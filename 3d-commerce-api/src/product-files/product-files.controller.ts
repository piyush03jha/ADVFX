import {
  BadGatewayException,
  BadRequestException,
  Controller,
  HttpException,
  Logger,
  Delete,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";

import type {
  FastifyReply,
  FastifyRequest,
} from "fastify";

import { AuthGuard } from "../auth/guards/auth.guard";
import { AdminGuard } from "../auth/guards/admin.guard";
import { StorageService } from "../storage/storage.service";
import { ProductFilesService } from "./product-files.service";

interface MultipartUploadedFile {
  filename: string;
  mimetype: string;
  toBuffer: () => Promise<Buffer>;
}

interface MultipartPart {
  type: "file" | "field";
  fieldname: string;
  filename?: string;
  mimetype?: string;
  value?: string;
  toBuffer?: () => Promise<Buffer>;
}

@UseGuards(AuthGuard, AdminGuard)
@Controller("products/:productId/files")
export class ProductFilesController {
  private readonly logger = new Logger(ProductFilesController.name);

  constructor(
    private readonly productFilesService: ProductFilesService,
    private readonly storage: StorageService,
  ) {}

  /**
   * ============================================================
   * SINGLE FILE UPLOAD
   * ============================================================
   */

  @Post()
  async upload(
    @Param("productId") productId: string,
    @Res() reply: FastifyReply,
  ) {
    const request =
      reply.request as FastifyRequest & {
        file?: () => Promise<
          MultipartUploadedFile | undefined
        >;
      };

    if (
      typeof request.file !==
      "function"
    ) {
      throw new BadRequestException(
        "Multipart upload support is not available",
      );
    }

    const uploadedFile =
      await request.file();

    if (!uploadedFile) {
      throw new BadRequestException(
        "File is required",
      );
    }

    const buffer =
      await uploadedFile.toBuffer();

    const file = {
      originalname:
        uploadedFile.filename,
      mimetype:
        uploadedFile.mimetype,
      size:
        buffer.length,
      buffer,
    };

    return reply.send(
      await this.productFilesService.upload(
        productId,
        file,
      ),
    );
  }

  /**
   * ============================================================
   * FILE LIST
   * ============================================================
   */

  @Get()
  findAll(
    @Param("productId") productId: string,
  ) {
    return this.productFilesService.findAll(
      productId,
    );
  }

  /**
   * ============================================================
   * FILE
   * ============================================================
   */

  @Get(":fileId")
  findOne(
    @Param("productId") productId: string,
    @Param("fileId") fileId: string,
  ) {
    return this.productFilesService.findOne(
      productId,
      fileId,
    );
  }

  /**
   * ============================================================
   * DOWNLOAD / PREVIEW
   * ============================================================
   */

  @Get(":fileId/download")
  async preview(
    @Param("productId") productId: string,
    @Param("fileId") fileId: string,
  ) {
    const file =
      await this.productFilesService.findOne(
        productId,
        fileId,
      );

    try {
      const stream = await this.storage.createReadStream(file.storageKey);
      const safeName = file.originalName.replace(
        /[\\/\r\n"']/g,
        "_",
      );

      return new StreamableFile(stream, {
        type:
          file.mimeType ??
          this.storage.getContentTypeForStorageKey(file.storageKey),
        disposition:
          `attachment; filename="${encodeURIComponent(safeName)}"`,
      });
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() < 500) {
        throw error;
      }

      this.logger.error(
        `Storage read failed for product file ${file.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadGatewayException("Storage is unavailable");
    }
  }

  /**
   * ============================================================
   * DELETE FILE
   * ============================================================
   */

  @Delete(":fileId")
  delete(
    @Param("productId") productId: string,
    @Param("fileId") fileId: string,
  ) {
    return this.productFilesService.delete(
      productId,
      fileId,
    );
  }


}