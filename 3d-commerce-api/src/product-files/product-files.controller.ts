import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  NotFoundException,
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
   * BUNDLE DETAILS
   * ============================================================
   */

  @Get("bundles/:bundleId")
  findBundle(
    @Param("productId") productId: string,
    @Param("bundleId") bundleId: string,
  ) {
    return this.productFilesService.findBundle(
      productId,
      bundleId,
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

    const absolutePath =
      this.storage.getAbsolutePath(
        file.storageKey,
      );

    try {
      const {
        createReadStream,
      } = await import(
        "node:fs"
      );

      const stream =
        createReadStream(
          absolutePath,
        );

      stream.once(
        "error",
        () => {
          // Missing-file errors occurring
          // after stream creation are handled
          // by the HTTP stream lifecycle.
        },
      );

      const safeName =
        file.originalName.replace(
          /[\\/\r\n"']/g,
          "_",
        );

      return new StreamableFile(
        stream,
        {
          type:
            file.mimeType ??
            "application/octet-stream",

          disposition:
            `inline; filename="${encodeURIComponent(
              safeName,
            )}"`,
        },
      );
    } catch {
      throw new NotFoundException(
        "Stored file could not be found",
      );
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

  /**
   * ============================================================
   * DELETE BUNDLE
   * ============================================================
   */

  @Delete("bundles/:bundleId")
  deleteBundle(
    @Param("productId") productId: string,
    @Param("bundleId") bundleId: string,
  ) {
    return this.productFilesService.deleteBundle(
      productId,
      bundleId,
    );
  }
}