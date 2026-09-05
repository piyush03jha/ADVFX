import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomRequestStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCustomRequestDto } from './dto/create-custom-request.dto';

const TRANSITIONS: Record<CustomRequestStatus, CustomRequestStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['IN_PRODUCTION', 'REVISION_REQUESTED'],
  IN_PRODUCTION: ['PREVIEW_READY'],
  PREVIEW_READY: ['CUSTOMER_REVIEW'],
  CUSTOMER_REVIEW: ['REVISION_REQUESTED', 'APPROVED'],
  REVISION_REQUESTED: ['IN_PRODUCTION'],
  APPROVED: ['ORDERABLE'],
  ORDERABLE: [],
  CANCELLED: [],
};

@Injectable()
export class CustomBuildService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateCustomRequestDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');

    const request = await this.prisma.customRequest.create({
      data: {
        userId,
        title: dto.title.trim(),
        requirements: dto.requirements.trim(),
        dimensions: dto.dimensions?.trim() || null,
        preferredMaterial: dto.preferredMaterial?.trim() || null,
        preferredScale: dto.preferredScale?.trim() || null,
        notes: dto.notes?.trim() || null,
        referenceFileCount: dto.referenceFileCount ?? 0,
        status: 'SUBMITTED',
      },
      include: { media: true, preview: true, quote: true },
    });

    await this.notifications.create(userId, {
      type: NotificationType.CUSTOM_REQUEST_SUBMITTED,
      title: 'Custom build request submitted',
      message: `Your custom build request “${request.title}” has been received.`,
      entityType: 'CUSTOM_REQUEST',
      entityId: request.id,
    });

    return request;
  }

  async mine(userId: string) {
    return this.prisma.customRequest.findMany({
      where: { userId },
      include: { media: true, preview: { include: { productFile: true } }, quote: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async mineOne(userId: string, id: string) {
    const request = await this.prisma.customRequest.findFirst({
      where: { id, userId },
      include: {
        media: true,
        preview: { include: { productFile: true } },
        quote: true,
        revisions: true,
        previewProduct: { include: { files: true, media: true, prices: true } },
      },
    });
    if (!request) throw new NotFoundException('Custom request not found');
    return request;
  }

  async findAllAdmin(status?: CustomRequestStatus) {
    return this.prisma.customRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        user: true,
        media: true,
        preview: { include: { productFile: true } },
        quote: true,
        revisions: true,
        previewProduct: { include: { files: true, media: true, prices: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneAdmin(id: string) {
    const request = await this.prisma.customRequest.findUnique({
      where: { id },
      include: {
        user: true,
        media: true,
        preview: { include: { productFile: true } },
        quote: true,
        revisions: true,
        previewProduct: { include: { files: true, media: true, prices: true } },
      },
    });
    if (!request) throw new NotFoundException('Custom request not found');
    return request;
  }

  async updateStatus(id: string, status: CustomRequestStatus) {
    const request = await this.findOneAdmin(id);
    const allowed = TRANSITIONS[request.status];
    if (status === 'CANCELLED') {
      const updated = await this.prisma.customRequest.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: { user: true, media: true, preview: { include: { productFile: true } }, quote: true, revisions: true, previewProduct: true },
      });
      if (updated.userId) {
        await this.notifications.create(updated.userId, {
          type: NotificationType.CUSTOM_REVISION_REQUESTED,
          title: 'Custom build cancelled',
          message: `Your custom build request “${updated.title}” was cancelled.`,
          entityType: 'CUSTOM_REQUEST',
          entityId: updated.id,
        });
      }
      return updated;
    }
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot change custom request from ${request.status} to ${status}`);
    }
    const updated = await this.prisma.customRequest.update({
      where: { id },
      data: { status },
      include: {
        user: true,
        media: true,
        preview: { include: { productFile: true } },
        quote: true,
        revisions: true,
        previewProduct: true,
      },
    });

    const event = this.statusNotification(status);
    if (event) {
      await this.notifications.create(updated.userId, {
        type: event.type,
        title: event.title,
        message: `${event.messagePrefix} “${updated.title}”.`,
        entityType: 'CUSTOM_REQUEST',
        entityId: updated.id,
      });
    }
    return updated;
  }

  async upsertPreview(id: string, url: string) {
    if (!url.trim()) throw new BadRequestException('Preview URL is required');
    const request = await this.findOneAdmin(id);
    const preview = await this.prisma.customRequestPreview.upsert({
      where: { customRequestId: id },
      create: { customRequestId: id, url: url.trim(), status: 'READY' },
      update: { url: url.trim(), status: 'READY' },
    });
    await this.prisma.customRequest.update({ where: { id }, data: { status: 'CUSTOMER_REVIEW' } });
    await this.notifications.create(request.userId, {
      type: NotificationType.CUSTOM_PREVIEW_READY,
      title: 'Your 3D preview is ready',
      message: `Your custom 3D model preview for “${request.title}” is ready to review.`,
      entityType: 'CUSTOM_REQUEST',
      entityId: id,
    });
    return preview;
  }

  async linkProcessedPreview(customRequestId: string, productFileId: string) {
    const request = await this.findOneAdmin(customRequestId);
    const file = await this.prisma.productFile.findUnique({
      where: { id: productFileId },
      select: { id: true, storageUrl: true, processingStatus: true, format: true },
    });
    if (!file) throw new NotFoundException('Preview file not found');
    if (file.processingStatus !== 'COMPLETED') throw new BadRequestException('Preview file is not processed yet');
    if (!file.storageUrl) throw new BadRequestException('Processed preview file has no storage URL');

    const preview = await this.prisma.customRequestPreview.upsert({
      where: { customRequestId },
      create: { customRequestId, productFileId: file.id, url: file.storageUrl, status: 'READY' },
      update: { productFileId: file.id, url: file.storageUrl, status: 'READY' },
    });

    await this.prisma.customRequest.update({ where: { id: customRequestId }, data: { status: 'CUSTOMER_REVIEW' } });
    await this.notifications.create(request.userId, {
      type: NotificationType.CUSTOM_PREVIEW_READY,
      title: 'Your 3D preview is ready',
      message: `Your processed custom 3D model preview for “${request.title}” is ready to review.`,
      entityType: 'CUSTOM_REQUEST',
      entityId: customRequestId,
    });
    return preview;
  }

  async approve(userId: string, id: string) {
    const request = await this.mineOne(userId, id);
    if (!['CUSTOMER_REVIEW', 'PREVIEW_READY'].includes(request.status)) throw new BadRequestException('Custom model is not ready for approval');
    if (!request.preview?.url) throw new BadRequestException('A 3D preview is required before approval');

    await this.prisma.customRequest.update({ where: { id }, data: { status: 'APPROVED' } });
    await this.notifications.create(userId, {
      type: NotificationType.CUSTOM_APPROVED,
      title: 'Custom model approved',
      message: `Your custom model “${request.title}” has been approved.`,
      entityType: 'CUSTOM_REQUEST',
      entityId: id,
    });
    await this.makeOrderable(id);
    return this.mineOne(userId, id);
  }

  async addToCart(userId: string, id: string) {
    const request = await this.mineOne(userId, id);
    if (request.status !== 'ORDERABLE' || !request.previewProductId) throw new BadRequestException('This custom build is not orderable yet');
    return this.cartService.addItem(userId, request.previewProductId, 1);
  }

  async requestRevision(userId: string, id: string, note?: string) {
    const request = await this.mineOne(userId, id);
    if (!['CUSTOMER_REVIEW', 'PREVIEW_READY'].includes(request.status)) throw new BadRequestException('Custom model is not ready for revision');

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.customRequest.update({
        where: { id },
        data: { status: 'REVISION_REQUESTED', revisionCount: { increment: 1 } },
        include: { media: true, preview: true, quote: true },
      });
      if (note?.trim()) {
        await tx.customRequestRevision.create({ data: { customRequestId: id, requestedById: userId, note: note.trim() } });
      }
      return result;
    });

    await this.notifications.create(userId, {
      type: NotificationType.CUSTOM_REVISION_REQUESTED,
      title: 'Revision requested',
      message: `Your revision request for “${request.title}” has been recorded.`,
      entityType: 'CUSTOM_REQUEST',
      entityId: id,
    });
    return updated;
  }

  async ensurePreviewProduct(id: string) {
    const request = await this.prisma.customRequest.findUnique({ where: { id }, select: { previewProductId: true } });
    if (request?.previewProductId) return request.previewProductId;

    const product = await this.prisma.product.create({
      data: {
        name: `Custom preview ${id}`,
        slug: `custom-preview-${id}`,
        status: 'DRAFT',
        inventory: { create: { stock: 0, trackStock: false } },
      },
      select: { id: true },
    });

    await this.prisma.customRequest.update({ where: { id }, data: { previewProductId: product.id } });
    return product.id;
  }

  private async makeOrderable(id: string) {
    const request = await this.prisma.customRequest.findUnique({ where: { id }, include: { preview: true, quote: true } });
    if (!request || request.status !== 'APPROVED' || !request.preview || !request.quote) { return; }

    const preview = request.preview;
    const quote = request.quote;
    const previewProductId = request.previewProductId ?? await this.ensurePreviewProduct(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: previewProductId },
        data: {
          name: request.title,
          description: request.requirements,
          status: 'ACTIVE',
          material: request.preferredMaterial,
          scale: request.preferredScale,
          dimensions: request.dimensions,
        },
      });
      await tx.productPrice.updateMany({ where: { productId: previewProductId, isActive: true }, data: { isActive: false } });
      await tx.productPrice.create({ data: { productId: previewProductId, currency: quote.currency, amountMinor: quote.amountMinor, isActive: true } });
      await tx.productMedia.updateMany({ where: { productId: previewProductId, type: 'MODEL_PREVIEW', isPrimary: true }, data: { isPrimary: false } });
      await tx.productMedia.create({ data: { productId: previewProductId, type: 'MODEL_PREVIEW', url: preview.url, isPrimary: true, sortOrder: 0 } });
      await tx.customRequest.update({ where: { id }, data: { status: 'ORDERABLE', previewProductId } });
    });

    await this.notifications.create(request.userId, {
      type: NotificationType.CUSTOM_ORDERABLE,
      title: 'Your custom product is ready to order',
      message: `Your approved custom product “${request.title}” is now ready to order.`,
      entityType: 'CUSTOM_REQUEST',
      entityId: id,
    });
  }

  private statusNotification(status: CustomRequestStatus) {
    const events: Partial<Record<CustomRequestStatus, { type: NotificationType; title: string; messagePrefix: string }>> = {
      UNDER_REVIEW: { type: NotificationType.CUSTOM_REQUEST_SUBMITTED, title: 'Custom build is under review', messagePrefix: 'We are reviewing your custom build' },
      IN_PRODUCTION: { type: NotificationType.CUSTOM_REQUEST_SUBMITTED, title: 'Custom build is in production', messagePrefix: 'Your custom build is now in production' },
    };
    return events[status];
  }
}
