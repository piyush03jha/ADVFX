import { BadRequestException } from '@nestjs/common';
import { CustomBuildFilesController } from './custom-build.files.controller';

describe('CustomBuildFilesController', () => {
  const requestId = 'custom-request-1';
  const prisma = {
    $transaction: jest.fn(),
    customRequest: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    customRequestMedia: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };
  const storage = {
    saveCustomRequestFile: jest.fn(),
    delete: jest.fn(),
  };
  const contentValidator = { validate: jest.fn() };

  let controller: CustomBuildFilesController;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) =>
      callback(prisma));
    prisma.customRequest.findFirst.mockResolvedValue({ id: requestId });
    prisma.customRequestMedia.findMany.mockResolvedValue([]);
    prisma.customRequest.update.mockResolvedValue({ id: requestId, referenceFileCount: 1 });
    prisma.customRequestMedia.create.mockImplementation(async ({ data }: { data: any }) => ({
      id: 'media-1',
      ...data,
    }));
    storage.saveCustomRequestFile.mockResolvedValue({
      storageKey: `custom-requests/${requestId}/reference.png`,
      storageUrl: `/storage/custom-requests/${requestId}/reference.png`,
    });
    storage.delete.mockResolvedValue(undefined);
    contentValidator.validate.mockResolvedValue(undefined);
    controller = new CustomBuildFilesController(
      prisma as any,
      storage as any,
      contentValidator as any,
    );
  });

  function fileRequest(filename: string, mimetype: string, bytes = Buffer.from('test-file')) {
    const upload = {
      fieldname: 'file',
      filename,
      mimetype,
      toBuffer: jest.fn().mockResolvedValue(bytes),
    };
    const req = {
      user: { id: 'customer-1' },
      upload,
      // file() must be called on the Fastify request instance; detaching it
      // throws, reproducing the production HTTP 500 regression.
      file: jest.fn(function (this: { upload: typeof upload }) {
        if (!this?.upload) throw new TypeError('multipart file() lost request context');
        return Promise.resolve(this.upload);
      }),
    };
    return req;
  }

  it('reads PNG reference via the request-bound multipart method', async () => {
    const req = fileRequest('portrait.png', 'image/png', Buffer.from('image bytes'));
    const response = await controller.uploadReference(req as any, requestId);

    expect(req.file).toHaveBeenCalledTimes(1);
    expect(contentValidator.validate).toHaveBeenCalledTimes(1);
    expect(storage.saveCustomRequestFile).toHaveBeenCalledWith(
      requestId, 'portrait.png', Buffer.from('image bytes'),
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.customRequest.update).toHaveBeenCalledWith({
      where: { id: requestId },
      data: { referenceFileCount: { increment: 1 } },
    });
    expect(response.fileSize).toBe(Buffer.byteLength('image bytes'));
  });

  it('accepts a 3MF model with an octet-stream MIME type', async () => {
    const req = fileRequest('figure.3mf', 'application/octet-stream');
    await expect(controller.uploadReference(req as any, requestId))
      .resolves.toMatchObject({ originalName: 'figure.3mf' });
    expect(contentValidator.validate).not.toHaveBeenCalled();
  });

  it('rejects an invalid multipart field instead of storing a file', async () => {
    const req = fileRequest('portrait.png', 'image/png');
    req.upload.fieldname = 'other';
    await expect(controller.uploadReference(req as any, requestId))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(storage.saveCustomRequestFile).not.toHaveBeenCalled();
  });

  it('removes an uploaded object if the media DB transaction fails', async () => {
    const req = fileRequest('portrait.png', 'image/png');
    prisma.$transaction.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(controller.uploadReference(req as any, requestId))
      .rejects.toThrow('Database unavailable');
    expect(storage.delete).toHaveBeenCalledWith(
      `custom-requests/${requestId}/reference.png`,
    );
  });
});
