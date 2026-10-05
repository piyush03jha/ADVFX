import "dotenv/config";
import { createHash, createHmac } from "node:crypto";

type B2Bucket = {
  bucketId: string;
  bucketName: string;
  bucketType: string;
};

type B2AuthorizeResponse = {
  accountId: string;
  authorizationToken: string;
  apiUrl: string;
};

const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

const corsRules = [
  {
    corsRuleName: "voxel-browser-uploads",
    allowedOrigins: [
      "https://voxel3d.org",
      "https://www.voxel3d.org",
      "http://localhost:3000",
    ],
    allowedOperations: ["s3_put", "s3_get", "s3_head"],
    allowedHeaders: ["*"],
    exposeHeaders: [
      "ETag",
      "Content-Length",
      "Content-Range",
      "Accept-Ranges",
    ],
    maxAgeSeconds: 3600,
  },
];

function getConfig() {
  const endpoint = (process.env.STORAGE_ENDPOINT ?? "").replace(/\/$/, "");
  const bucket = process.env.STORAGE_BUCKET ?? "";
  const storageAccessKey = process.env.STORAGE_ACCESS_KEY_ID ?? "";
  const storageSecretKey = process.env.STORAGE_SECRET_ACCESS_KEY ?? "";

  if (!bucket) {
    throw new Error("STORAGE_BUCKET is required");
  }

  return {
    endpoint,
    bucket,
    b2KeyId: process.env.B2_CORS_KEY_ID ?? storageAccessKey,
    b2ApplicationKey:
      process.env.B2_CORS_APPLICATION_KEY ?? storageSecretKey,
  };
}

async function b2Authorize(keyId: string, applicationKey: string) {
  if (!keyId || !applicationKey) {
    throw new Error(
      "B2_CORS_KEY_ID and B2_CORS_APPLICATION_KEY are required for Backblaze B2 bucket administration. " +
        "They may be provided through STORAGE_ACCESS_KEY_ID/STORAGE_SECRET_ACCESS_KEY when that key has writeBuckets capability.",
    );
  }

  const credentials = Buffer.from(`${keyId}:${applicationKey}`).toString(
    "base64",
  );

  const response = await fetch(
    "https://api.backblazeb2.com/b2api/v4/b2_authorize_account",
    {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    },
  );

  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `B2 authorization failed (${response.status}): ${body}`,
    );
  }

  return JSON.parse(body) as B2AuthorizeResponse;
}

async function b2Request<T>(
  apiUrl: string,
  authorizationToken: string,
  action: string,
  payload: Record<string, unknown>,
) {
  const response = await fetch(
    `${apiUrl}/b2api/v4/${action}`,
    {
      method: "POST",
      headers: {
        Authorization: authorizationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`B2 ${action} failed (${response.status}): ${body}`);
  }

  return JSON.parse(body) as T;
}

async function configureB2Cors() {
  const { bucket, b2KeyId, b2ApplicationKey } = getConfig();

  console.log(`Configuring native Backblaze B2 CORS for bucket: ${bucket}`);

  const auth = await b2Authorize(b2KeyId, b2ApplicationKey);

  const buckets = await b2Request<{ buckets: B2Bucket[] }>(
    auth.apiUrl,
    auth.authorizationToken,
    "b2_list_buckets",
    {
      accountId: auth.accountId,
    },
  );

  const target = buckets.buckets.find((item) => item.bucketName === bucket);
  if (!target) {
    throw new Error(`Backblaze bucket not found: ${bucket}`);
  }

  await b2Request(
    auth.apiUrl,
    auth.authorizationToken,
    "b2_update_bucket",
    {
      accountId: auth.accountId,
      bucketId: target.bucketId,
      bucketType: target.bucketType,
      corsRules,
    },
  );

  const verify = await b2Request<{ buckets: B2Bucket[] }>(
    auth.apiUrl,
    auth.authorizationToken,
    "b2_list_buckets",
    {
      accountId: auth.accountId,
    },
  );

  const verified = verify.buckets.find(
    (item) => item.bucketId === target.bucketId,
  );

  console.log(
    `B2 bucket CORS configuration applied successfully to ${verified?.bucketName ?? bucket}.`,
  );
}

async function main() {
  const { endpoint } = getConfig();

  if (/backblazeb2\\.com/i.test(endpoint)) {
    await configureB2Cors();
    return;
  }

  throw new Error(
    "This script currently supports Backblaze B2 bucket CORS administration only. " +
      "Use storage:configure-cors for other S3-compatible providers.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
