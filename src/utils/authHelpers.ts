import type { Profile } from "../types/types";

export function buildAuthHeader(profile: Profile): Record<string, string> {
  if (!profile.auth?.value) return {};

  const type = profile.auth.type ?? "bearer";
  const name =
    type === "custom" ? profile.auth.headerName || "Authorization" : "Authorization";
  const value =
    type === "bearer"
      ? `Bearer ${profile.auth.value}`
      : type === "basic"
      ? `Basic ${btoa(profile.auth.value)}`
      : profile.auth.value;

  return { [name]: value };
}

export async function fetchWithOptionalAuth(
  profile: Profile,
  endpoint: string,
  body?: any
): Promise<any> {
  const headers = {
    "Content-Type": "application/json",
    ...buildAuthHeader(profile),
  };

  const response = await fetch(`${profile.address}/${endpoint}`, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}