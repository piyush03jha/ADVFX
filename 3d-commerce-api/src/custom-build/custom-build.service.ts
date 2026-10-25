import { CreateCustomBuildHeightRangeDto, CreateCustomBuildOptionDto, UpdateCustomBuildCategoryDto, UpdateCustomBuildHeightRangeDto, UpdateCustomBuildOptionDto } from "./custom-build.config.dto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CustomRequestStatus,
  NotificationType,
} from "@prisma/client";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { StorageService } from "../storage/storage.service";
import { CreateCustomRequestDto } from "./dto/create-custom-request.dto";
import { CustomPricingDto } from "./dto/custom-pricing.dto";

type CustomPricingInput = Pick<
  CustomPricingDto,
  | "category"
  | "bodyType"
  | "headType"
  | "subjectType"
  | "personCount"
  | "petCount"
  | "sizeCm"
>;

const TRANSITIONS: Record<CustomRequestStatus, CustomRequestStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["PREVIEW_READY", "CANCELLED"],
  PREVIEW_READY: ["CUSTOMER_REVIEW", "CANCELLED"],
  CUSTOMER_REVIEW: ["REVISION_REQUESTED", "APPROVED", "CANCELLED"],
  REVISION_REQUESTED: ["IN_PRODUCTION", "CANCELLED"],
  APPROVED: ["ORDERABLE", "CANCELLED"],
  ORDERABLE: [],
  CANCELLED: [],
};

@Injectable()
export class CustomBuildService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  async quote(input: CustomPricingInput) {
    const calculated = await this.calculateConfiguredPrice(input);
    return { currency: calculated.currency, amountMinor: calculated.amountMinor, priceMinor: calculated.amountMinor, breakdown: calculated.breakdown };
  }

  private async calculateConfiguredPrice(input: CustomPricingInput) {
    const category = await this.prisma.customBuildCategory.findUnique({
      where: { slug: input.category },
      include: {
        options: { where: { isActive: true }, orderBy: [{ section: "asc" }, { sortOrder: "asc" }] },
        heightRanges: { where: { isActive: true }, orderBy: { minCm: "asc" } },
      },
    });
    if (!category || !category.isActive) throw new BadRequestException("Custom category is unavailable");

    // Heights are entered to one decimal place; round so 12.0000001 cannot fall
    // between two admin ranges.
    const heightCm = Math.round(input.sizeCm * 10) / 10;
    const range = category.heightRanges.find((item) => heightCm >= item.minCm && heightCm <= item.maxCm);
    if (!range) {
      const available = category.heightRanges.map((item) => `${item.minCm}–${item.maxCm} cm`).join(", ");
      throw new BadRequestException(
        available
          ? `No price is configured for a height of ${heightCm} cm. Available heights: ${available}.`
          : "No height pricing is configured for this category yet.",
      );
    }

    const by = (section: string, slug?: string) => slug ? category.options.find((o) => o.section === section && o.slug === slug) : undefined;
    const selected: { section: string; slug: string; name: string; priceMinor: number }[] = [];
    // The admin-set range price is the base price. Selected body/frame options
    // add their own admin-set price on top, exactly as they are shown on the form.
    let amountMinor = range.priceMinor;
    if (category.slug === "person") {
      const body = by("body", input.bodyType), frame = by("frame", input.subjectType);
      if (!body || !frame) throw new BadRequestException("Person build has an invalid configuration");
      amountMinor += body.priceMinor + frame.priceMinor;
      selected.push(body, frame);
    }

    return {
      amountMinor,
      currency: category.currency,
      breakdown: {
        category: category.slug,
        categoryName: category.name,
        bodyType: input.bodyType ?? null,
        headType: input.headType ?? null,
        subjectType: input.subjectType ?? null,
        personCount: input.personCount ?? null,
        petCount: input.petCount ?? null,
        heightCm,
        heightRange: { minCm: range.minCm, maxCm: range.maxCm, priceMinor: range.priceMinor },
        selectedOptions: selected.map((o) => ({ section: o.section, slug: o.slug, name: o.name, priceMinor: o.priceMinor })),
      },
    };
  }

  async getPublicConfig() {
    const categories = await this.prisma.customBuildCategory.findMany({
      where: { isActive: true },
      include: {
        options: { where: { isActive: true }, orderBy: [{ section: "asc" }, { sortOrder: "asc" }] },
        heightRanges: { where: { isActive: true }, orderBy: { minCm: "asc" } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return { categories };
  }

  async getAdminConfig() {
    return this.prisma.customBuildCategory.findMany({
      include: {
        options: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] },
        heightRanges: { orderBy: { minCm: "asc" } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async createConfigCategory(data: { slug: string; name: string; description?: string; basePriceMinor?: number; sortOrder?: number; isActive?: boolean }) {
    return this.prisma.customBuildCategory.create({ data: { slug: data.slug.trim().toLowerCase(), name: data.name.trim(), description: data.description?.trim() || null, basePriceMinor: data.basePriceMinor ?? 0, sortOrder: data.sortOrder ?? 0, isActive: data.isActive !== false } });
  }
  async updateConfigCategory(id: string, dto: UpdateCustomBuildCategoryDto) { return this.prisma.customBuildCategory.update({ where: { id }, data: dto }); }
  async createConfigOption(categoryId: string, dto: CreateCustomBuildOptionDto) { return this.prisma.customBuildOption.create({ data: { ...dto, categoryId, priceMinor: dto.priceMinor ?? 0, sortOrder: dto.sortOrder ?? 0, isActive: dto.isActive !== false } }); }
  async updateConfigOption(id: string, dto: UpdateCustomBuildOptionDto) { return this.prisma.customBuildOption.update({ where: { id }, data: dto }); }
  async deleteConfigOption(id: string) { return this.prisma.customBuildOption.delete({ where: { id } }); }

  private async assertHeightRangeValid(categoryId: string, minCm: number, maxCm: number, isActive: boolean, ignoreId?: string) {
    if (minCm > maxCm) throw new BadRequestException("Minimum height cannot be greater than maximum height");
    if (!isActive) return;
    const overlapping = await this.prisma.customBuildHeightRange.findFirst({
      where: { categoryId, isActive: true, id: ignoreId ? { not: ignoreId } : undefined, minCm: { lte: maxCm }, maxCm: { gte: minCm } },
    });
    if (overlapping) {
      throw new ConflictException(`Overlaps the existing ${overlapping.minCm}–${overlapping.maxCm} cm range. Ranges are inclusive and must not overlap.`);
    }
  }

  async createConfigHeightRange(categoryId: string, dto: CreateCustomBuildHeightRangeDto) {
    const category = await this.prisma.customBuildCategory.findUnique({ where: { id: categoryId }, select: { id: true } });
    if (!category) throw new NotFoundException("Custom category not found");
    const isActive = dto.isActive !== false;
    await this.assertHeightRangeValid(categoryId, dto.minCm, dto.maxCm, isActive);
    return this.prisma.customBuildHeightRange.create({
      data: { categoryId, minCm: dto.minCm, maxCm: dto.maxCm, priceMinor: dto.priceMinor, sortOrder: dto.sortOrder ?? 0, isActive },
    });
  }

  async updateConfigHeightRange(id: string, dto: UpdateCustomBuildHeightRangeDto) {
    const current = await this.prisma.customBuildHeightRange.findUnique({ where: { id } });
    if (!current) throw new NotFoundException("Height range not found");
    await this.assertHeightRangeValid(
      current.categoryId,
      dto.minCm ?? current.minCm,
      dto.maxCm ?? current.maxCm,
      dto.isActive ?? current.isActive,
      id,
    );
    return this.prisma.customBuildHeightRange.update({ where: { id }, data: dto });
  }

  async deleteConfigHeightRange(id: string) {
    return this.prisma.customBuildHeightRange.delete({ where: { id } });
  }

  async uploadConfigOptionImage(id: string, file: { originalname: string; mimetype: string; buffer: Buffer }) {
    const option = await this.prisma.customBuildOption.findUnique({ where: { id } });
    if (!option) throw new NotFoundException("Custom option not found");
    if (!file.buffer?.length || file.buffer.length > 5 * 1024 * 1024) throw new BadRequestException("Option image must be between 1 byte and 5 MB");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) throw new BadRequestException("Only JPG, PNG and WebP are supported");
    const stored = await this.storage.saveCustomBuildOptionImage(id, file.originalname, file.buffer);
    const updated = await this.prisma.customBuildOption.update({ where: { id }, data: { imageUrl: stored.storageUrl } });
    if (option.imageUrl?.startsWith("/storage/")) { try { await this.storage.delete(option.imageUrl.replace(/^\/storage\//, "")); } catch {} }
    return updated;
  }

  async uploadConfigCategoryImage(id: string, file: { originalname: string; mimetype: string; buffer: Buffer }) {
    const category = await this.prisma.customBuildCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException("Custom category not found");
    if (!file.buffer?.length || file.buffer.length > 5 * 1024 * 1024) throw new BadRequestException("Category image must be between 1 byte and 5 MB");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) throw new BadRequestException("Only JPG, PNG and WebP are supported");
    const stored = await this.storage.saveCustomBuildCategoryImage(id, file.originalname, file.buffer);
    const updated = await this.prisma.customBuildCategory.update({ where: { id }, data: { imageUrl: stored.storageUrl } });
    if (category.imageUrl?.startsWith("/storage/")) { try { await this.storage.delete(category.imageUrl.replace(/^\/storage\//, "")); } catch {} }
    return updated;
  }

  async checkout(
    userId: string,
    requestId: string,
    shippingAddressId: string,
    idempotencyKey?: string,
  ) {
    const request = await this.prisma.customRequest.findFirst({
      where: { id: requestId, userId },
    });
    if (!request) throw new NotFoundException("Custom request not found");
    if (!request.category || !request.sizeCm || !request.priceMinor || !request.priceCurrency) {
      throw new BadRequestException("Custom request is missing a valid price configuration");
    }

    const address = await this.prisma.address.findFirst({
      where: { id: shippingAddressId, userId },
    });
    if (!address) throw new NotFoundException("Shipping address not found");

    const postalCode = address.postalCode?.trim().toUpperCase();
    if (postalCode) {
      const deliveryZone = await this.prisma.deliveryZone.findUnique({
        where: { postalCode },
        select: { active: true, coverage: true },
      });
      if (deliveryZone?.active && deliveryZone.coverage === "NOT_DELIVERED") {
        throw new BadRequestException(
          "We currently do not deliver to postal code " + postalCode,
        );
      }
    }

    if (request.status === "CANCELLED") {
      throw new BadRequestException("Cancelled custom requests cannot be purchased");
    }
    if (request.status === "IN_PRODUCTION") {
      throw new ConflictException("This custom order has already been paid.");
    }

    if (request.orderId) {
      const linkedOrder = await this.prisma.order.findUnique({
        where: { id: request.orderId },
        include: {
          payment: true,
          shipment: true,
          shippingAddress: true,
          customRequest: true,
        },
      });
      if (linkedOrder?.status === "PENDING_PAYMENT") {
        // Reuse the unpaid order, but honour the address picked on this attempt.
        if (linkedOrder.shippingAddressId !== address.id) {
          const updated = await this.prisma.order.update({
            where: { id: linkedOrder.id },
            data: {
              shippingAddressId: address.id,
              shippingAddressSnapshot: {
                fullName: address.fullName,
                phone: address.phone,
                line1: address.line1,
                line2: address.line2,
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
                country: address.country,
              },
            },
            include: {
              payment: true,
              shipment: true,
              shippingAddress: true,
              customRequest: true,
            },
          });
          return { requestId: request.id, order: updated };
        }
        return { requestId: request.id, order: linkedOrder };
      }
      // A cancelled unpaid order must not dead-end the customer: fall through and
      // create a fresh order. Any other status means the request is already paid.
      if (linkedOrder && linkedOrder.status !== "CANCELLED") {
        throw new ConflictException("This custom order already has an order and cannot be checked out again.");
      }
    }

    const amountMinor = request.priceMinor;
    const idempotency = idempotencyKey?.trim() || undefined;

    if (idempotency) {
      const existing = await this.prisma.order.findFirst({
        where: { userId, idempotencyKey: idempotency },
        include: {
          payment: true,
          shipment: true,
          shippingAddress: true,
          customRequest: true,
        },
      });
      if (existing) return { requestId: existing.customRequest?.id ?? requestId, order: existing };
    }

    const order = await this.prisma.order.create({
      data: {
        orderNumber: `ADV-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`,
        idempotencyKey: idempotency ?? null,
        checkoutSource: "CUSTOM",
        userId,
        status: "PENDING_PAYMENT",
        currency: request.priceCurrency,
        subtotalMinor: amountMinor,
        discountMinor: 0,
        shippingMinor: 0,
        taxMinor: 0,
        totalMinor: amountMinor,
        shippingAddressId: address.id,
        shippingAddressSnapshot: {
          fullName: address.fullName,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
        },
        customRequest: { connect: { id: request.id } },
        payment: {
          create: {
            provider: "RAZORPAY",
            status: "PENDING",
            amountMinor,
            currency: request.priceCurrency,
          },
        },
        shipment: { create: { status: "PENDING" } },
      },
      include: {
        payment: true,
        shipment: true,
        shippingAddress: true,
        customRequest: true,
      },
    });

    await this.prisma.customRequestQuote.upsert({
      where: { customRequestId: request.id },
      create: {
        customRequestId: request.id,
        currency: request.priceCurrency,
        amountMinor,
      },
      update: {
        currency: request.priceCurrency,
        amountMinor,
      },
    });

    return { requestId: request.id, order };
  }

  async create(userId: string, dto: CreateCustomRequestDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const configured = await this.calculateConfiguredPrice(dto);
    const sizeLabel = `${dto.sizeCm} cm`;
    const requirements = [
      dto.requirements.trim(),
      `Category: ${dto.category}`,
      dto.bodyType ? `Body type: ${dto.bodyType}` : "",
      dto.headType ? `Head type: ${dto.headType}` : "",
      dto.subjectType ? `Subject type: ${dto.subjectType}` : "",
      dto.personCount != null ? `People: ${dto.personCount}` : "",
      dto.petCount != null ? `Pets: ${dto.petCount}` : "",
      `Size: ${sizeLabel}`,
    ].filter(Boolean).join("\n");

    const request = await this.prisma.customRequest.create({
      data: {
        userId,
        title: dto.title.trim(),
        requirements,
        dimensions: dto.dimensions?.trim() || sizeLabel,
        preferredMaterial: dto.preferredMaterial?.trim() || null,
        preferredScale: dto.preferredScale?.trim() || sizeLabel,
        notes: dto.notes?.trim() || null,
        category: dto.category,
        bodyType: dto.bodyType ?? null,
        headType: dto.headType ?? null,
        subjectType: dto.subjectType ?? null,
        personCount: dto.personCount ?? null,
        petCount: dto.petCount ?? null,
        sizeCm: dto.sizeCm,
        priceMinor: configured.amountMinor,
        priceCurrency: "INR",
        pricedAt: new Date(),
        referenceFileCount: 0,
        configurationSnapshot: JSON.stringify(configured.breakdown),
        status: "SUBMITTED",
      },
      include: { media: true, quote: true, order: true },
    });

    await this.prisma.customRequestQuote.upsert({
      where: { customRequestId: request.id },
      create: {
        customRequestId: request.id,
        currency: "INR",
        amountMinor: configured.amountMinor,
      },
      update: {
        currency: "INR",
        amountMinor: configured.amountMinor,
      },
    });

    const pricedRequest = await this.prisma.customRequest.findUniqueOrThrow({
      where: { id: request.id },
      include: { media: true, quote: true, order: true },
    });

    await this.notifications.create(userId, {
      type: NotificationType.CUSTOM_REQUEST_SUBMITTED,
      title: "Custom build saved",
      message: `Your custom build “${request.title}” is ready for payment.`,
      entityType: "CUSTOM_REQUEST",
      entityId: request.id,
    });

    return pricedRequest;
  }


  async mine(userId: string) {
    return this.prisma.customRequest.findMany({
      where: { userId },
      include: { media: true, quote: true, order: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async mineOne(userId: string, id: string) {
    const request = await this.prisma.customRequest.findFirst({
      where: { id, userId },
      include: {
        media: true,
        quote: true,
        revisions: true,
        order: { include: { payment: true, shipment: true, items: true } },
      },
    });
    if (!request) throw new NotFoundException("Custom request not found");
    return request;
  }

  async findAllAdmin(status?: CustomRequestStatus) {
    return this.prisma.customRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        user: true,
        media: true,
        quote: true,
        revisions: true,
        order: { include: { payment: true, shipment: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOneAdmin(id: string) {
    const request = await this.prisma.customRequest.findUnique({
      where: { id },
      include: {
        user: true,
        media: true,
        quote: true,
        revisions: true,
        order: { include: { payment: true, shipment: true, items: true } },
      },
    });
    if (!request) throw new NotFoundException("Custom request not found");
    return request;
  }

  async updateStatus(id: string, status: CustomRequestStatus) {
    const request = await this.findOneAdmin(id);
    if (status === "CANCELLED") {
      return this.prisma.customRequest.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: { user: true, media: true, quote: true, order: true },
      });
    }

    const allowed = TRANSITIONS[request.status];
    if (!allowed?.includes(status)) {
      throw new BadRequestException(
        `Cannot change custom request from ${request.status} to ${status}`,
      );
    }

    return this.prisma.customRequest.update({
      where: { id },
      data: { status },
      include: { user: true, media: true, quote: true, order: true },
    });
  }

  private formatMoney(amountMinor: number | null, currency: string) {
    if (amountMinor == null) return `${currency} 0`;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amountMinor / 100);
  }
}
