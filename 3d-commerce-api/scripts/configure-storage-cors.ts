import "dotenv/config";
import { createHash, createHmac } from "node:crypto";

const encode = (value: string) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );

const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

const md5 = (value: string | Buffer) =>
  createHash("md5").update(value).digest("base64");

function getConfig() {
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

  return { endpoint, bucket, accessKey, secretKey, region };
}

function signingKey(secretKey: string, region: string, dateStamp: string) {
  const kDate = createHmac("sha256", `AWS4${secretKey}`).update(dateStamp).digest();
  const kRegion = createHmac("sha256", kDate).update(region).digest();
  const kService = createHmac("sha256", kRegion).update("s3").digest();
  return createHmac("sha256", kService).update("aws4_request").digest();
}

async function signedRequest(method: "GET" | "PUT", body = "") {
  const { endpoint, bucket, accessKey, secretKey, region } = getConfig();
  const url = new URL(`${endpoint}/${encode(bucket)}`);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const payloadHash = hash(body);

  const headers: Record<string, string> = {
    host: url.host,
    "content-type": "application/xml",
    ...(method === "PUT" ? { "content-md5": md5(body) } : {}),
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };

  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((name) => `${name}:${headers[name].trim()}\n`)
    .join("");
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalRequest = [
    method,
    url.pathname,
    "cors=",
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

  const signature = createHmac("sha256", signingKey(secretKey, region, dateStamp))
    .update(stringToSign)
    .digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(`${url}?cors=`, {
    method,
    headers: { ...headers, authorization },
    body: method === "PUT" ? body : undefined,
  });
}

const corsXml = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>https://voxel3d.org</AllowedOrigin>
    <AllowedOrigin>https://www.voxel3d.org</AllowedOrigin>
    <AllowedOrigin>http://localhost:3000</AllowedOrigin>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <ExposeHeader>Content-Length</ExposeHeader>
    <ExposeHeader>Content-Range</ExposeHeader>
    <ExposeHeader>Accept-Ranges</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`;

async function main() {
  const { endpoint } = getConfig();

  if (/backblazeb2\\.com/i.test(endpoint)) {
    console.log(
      "Configuring CORS through Backblaze B2's S3-compatible PutBucketCors API.",
    );
  }

  const put = await signedRequest("PUT", corsXml);
  if (!put.ok) {
    throw new Error(
      `Unable to configure bucket CORS (${put.status}): ${await put.text()}`,
    );
  }

  const get = await signedRequest("GET");
  if (!get.ok) {
    throw new Error(
      `CORS was configured but could not be read back (${get.status}): ${await get.text()}`,
    );
  }

  console.log(await get.text());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
