import {
  BadGatewayException,
  BadRequestException,
  Controller,
  Get,
  HttpException,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CustomerAuthGuard } from '../auth/guards/customer-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { FileContentValidationService } from '../product-files/file-content-validation.service';
import { ProductFileFormat } from '@prisma/client';
import { StorageService } from '../storage/storage.service';

const REFERENCE_MIME_TYPES = new Set(['image/jpeg', 'image/png']);
const MODEL_EXTENSIONS = new Set([
  'glb',
  'gltf',
  'obj',
  'ply',
  'stl',
  '3mf',
  'fbx',
  'bvh',
  'abc',
  'usd',
  'usda',
  'usdc',
  'usdz',
]);
const MAX_REFERENCE_FILES = 5;
const MAX_REFERENCE_FILE_SIZE = 15 * 1024 * 1024;
const MAX_REFERENCE_TOTAL_SIZE = 50 * 1024 * 1024;
const MAX_MODEL_FILES = 1;
const MAX_MODEL_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Lower-case file extension without the dot ("Model.GLB" -> "glb").
 * This was previously matched with /\\.([a-z0-9]+)$/, which looks for a literal
 * backslash and therefore returned '' for every real filename, rejecting every
 * custom-request upload.
 */
function extensionOf(filename: string): string {
  return filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';
}

@Controller('custom-requests/:requestId/files')
export class CustomBuildFilesController {
  private readonly logger = new Logger(CustomBuildFilesController.name);

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

    const uploaded = await this.readMultipart(req, MAX_MODEL_FILE_SIZE);

    const extension = extensionOf(uploaded.filename);
    const isImage = REFERENCE_MIME_TYPES.has(uploaded.mimetype);
    if (isImage && uploaded.buffer.length > MAX_REFERENCE_FILE_SIZE) {
      throw new BadRequestException(`Reference images cannot exceed ${MAX_REFERENCE_FILE_SIZE / (1024 * 1024)} MB each.`);
    }
    const isModel = MODEL_EXTENSIONS.has(extension);

    if (!isImage && !isModel) {
      throw new BadRequestException(
        'Unsupported reference file. Use JPG/PNG images or GLB, glTF, OBJ, PLY, STL, 3MF, FBX, BVH, ABC, USD, USDA, USDC, or USDZ.',
      );
    }

    const existingMedia = await this.prisma.customRequestMedia.findMany({
      where: { customRequestId: requestId },
      select: { fileSize: true, originalName: true },
    });

    if (isModel) {
      const existingModel = existingMedia.some((media) => {
        const existingExtension = extensionOf(media.originalName);
        return MODEL_EXTENSIONS.has(existingExtension);
      });

      if (existingModel) {
        throw new BadRequestException(
          `A custom request can contain at most ${MAX_MODEL_FILES} 3D reference file.`,
        );
      }

      if (uploaded.buffer.length > MAX_MODEL_FILE_SIZE) {
        throw new BadRequestException(
          `3D reference files cannot exceed ${MAX_MODEL_FILE_SIZE / (1024 * 1024)} MB.`,
        );
      }
    } else {
      const imageCount = existingMedia.filter((media) => {
        const existingExtension = extensionOf(media.originalName);
        return ['jpg', 'jpeg', 'png'].includes(existingExtension);
      }).length;

      if (imageCount >= MAX_REFERENCE_FILES) {
        throw new BadRequestException(
          `A custom request can contain at most ${MAX_REFERENCE_FILES} reference images.`,
        );
      }

      if (!REFERENCE_MIME_TYPES.has(uploaded.mimetype)) {
        throw new BadRequestException('Only JPG and PNG references are supported');
      }

      const existingImageTotal = existingMedia
        .filter((media) => {
          const existingExtension = extensionOf(media.originalName);
          return ['jpg', 'jpeg', 'png'].includes(existingExtension);
        })
        .reduce((total, media) => total + Number(media.fileSize), 0);

      if (existingImageTotal + uploaded.buffer.length > MAX_REFERENCE_TOTAL_SIZE) {
        throw new BadRequestException(
          `Reference images for a custom request cannot exceed ${MAX_REFERENCE_TOTAL_SIZE / (1024 * 1024)} MB in total.`,
        );
      }
    }

    const format =
      extension === 'png'
        ? ProductFileFormat.PNG
        : extension === 'jpg' || extension === 'jpeg'
          ? ProductFileFormat.JPEG
          : extension === 'glb'
            ? ProductFileFormat.GLB
            : extension === 'gltf'
              ? ProductFileFormat.GLTF
              : null;

    if (isImage && !format) {
      throw new BadRequestException('Reference filename must end in .jpg, .jpeg, or .png');
    }

    if (format) {
      await this.contentValidator.validate(format, uploaded.buffer);
    }

    const stored = await this.storage.saveCustomRequestFile(
      requestId,
      uploaded.filename,
      uploaded.buffer,
    );

    try {
      // The media row and its reference count must commit together.
      // Otherwise a failed count update leaves a dangling media record,
      // even if the uploaded object is later removed.
      const media = await this.prisma.$transaction(async (tx) => {
        const created = await tx.customRequestMedia.create({
          data: {
            customRequestId: requestId,
            originalName: uploaded.filename,
            storageKey: stored.storageKey,
            storageUrl: stored.storageUrl,
            mimeType: uploaded.mimetype,
            fileSize: BigInt(uploaded.buffer.length),
          },
        });

        await tx.customRequest.update({
          where: { id: requestId },
          data: { referenceFileCount: { increment: 1 } },
        });

        return created;
      });

      return this.serialize(media);
    } catch (error) {
      // Storage cleanup is best-effort; never hide the original DB exception.
      try {
        await this.storage.delete(stored.storageKey);
      } catch (cleanupError) {
        console.error("Unable to clean up failed custom upload", {
          requestId,
          cleanupError,
        });
      }
      throw error;
    }
  }

  /**
   * Private customer references must only be read by authenticated admins.
   * Use a DB-scoped media id rather than accepting an arbitrary storage key.
   * Images can be previewed in the admin; 3D files are downloaded.
   */
  @UseGuards(AuthGuard, AdminGuard)
  @Get(':fileId')
  async readAdminFile(
    @Param('requestId') requestId: string,
    @Param('fileId') fileId: string,
    @Query('download') download: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const file = await this.prisma.customRequestMedia.findFirst({
      where: { id: fileId, customRequestId: requestId },
      select: { id: true, originalName: true, mimeType: true, storageKey: true },
    });
    if (!file) throw new NotFoundException('Reference file not found');

    const extension = extensionOf(file.originalName);
    const inlineType = extension === 'jpg' || extension === 'jpeg'
      ? 'image/jpeg'
      : extension === 'png'
        ? 'image/png'
        : null;
    const isPreview = download !== '1' && inlineType !== null;
    const filename = file.originalName
      .replace(/[\\/\\\\\\r\\n"\\x00-\\x1f\\x7f]/g, '_')
      .slice(0, 160) || 'customer-reference';
    const dispositionName = encodeURIComponent(filename);

    try {
      const { stream, size } = await this.storage.openReadStream(file.storageKey);
      reply.header('Cache-Control', 'private, no-store');
      reply.header('X-Content-Type-Options', 'nosniff');
      if (typeof size === 'number' && Number.isSafeInteger(size) && size >= 0) {
        reply.header('Content-Length', size);
      }
      return new StreamableFile(stream, {
        type: isPreview ? inlineType : 'application/octet-stream',
        disposition: `${isPreview ? 'inline' : 'attachment'}; filename*=UTF-8''${dispositionName}`,
      });
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() < 500) throw error;
      this.logger.error(
        `Unable to read customer reference file ${fileId} for request ${requestId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadGatewayException('Unable to retrieve reference file from storage');
    }
  }

  private async readMultipart(req: FastifyRequest, maxSize: number) {
    // @fastify/multipart adds file() to the *request instance*. Calling a
    // detached copy of this method loses its request-bound context and can
    // throw a TypeError (HTTP 500) before any file bytes are processed.
    const multipartRequest = req as FastifyRequest & { file?: () => Promise<any> };
    if (typeof multipartRequest.file !== 'function') {
      throw new BadRequestException('Multipart upload support is not available');
    }

    const uploaded = await multipartRequest.file();
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
