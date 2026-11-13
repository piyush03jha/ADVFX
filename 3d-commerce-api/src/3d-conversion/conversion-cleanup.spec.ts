import {
  CleanupFileRow,
  CleanupJobRow,
  CleanupMediaRow,
  planConversionCleanup,
  runConversionCleanup,
} from './conversion-cleanup';

const publicUrl = (key: string) => `/api/assets/${key}`;

const job = (overrides: Partial<CleanupJobRow> & { id: string }): CleanupJobRow => ({
  status: 'COMPLETED',
  stage: 'PUBLISHED',
  targetProductId: 'p1',
  sourceStorageKey: 'pending',
  convertedStorageKey: null,
  outputStorageKey: null,
  deleteSourceOnSuccess: true,
  publishedFileId: null,
  ...overrides,
});

const file = (overrides: Partial<CleanupFileRow> & { id: string; storageKey: string }): CleanupFileRow => ({
  productId: 'p1',
  fileType: 'MODEL',
  format: 'GLB',
  bundleRoot: null,
  ...overrides,
});

const preview = (productId: string, key: string): CleanupMediaRow => ({ productId, url: publicUrl(key) });

// A GLB that was uploaded as a product file, optimized and published (the leak).
const ORIGINAL = 'products/p1/models/upload-abc.glb';
const PUBLISHED = 'products/p1/models/j1.glb';
const STAGING = 'conversions/j1/output/model.glb';

const leakedJob = job({
  id: 'j1',
  sourceStorageKey: ORIGINAL,
  convertedStorageKey: ORIGINAL,
  outputStorageKey: STAGING,
  deleteSourceOnSuccess: false,
  publishedFileId: 'f-new',
});
const originalFile = file({ id: 'f-old', storageKey: ORIGINAL });
const publishedFile = file({ id: 'f-new', storageKey: PUBLISHED });

const plan = (overrides: Partial<Parameters<typeof planConversionCleanup>[0]> = {}) =>
  planConversionCleanup({
    jobs: [leakedJob],
    files: [originalFile, publishedFile],
    media: [preview('p1', PUBLISHED)],
    publicUrl,
    verifiedKeys: new Set([PUBLISHED]),
    ...overrides,
  });

describe('planConversionCleanup', () => {
  it('plans the original product file and the staging copy, and never the optimized model', () => {
    const result = plan();

    expect(result.actions.map((a) => [a.kind, a.key]).sort()).toEqual([
      ['object', STAGING],
      ['product-file', ORIGINAL],
    ]);
    expect(result.actions.find((a) => a.key === ORIGINAL)).toMatchObject({ fileId: 'f-old', verifyKey: PUBLISHED });
    expect(result.actions.map((a) => a.key)).not.toContain(PUBLISHED);
  });

  it('plans the source, converted and output objects of a conversion-owned job', () => {
    const converted = job({
      id: 'j2',
      sourceStorageKey: 'conversions/j2/source/model.fbx',
      convertedStorageKey: 'conversions/j2/converted/model.glb',
      outputStorageKey: 'conversions/j2/output/model.glb',
      publishedFileId: 'f2',
    });
    const published = file({ id: 'f2', storageKey: 'products/p1/models/j2.glb' });

    const result = planConversionCleanup({
      jobs: [converted],
      files: [published],
      media: [preview('p1', published.storageKey)],
      publicUrl,
      verifiedKeys: new Set([published.storageKey]),
    });

    expect(result.actions.map((a) => a.key).sort()).toEqual([
      'conversions/j2/converted/model.glb',
      'conversions/j2/output/model.glb',
      'conversions/j2/source/model.fbx',
    ]);
    expect(result.actions.every((a) => a.kind === 'object')).toBe(true);
  });

  it('leaves completed jobs that were never published alone', () => {
    const unpublished = job({
      id: 'j3',
      stage: 'READY',
      sourceStorageKey: 'conversions/j3/source/a.obj',
      convertedStorageKey: 'conversions/j3/converted/model.glb',
      outputStorageKey: 'conversions/j3/output/model.glb',
    });

    const result = planConversionCleanup({
      jobs: [unpublished],
      files: [],
      media: [],
      publicUrl,
      verifiedKeys: new Set(),
    });

    expect(result.actions).toEqual([]);
    expect(result.unpublishedJobs).toBe(1);
  });

  it('keeps everything when the published optimized model is missing from storage', () => {
    const result = plan({ verifiedKeys: new Set() });

    expect(result.actions).toEqual([]);
    expect(result.skipped[0].reason).toMatch(/missing from storage/);
  });

  it('keeps the original when the product preview does not point at the optimized model', () => {
    const result = plan({ media: [preview('p1', ORIGINAL)] });

    expect(result.actions.map((a) => a.key)).toEqual([STAGING]);
    expect(result.skipped.map((s) => s.reason).join('|')).toMatch(/referenced by product media/);
  });

  it('keeps the original when the product has no preview of the optimized model', () => {
    const result = plan({ media: [] });

    expect(result.actions.map((a) => a.key)).toEqual([STAGING]);
    expect(result.skipped.map((s) => s.reason).join('|')).toMatch(/preview does not point at the optimized model/);
  });

  it('never plans a model that another job published, even when it is a later job\'s source', () => {
    const reoptimize = job({
      id: 'j9',
      sourceStorageKey: PUBLISHED,
      convertedStorageKey: PUBLISHED,
      outputStorageKey: 'conversions/j9/output/model.glb',
      deleteSourceOnSuccess: false,
      publishedFileId: 'f9',
    });
    const newest = file({ id: 'f9', storageKey: 'products/p1/models/j9.glb' });

    const result = planConversionCleanup({
      jobs: [leakedJob, reoptimize],
      files: [originalFile, publishedFile, newest],
      media: [preview('p1', newest.storageKey)],
      publicUrl,
      verifiedKeys: new Set([PUBLISHED, newest.storageKey]),
    });

    const planned = result.actions.map((a) => a.key);
    expect(planned).not.toContain(PUBLISHED);
    expect(planned).not.toContain(newest.storageKey);
  });

  it('skips a re-run source that belongs to another job', () => {
    const rerun = job({
      id: 'j4',
      sourceStorageKey: 'conversions/earlier/converted/model.glb',
      convertedStorageKey: 'conversions/earlier/converted/model.glb',
      outputStorageKey: 'conversions/j4/output/model.glb',
      deleteSourceOnSuccess: false,
      publishedFileId: 'f4',
    });
    const published = file({ id: 'f4', storageKey: 'products/p1/models/j4.glb' });

    const result = planConversionCleanup({
      jobs: [rerun],
      files: [published],
      media: [preview('p1', published.storageKey)],
      publicUrl,
      verifiedKeys: new Set([published.storageKey]),
    });

    expect(result.actions.map((a) => a.key)).toEqual(['conversions/j4/output/model.glb']);
    expect(result.skipped.map((s) => s.reason).join('|')).toMatch(/not owned by this job/);
  });

  it('skips a key that an unfinished job still references', () => {
    const queued = job({
      id: 'j5',
      status: 'QUEUED',
      stage: 'QUEUED',
      sourceStorageKey: ORIGINAL,
      deleteSourceOnSuccess: false,
    });

    const result = plan({ jobs: [leakedJob, queued] });

    expect(result.actions.map((a) => a.key)).toEqual([STAGING]);
    expect(result.skipped.map((s) => s.reason).join('|')).toMatch(/shared with job j5/);
  });

  it('never removes a bundle root, a file of another product, or a non-GLB file', () => {
    for (const changed of [
      { bundleRoot: { id: 'b1' } },
      { productId: 'other' },
      { format: 'STL' },
      { fileType: 'DOCUMENT' },
    ]) {
      const result = plan({ files: [{ ...originalFile, ...changed }, publishedFile] });
      expect(result.actions.map((a) => a.key)).toEqual([STAGING]);
    }
  });

  it('does not plan keys that were not created by the job', () => {
    const stray = job({
      id: 'j6',
      sourceStorageKey: 'conversions/j6/source/a.obj',
      convertedStorageKey: 'products/p1/models/shared.glb',
      publishedFileId: 'f6',
    });
    const published = file({ id: 'f6', storageKey: 'products/p1/models/j6.glb' });

    const result = planConversionCleanup({
      jobs: [stray],
      files: [published],
      media: [preview('p1', published.storageKey)],
      publicUrl,
      verifiedKeys: new Set([published.storageKey]),
    });

    expect(result.actions.map((a) => a.key)).toEqual(['conversions/j6/source/a.obj']);
  });

  it('rejects unsafe storage keys', () => {
    const unsafe = job({
      id: 'j7',
      sourceStorageKey: 'conversions/j7/../../products/p1/models/live.glb',
      publishedFileId: 'f7',
    });
    const published = file({ id: 'f7', storageKey: 'products/p1/models/j7.glb' });

    const result = planConversionCleanup({
      jobs: [unsafe],
      files: [published],
      media: [preview('p1', published.storageKey)],
      publicUrl,
      verifiedKeys: new Set([published.storageKey]),
    });

    expect(result.actions).toEqual([]);
    expect(result.skipped[0].reason).toBe('unsafe storage key');
  });

  it('only plans the requested job when onlyJobIds is given', () => {
    const result = plan({ onlyJobIds: new Set(['someone-else']) });

    expect(result.actions).toEqual([]);
  });
});

describe('runConversionCleanup', () => {
  const makeDeps = () => {
    const jobs = [{ ...leakedJob }];
    const files = [{ ...originalFile }, { ...publishedFile }];
    const media = [{ productId: 'p1', url: publicUrl(PUBLISHED) }];
    const objects = new Map<string, number>([
      [ORIGINAL, 40_000_000],
      [STAGING, 8_000_000],
      [PUBLISHED, 8_000_000],
    ]);

    const inList = (value: any, list?: any[]) => !list || list.includes(value);
    const db = {
      threeDConversionJob: {
        findMany: jest.fn(async () => jobs),
        update: jest.fn(async ({ where, data }: any) => Object.assign(jobs.find((j) => j.id === where.id)!, data)),
      },
      productFile: {
        findMany: jest.fn(async ({ where }: any) =>
          files.filter((f) => inList(f.id, where.id?.in) && inList(f.storageKey, where.storageKey?.in)),
        ),
        delete: jest.fn(async ({ where }: any) => {
          files.splice(files.findIndex((f) => f.id === where.id), 1);
        }),
      },
      productMedia: {
        findMany: jest.fn(async ({ where }: any) =>
          media.filter((m) => inList(m.productId, where.productId?.in) && inList(m.url, where.url?.in)),
        ),
      },
    };
    const storage = {
      exists: jest.fn(async (key: string) => objects.has(key)),
      getObjectSize: jest.fn(async (key: string) => {
        if (!objects.has(key)) throw new Error('missing');
        return objects.get(key)!;
      }),
      delete: jest.fn(async (key: string) => {
        objects.delete(key);
      }),
      getPublicAssetUrl: publicUrl,
    };
    return { db, storage, jobs, files, objects };
  };

  it('deletes nothing in a dry run and reports what would be freed', async () => {
    const { db, storage, objects } = makeDeps();
    const lines: string[] = [];

    const report = await runConversionCleanup({ db, storage }, { apply: false, log: (l) => lines.push(l) });

    expect(report).toMatchObject({ mode: 'dry-run', planned: 2, reclaimableBytes: 48_000_000, deleted: 0 });
    expect(storage.delete).not.toHaveBeenCalled();
    expect(db.productFile.delete).not.toHaveBeenCalled();
    expect(db.threeDConversionJob.update).not.toHaveBeenCalled();
    expect([...objects.keys()]).toContain(ORIGINAL);
    expect(lines.join('\n')).toMatch(/dry run/);
  });

  it('with --apply removes the original, its record and the staging copy but keeps the optimized model', async () => {
    const { db, storage, jobs, files, objects } = makeDeps();

    const report = await runConversionCleanup({ db, storage }, { apply: true });

    expect(report).toMatchObject({ mode: 'apply', planned: 2, deleted: 2, deletedBytes: 48_000_000, failed: 0 });
    expect([...objects.keys()]).toEqual([PUBLISHED]);
    expect(files.map((f) => f.id)).toEqual(['f-new']);
    expect(jobs[0]).toMatchObject({ convertedStorageKey: null, outputStorageKey: null });
    expect(storage.delete).not.toHaveBeenCalledWith(PUBLISHED);
  });

  it('is safe to run again: the second run plans nothing', async () => {
    const { db, storage } = makeDeps();

    await runConversionCleanup({ db, storage }, { apply: true });
    const second = await runConversionCleanup({ db, storage }, { apply: true });

    expect(second.planned).toBe(0);
    expect(second.failed).toBe(0);
    expect(storage.delete).not.toHaveBeenCalledWith(PUBLISHED);
  });

  it('skips an action when the optimized model disappears before the delete', async () => {
    const { db, storage, objects } = makeDeps();
    storage.exists.mockImplementation(async (key: string) => {
      // Present while planning, gone by the time deletion starts.
      if (key === PUBLISHED && storage.exists.mock.calls.length > 1) return false;
      return objects.has(key);
    });

    const report = await runConversionCleanup({ db, storage }, { apply: true });

    expect(report.deleted).toBe(0);
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('keeps going and counts a failure when one delete errors', async () => {
    const { db, storage, files } = makeDeps();
    storage.delete.mockImplementation(async (key: string) => {
      if (key === ORIGINAL) throw new Error('storage down');
    });

    const report = await runConversionCleanup({ db, storage }, { apply: true });

    expect(report).toMatchObject({ deleted: 1, failed: 1 });
    // The record stays because its object could not be removed.
    expect(files.map((f) => f.id)).toContain('f-old');
  });

  it('honours --limit and --job', async () => {
    const { db, storage } = makeDeps();

    const limited = await runConversionCleanup({ db, storage }, { apply: false, limit: 1 });
    expect(limited.planned).toBe(1);

    const other = await runConversionCleanup({ db, storage }, { apply: false, jobIds: ['nope'] });
    expect(other.planned).toBe(0);
  });
});
