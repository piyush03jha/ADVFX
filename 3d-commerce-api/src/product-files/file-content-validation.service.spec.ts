import { BadRequestException } from "@nestjs/common";
import { ProductFileFormat } from "@prisma/client";
import sharp from "sharp";

import { FileContentValidationService } from "./file-content-validation.service";

describe("FileContentValidationService", () => {
  const service = new FileContentValidationService();

  it("accepts a valid WEBP regardless of MIME metadata", async () => {
    const buffer = await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .webp()
      .toBuffer();

    await expect(
      service.validate(ProductFileFormat.WEBP, buffer),
    ).resolves.toBeUndefined();
  });

  it("rejects a PNG renamed to WEBP", async () => {
    const buffer = await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    await expect(
      service.validate(ProductFileFormat.WEBP, buffer),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects an invalid GLB", async () => {
    await expect(
      service.validate(
        ProductFileFormat.GLB,
        Buffer.from("not-a-glb"),
      ),
    ).rejects.toThrow("Invalid GLB");
  });

  it("accepts a valid glTF JSON document", async () => {
    const buffer = Buffer.from(
      JSON.stringify({
        asset: { version: "2.0" },
        scenes: [{ nodes: [] }],
        scene: 0,
      }),
    );

    await expect(
      service.validate(ProductFileFormat.GLTF, buffer),
    ).resolves.toBeUndefined();
  });

  it("rejects malformed glTF JSON", async () => {
    await expect(
      service.validate(
        ProductFileFormat.GLTF,
        Buffer.from("{broken-json"),
      ),
    ).rejects.toThrow("Invalid glTF");
  });
});
