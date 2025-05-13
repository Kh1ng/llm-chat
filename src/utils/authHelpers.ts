import { Profile } from "../types/types";

export function resolveAuthHeaderName(auth: Profile["auth"]): string {
  if (!auth) return "";
  return auth.type === "custom" ? auth.headerName || "Authorization" : "Authorization";
}

export function resolveAuthHeaderValue(auth: Profile["auth"]): string {
  if (!auth) return "";
  switch (auth.type) {
    case "bearer":
      return `Bearer ${auth.value}`;
    case "basic":
      return `Basic ${btoa(auth.value)}`;
    case "custom":
    default:
      return auth.value;
  }
}

export function buildAuthHeader(profile: Profile): Record<string, string> {
  if (!profile.auth?.value) return {};
  return {
    [resolveAuthHeaderName(profile.auth)]: resolveAuthHeaderValue(profile.auth),
  };
}