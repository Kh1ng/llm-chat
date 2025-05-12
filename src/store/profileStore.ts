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