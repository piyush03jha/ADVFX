import "dotenv/config";
import { request } from "node:https";
import { StorageService } from "../src/storage/storage.service";

const ok = (message: string) => console.log(`  ok    ${message}`);
const fail = (message: string) => {
  console.error(`  FAIL  ${message}`);
  process.exitCode = 1;
};

function preflight(origin: string): Promise<Record<string, string | string[] | undefined>> {
  const endpoint = new URL((process.env.STORAGE_ENDPOINT ?? "").replace(/\/$/, ""));
  const bucket = process.env.STORAGE_BUCKET ?? "";
  const path = `/${encodeURIComponent(bucket)}/products/cors-check/part.bin`;

  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: endpoint.host,
        path,
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "PUT",
          "Access-Control-Request-Headers": "content-type",
        },
      },
      (response) => {
        response.resume();
        response.on("end", () =>
          resolve({ status: String(response.statusCode), ...response.headers }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  const origin = process.argv[2] ?? "https://voxel3d.org";
  const endpoint = process.env.STORAGE_ENDPOINT ?? "";
  const region = process.env.STORAGE_REGION ?? "";

  console.log("1. Config");
  const match = /^https:\/\/s3\.([a-z0-9-]+)\.backblazeb2\.com\/?$/i.exec(endpoint);

  match
    ? ok(`endpoint region ${match[1]}`)
    : fail(`endpoint "${endpoint}" is not https://s3.<region>.backblazeb2.com`);

  if (match) {
    match[1].toLowerCase() === region.trim().toLowerCase()
      ? ok("STORAGE_REGION matches endpoint")
      : fail(`STORAGE_REGION is "${region}" but endpoint region is "${match[1]}"`);
  }

  /[/:]/.test(process.env.STORAGE_BUCKET ?? "")
    ? fail("STORAGE_BUCKET must be the bucket name only")
    : ok("bucket name format");

  if (process.env.STORAGE_PUBLIC_BASE_URL) {
    fail("STORAGE_PUBLIC_BASE_URL must be empty for the private B2 bucket");
  }

  console.log("2. Server-side object operations");
  const storage = new StorageService();
  let key = "";
  try {
    const saved = await storage.saveGeneratedFile(
      Buffer.from("b2-diagnose"),
      "storage-smoke-test",
      `diag-${Date.now()}.bin`,
    );
    key = saved.storageKey;
    ok(`PUT ${key}`);
    (await storage.exists(key)) ? ok("HEAD") : fail("HEAD returned not found");
    (await storage.read(key)).toString() === "b2-diagnose"
      ? ok("GET")
      : fail("GET content mismatch");
    await storage.delete(key);
    key = "";
    ok("DELETE");
  } catch (error) {
    if (key) await storage.delete(key).catch(() => undefined);
    fail(error instanceof Error ? error.message : String(error));
  }

  console.log(`3. Browser CORS preflight for ${origin}`);
  try {
    const headers = await preflight(origin);
    const allowOrigin = String(headers["access-control-allow-origin"] ?? "");
    const allowMethods = String(headers["access-control-allow-methods"] ?? "");
    allowOrigin === origin || allowOrigin === "*"
      ? ok(`Allow-Origin: ${allowOrigin}`)
      : fail(`no Allow-Origin for ${origin} (status ${headers.status}); CORS rule missing or wrong origin`);
    /PUT/i.test(allowMethods)
      ? ok(`Allow-Methods: ${allowMethods}`)
      : fail("PUT not allowed by CORS rule (needs s3_put)");
    ok("ETag must be listed in exposeHeaders; verify scripts/b2-cors-rules.json is applied to B2");
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

main();
