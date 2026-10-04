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

async function signedLifecycleRequest(
  method: "GET" | "PUT",
  body = "",
): Promise<Response> {
  const { endpoint, bucket, accessKey, secretKey, region } = getConfig();
  const url = new URL(`${endpoint}/${encode(bucket)}`);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const payloadHash = hash(body);

  const headers: Record<string, string> = {
    host: url.host,
    ...(method === "PUT" ? { "content-type": "application/xml", "content-md5": md5(body) } : {}),
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

  const signature = createHmac("sha256", signingKey(secretKey, region, dateStamp))
    .update(stringToSign)
    .digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(`${url}?lifecycle=`, {
    method,
    headers: { ...headers, authorization },
    body: method === "PUT" ? body : undefined,
  });
}

const managedRule = `  <Rule>
    <ID>abort-incomplete-product-multipart-uploads</ID>
    <Filter>
      <Prefix>products/</Prefix>
    </Filter>
    <Status>Enabled</Status>
    <AbortIncompleteMultipartUpload>
      <DaysAfterInitiation>1</DaysAfterInitiation>
    </AbortIncompleteMultipartUpload>
  </Rule>`;

function mergeLifecycleConfiguration(existingXml: string): string {
  const rules =
    existingXml.match(/<Rule(?:\s[^>]*)?>[\s\S]*?<\/Rule>/g) ?? [];
  const managedId = "abort-incomplete-product-multipart-uploads";
  const managedIndex = rules.findIndex((rule) =>
    rule.includes(`<ID>${managedId}</ID>`),
  );

  if (managedIndex >= 0) {
    rules[managedIndex] = managedRule;
  } else {
    rules.push(managedRule);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<LifecycleConfiguration>
${rules.join("\n")}
</LifecycleConfiguration>`;
}

async function main() {
  const response = await signedLifecycleRequest("GET");

  let existingXml = "";
  if (response.ok) {
    existingXml = await response.text();
  } else if (response.status !== 404) {
    throw new Error(
      `Unable to read existing bucket lifecycle (${response.status}): ${await response.text()}`,
    );
  }

  const lifecycleXml = mergeLifecycleConfiguration(existingXml);
  const put = await signedLifecycleRequest("PUT", lifecycleXml);

  if (!put.ok) {
    throw new Error(
      `Unable to configure multipart lifecycle (${put.status}): ${await put.text()}`,
    );
  }

  console.log(
    "Configured S3 lifecycle: incomplete multipart uploads under products/ are aborted after 1 day.",
  );
  if (existingXml) {
    console.log("Existing lifecycle rules were preserved; the managed rule was added or updated.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
