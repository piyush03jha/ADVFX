import {
  Controller,
  Get,
  NotFoundException,
  Req,
  Res,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname } from "node:path";

import { StorageService } from "./storage.service";

@Controller("storage")
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Get("*")
  async getFile(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    if ((process.env.STORAGE_PROVIDER ?? "local").toLowerCase() !== "local") {
      throw new NotFoundException("Local storage is not available");
    }

    const params = request.params as Record<string, string | undefined>;
    const storageKey = params["*"] ?? params["0"] ?? "";
    const normalizedKey = decodeURIComponent(storageKey).replace(/^\/+/, "");

    if (!normalizedKey) {
      throw new NotFoundException("File not found");
    }

    const filePath = this.storage.getAbsolutePath(normalizedKey);

    let fileStat;
    try {
      fileStat = await stat(filePath);
    } catch {
      throw new NotFoundException("File not found");
    }

    if (!fileStat.isFile()) {
      throw new NotFoundException("File not found");
    }

    reply.header("Content-Type", this.getContentType(extname(filePath)));
    reply.header("Content-Length", fileStat.size);
    reply.header("Cache-Control", "public, max-age=31536000, immutable");

    return reply.send(createReadStream(filePath));
  }

  private getContentType(extension: string): string {
    const types: Record<string, string> = {
      ".glb": "model/gltf-binary",
      ".gltf": "model/gltf+json",
      ".bin": "application/octet-stream",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".obj": "text/plain",
      ".mtl": "text/plain",
    };

    return types[extension.toLowerCase()] ?? "application/octet-stream";
  }
}
