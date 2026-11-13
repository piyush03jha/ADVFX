/**
 * One-time cleanup of storage left behind by 3D conversion jobs that were
 * optimized and published before originals were removed automatically.
 *
 * Safety model:
 *  - Only jobs that finished AND published an optimized model are considered.
 *  - Every file published by any job (the optimized models) is protected, as is
 *    anything a product's media points at.
 *  - Nothing is removed unless the published optimized object is confirmed in
 *    storage, both when planning and again right before each deletion.
 *  - An original product file is removed only when the product's preview
 *    points at the optimized model, it is a plain GLB model of that same
 *    product, and it is not a bundle root.
 *  - Keys shared with a job that is not being cleaned, or that this job did
 *    not create, are skipped and reported.
 *
 * This module has no Prisma imports so it can be type-checked and unit tested
 * without a generated client. The CLI wrapper lives in
 * scripts/cleanup-optimized-originals.ts.
 */

export interface CleanupJobRow {
  id: string;
  status: string;
  stage: string;
  targetProductId: string | null;
  sourceStorageKey: string;
  convertedStorageKey: string | null;
  outputStorageKey: string | null;
  deleteSourceOnSuccess: boolean;
  publishedFileId: string | null;
}

export interface CleanupFileRow {
  id: string;
  productId: string;
  storageKey: string;
  fileType: string;
  format: string;
  bundleRoot?: { id: string } | null;
}

export interface CleanupMediaRow {
  productId: string;
  url: string;
}

export type CleanupRole = "staging-output" | "converted-glb" | "conversion-source" | "product-file";

export interface CleanupAction {
  kind: "object" | "product-file";
  role: CleanupRole;
  key: string;
  /** Present for kind "product-file". */
  fileId?: string;
  productId: string;
  jobIds: string[];
  /** The published optimized object that must exist before this is deleted. */
  verifyKey: string;
}

export interface CleanupSkip {
  jobId: string;
  key: string;
  reason: string;
}

export interface CleanupPlan {
  actions: CleanupAction[];
  skipped: CleanupSkip[];
  /** Completed jobs that were never published; left untouched on purpose. */
  unpublishedJobs: number;
}

export interface PlanInput {
  jobs: CleanupJobRow[];
  files: CleanupFileRow[];
  media: CleanupMediaRow[];
  publicUrl: (storageKey: string) => string;
  /** Published storage keys confirmed to exist in storage. */
  verifiedKeys: Set<string>;
  onlyJobIds?: Set<string>;
}

const isUnsafeKey = (key: string) => key.startsWith("/") || key.split("/").includes("..");

export function planConversionCleanup(input: PlanInput): CleanupPlan {
  const { jobs, files, media, publicUrl, verifiedKeys, onlyJobIds } = input;

  const filesById = new Map(files.map((file) => [file.id, file]));
  const filesByKey = new Map<string, CleanupFileRow[]>();
  for (const file of files) {
    const list = filesByKey.get(file.storageKey) ?? [];
    list.push(file);
    filesByKey.set(file.storageKey, list);
  }

  // Every optimized model any job has ever published is protected, whatever
  // state the job is in now.
  const publishedKeys = new Set<string>();
  for (const job of jobs) {
    const published = job.publishedFileId ? filesById.get(job.publishedFileId) : undefined;
    if (published) publishedKeys.add(published.storageKey);
  }

  const allMediaUrls = new Set(media.map((item) => item.url));
  const urlsByProduct = new Map<string, Set<string>>();
  for (const item of media) {
    const set = urlsByProduct.get(item.productId) ?? new Set<string>();
    set.add(item.url);
    urlsByProduct.set(item.productId, set);
  }

  const refsByKey = new Map<string, CleanupJobRow[]>();
  const addRef = (key: string | null, job: CleanupJobRow) => {
    if (!key || key === "pending") return;
    const list = refsByKey.get(key) ?? [];
    if (!list.includes(job)) list.push(job);
    refsByKey.set(key, list);
  };
  for (const job of jobs) {
    addRef(job.sourceStorageKey, job);
    addRef(job.convertedStorageKey, job);
    addRef(job.outputStorageKey, job);
  }

  const skipped: CleanupSkip[] = [];
  let unpublishedJobs = 0;
  const targets: CleanupJobRow[] = [];

  for (const job of jobs) {
    if (onlyJobIds && !onlyJobIds.has(job.id)) continue;
    if (job.status !== "COMPLETED" || job.stage !== "PUBLISHED" || !job.publishedFileId) {
      if (job.status === "COMPLETED") unpublishedJobs += 1;
      continue;
    }
    const published = filesById.get(job.publishedFileId);
    if (!published) {
      skipped.push({ jobId: job.id, key: "", reason: "published file record not found" });
      continue;
    }
    if (!verifiedKeys.has(published.storageKey)) {
      skipped.push({
        jobId: job.id,
        key: published.storageKey,
        reason: "published optimized model is missing from storage, keeping the originals",
      });
      continue;
    }
    targets.push(job);
  }
  const targetIds = new Set(targets.map((job) => job.id));

  const actions = new Map<string, CleanupAction>();
  const addAction = (action: CleanupAction, jobId: string) => {
    const existing = actions.get(action.key);
    if (existing) {
      if (!existing.jobIds.includes(jobId)) existing.jobIds.push(jobId);
      return;
    }
    actions.set(action.key, { ...action, jobIds: [jobId] });
  };

  for (const job of targets) {
    const published = filesById.get(job.publishedFileId as string) as CleanupFileRow;
    const productId = published.productId;
    const verifyKey = published.storageKey;

    const candidates = new Map<string, CleanupRole>();
    const consider = (key: string | null, role: CleanupRole) => {
      if (!key || key === "pending" || candidates.has(key)) return;
      candidates.set(key, role);
    };
    // The source goes first: when source === converted (a direct GLB) the
    // source ownership rules decide.
    consider(job.sourceStorageKey, "conversion-source");
    consider(job.convertedStorageKey, "converted-glb");
    consider(job.outputStorageKey, "staging-output");

    for (const [key, role] of candidates) {
      const skip = (reason: string) => skipped.push({ jobId: job.id, key, reason });

      if (isUnsafeKey(key)) {
        skip("unsafe storage key");
        continue;
      }
      if (publishedKeys.has(key)) {
        skip("is a published optimized model");
        continue;
      }
      if (allMediaUrls.has(publicUrl(key))) {
        skip("referenced by product media");
        continue;
      }
      const sharing = (refsByKey.get(key) ?? []).find((ref) => !targetIds.has(ref.id));
      if (sharing) {
        skip(`shared with job ${sharing.id}, which is not being cleaned`);
        continue;
      }

      const owners = filesByKey.get(key) ?? [];
      if (owners.length > 1) {
        skip("several product files share this key");
        continue;
      }

      if (owners.length === 1) {
        const file = owners[0];
        if (role === "staging-output") {
          skip("staging output is registered as a product file");
          continue;
        }
        if (file.productId !== productId) {
          skip("belongs to a different product than the published model");
          continue;
        }
        if (file.fileType !== "MODEL" || file.format !== "GLB") {
          skip("not a GLB model file");
          continue;
        }
        if (file.bundleRoot) {
          skip("is a bundle root file");
          continue;
        }
        if (file.id === published.id) {
          skip("is the published model");
          continue;
        }
        if (!urlsByProduct.get(productId)?.has(publicUrl(verifyKey))) {
          skip("product preview does not point at the optimized model");
          continue;
        }
        addAction(
          { kind: "product-file", role: "product-file", key, fileId: file.id, productId, jobIds: [], verifyKey },
          job.id,
        );
        continue;
      }

      // Not a catalog file: an object owned by the conversion job.
      if (key === job.sourceStorageKey) {
        if (!job.deleteSourceOnSuccess) {
          skip("source is not owned by this job (re-run or catalog source)");
          continue;
        }
      } else if (!key.startsWith(`conversions/${job.id}/`)) {
        skip("not created by this job");
        continue;
      }
      addAction({ kind: "object", role, key, productId, jobIds: [], verifyKey }, job.id);
    }
  }

  return { actions: [...actions.values()], skipped, unpublishedJobs };
}

/* ------------------------------------------------------------------ */
/* Orchestration                                                        */
/* ------------------------------------------------------------------ */

export interface CleanupDb {
  threeDConversionJob: {
    findMany(args: any): Promise<any[]>;
    update(args: any): Promise<any>;
  };
  productFile: {
    findMany(args: any): Promise<any[]>;
    delete(args: any): Promise<any>;
  };
  productMedia: {
    findMany(args: any): Promise<any[]>;
  };
}

export interface CleanupStorage {
  exists(storageKey: string): Promise<boolean>;
  getObjectSize(storageKey: string): Promise<number>;
  delete(storageKey: string): Promise<void>;
  getPublicAssetUrl(storageKey: string): string;
}

export interface CleanupOptions {
  apply: boolean;
  jobIds?: string[];
  limit?: number;
  log?: (line: string) => void;
}

export interface CleanupReport {
  mode: "dry-run" | "apply";
  planned: number;
  reclaimableBytes: number;
  deleted: number;
  deletedBytes: number;
  failed: number;
  skipped: CleanupSkip[];
  unpublishedJobs: number;
}

const JOB_SELECT = {
  id: true,
  status: true,
  stage: true,
  targetProductId: true,
  sourceStorageKey: true,
  convertedStorageKey: true,
  outputStorageKey: true,
  deleteSourceOnSuccess: true,
  publishedFileId: true,
};

const FILE_SELECT = {
  id: true,
  productId: true,
  storageKey: true,
  fileType: true,
  format: true,
  bundleRoot: { select: { id: true } },
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export async function runConversionCleanup(
  deps: { db: CleanupDb; storage: CleanupStorage },
  options: CleanupOptions,
): Promise<CleanupReport> {
  const { db, storage } = deps;
  const log = options.log ?? (() => undefined);

  const jobs = (await db.threeDConversionJob.findMany({ select: JOB_SELECT })) as CleanupJobRow[];

  const keys = new Set<string>();
  const publishedIds = new Set<string>();
  for (const job of jobs) {
    for (const key of [job.sourceStorageKey, job.convertedStorageKey, job.outputStorageKey]) {
      if (key && key !== "pending") keys.add(key);
    }
    if (job.publishedFileId) publishedIds.add(job.publishedFileId);
  }

  const filesById = new Map<string, CleanupFileRow>();
  for (const ids of chunk([...publishedIds], 500)) {
    for (const file of await db.productFile.findMany({ where: { id: { in: ids } }, select: FILE_SELECT })) {
      filesById.set(file.id, file);
    }
  }
  for (const batch of chunk([...keys], 500)) {
    for (const file of await db.productFile.findMany({ where: { storageKey: { in: batch } }, select: FILE_SELECT })) {
      filesById.set(file.id, file);
    }
  }
  const files = [...filesById.values()];

  const productIds = [...new Set(files.map((file) => file.productId))];
  const mediaMap = new Map<string, CleanupMediaRow>();
  const addMedia = (rows: any[]) => {
    for (const row of rows) mediaMap.set(row.productId + "\n" + row.url, { productId: row.productId, url: row.url });
  };
  for (const ids of chunk(productIds, 500)) {
    addMedia(
      await db.productMedia.findMany({
        where: { type: "MODEL_PREVIEW", productId: { in: ids } },
        select: { productId: true, url: true },
      }),
    );
  }
  for (const batch of chunk([...keys].map((key) => storage.getPublicAssetUrl(key)), 500)) {
    addMedia(await db.productMedia.findMany({ where: { url: { in: batch } }, select: { productId: true, url: true } }));
  }

  // Confirm every optimized model that originals would be removed against.
  const verifiedKeys = new Set<string>();
  for (const job of jobs) {
    if (job.status !== "COMPLETED" || job.stage !== "PUBLISHED" || !job.publishedFileId) continue;
    const published = filesById.get(job.publishedFileId);
    if (!published || verifiedKeys.has(published.storageKey)) continue;
    if (await storage.exists(published.storageKey).catch(() => false)) verifiedKeys.add(published.storageKey);
  }

  const plan = planConversionCleanup({
    jobs,
    files,
    media: [...mediaMap.values()],
    publicUrl: (key) => storage.getPublicAssetUrl(key),
    verifiedKeys,
    onlyJobIds: options.jobIds?.length ? new Set(options.jobIds) : undefined,
  });

  let actions = plan.actions;
  if (options.limit && options.limit > 0) actions = actions.slice(0, options.limit);

  const sizes = new Map<string, number>();
  let reclaimableBytes = 0;
  for (const action of actions) {
    const size = await storage.getObjectSize(action.key).catch(() => 0);
    sizes.set(action.key, size);
    reclaimableBytes += size;
  }

  const apply = options.apply;
  log(apply ? "MODE: APPLY (deleting)" : "MODE: dry run (nothing is deleted; pass --apply to delete)");
  for (const action of actions) {
    const size = sizes.get(action.key) ?? 0;
    log(
      `${apply ? "DELETE" : "would delete"}  ${action.role.padEnd(17)} ${action.key}  ` +
        `${size > 0 ? formatBytes(size) : "already gone"}  (job ${action.jobIds.join(", ")}, product ${action.productId})`,
    );
  }
  for (const skip of plan.skipped) {
    log(`skipped  job ${skip.jobId}  ${skip.key || "-"}  ${skip.reason}`);
  }

  let deleted = 0;
  let deletedBytes = 0;
  let failed = 0;

  if (apply) {
    const jobsById = new Map(jobs.map((job) => [job.id, job]));
    for (const action of actions) {
      try {
        // Re-confirm the optimized model right before deleting anything.
        if (!(await storage.exists(action.verifyKey))) {
          log(`skipped  ${action.key}  optimized model ${action.verifyKey} no longer found`);
          continue;
        }

        await storage.delete(action.key);
        if (action.kind === "product-file" && action.fileId) {
          await db.productFile.delete({ where: { id: action.fileId } });
        }

        for (const jobId of action.jobIds) {
          const job = jobsById.get(jobId);
          if (!job) continue;
          const clear: { convertedStorageKey?: null; outputStorageKey?: null } = {};
          if (job.convertedStorageKey === action.key) clear.convertedStorageKey = null;
          if (job.outputStorageKey === action.key) clear.outputStorageKey = null;
          if (Object.keys(clear).length > 0) {
            await db.threeDConversionJob.update({ where: { id: jobId }, data: clear });
          }
        }

        deleted += 1;
        deletedBytes += sizes.get(action.key) ?? 0;
      } catch (error) {
        failed += 1;
        log(`FAILED   ${action.key}  ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  log("");
  log(`Jobs published but not eligible / skipped: ${plan.skipped.length}`);
  log(`Completed jobs that were never published (left alone): ${plan.unpublishedJobs}`);
  log(
    apply
      ? `Deleted ${deleted} of ${actions.length} planned objects, freeing ${formatBytes(deletedBytes)}. Failed: ${failed}.`
      : `${actions.length} objects planned, about ${formatBytes(reclaimableBytes)} would be freed.`,
  );

  return {
    mode: apply ? "apply" : "dry-run",
    planned: actions.length,
    reclaimableBytes,
    deleted,
    deletedBytes,
    failed,
    skipped: plan.skipped,
    unpublishedJobs: plan.unpublishedJobs,
  };
}
