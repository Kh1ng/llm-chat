import { Store } from "@tauri-apps/plugin-store";
import  { Profile } from "../types/types"

let store: Store | null = null;

async function getStore() {
  if (!store) {
    store = await Store.load(".profiles.json");
  }
  return store;
}

export async function loadProfiles(): Promise<Profile[]> {
  const s = await getStore();
  const data = await s.get("profiles");
  return Array.isArray(data) ? (data as Profile[]) : [];
}

export async function saveProfiles(profiles: Profile[]) {
  const s = await getStore();
  await s.set("profiles", profiles);
  await s.save();
}

export async function updateProfileModels(profileName: string, models: string[]) {
  const s = await getStore();
  const profiles = await loadProfiles();
  const updatedProfiles = profiles.map((p) =>
    p.name === profileName ? { ...p, models } : p
  );
  await saveProfiles(updatedProfiles);
}

export async function saveOrUpdateProfile(profile: Profile) {
  const existing = await loadProfiles();
  const updated = [
    ...existing.filter((p) => p.name !== profile.name),
    profile,
  ];
  await saveProfiles(updated);
}