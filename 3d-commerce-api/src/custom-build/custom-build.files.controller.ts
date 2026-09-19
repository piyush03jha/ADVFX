import {
  BadRequestException,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CustomerAuthGuard } from '../auth/guards/customer-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const REFERENCE_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

const CUSTOM_PREVIEW_EXTENSIONS: Record<string, ProductFileFormat> = {
  '.glb': ProductFileFormat.GLB,
  '.gltf': ProductFileFormat.GLTF,
};

@Controller('custom-requests/:requestId/files')
export class CustomBuildFilesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
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
