import { ThreeDConversionService } from './three-d-conversion.service';

describe('ThreeDConversionService.discardConversionIntermediates', () => {
  const prisma = { threeDConversionJob: { update: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn() } } as any;
  const storage = { delete: jest.fn(), completeMultipartUpload: jest.fn(), getObjectSize: jest.fn(), abortMultipartUpload: jest.fn() } as any;
  let service: ThreeDConversionService;
  const keep = 'products/p1/models/j1.glb';

  const discard = (job: any) => (service as any).discardConversionIntermediates(job, keep);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.threeDConversionJob.update.mockResolvedValue({});
    storage.delete.mockResolvedValue(undefined);
    service = new ThreeDConversionService(prisma, storage);
  });

  it('claims upload completion atomically and queues only after verifying stored size', async () => {
    const uploading = {
      id: 'j1', status: 'PROCESSING', stage: 'UPLOADING',
      sourceStorageKey: 'conversions/j1/source/model.obj', uploadId: 'upload-1',
      originalSize: null, convertedSize: null, outputSize: null,
    };
    const completing = { ...uploading, stage: 'COMPLETING' };
    const queued = { ...completing, status: 'QUEUED', stage: 'QUEUED', uploadId: null, originalSize: BigInt(1024) };
    prisma.threeDConversionJob.findUnique
      .mockResolvedValueOnce(uploading)
      .mockResolvedValueOnce(completing)
      .mockResolvedValueOnce(queued);
    prisma.threeDConversionJob.updateMany.mockResolvedValue({ count: 1 });
    storage.completeMultipartUpload.mockResolvedValue(undefined);
    storage.getObjectSize.mockResolvedValue(1024);

    const result = await service.complete('j1', {
      key: uploading.sourceStorageKey,
      uploadId: 'upload-1',
      size: 1024,
      parts: [{ PartNumber: 1, ETag: 'etag-1' }],
    });

    expect(prisma.threeDConversionJob.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.threeDConversionJob.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 'j1', status: 'PROCESSING', stage: 'UPLOADING', uploadId: 'upload-1' },
      data: { stage: 'COMPLETING' },
    });
    expect(result).toMatchObject({ id: 'j1', status: 'QUEUED', stage: 'QUEUED' });
  });

  it('rejects a second concurrent completion while the first completion lease is fresh', async () => {
    const completing = {
      id: 'j1', status: 'PROCESSING', stage: 'COMPLETING',
      sourceStorageKey: 'conversions/j1/source/model.obj', uploadId: 'upload-1',
      completionSize: BigInt(1024),
      completionParts: [{ PartNumber: 1, ETag: 'etag-1' }],
      updatedAt: new Date(),
      originalSize: null, convertedSize: null, outputSize: null,
    };
    prisma.threeDConversionJob.findUnique.mockResolvedValue(completing);
    prisma.threeDConversionJob.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.complete('j1', {
      key: completing.sourceStorageKey,
      uploadId: 'upload-1',
      size: 1024,
      parts: [{ PartNumber: 1, ETag: 'etag-1' }],
    })).rejects.toThrow('Conversion upload is already being finalized');

    expect(storage.completeMultipartUpload).not.toHaveBeenCalled();
  });

  it('recovers when storage completed but the database was not advanced to QUEUED', async () => {
    const completing = {
      id: 'j1', status: 'PROCESSING', stage: 'COMPLETING',
      sourceStorageKey: 'conversions/j1/source/model.obj', uploadId: 'upload-1',
      completionSize: BigInt(1024),
      completionParts: [{ PartNumber: 1, ETag: 'etag-1' }],
      updatedAt: new Date(Date.now() - 60_000),
      originalSize: null, convertedSize: null, outputSize: null,
    };
    const queued = { ...completing, status: 'QUEUED', stage: 'QUEUED', uploadId: null, originalSize: BigInt(1024) };
    prisma.threeDConversionJob.findUnique
      .mockResolvedValueOnce(completing)
      .mockResolvedValueOnce(completing)
      .mockResolvedValueOnce(queued);
    prisma.threeDConversionJob.updateMany.mockResolvedValue({ count: 1 });
    storage.completeMultipartUpload.mockRejectedValue(new Error('NoSuchUpload'));
    storage.getObjectSize.mockResolvedValue(1024);

    await expect(service.complete('j1', {
      key: completing.sourceStorageKey,
      uploadId: 'upload-1',
      size: 1024,
      parts: [{ PartNumber: 1, ETag: 'etag-1' }],
    })).resolves.toMatchObject({ status: 'QUEUED' });

    expect(storage.delete).not.toHaveBeenCalled();
    expect(prisma.threeDConversionJob.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ stage: 'COMPLETING', uploadId: 'upload-1' }),
      data: expect.objectContaining({ status: 'QUEUED', stage: 'QUEUED', uploadId: null }),
    }));
  });

  it('removes converted + output copies and clears them on the job', async () => {
    await discard({
      id: 'j1',
      sourceStorageKey: 'conversions/j1/source/a.fbx',
      convertedStorageKey: 'conversions/j1/converted/model.glb',
      outputStorageKey: 'conversions/j1/output/model.glb',
    });

    expect(storage.delete).toHaveBeenCalledWith('conversions/j1/converted/model.glb');
    expect(storage.delete).toHaveBeenCalledWith('conversions/j1/output/model.glb');
    expect(storage.delete).not.toHaveBeenCalledWith(keep);
    expect(prisma.threeDConversionJob.update).toHaveBeenCalledWith({
      where: { id: 'j1' },
      data: { convertedStorageKey: null, outputStorageKey: null, sourceStorageKey: 'pending' },
    });
  });

  it('deletes a direct GLB source (source === converted) only once', async () => {
    await discard({
      id: 'j1',
      sourceStorageKey: 'conversions/j1/source/a.glb',
      convertedStorageKey: 'conversions/j1/source/a.glb',
      outputStorageKey: 'conversions/j1/output/model.glb',
    });

    const deleted = storage.delete.mock.calls.map((c: any[]) => c[0]);
    expect(deleted.filter((k: string) => k === 'conversions/j1/source/a.glb')).toHaveLength(1);
  });

  it('keeps both references if deleting a shared original and converted GLB fails', async () => {
    const source = 'conversions/j1/source/a.glb';
    storage.delete.mockImplementation(async (key: string) => {
      if (key === source) throw new Error('storage down');
    });
    await discard({ id: 'j1', sourceStorageKey: source, convertedStorageKey: source, outputStorageKey: 'conversions/j1/output/model.glb' });
    expect(prisma.threeDConversionJob.update).toHaveBeenCalledWith({
      where: { id: 'j1' }, data: { outputStorageKey: null },
    });
  });

  it('keeps the key on the job when a delete fails so cleanup can retry later', async () => {
    storage.delete.mockImplementation(async (key: string) => {
      if (key.includes('output')) throw new Error('storage down');
    });

    await discard({
      id: 'j1',
      sourceStorageKey: 'pending',
      convertedStorageKey: 'conversions/j1/converted/model.glb',
      outputStorageKey: 'conversions/j1/output/model.glb',
    });

    expect(prisma.threeDConversionJob.update).toHaveBeenCalledWith({
      where: { id: 'j1' },
      data: { convertedStorageKey: null },
    });
  });
});

describe('ThreeDConversionService.discardReplacedCatalogSource', () => {
  const prisma = {
    threeDConversionJob: { update: jest.fn() },
    productFile: { findFirst: jest.fn(), delete: jest.fn() },
  } as any;
  const storage = { exists: jest.fn(), delete: jest.fn() } as any;
  let service: ThreeDConversionService;

  const keep = 'products/p1/models/j1.glb';
  const original = 'products/p1/models/upload-abc.glb';
  const staging = 'conversions/j1/output/model.glb';
  const job = {
    id: 'j1',
    sourceStorageKey: original,
    convertedStorageKey: original,
    outputStorageKey: staging,
  };

  const discard = (overrides: Partial<typeof job> = {}) =>
    (service as any).discardReplacedCatalogSource({ ...job, ...overrides }, 'p1', 'file-new', keep);

  beforeEach(() => {
    jest.resetAllMocks();
    storage.exists.mockResolvedValue(true);
    storage.delete.mockResolvedValue(undefined);
    prisma.productFile.findFirst.mockResolvedValue({ id: 'file-old', storageKey: original, bundleRoot: null });
    prisma.productFile.delete.mockResolvedValue({});
    prisma.threeDConversionJob.update.mockResolvedValue({});
    service = new ThreeDConversionService(prisma, storage);
  });

  it('removes the staging output and the original product file once the optimized model is published', async () => {
    await discard();

    expect(storage.exists).toHaveBeenCalledWith(keep);
    expect(storage.delete).toHaveBeenCalledWith(staging);
    expect(storage.delete).toHaveBeenCalledWith(original);
    expect(storage.delete).not.toHaveBeenCalledWith(keep);
    expect(prisma.productFile.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        productId: 'p1',
        storageKey: original,
        id: { not: 'file-new' },
        fileType: 'MODEL',
        format: 'GLB',
      },
    }));
    expect(prisma.productFile.delete).toHaveBeenCalledWith({ where: { id: 'file-old' } });
    expect(prisma.threeDConversionJob.update).toHaveBeenCalledWith({
      where: { id: 'j1' },
      data: { outputStorageKey: null, convertedStorageKey: null },
    });
  });

  it('deletes nothing when the published optimized model is not in storage', async () => {
    storage.exists.mockResolvedValue(false);

    await discard();

    expect(storage.delete).not.toHaveBeenCalled();
    expect(prisma.productFile.delete).not.toHaveBeenCalled();
  });

  it('leaves a re-run source alone because it matches no product file', async () => {
    prisma.productFile.findFirst.mockResolvedValue(null);
    const converted = 'conversions/earlier/converted/model.glb';

    await discard({ sourceStorageKey: converted, convertedStorageKey: converted });

    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenCalledWith(staging);
    expect(storage.delete).not.toHaveBeenCalledWith(converted);
    expect(prisma.productFile.delete).not.toHaveBeenCalled();
  });

  it('never removes a bundle root file', async () => {
    prisma.productFile.findFirst.mockResolvedValue({ id: 'file-old', storageKey: original, bundleRoot: { id: 'bundle-1' } });

    await discard();

    expect(storage.delete).not.toHaveBeenCalledWith(original);
    expect(prisma.productFile.delete).not.toHaveBeenCalled();
  });

  it('keeps the original referenced when its storage delete fails', async () => {
    storage.delete.mockImplementation(async (key: string) => {
      if (key === original) throw new Error('storage down');
    });

    await discard();

    expect(prisma.productFile.delete).not.toHaveBeenCalled();
    expect(prisma.threeDConversionJob.update).toHaveBeenCalledWith({
      where: { id: 'j1' },
      data: { outputStorageKey: null },
    });
  });

  it('never throws, so a cleanup failure cannot roll back a successful publish', async () => {
    prisma.productFile.findFirst.mockRejectedValue(new Error('db down'));

    await expect(discard()).resolves.toBeUndefined();
    expect(storage.delete).not.toHaveBeenCalledWith(keep);
  });
});
