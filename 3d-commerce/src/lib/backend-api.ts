const DEFAULT_BACKEND_API_URL = "http://localhost:4000";

export function getBackendApiUrl(path: string) {
  const configured = process.env.BACKEND_API_URL;

  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error(
      "BACKEND_API_URL is not configured. Refusing to fall back to localhost in production.",
    );
  }

  const baseUrl = configured ?? DEFAULT_BACKEND_API_URL;
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}
