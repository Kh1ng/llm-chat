import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadProfiles,
  saveProfiles,
  updateProfileModels,
  saveOrUpdateProfile
} from "../../src/store/profileStore";
import { Profile } from "../../src/types/types"

const fakeData: Record<string, any> = {};

class MockStore {
  async get<T>(key: string): Promise<T | undefined> {
    return fakeData[key];
  }

  async set<T>(key: string, value: T): Promise<void> {
    fakeData[key] = value;
  }

  async save(): Promise<void> {}

  clear(): void {
    for (const key of Object.keys(fakeData)) {
      delete fakeData[key];
    }
  }
}

const sharedStore = new MockStore();

vi.mock("@tauri-apps/plugin-store", () => {
  return {
    Store: {
      load: async () => sharedStore
    }
  };
});

const mockProfiles: Profile[] = [
  { name: "local", address: "localhost:11434", models: ["llama3", "codellama"] },
  { name: "remote", address: "192.168.1.5", models: ["wizardlm"] },
];

beforeEach(async () => {
  sharedStore.clear();
  const mod = await import("../../src/store/profileStore");
  (mod as any).store = null;

  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(".test");
  await store.set("profiles", []);
});

describe("profileStore", () => {
  it("loads empty list when no profiles are saved", async () => {
    const profiles = await loadProfiles();
    expect(profiles).toEqual([]);
  });

  it("saves and loads profiles correctly", async () => {
    await saveProfiles(mockProfiles);
    const loaded = await loadProfiles();
    expect(loaded).toEqual(mockProfiles);
    expect(fakeData["profiles"]).toEqual(mockProfiles);
  });

  it("overwrites old profiles with same name", async () => {
    const first = [{ name: "test", address: "localhost", models: ["v1"] }];
    const updated = [{ name: "test", address: "localhost", models: ["v2"] }];
    await saveProfiles(first);
    await saveProfiles(updated);
    const loaded = await loadProfiles();
    expect(loaded).toEqual(updated);
  });

  it("handles corrupted profile data gracefully", async () => {
    fakeData["profiles"] = "__corrupted__";
       
    const result = await loadProfiles();
    expect(Array.isArray(result)).toBe(true);
  });

it("updates models for an existing profile using updateProfileModels", async () => {
  await saveProfiles(mockProfiles);
  await updateProfileModels("local", ["new-model"]);
  const updated = await loadProfiles();
  const local = updated.find(p => p.name === "local");
  expect(local?.models).toEqual(["new-model"]);
});

it("saves a new profile with saveOrUpdateProfile", async () => {
  const newProfile: Profile = {
    name: "test1",
    address: "127.0.0.1",
    models: ["mistral"]
  };
  await saveOrUpdateProfile(newProfile);
  const loaded = await loadProfiles();
  expect(loaded.find(p => p.name === "test1")).toEqual(newProfile);
});

it("overwrites a profile with saveOrUpdateProfile", async () => {
  const original: Profile = {
    name: "duplicate",
    address: "127.0.0.1",
    models: ["v1"]
  };
  const updated: Profile = {
    name: "duplicate",
    address: "127.0.0.1",
    models: ["v2"]
  };
  await saveOrUpdateProfile(original);
  await saveOrUpdateProfile(updated);
  const result = await loadProfiles();
  expect(result.find(p => p.name === "duplicate")).toEqual(updated);
});
});