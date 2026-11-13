import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { CleanupDb, runConversionCleanup } from "../src/3d-conversion/conversion-cleanup";
import { StorageService } from "../src/storage/storage.service";

/**
 * One-time cleanup of originals and temporary copies left in storage by 3D
 * conversion jobs that were optimized and published before originals were
 * removed automatically. Optimized models that products use are never deleted.
 *
 *   npm run storage:cleanup-originals                 dry run, deletes nothing
 *   npm run storage:cleanup-originals -- --apply      delete what the dry run listed
 *
 * Options:
 *   --apply         actually delete (default is a dry run)
 *   --job=<id>      only clean this conversion job (repeatable)
 *   --limit=<n>     stop after planning n objects (try a small batch first)
 *   --help          show this help
 */

function parseArgs(argv: string[]) {
  const options = { apply: false, jobIds: [] as string[], limit: undefined as number | undefined, help: false };

  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--job=")) options.jobIds.push(arg.slice("--job=".length));
    else if (arg.startsWith("--limit=")) {
      const limit = Number(arg.slice("--limit=".length));
      if (!Number.isInteger(limit) || limit <= 0) throw new Error("--limit must be a positive whole number");
      options.limit = limit;
    } else {
      throw new Error(`Unknown option: ${arg} (use --help)`);
    }
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(
      [
        "Usage: npm run storage:cleanup-originals -- [--apply] [--job=<id>] [--limit=<n>]",
        "",
        "Default is a dry run that lists what would be deleted and how much space it frees.",
        "Pass --apply to delete. Optimized models that products use are never deleted.",
      ].join("\n"),
    );
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");

  let databaseHost = "unknown host";
  try {
    databaseHost = new URL(connectionString).host;
  } catch {
    // Keep the placeholder; the connection attempt will report a real error.
  }
  const provider = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase();
  console.log(`Database: ${databaseHost}`);
  console.log(`Storage:  ${provider}${process.env.STORAGE_BUCKET ? ` / ${process.env.STORAGE_BUCKET}` : ""}`);
  console.log("");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const storage = new StorageService();

  try {
    const report = await runConversionCleanup(
      { db: prisma as unknown as CleanupDb, storage },
      {
        apply: options.apply,
        jobIds: options.jobIds,
        limit: options.limit,
        log: (line) => console.log(line),
      },
    );

    if (report.failed > 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
