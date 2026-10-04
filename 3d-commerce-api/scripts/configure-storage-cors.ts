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

function signingKey(dateStamp: string) {
  const kDate = createHmac("sha256", `AWS4${secretKey}`).update(dateStamp).digest();
  const kRegion = createHmac("sha256", kDate).update(region).digest();
  const kService = createHmac("sha256", kRegion).update("s3").digest();
  return createHmac("sha256", kService).update("aws4_request").digest();
}

async function signedRequest(method: "GET" | "PUT", body = "") {
  const url = new URL(`${endpoint}/${encode(bucket)}`);
  const query = { cors: "" };
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const payloadHash = hash(body);

  const headers: Record<string, string> = {
    host: url.host,
    "content-type": "application/xml",
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };

  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((name) => `${name}:${headers[name].trim()}\n`)
    .join("");
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalQuery = "cors=";

  const canonicalRequest = [
    method,
    url.pathname,
    canonicalQuery,
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

  const auth = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(`${url}?cors=`, {
    method,
    headers: {
      ...headers,
      authorization: auth,
    },
    body: method === "PUT" ? body : undefined,
  });
}

const corsXml = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>https://voxel3d.org</AllowedOrigin>
    <AllowedOrigin>https://www.voxel3d.org</AllowedOrigin>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`;

const put = await signedRequest("PUT", corsXml);
if (!put.ok) {
  throw new Error(`Unable to configure bucket CORS (${put.status}): ${await put.text()}`);
}

const get = await signedRequest("GET");
if (!get.ok) {
  throw new Error(`CORS was configured but could not be read back (${get.status})`);
}

console.log(await get.text());
