import { describe, it, expect, beforeEach } from "vitest";
import { loadProfiles, saveProfiles } from "../../src/store/profileStore";
import { Profile } from "../../src/types/types"

vi.mock("@tauri-apps/plugin-store", () => {
  let fakeData: any = {};

  return {
    Store: class {
      constructor() {}
      static async load() {
        return new this();
      }
      async get() {
        return fakeData["profiles"] || [];
      }
      async set(key: string, value: any) {
        fakeData[key] = value;
      }
      async save() {}
    }
  };
});

const mockProfiles: Profile[] = [
  { name: "local", address: "localhost:11434", models: ["llama3", "codellama"] },
  { name: "remote", address: "192.168.1.5", models: ["wizardlm"] },
];

beforeEach(async () => {
  // Clear the store to ensure clean state for each test
  await saveProfiles([]);
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
    const { Store } = await import("@tauri-apps/plugin-store");

    // Override get() to simulate corrupted data
    Store.prototype.get = async () => "__corrupted__" as unknown as undefined; 
       
    const result = await loadProfiles();
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws when attempting to save a profile with missing required fields", async () => {
    const invalidProfiles = [
      { name: "", address: "localhost", models: ["llama3"] },
      { name: "Test", address: "", models: ["llama3"] },
      { name: "Test", address: "localhost", models: [] }
    ];

    for (const profile of invalidProfiles) {
      await expect(() => saveProfiles([profile as Profile])).rejects.toThrow();
    }
  });
});