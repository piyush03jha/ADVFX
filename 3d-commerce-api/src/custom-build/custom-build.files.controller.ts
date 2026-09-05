import {
  BadRequestException,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import {
  ProductFileFormat,
  ProductFileType,
  ProcessingStatus,
} from '@prisma/client';
import { extname } from 'node:path';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ProcessingJobsService } from '../processing-jobs/processing-jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const REFERENCE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const CUSTOM_PREVIEW_EXTENSIONS: Record<string, ProductFileFormat> = {
  '.glb': ProductFileFormat.GLB,
  '.gltf': ProductFileFormat.GLTF,
};

@UseGuards(AuthGuard)
@Controller('custom-requests/:requestId/files')
export class CustomBuildFilesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly processingJobs: ProcessingJobsService,
  ) {}

  @Post()
  async uploadReference(
    @Req() req: FastifyRequest,
    @Param('requestId') requestId: string,
  ) {
    const user = (req as FastifyRequest & { user?: { id: string } }).user;
    if (!user) throw new BadRequestException('Authentication is required');

    const request = await this.prisma.customRequest.findFirst({
      where: { id: requestId, userId: user.id },
      select: { id: true },
    });
    if (!request) throw new BadRequestException('Custom request not found');

    const uploaded = await this.readMultipart(req, 50 * 1024 * 1024);
    if (!REFERENCE_MIME_TYPES.has(uploaded.mimetype)) {
      throw new BadRequestException(
        'Only JPG, PNG, WEBP and PDF references are supported',
      );
    }

    const stored = await this.storage.saveCustomRequestFile(
      requestId,
      uploaded.filename,
      uploaded.buffer,
    );

    try {
      const media = await this.prisma.customRequestMedia.create({
        data: {
          customRequestId: requestId,
          originalName: uploaded.filename,
          storageKey: stored.storageKey,
          storageUrl: stored.storageUrl,
          mimeType: uploaded.mimetype,
          fileSize: BigInt(uploaded.buffer.length),
        },
      });

      await this.prisma.customRequest.update({
        where: { id: requestId },
        data: {
          referenceFileCount: { increment: 1 },
        },
      });

      return this.serialize(media);
    } catch (error) {
      await this.storage.delete(stored.storageKey);
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Post('/preview')
  async uploadPreview(
    @Req() req: FastifyRequest,
    @Param('requestId') requestId: string,
  ) {
    const customRequest = await this.prisma.customRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true, previewProductId: true },
    });

    if (!customRequest) {
      throw new BadRequestException('Custom request not found');
    }

    if (
      ![
        'IN_PRODUCTION',
        'REVISION_REQUESTED',
        'PREVIEW_READY',
        'CUSTOMER_REVIEW',
      ].includes(customRequest.status)
    ) {
      throw new BadRequestException(
        'Custom request is not in a preview-production stage',
      );
    }

    const uploaded = await this.readMultipart(req, 512 * 1024 * 1024);
    const extension = extname(uploaded.filename).toLowerCase();
    const format = CUSTOM_PREVIEW_EXTENSIONS[extension];

    if (
      !format ||
      ![
        'model/gltf-binary',
        'model/gltf+json',
        'application/octet-stream',
        'application/json',
      ].includes(uploaded.mimetype)
    ) {
      throw new BadRequestException('Custom previews must be GLB or GLTF files');
    }

    const productId = await this.ensurePreviewProduct(requestId);
    const stored = await this.storage.saveCustomRequestFile(
      requestId,
      uploaded.filename,
      uploaded.buffer,
    );

    try {
      const file = await this.prisma.productFile.create({
        data: {
          productId,
          originalName: uploaded.filename,
          storageKey: stored.storageKey,
          storageUrl: stored.storageUrl,
          format,
          fileType: ProductFileType.MODEL,
          mimeType: uploaded.mimetype,
          fileSize: BigInt(uploaded.buffer.length),
          processingStatus: ProcessingStatus.PENDING,
        },
      });

      await this.processingJobs.create(file.id);

      const preview = await this.prisma.customRequestPreview.upsert({
        where: { customRequestId: requestId },
        create: {
          customRequestId: requestId,
          url: stored.storageUrl,
          status: 'PROCESSING',
        },
        update: {
          url: stored.storageUrl,
          status: 'PROCESSING',
        },
      });

      await this.prisma.customRequest.update({
        where: { id: requestId },
        data: { status: 'PREVIEW_READY' },
      });

      return {
        file: this.serialize(file),
        preview,
        status: 'PROCESSING',
      };
    } catch (error) {
      await this.storage.delete(stored.storageKey);
      throw error;
    }
  }

  private async ensurePreviewProduct(requestId: string): Promise<string> {
    const request = await this.prisma.customRequest.findUnique({
      where: { id: requestId },
      select: { previewProductId: true },
    });

    if (request?.previewProductId) return request.previewProductId;

    const product = await this.prisma.product.create({
      data: {
        name: `Custom preview ${requestId}`,
        slug: `custom-preview-${requestId}`,
        status: 'DRAFT',
        inventory: { create: { stock: 0, trackStock: false } },
      },
      select: { id: true },
    });

    await this.prisma.customRequest.update({
      where: { id: requestId },
      data: { previewProductId: product.id },
    });

    return product.id;
  }

  private async readMultipart(req: FastifyRequest, maxSize: number) {
    const multipart = (req as FastifyRequest & { file?: () => Promise<any> }).file;
    if (typeof multipart !== 'function') {
      throw new BadRequestException('Multipart upload support is not available');
    }

    const uploaded = await multipart();
    if (!uploaded) throw new BadRequestException('File is required');

    const buffer = await uploaded.toBuffer();
    if (!buffer.length) throw new BadRequestException('Uploaded file is empty');
    if (buffer.length > maxSize) {
      throw new BadRequestException(
        `File exceeds the ${Math.round(maxSize / (1024 * 1024))} MB limit`,
      );
    }

    return {
      filename: uploaded.filename as string,
      mimetype: uploaded.mimetype as string,
      buffer: buffer as Buffer,
    };
  }

  private serialize<T extends { fileSize: bigint }>(file: T) {
    return { ...file, fileSize: Number(file.fileSize) };
  }
}
