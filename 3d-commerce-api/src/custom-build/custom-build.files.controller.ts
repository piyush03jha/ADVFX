import {
  BadRequestException,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CustomerAuthGuard } from '../auth/guards/customer-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { FileContentValidationService } from '../product-files/file-content-validation.service';
import { ProductFileFormat } from '@prisma/client';
import { StorageService } from '../storage/storage.service';

const REFERENCE_MIME_TYPES = new Set(['image/jpeg', 'image/png']);
const MAX_REFERENCE_FILES = 5;
const MAX_REFERENCE_FILE_SIZE = 15 * 1024 * 1024;
const MAX_REFERENCE_TOTAL_SIZE = 50 * 1024 * 1024;

@Controller('custom-requests/:requestId/files')
export class CustomBuildFilesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly contentValidator: FileContentValidationService,
  ) {}

  @UseGuards(CustomerAuthGuard)
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

    const referenceCount = await this.prisma.customRequestMedia.count({
      where: { customRequestId: requestId },
    });
    if (referenceCount >= MAX_REFERENCE_FILES) {
      throw new BadRequestException(
        `A custom request can contain at most ${MAX_REFERENCE_FILES} reference images.`,
      );
    }

    const uploaded = await this.readMultipart(req, MAX_REFERENCE_FILE_SIZE);
    if (!REFERENCE_MIME_TYPES.has(uploaded.mimetype)) {
      throw new BadRequestException('Only JPG and PNG references are supported');
    }

    const extension = uploaded.filename.toLowerCase().match(/\\.([a-z0-9]+)$/)?.[1];
    const format =
      extension === 'png'
        ? ProductFileFormat.PNG
        : extension === 'jpg' || extension === 'jpeg'
          ? ProductFileFormat.JPEG
          : null;
    if (!format) {
      throw new BadRequestException(
        'Reference filename must end in .jpg, .jpeg, or .png',
      );
    }

    const existingMedia = await this.prisma.customRequestMedia.findMany({
      where: { customRequestId: requestId },
      select: { fileSize: true },
    });
    const existingTotal = existingMedia.reduce(
      (total, media) => total + Number(media.fileSize),
      0,
    );

    if (existingTotal + uploaded.buffer.length > MAX_REFERENCE_TOTAL_SIZE) {
      throw new BadRequestException(
        `Reference images for a custom request cannot exceed ${MAX_REFERENCE_TOTAL_SIZE / (1024 * 1024)} MB in total.`,
      );
    }

    await this.contentValidator.validate(format, uploaded.buffer);

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
        data: { referenceFileCount: { increment: 1 } },
      });

      return this.serialize(media);
    } catch (error) {
      await this.storage.delete(stored.storageKey);
      throw error;
    }
  }

  private async readMultipart(req: FastifyRequest, maxSize: number) {
    const multipart = (req as FastifyRequest & { file?: () => Promise<any> }).file;
    if (typeof multipart !== 'function') {
      throw new BadRequestException('Multipart upload support is not available');
    }

    const uploaded = await multipart();
    if (!uploaded) throw new BadRequestException('File is required');
    if (uploaded.fieldname !== 'file') {
      throw new BadRequestException('Multipart field must be named file');
    }

    const buffer = await uploaded.toBuffer();
    if (!buffer.length) throw new BadRequestException('Uploaded file is empty');
    if (buffer.length > maxSize) {
      throw new BadRequestException(
        `File exceeds the ${Math.round(maxSize / (1024 * 1024))} MB limit`,
      );
    }

    return {
      filename: uploaded.filename as string,
      mimetype: (uploaded.mimetype as string).split(';', 1)[0].trim().toLowerCase(),
      buffer: buffer as Buffer,
    };
  }

  private serialize<T extends { fileSize: bigint }>(file: T) {
    return { ...file, fileSize: Number(file.fileSize) };
  }
}
