import "dotenv/config";

type B2Bucket = {
  bucketId: string;
  bucketName: string;
  bucketType: string;
  corsRules?: unknown[];
};

type B2AuthorizeResponse = {
  accountId: string;
  authorizationToken: string;
  apiInfo?: {
    storageApi?: {
      apiUrl?: string;
    };
  };
};

const CORS_RULES = [
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
  const bucket = process.env.STORAGE_BUCKET?.trim() ?? "";
  const keyId = process.env.B2_CORS_KEY_ID?.trim() ?? "";
  const applicationKey = process.env.B2_CORS_APPLICATION_KEY?.trim() ?? "";

  if (!bucket) {
    throw new Error("STORAGE_BUCKET is required.");
  }

  if (!keyId || !applicationKey) {
    throw new Error(
      "B2_CORS_KEY_ID and B2_CORS_APPLICATION_KEY are required. " +
        "Use a Backblaze application key with writeBuckets capability for this one-time bucket configuration.",
    );
  }

  return { bucket, keyId, applicationKey };
}

async function authorizeB2(
  keyId: string,
  applicationKey: string,
): Promise<B2AuthorizeResponse> {
  const credentials = Buffer.from(
    `${keyId}:${applicationKey}`,
    "utf8",
  ).toString("base64");

  const response = await fetch(
    "https://api.backblazeb2.com/b2api/v4/b2_authorize_account",
    {
      method: "GET",
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

  const parsed = JSON.parse(body) as B2AuthorizeResponse;
  const apiUrl = parsed.apiInfo?.storageApi?.apiUrl;

  if (!apiUrl) {
    throw new Error(
      "B2 authorization succeeded, but apiInfo.storageApi.apiUrl was not returned by b2_authorize_account.",
    );
  }

  return parsed;
}

async function b2Request<T>(
  auth: B2AuthorizeResponse,
  action: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(
    `${auth.apiInfo?.storageApi?.apiUrl}/b2api/v4/${action}`,
    {
      method: "POST",
      headers: {
        Authorization: auth.authorizationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `B2 ${action} failed (${response.status}): ${body}`,
    );
  }

  return JSON.parse(body) as T;
}

async function configureB2Cors() {
  const { bucket, keyId, applicationKey } = getConfig();

  console.log(`Authorizing Backblaze B2 for bucket: ${bucket}`);

  const auth = await authorizeB2(keyId, applicationKey);

  const list = await b2Request<{ buckets: B2Bucket[] }>(
    auth,
    "b2_list_buckets",
    {
      accountId: auth.accountId,
      bucketName: bucket,
    },
  );

  const target = list.buckets.find(
    (candidate) => candidate.bucketName === bucket,
  );

  if (!target) {
    throw new Error(
      `Backblaze bucket "${bucket}" was not found for account "${auth.accountId}".`,
    );
  }

  console.log(
    `Updating CORS on ${target.bucketName} (${target.bucketId})...`,
  );

  await b2Request(
    auth,
    "b2_update_bucket",
    {
      accountId: auth.accountId,
      bucketId: target.bucketId,
      bucketType: target.bucketType,
      corsRules: CORS_RULES,
    },
  );

  const verify = await b2Request<{ buckets: B2Bucket[] }>(
    auth,
    "b2_list_buckets",
    {
      accountId: auth.accountId,
      bucketName: bucket,
    },
  );

  const verified = verify.buckets.find(
    (candidate) => candidate.bucketId === target.bucketId,
  );

  const rules = verified?.corsRules ?? [];

  if (rules.length === 0) {
    throw new Error(
      "B2 accepted the bucket update but returned no CORS rules during verification.",
    );
  }

  console.log("B2 CORS configured successfully.");
  console.log(JSON.stringify(rules, null, 2));
}

configureB2Cors().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
