const rawApiUrl = import.meta.env.VITE_API_URL ?? "";

export const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");

export function apiUrl(path: string): string {
  if (!API_BASE_URL) return path;
  return path.startsWith("/") ? `${API_BASE_URL}${path}` : `${API_BASE_URL}/${path}`;
}
