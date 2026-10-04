export interface ModelUploadProgress {
  (percent: number): void;
}

interface UploadSession {
  key: string;
  uploadId: string;
  partSize: number;
  parts: { partNumber: number; url: string }[];
}

interface UploadedPart {
  PartNumber: number;
  ETag: string;
}

export async function uploadModelDirect(
  productId: string,
  file: File,
  onProgress: ModelUploadProgress,
  signal?: AbortSignal,
) {
  const base = `/api/products/${encodeURIComponent(productId)}/model-multipart`;

  const post = async (
    path: string,
    body: unknown,
    requestSignal: AbortSignal | undefined = signal,
  ) => {
    const response = await fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: requestSignal,
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data?.message ?? data?.error ?? `Upload request failed (${response.status})`,
      );
    }

    return data;
  };

  const session = (await post("", { size: file.size })) as UploadSession;
  const etags: UploadedPart[] = [];
  let doneBytes = 0;
  const sessionController = new AbortController();
  const onSessionAbort = () => sessionController.abort();
  signal?.addEventListener("abort", onSessionAbort, { once: true });

  const putPart = async (part: UploadSession["parts"][number]) => {
    const start = (part.partNumber - 1) * session.partSize;
    const blob = file.slice(
      start,
      Math.min(file.size, start + session.partSize),
    );

    for (let attempt = 0; ; attempt += 1) {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 180_000);

      const onAbort = () => controller.abort();
      const onSession = () => controller.abort();
      signal?.addEventListener("abort", onAbort, { once: true });
      sessionController.signal.addEventListener("abort", onSession, { once: true });

      try {
        if (signal?.aborted || sessionController.signal.aborted) {
          throw new DOMException("Upload cancelled", "AbortError");
        }

        if (!navigator.onLine) {
          await new Promise<void>((resolve, reject) => {
            const handleOnline = () => {
              window.removeEventListener("online", handleOnline);
              resolve();
            };
            window.addEventListener("online", handleOnline, { once: true });

            if (signal) {
              const handleAbort = () => {
                window.removeEventListener("online", handleOnline);
                reject(new DOMException("Upload cancelled", "AbortError"));
              };
              signal.addEventListener("abort", handleAbort, { once: true });
            }
          });
        }

        const response = await fetch(part.url, {
          method: "PUT",
          body: blob,
          signal: controller.signal,
        });

        if (!response.ok) {
          const error = Object.assign(
            new Error(`Storage returned ${response.status}`),
            { status: response.status },
          );
          throw error;
        }

        const etag = response.headers.get("ETag");

        if (!etag) {
          throw Object.assign(
            new Error("Bucket CORS must expose the ETag response header"),
            { status: 400 },
          );
        }

        etags.push({
          PartNumber: part.partNumber,
          ETag: etag,
        });

        doneBytes += blob.size;
        onProgress(Math.round((doneBytes / file.size) * 100));
        return;
      } catch (error) {
        const status =
          typeof error === "object" &&
          error !== null &&
          "status" in error
            ? Number((error as { status?: number }).status)
            : undefined;

        if (signal?.aborted || sessionController.signal.aborted) {
          throw error;
        }

        if (status === 400 || status === 403 || attempt >= 6) {
          sessionController.abort();
          throw error;
        }

        await new Promise((resolve) =>
          window.setTimeout(
            resolve,
            Math.min(20_000, 600 * 2 ** attempt) +
              Math.random() * 300,
          ),
        );
      } finally {
        window.clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        sessionController.signal.removeEventListener("abort", onSession);
      }
    }
  };

  let nextPart = 0;
  const workers = Math.min(3, session.parts.length);

  try {
    await Promise.all(
      Array.from({ length: workers }, async () => {
        while (nextPart < session.parts.length) {
          const part = session.parts[nextPart];
          nextPart += 1;
          await putPart(part);
        }
      }),
    );
  } catch (error) {
    await post(
      "/abort",
      { key: session.key, uploadId: session.uploadId },
      undefined,
    ).catch(() => undefined);
    throw error;
  } finally {
    signal?.removeEventListener("abort", onSessionAbort);
  }

  return post("/complete", {
    key: session.key,
    uploadId: session.uploadId,
    size: file.size,
    originalName: file.name,
    parts: etags,
  });
}
