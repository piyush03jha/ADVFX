import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CustomRequestStatus,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
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
  bobble: 500,
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
  SUBMITTED: ["CANCELLED"],
  UNDER_REVIEW: ["CANCELLED"],
  IN_PRODUCTION: ["CANCELLED"],
  PREVIEW_READY: ["CANCELLED"],
  CUSTOMER_REVIEW: ["CANCELLED"],
  REVISION_REQUESTED: ["CANCELLED"],
  APPROVED: ["CANCELLED"],
  ORDERABLE: [],
  CANCELLED: [],
};

@Injectable()
export class CustomBuildService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
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
    const priceMinor = this.calculatePrice(input) * 100;

    return {
      currency: "INR",
      amountMinor: priceMinor,
      priceMinor,
      breakdown: {
        category: input.category,
        bodyType: input.bodyType ?? null,
        headType: input.headType ?? null,
        subjectType: input.subjectType ?? null,
        personCount: input.personCount ?? null,
        petCount: input.petCount ?? null,
        sizeCm: input.sizeCm,
      },
    };
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

    const price = this.calculatePrice(dto);
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
