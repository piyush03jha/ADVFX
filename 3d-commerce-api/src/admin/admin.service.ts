import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';
import { recalculateFixedSizePrice } from '../products/fixed-size-price';
import { calculateManufacturingPrice, createPricingCache, normalizePricingSize, type PricingCache } from '../pricing/manufacturing-pricing';

type ProductRank = { product: any; score: number };

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [products, activeProducts, archivedProducts, categories, pausedProducts, pausedCategories, orders, pendingOrders, processingOrders, readyToShip, customRequests, pendingCustomRequests, customers, deliveryRules, settings] =
      await Promise.all([
        this.prisma.product.count(),
        this.prisma.product.count({ where: { status: 'ACTIVE' } }),
        this.prisma.product.count({ where: { status: 'ARCHIVED' } }),
        this.prisma.category.count({ where: { isActive: true } }),
        // Products that cannot currently be ordered: paused directly, or because
        // their category (or parent category) has orders paused.
        this.prisma.product.count({
          where: {
            status: 'ACTIVE',
            OR: [
              { ordersEnabled: false },
              { category: { ordersEnabled: false } },
              { category: { parent: { ordersEnabled: false } } },
            ],
          },
        }),
        this.prisma.category.count({ where: { isActive: true, ordersEnabled: false } }),
        this.prisma.order.count(),
        this.prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
        this.prisma.order.count({ where: { status: 'PROCESSING' } }),
        this.prisma.order.count({ where: { status: 'READY_TO_SHIP' } }),
        this.prisma.customRequest.count(),
        this.prisma.customRequest.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'CUSTOMER_REVIEW'] } } }),
        this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
        this.prisma.deliveryZone.count({ where: { active: true } }),
        this.prisma.siteSetting.count(),
      ]);

    return {
      products: { total: products, active: activeProducts, archived: archivedProducts },
      categories,
      ordersPaused: { products: pausedProducts, categories: pausedCategories },
      orders: { total: orders, pendingPayment: pendingOrders, processing: processingOrders, readyToShip },
      customBuilds: { total: customRequests, needsAttention: pendingCustomRequests },
      customers, deliveryRules, settings,
    };
  }

  async settings() {
    const rows = await this.prisma.siteSetting.findMany({ orderBy: { key: 'asc' } });
    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
    }
    const featured = await this.prisma.product.findMany({
      where: { status: 'ACTIVE', isFeatured: true },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: 'desc' }, take: 20,
    });
    return { settings, featured };
  }

  async updateSettings(input: { hero?: unknown; storefront?: unknown; siteContent?: unknown; privacy?: unknown; terms?: unknown; refund?: unknown; shipping?: unknown; faq?: unknown }) {
    const updates = Object.entries(input)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => ({ key, value: JSON.stringify(value) }));

    const siteContent =
      input.siteContent &&
      typeof input.siteContent === 'object' &&
      !Array.isArray(input.siteContent)
        ? input.siteContent as Record<string, unknown>
        : null;

    const contactEmail =
      typeof siteContent?.contactEmail === 'string'
        ? siteContent.contactEmail.trim()
        : '';

    if (contactEmail) {
      updates.push({
        key: 'contactEmail',
        value: JSON.stringify(contactEmail),
      });
    }

    if (updates.length) {
      await this.prisma.$transaction(updates.map((item) => this.prisma.siteSetting.upsert({
        where: { key: item.key }, create: { key: item.key, value: item.value }, update: { value: item.value },
      })));
    }

    return this.settings();
  }

  async deliveryZones(includeInactive = true) {
    return this.prisma.deliveryZone.findMany({ where: includeInactive ? undefined : { active: true }, orderBy: [{ coverage: 'asc' }, { postalCode: 'asc' }] });
  }

  async upsertDeliveryZone(postalCode: string, coverage: 'DELIVERED' | 'NOT_DELIVERED', label?: string, active = true) {
    const normalized = postalCode.trim().toUpperCase();
    if (!/^[0-9A-Z -]{3,12}$/.test(normalized)) throw new BadRequestException('Invalid postal code');
    return this.prisma.deliveryZone.upsert({
      where: { postalCode: normalized },
      create: { postalCode: normalized, coverage, label: label?.trim() || null, active },
      update: { coverage, label: label?.trim() || null, active },
    });
  }

  async removeDeliveryZone(id: string) {
    const zone = await this.prisma.deliveryZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException('Delivery zone not found');
    return this.prisma.deliveryZone.update({ where: { id }, data: { active: false } });
  }

  async isPostalCodeDeliverable(postalCode: string) {
    const normalized = postalCode.trim().toUpperCase();
    const exact = await this.prisma.deliveryZone.findUnique({ where: { postalCode: normalized } });
    return { postalCode: normalized, deliverable: exact ? exact.coverage === 'DELIVERED' && exact.active : true, rule: exact?.coverage ?? 'DEFAULT' };
  }

  async customers(search?: string) {
    const term = search?.trim();
    return this.prisma.user.findMany({
      where: { role: 'CUSTOMER', ...(term ? { OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ] } : {}) },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: { select: { orders: true, customRequests: true } },
        wishlist: { select: { _count: { select: { items: true } } } },
      },
      orderBy: { createdAt: 'desc' }, take: 200,
    }).then((customers) =>
      customers.map(({ wishlist, ...customer }) => ({
        ...customer,
        _count: {
          ...customer._count,
          wishlist: wishlist?._count.items ?? 0,
        },
      })),
    );
  }

  async setCustomerActive(id: string, isActive: boolean) {
    const customer = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!customer || customer.role !== 'CUSTOMER') throw new NotFoundException('Customer not found');
    return this.prisma.user.update({ where: { id }, data: { isActive }, select: { id: true, name: true, email: true, phone: true, isActive: true } });
  }

  async materialPricingRules() {
    return this.prisma.materialPricingRule.findMany({
      orderBy: [{ material: 'asc' }, { sizeKey: 'asc' }],
    });
  }

  // Bulk recalculations touch every product, so they get a longer interactive
  // transaction window than Prisma's 5 second default.
  private static readonly BULK_PRICING_TX = { maxWait: 10_000, timeout: 120_000 };

  private async recalculateProductPrices(
    tx: Prisma.TransactionClient,
    productId: string,
    options: { cache?: PricingCache; deactivateUnpriced?: boolean } = {},
  ) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, material: true, hasSizes: true, fixedWeightGrams: true, variants: { where: { isActive: true }, select: { id: true, name: true, size: true, weightGrams: true, price: { select: { priceOverrideMinor: true } } } } },
    });
    // A product without sizes has one price, calculated like its Medium size.
    if (product?.hasSizes === false) {
      await recalculateFixedSizePrice(tx, product, { cache: options.cache });
      return;
    }
    if (!product?.material?.trim()) return;
    for (const variant of product.variants) {
      // A manually set size price stays as the admin entered it.
      if (variant.price?.priceOverrideMinor != null) continue;
      if (variant.weightGrams == null) {
        const perKgRule = await tx.materialPricingRule.findFirst({
          where: {
            material: { equals: product.material, mode: 'insensitive' },
            sizeKey: { in: [normalizePricingSize(variant.name) || normalizePricingSize(variant.size), 'all'] },
            isActive: true,
            pricePerKgMinor: { gt: 0 },
          },
        });
        if (perKgRule) {
          await tx.productVariantPrice.updateMany({
            where: { variantId: variant.id },
            data: { isActive: false },
          });
          continue;
        }
      }
      try {
        const calculated = await calculateManufacturingPrice(tx, {
          productId: product.id,
          material: product.material,
          size: variant.size,
          variantName: variant.name,
          weightGrams: variant.weightGrams,
          cache: options.cache,
        });
        await tx.productVariantPrice.upsert({
          where: { variantId: variant.id },
          create: {
            variantId: variant.id,
            currency: calculated.currency,
            amountMinor: calculated.amountMinor,
            costBreakdown: calculated.costBreakdown,
            isActive: true,
          },
          update: {
            currency: calculated.currency,
            amountMinor: calculated.amountMinor,
            compareAtMinor: null,
            costBreakdown: calculated.costBreakdown,
            isActive: true,
          },
        });
      } catch (error) {
        // Products without a configured material/size rule are skipped during
        // bulk recalculation; invalid configured costs must still fail loudly.
        if (
          !(error instanceof BadRequestException) ||
          !error.message.includes('No active material pricing is configured')
        ) throw error;
        // When a rule was just switched off and nothing else covers this
        // variant, stop selling it at the old price.
        if (options.deactivateUnpriced) {
          await tx.productVariantPrice.updateMany({
            where: { variantId: variant.id },
            data: { isActive: false },
          });
        }
      }
    }
  }

  async upsertMaterialPricingRule(input: {
    material: string;
    sizeKey: string;
    currency?: string;
    rawMaterialCostMinor: number;
    pricePerKgMinor?: number;
    wastageRateBps: number;
    electricityKwhMilli: number;
    machineHoursMilli: number;
    isActive?: boolean;
  }) {
    const material = input.material?.trim();
    const sizeKey = normalizePricingSize(input.sizeKey);
    const currency = (input.currency || 'INR').trim().toUpperCase();
    if (!material || !sizeKey) throw new BadRequestException('Material and size are required');
    if (!/^[A-Z]{3}$/.test(currency)) throw new BadRequestException('Currency must be a three-letter ISO code');
    const numericValues = [
      input.rawMaterialCostMinor,
      input.pricePerKgMinor ?? 0,
      input.wastageRateBps,
      input.electricityKwhMilli,
      input.machineHoursMilli,
    ];
    if (numericValues.some((value) => !Number.isSafeInteger(value) || value < 0)) {
      throw new BadRequestException('Manufacturing cost inputs must be non-negative integer values');
    }
    if (input.wastageRateBps > 100000) {
      throw new BadRequestException('Wastage rate cannot exceed 1000%');
    }

    return this.prisma.$transaction(async (tx) => {
      const existingRule = await tx.materialPricingRule.findFirst({
        where: { material: { equals: material, mode: 'insensitive' }, sizeKey },
      });
      const rule = existingRule
        ? await tx.materialPricingRule.update({
            where: { id: existingRule.id },
            data: {
              currency,
              rawMaterialCostMinor: input.rawMaterialCostMinor,
              pricePerKgMinor: input.pricePerKgMinor ?? 0,
              wastageRateBps: input.wastageRateBps,
              electricityKwhMilli: input.electricityKwhMilli,
              machineHoursMilli: input.machineHoursMilli,
              isActive: input.isActive ?? true,
            },
          })
        : await tx.materialPricingRule.create({
            data: {
              material, sizeKey, currency, amountMinor: 0,
              rawMaterialCostMinor: input.rawMaterialCostMinor,
              pricePerKgMinor: input.pricePerKgMinor ?? 0,
              wastageRateBps: input.wastageRateBps,
              electricityKwhMilli: input.electricityKwhMilli,
              machineHoursMilli: input.machineHoursMilli,
              isActive: input.isActive ?? true,
            },
          });
      const products = await tx.product.findMany({
        where: { material: { equals: material, mode: 'insensitive' }, status: { not: 'ARCHIVED' } },
        select: { id: true },
      });
      // Recalculate through the normal engine in both cases. When the rule was
      // deactivated, variants that another rule (for example the "all" per-kg
      // fallback) still covers keep a correct price; only variants left with
      // no applicable rule are switched off.
      const cache = createPricingCache();
      for (const product of products) {
        await this.recalculateProductPrices(tx, product.id, { cache, deactivateUnpriced: !rule.isActive });
      }
      return rule;
    }, AdminService.BULK_PRICING_TX);
  }

  async sizeManufacturingRules() {
    return this.prisma.sizeManufacturingRule.findMany({ orderBy: { sizeKey: 'asc' } });
  }

  async upsertSizeManufacturingRule(input: {
    sizeKey: string;
    electricityCostMinor: number;
    machineCostMinor: number;
    labourCostMinor: number;
    finishingCostMinor: number;
    platformCostMinor: number;
    packagingCostMinor: number;
  }) {
    const sizeKey = normalizePricingSize(input.sizeKey);
    if (!sizeKey) throw new BadRequestException('A valid size is required');
    const values = [
      input.electricityCostMinor, input.machineCostMinor, input.labourCostMinor,
      input.finishingCostMinor, input.platformCostMinor, input.packagingCostMinor,
    ];
    if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
      throw new BadRequestException('Size manufacturing costs must be non-negative integer values');
    }
    return this.prisma.$transaction(async (tx) => {
      const rule = await tx.sizeManufacturingRule.upsert({
        where: { sizeKey },
        create: {
          sizeKey,
          electricityCostMinor: input.electricityCostMinor,
          machineCostMinor: input.machineCostMinor,
          labourCostMinor: input.labourCostMinor,
          finishingCostMinor: input.finishingCostMinor,
          platformCostMinor: input.platformCostMinor,
          packagingCostMinor: input.packagingCostMinor,
        },
        update: {
          electricityCostMinor: input.electricityCostMinor,
          machineCostMinor: input.machineCostMinor,
          labourCostMinor: input.labourCostMinor,
          finishingCostMinor: input.finishingCostMinor,
          platformCostMinor: input.platformCostMinor,
          packagingCostMinor: input.packagingCostMinor,
        },
      });
      const products = await tx.product.findMany({
        where: { status: { not: 'ARCHIVED' }, material: { not: null } },
        select: { id: true },
      });
      const cache = createPricingCache();
      for (const product of products) await this.recalculateProductPrices(tx, product.id, { cache });
      return rule;
    }, AdminService.BULK_PRICING_TX);
  }

  async productCostRules(productId?: string) {
    return this.prisma.productCostRule.findMany({
      where: productId ? { productId } : undefined,
      include: { product: { select: { id: true, name: true, material: true } } },
      orderBy: [{ productId: 'asc' }, { sizeKey: 'asc' }],
    });
  }

  async upsertProductCostRule(input: {
    productId: string;
    sizeKey: string;
    labourCostMinor?: number | null;
    paintingCostMinor?: number;
    finishingCostMinor?: number;
    machineSetupCostMinor?: number;
    packagingCostMinor?: number | null;
  }) {
    const product = await this.prisma.product.findUnique({ where: { id: input.productId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
    const sizeKey = normalizePricingSize(input.sizeKey);
    if (!sizeKey) throw new BadRequestException('A valid size is required');
    const values = [
      input.labourCostMinor,
      input.paintingCostMinor,
      input.finishingCostMinor,
      input.machineSetupCostMinor,
      input.packagingCostMinor,
    ];
    if (values.some((value) => value != null && (!Number.isSafeInteger(value) || value < 0))) {
      throw new BadRequestException('Product manufacturing costs must be non-negative integer values');
    }
    return this.prisma.$transaction(async (tx) => {
      const rule = await tx.productCostRule.upsert({
        where: { productId_sizeKey: { productId: input.productId, sizeKey } },
        create: {
          productId: input.productId,
          sizeKey,
          labourCostMinor: input.labourCostMinor ?? null,
          paintingCostMinor: input.paintingCostMinor ?? 0,
          finishingCostMinor: input.finishingCostMinor ?? 0,
          machineSetupCostMinor: input.machineSetupCostMinor ?? 0,
          packagingCostMinor: input.packagingCostMinor ?? null,
        },
        update: {
          labourCostMinor: input.labourCostMinor ?? null,
          paintingCostMinor: input.paintingCostMinor ?? 0,
          finishingCostMinor: input.finishingCostMinor ?? 0,
          machineSetupCostMinor: input.machineSetupCostMinor ?? 0,
          packagingCostMinor: input.packagingCostMinor ?? null,
        },
      });
      await this.recalculateProductPrices(tx, input.productId);
      return rule;
    });
  }

  async manufacturingRates() {
    return this.prisma.manufacturingRate.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
  }

  async upsertManufacturingRates(input: {
    electricityRatePerKwhMinor: number;
    machineHourlyCostMinor: number;
    generalOverheadBps: number;
    profitMarginBps: number;
    defaultLabourCostMinor: number;
    standardPackagingCostMinor: number;
  }) {
    const values = Object.values(input);
    if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
      throw new BadRequestException('Global manufacturing rates must be non-negative integer values');
    }
    if (input.generalOverheadBps > 10000) {
      throw new BadRequestException('General overhead cannot exceed 100%');
    }
    if (input.profitMarginBps > 8000) {
      throw new BadRequestException('Profit margin cannot exceed 80%');
    }
    return this.prisma.$transaction(async (tx) => {
      const rates = await tx.manufacturingRate.upsert({
        where: { id: 'default' },
        create: { id: 'default', ...input },
        update: input,
      });
      const products = await tx.product.findMany({
        where: { status: { not: 'ARCHIVED' }, material: { not: null } },
        select: { id: true },
      });
      const cache = createPricingCache();
      for (const product of products) await this.recalculateProductPrices(tx, product.id, { cache });
      return rates;
    }, AdminService.BULK_PRICING_TX);
  }

  async catalog() {
    const [products, categories, materialPricingRules, productCostRules, manufacturingRates] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: { not: 'ARCHIVED' } },
        include: { category: { include: { parent: { select: { id: true, name: true, ordersEnabled: true } } } }, prices: { where: { isActive: true, countryCode: null }, orderBy: { createdAt: 'desc' }, take: 1 }, variants: { include: { price: true }, orderBy: { createdAt: 'asc' } }, media: { orderBy: { sortOrder: 'asc' } }, metrics: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.category.findMany({ where: { isActive: true }, orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }] }),
      this.prisma.materialPricingRule.findMany({ where: { isActive: true }, orderBy: [{ material: 'asc' }, { sizeKey: 'asc' }] }),
      this.prisma.productCostRule.findMany({ orderBy: [{ productId: 'asc' }, { sizeKey: 'asc' }] }),
      this.prisma.manufacturingRate.findUnique({ where: { id: 'default' } }),
    ]);
    return { products, categories, materialPricingRules, productCostRules, manufacturingRates };
  }

  async saleCampaign() {
    const row = await this.prisma.siteSetting.findUnique({ where: { key: 'saleCampaign' } });
    const defaults = { enabled: false, categoryId: null as string | null, priceIncreaseBps: 2000, discountBps: 2000, startsAt: null as string | null, endsAt: null as string | null };
    if (!row) return defaults;
    try {
      const value = JSON.parse(row.value) as Partial<typeof defaults>;
      return {
        enabled: value.enabled === true,
        categoryId: typeof value.categoryId === 'string' && value.categoryId.trim() ? value.categoryId : null,
        priceIncreaseBps: Number.isInteger(value.priceIncreaseBps) ? value.priceIncreaseBps! : defaults.priceIncreaseBps,
        discountBps: Number.isInteger(value.discountBps) ? value.discountBps! : defaults.discountBps,
        startsAt: value.startsAt ?? null,
        endsAt: value.endsAt ?? null,
      };
    } catch {
      return defaults;
    }
  }

  async updateSaleCampaign(input: {
    enabled?: boolean;
    categoryId?: string | null;
    priceIncreaseBps?: number;
    discountBps?: number;
    startsAt?: string | null;
    endsAt?: string | null;
  }) {
    const current = await this.saleCampaign();
    const priceIncreaseBps = input.priceIncreaseBps ?? current.priceIncreaseBps;
    const discountBps = input.discountBps ?? current.discountBps;
    if (!Number.isInteger(priceIncreaseBps) || priceIncreaseBps < 0 || priceIncreaseBps > 10000) {
      throw new BadRequestException('Sale price increase must be between 0% and 100%.');
    }
    if (!Number.isInteger(discountBps) || discountBps < 0 || discountBps > 10000) {
      throw new BadRequestException('Sale discount must be between 0% and 100%.');
    }
    const startsAt = input.startsAt === undefined ? current.startsAt : input.startsAt;
    const endsAt = input.endsAt === undefined ? current.endsAt : input.endsAt;
    const startDate = startsAt ? new Date(startsAt) : null;
    const endDate = endsAt ? new Date(endsAt) : null;
    if ((startDate && Number.isNaN(startDate.getTime())) || (endDate && Number.isNaN(endDate.getTime()))) {
      throw new BadRequestException('Sale campaign dates are invalid.');
    }
    if (startDate && endDate && endDate <= startDate) {
      throw new BadRequestException('Sale end date must be after its start date.');
    }
    const categoryId = input.categoryId === undefined ? current.categoryId : input.categoryId?.trim() || null;
    if (categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
      if (!category) throw new BadRequestException('Selected sale category was not found.');
    }
    const campaign = {
      enabled: input.enabled ?? current.enabled,
      categoryId,
      priceIncreaseBps,
      discountBps,
      startsAt: startDate?.toISOString() ?? null,
      endsAt: endDate?.toISOString() ?? null,
    };
    await this.prisma.siteSetting.upsert({
      where: { key: 'saleCampaign' },
      create: { key: 'saleCampaign', value: JSON.stringify(campaign) },
      update: { value: JSON.stringify(campaign) },
    });
    return campaign;
  }

  async promotions() {
    return this.prisma.promotion.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async upsertPromotion(input: {
    id?: string;
    name: string;
    description?: string | null;
    code?: string | null;
    type: any;
    value: number;
    minSubtotalMinor?: number | null;
    maxDiscountMinor?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
    usageLimit?: number | null;
    isActive?: boolean;
  }) {
    const data = {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      code: input.code?.trim().toUpperCase() || null,
      type: input.type,
      value: input.value,
      minSubtotalMinor: input.minSubtotalMinor ?? null,
      maxDiscountMinor: input.maxDiscountMinor ?? null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      usageLimit: input.usageLimit ?? null,
      isActive: input.isActive ?? true,
    };
    if (!data.name) throw new BadRequestException('Promotion name is required');
    if (data.value < 0) throw new BadRequestException('Promotion value cannot be negative');
    return input.id
      ? this.prisma.promotion.update({ where: { id: input.id }, data })
      : this.prisma.promotion.create({ data });
  }

  async setPromotionActive(id: string, isActive: boolean) {
    return this.prisma.promotion.update({ where: { id }, data: { isActive } });
  }

  async taxRules() {
    return this.prisma.taxRule.findMany({ orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }] });
  }

  async upsertTaxRule(input: {
    id?: string;
    name: string;
    countryCode: string;
    stateCode?: string | null;
    rateBps: number;
    applyToShipping?: boolean;
    priority?: number;
    isActive?: boolean;
  }) {
    const data = {
      name: input.name.trim(),
      countryCode: input.countryCode.trim().toUpperCase(),
      stateCode: input.stateCode?.trim().toUpperCase() || null,
      rateBps: Math.max(0, Math.round(input.rateBps)),
      applyToShipping: input.applyToShipping ?? false,
      priority: Math.max(0, Math.round(input.priority ?? 0)),
      isActive: input.isActive ?? true,
    };
    if (!data.name || !data.countryCode) throw new BadRequestException('Name and country code are required');
    return input.id
      ? this.prisma.taxRule.update({ where: { id: input.id }, data })
      : this.prisma.taxRule.create({ data });
  }

  async setTaxRuleActive(id: string, isActive: boolean) {
    return this.prisma.taxRule.update({ where: { id }, data: { isActive } });
  }

  async analytics(days = 30) {
    const safeDays = Math.min(90, Math.max(7, Math.floor(days)));
    const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
    const [orders, topProducts] = await Promise.all([
      this.prisma.order.findMany({ where: { createdAt: { gte: since }, payment: { status: 'CAPTURED' } }, select: { createdAt: true, totalMinor: true, status: true } }),
      this.prisma.orderItem.groupBy({ by: ['productId'], where: { order: { createdAt: { gte: since }, payment: { status: 'CAPTURED' } } }, _sum: { quantity: true, totalPriceMinor: true }, orderBy: { _sum: { totalPriceMinor: 'desc' } }, take: 10 }),
    ]);
    const byDay = new Map<string,{orders:number;revenueMinor:number}>();
    for(let i=0;i<safeDays;i++){const d=new Date(Date.now()-(safeDays-1-i)*86400000);byDay.set(d.toISOString().slice(0,10),{orders:0,revenueMinor:0});}
    for(const order of orders){const key=order.createdAt.toISOString().slice(0,10);const row=byDay.get(key);if(row){row.orders++;row.revenueMinor+=order.totalMinor;}}
    const ids=topProducts.map(x=>x.productId);const products=await this.prisma.product.findMany({where:{id:{in:ids}},select:{id:true,name:true,slug:true}});const productMap=new Map(products.map(p=>[p.id,p]));
    return { days:safeDays, summary:{orders:orders.length,revenueMinor:orders.reduce((t,o)=>t+o.totalMinor,0),averageOrderMinor:orders.length?Math.round(orders.reduce((t,o)=>t+o.totalMinor,0)/orders.length):0}, daily:[...byDay.entries()].map(([date,v])=>({date,...v})), topProducts:topProducts.map(x=>({...productMap.get(x.productId),quantity:x._sum.quantity??0,revenueMinor:x._sum.totalPriceMinor??0})) };
  }

  async notificationAudience(search?: string) {
    const term = search?.trim();
    return this.prisma.user.findMany({ where: { role: 'CUSTOMER', ...(term ? { OR: [{name:{contains:term,mode:'insensitive'}},{email:{contains:term,mode:'insensitive'}}] } : {}) }, select: { id:true,name:true,email:true }, orderBy:{createdAt:'desc'}, take:500 });
  }

  async sendAnnouncement(input:{userIds?:string[];title:string;message:string;actorId?:string}) {
    const title=input.title.trim(), message=input.message.trim();
    if(!title||!message) throw new BadRequestException('Title and message are required');
    const users = input.userIds?.length
      ? await this.prisma.user.findMany({where:{id:{in:[...new Set(input.userIds)]},role:'CUSTOMER'},select:{id:true}})
      : await this.prisma.user.findMany({where:{role:'CUSTOMER',isActive:true},select:{id:true}});
    if(!users.length) return {sent:0};
    const result=await this.prisma.notification.createMany({data:users.map(u=>({userId:u.id,type:NotificationType.ADMIN_ANNOUNCEMENT,title,message}))});
    await this.prisma.adminAuditLog.create({data:{actorId:input.actorId??null,action:'NOTIFICATION_BROADCAST',entityType:'NOTIFICATION',summary:`Announcement sent to ${result.count} customers`,metadata:JSON.stringify({title,userIds:input.userIds??null})}});
    return {sent:result.count};
  }

  async merchandising(limit = 8) {
    const products = await this.prisma.product.findMany({ where: { status: 'ACTIVE' }, include: { metrics: true } });
    const bestsellers: ProductRank[] = products.map((product) => ({
      product,
      score: (product.metrics?.unitsSold ?? 0) * 8 + (product.metrics?.purchaseCount ?? 0) * 4 + (product.metrics?.cartAddCount ?? 0) + (product.metrics?.viewCount ?? 0) * 0.1,
    })).sort((a, b) => b.score - a.score);
    const newArrivals = [...products].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return {
      algorithm: { bestseller: '8× units sold + 4× purchases + 1× cart adds + 0.1× views', newArrival: 'newest active products by createdAt' },
      bestsellers: bestsellers.slice(0, limit).map(({ product, score }) => ({ ...product, rankingScore: Number(score.toFixed(2)) })),
      newArrivals: newArrivals.slice(0, limit),
    };
  }
}
