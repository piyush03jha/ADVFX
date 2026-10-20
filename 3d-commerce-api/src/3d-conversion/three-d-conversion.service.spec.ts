import { ThreeDConversionService } from './three-d-conversion.service';

describe('ThreeDConversionService.discardConversionIntermediates', () => {
  const prisma = { threeDConversionJob: { update: jest.fn() } } as any;
  const storage = { delete: jest.fn() } as any;
  let service: ThreeDConversionService;
  const keep = 'products/p1/models/j1.glb';

  const discard = (job: any) => (service as any).discardConversionIntermediates(job, keep);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.threeDConversionJob.update.mockResolvedValue({});
    storage.delete.mockResolvedValue(undefined);
    service = new ThreeDConversionService(prisma, storage);
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
      data: { convertedStorageKey: null, outputStorageKey: null },
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
