const DEFAULT_BACKEND_API_URL = "http://localhost:3001";

export function getBackendApiUrl(path: string) {
  const baseUrl = process.env.BACKEND_API_URL ?? DEFAULT_BACKEND_API_URL;
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}
