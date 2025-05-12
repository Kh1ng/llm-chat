import { Store } from "@tauri-apps/plugin-store";

export type Profile = {
  name: string;
  address: string;
  models: string[];
};

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