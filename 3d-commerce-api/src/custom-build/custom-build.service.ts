import { CreateCustomBuildOptionDto, UpdateCustomBuildCategoryDto, UpdateCustomBuildOptionDto } from "./custom-build.config.dto";
import {
  BadRequestException,
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

const CATEGORY_BASE: Record<string, number> = {
  person: 0,
  pet: 2999,
  object: 2799,
  vehicle: 3299,
  character: 2999,
  other: 2499,
};

const BODY_BASE: Record<string, number> = {
  half: 2499,
  full: 3499,
};

const HEAD_ADD: Record<string, number> = {
  stationary: 0,
};

const SUBJECT_ADD: Record<string, number> = {
  single: 0,
  couple: 1800,
  pet: 1200,
  group: 3200,
};

const SIZE_MULTIPLIER: Record<number, number> = {
  8: 0.75,
  12: 0.9,
  15: 1,
  20: 1.35,
  25: 1.75,
  30: 2.15,
};

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

  calculatePrice(input: CustomPricingInput) {
    const multiplier = SIZE_MULTIPLIER[input.sizeCm];
    if (!multiplier) {
      throw new BadRequestException("Unsupported custom size");
    }

    if (input.category === "person") {
      if (!input.bodyType || !input.headType || !input.subjectType) {
        throw new BadRequestException(
          "Person custom builds require body type, head type and subject type",
        );
      }

      if (input.subjectType === "couple") {
        input.personCount = input.personCount ?? 2;
      } else if (input.subjectType === "group") {
        if ((input.personCount ?? 0) < 3) {
          throw new BadRequestException(
            "Family/group builds require at least 3 people",
          );
        }
      } else if (input.subjectType === "single") {
        input.personCount = 1;
      } else if (input.subjectType === "pet") {
        input.personCount = 1;
        input.petCount = input.petCount ?? 1;
      }

      const base =
        BODY_BASE[input.bodyType] +
        HEAD_ADD[input.headType] +
        SUBJECT_ADD[input.subjectType];

      return Math.round(base * multiplier);
    }

    if (
      (input.category === "pet" || input.category === "character") &&
      !input.headType
    ) {
      throw new BadRequestException("This category requires a head type");
    }

    return Math.round(
      (CATEGORY_BASE[input.category] +
        (input.category === "pet" || input.category === "character"
          ? HEAD_ADD[input.headType ?? "stationary"]
          : 0)) *
        multiplier,
    );
  }

  async quote(input: CustomPricingInput) {
    const calculated = await this.calculateConfiguredPrice(input);
    return { currency: calculated.currency, amountMinor: calculated.amountMinor, priceMinor: calculated.amountMinor, breakdown: calculated.breakdown };
  }

  private async calculateConfiguredPrice(input: CustomPricingInput) {
    const category = await this.prisma.customBuildCategory.findUnique({
      where: { slug: input.category },
      include: { options: { where: { isActive: true }, orderBy: [{ section: "asc" }, { sortOrder: "asc" }] } },
    });
    if (!category || !category.isActive) throw new BadRequestException("Custom category is unavailable");
    const size = await this.prisma.customBuildOption.findFirst({
      where: { categoryId: category.id, section: "size", slug: String(input.sizeCm), isActive: true },
    });
    if (!size?.multiplier) throw new BadRequestException("Unsupported custom size");
    const by = (section: string, slug?: string) => slug ? category.options.find((o) => o.section === section && o.slug === slug) : undefined;
    let baseMinor = category.basePriceMinor;
    const selected: any[] = [];
    if (category.slug === "person") {
      const body = by("body", input.bodyType), head = by("head", input.headType), frame = by("frame", input.subjectType);
      if (!body || !head || !frame) throw new BadRequestException("Person build has an invalid configuration");
      baseMinor = body.priceMinor + head.priceMinor + frame.priceMinor;
      selected.push(body, head, frame);
    } else if (input.headType) {
      const head = by("head", input.headType);
      if (!head) throw new BadRequestException("Invalid head configuration");
      baseMinor += head.priceMinor; selected.push(head);
    }
    return {
      amountMinor: Math.round(baseMinor * size.multiplier), currency: category.currency,
      breakdown: { category: category.slug, categoryName: category.name, bodyType: input.bodyType ?? null, headType: input.headType ?? null, subjectType: input.subjectType ?? null, personCount: input.personCount ?? null, petCount: input.petCount ?? null, sizeCm: input.sizeCm, multiplier: size.multiplier, selectedOptions: selected.map((o) => ({ section: o.section, slug: o.slug, name: o.name, priceMinor: o.priceMinor })) },
    };
  }

  async getPublicConfig() {
    const [categories, sizeOptions] = await Promise.all([
      this.prisma.customBuildCategory.findMany({ where: { isActive: true }, include: { options: { where: { isActive: true }, orderBy: [{ section: "asc" }, { sortOrder: "asc" }] } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      this.prisma.customBuildOption.findMany({ where: { category: { slug: "person" }, section: "size", isActive: true }, orderBy: { sortOrder: "asc" } }),
    ]);
    return { categories, sizeOptions };
  }

  async getAdminConfig() {
    return this.prisma.customBuildCategory.findMany({ include: { options: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  }

  async createConfigCategory(data: { slug: string; name: string; description?: string; basePriceMinor?: number; sortOrder?: number; isActive?: boolean }) {
    return this.prisma.customBuildCategory.create({ data: { slug: data.slug.trim().toLowerCase(), name: data.name.trim(), description: data.description?.trim() || null, basePriceMinor: data.basePriceMinor ?? 0, sortOrder: data.sortOrder ?? 0, isActive: data.isActive !== false } });
  }
  async updateConfigCategory(id: string, dto: UpdateCustomBuildCategoryDto) { return this.prisma.customBuildCategory.update({ where: { id }, data: dto }); }
  async createConfigOption(categoryId: string, dto: CreateCustomBuildOptionDto) { return this.prisma.customBuildOption.create({ data: { ...dto, categoryId, priceMinor: dto.priceMinor ?? 0, sortOrder: dto.sortOrder ?? 0, isActive: dto.isActive !== false } }); }
  async updateConfigOption(id: string, dto: UpdateCustomBuildOptionDto) { return this.prisma.customBuildOption.update({ where: { id }, data: dto }); }
  async deleteConfigOption(id: string) { return this.prisma.customBuildOption.delete({ where: { id } }); }

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

    if (request.status === "CANCELLED") {
      throw new BadRequestException("Cancelled custom requests cannot be purchased");
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
    const price = configured.amountMinor / 100;
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
        priceMinor: price * 100,
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
        amountMinor: price * 100,
      },
      update: {
        currency: "INR",
        amountMinor: price * 100,
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
