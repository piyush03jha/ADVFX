import { createHash, createHmac } from "node:crypto";

const endpoint = (process.env.STORAGE_ENDPOINT ?? "").replace(/\/$/, "");
const bucket = process.env.STORAGE_BUCKET ?? "";
const accessKey = process.env.STORAGE_ACCESS_KEY_ID ?? "";
const secretKey = process.env.STORAGE_SECRET_ACCESS_KEY ?? "";
const region = process.env.STORAGE_REGION ?? "us-east-1";

if (!endpoint || !bucket || !accessKey || !secretKey) {
  throw new Error(
    "STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY are required",
  );
}

const encode = (value: string) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );

const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

const md5 = (value: string | Buffer) =>
  createHash("md5").update(value).digest("base64");

function signingKey(dateStamp: string) {
  const kDate = createHmac("sha256", `AWS4${secretKey}`).update(dateStamp).digest();
  const kRegion = createHmac("sha256", kDate).update(region).digest();
  const kService = createHmac("sha256", kRegion).update("s3").digest();
  return createHmac("sha256", kService).update("aws4_request").digest();
}

async function putLifecycle(body: string) {
  const url = new URL(`${endpoint}/${encode(bucket)}`);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const payloadHash = hash(body);

  const headers: Record<string, string> = {
    host: url.host,
    "content-type": "application/xml",
    "content-md5": md5(body),
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };

  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((name) => `${name}:${headers[name].trim()}\n`)
    .join("");
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalRequest = [
    "PUT",
    url.pathname,
    "lifecycle=",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    hash(canonicalRequest),
  ].join("\n");

  const signature = createHmac("sha256", signingKey(dateStamp))
    .update(stringToSign)
    .digest("hex");

  const auth =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`${url}?lifecycle=`, {
    method: "PUT",
    headers: { ...headers, authorization: auth },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `Unable to configure multipart lifecycle (${response.status}): ${await response.text()}`,
    );
  }
}

const lifecycleXml = `<?xml version="1.0" encoding="UTF-8"?>
<LifecycleConfiguration>
  <Rule>
    <ID>abort-incomplete-product-multipart-uploads</ID>
    <Filter>
      <Prefix>products/</Prefix>
    </Filter>
    <Status>Enabled</Status>
    <AbortIncompleteMultipartUpload>
      <DaysAfterInitiation>1</DaysAfterInitiation>
    </AbortIncompleteMultipartUpload>
  </Rule>
</LifecycleConfiguration>`;

await putLifecycle(lifecycleXml);

console.log(
  "Configured S3 lifecycle: incomplete multipart uploads under products/ are aborted after 1 day.",
);
