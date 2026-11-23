import { NotFoundException, StreamableFile } from '@nestjs/common';
import { Readable } from 'node:stream';

import { CustomBuildFilesController } from './custom-build.files.controller';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

describe('CustomBuildFilesController admin file access', () => {
  const requestId = 'request-1';
  const fileId = 'file-1';
  const prisma = {
    customRequestMedia: {
      findFirst: jest.fn(),
    },
  };
  const storage = {
    openReadStream: jest.fn(),
  };
  const controller = new CustomBuildFilesController(prisma as any, storage as any, {} as any);
  const reply = { header: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.customRequestMedia.findFirst.mockResolvedValue({
      id: fileId,
      originalName: 'Reference photo.PNG',
      mimeType: 'image/png',
      storageKey: 'custom-requests/request-1/example.png',
    });
    storage.openReadStream.mockResolvedValue({
      stream: Readable.from(Buffer.from('image data')),
      size: 10,
    });
  });

  it('requires both authentication and an admin role', () => {
    const guards = Reflect.getMetadata('__guards__', controller.readAdminFile);
    expect(guards).toContain(AuthGuard);
    expect(guards).toContain(AdminGuard);
  });

  it('scopes file lookup to the chosen customer request', async () => {
    const result = await controller.readAdminFile(requestId, fileId, undefined, reply as any);
    expect(result).toBeInstanceOf(StreamableFile);
    expect(prisma.customRequestMedia.findFirst).toHaveBeenCalledWith({
      where: { id: fileId, customRequestId: requestId },
      select: { id: true, originalName: true, mimeType: true, storageKey: true },
    });
    expect(result.getHeaders()).toEqual(expect.objectContaining({
      type: 'image/png',
      disposition: expect.stringContaining('inline;'),
    }));
  });

  it('forces a download even for images when requested', async () => {
    const result = await controller.readAdminFile(requestId, fileId, '1', reply as any);
    expect(result.getHeaders()).toEqual(expect.objectContaining({
      type: 'application/octet-stream',
      disposition: expect.stringContaining('attachment;'),
    }));
  });

  it('downloads 3D models instead of rendering untrusted content inline', async () => {
    prisma.customRequestMedia.findFirst.mockResolvedValueOnce({
      id: fileId, originalName: 'figure.3mf', mimeType: 'application/octet-stream',
      storageKey: 'custom-requests/request-1/figure.3mf',
    });
    const result = await controller.readAdminFile(requestId, fileId, undefined, reply as any);
    expect(result.getHeaders()).toEqual(expect.objectContaining({
      type: 'application/octet-stream',
      disposition: expect.stringContaining('attachment;'),
    }));
  });

  it('does not read storage for a missing or unrelated reference', async () => {
    prisma.customRequestMedia.findFirst.mockResolvedValueOnce(null);
    await expect(controller.readAdminFile(requestId, fileId, undefined, reply as any))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(storage.openReadStream).not.toHaveBeenCalled();
  });
});
