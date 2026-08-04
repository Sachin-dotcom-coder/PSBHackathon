/**
 * PHANTOM API — Base URL and fetch helper
 * All API calls go through apiFetch so we have one place to handle errors.
 */

export const API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    throw new Error(`PHANTOM API error ${res.status} on ${path}`);
  }
  return res.json() as Promise<T>;
}
