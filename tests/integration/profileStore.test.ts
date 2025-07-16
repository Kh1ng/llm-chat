import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { saveOrUpdateProfile, sendWakePacket, sendMessage } from "../../src/store/profileStore";
import { startTestServer, stopTestServer } from "../setup/mock-server.cjs";

// Mock the Tauri store since we're in a test environment
vi.mock("@tauri-apps/plugin-store", () => ({
  Store: {
    load: vi.fn().mockResolvedValue({
      get: vi.fn().mockResolvedValue([]),
      set: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe("Profile Store Integration", () => {
  let testServer: { url: string };

  beforeEach(async () => {
    vi.clearAllMocks();
    testServer = await startTestServer();
    console.log("Test server started at", testServer.url);
  });

  afterEach(async () => {
    await stopTestServer();
    console.log("Test server stopped");
  });

  it("should handle profile operations correctly", async () => {
    const profile = {
      name: "Test Profile",
      address: "192.168.1.1:8080",
      macAddress: "AA:BB:CC:DD:EE:FF",
      port: 8080,
      models: [],
    };

    // Save profile (this should work with the mocked store)
    await saveOrUpdateProfile(profile);
    console.log("Profile saved successfully");

    // Send wake packet
    const wakeResponse = await sendWakePacket(profile);
    console.log("Wake packet response:", wakeResponse);
    expect(wakeResponse).toBe("Magic packet sent!");

    // Send message
    const messageResponse = await sendMessage(testServer.url, "Hello LLM");
    console.log("Message response:", messageResponse);
    expect(messageResponse).toBe("You said: Hello LLM");
  });
});
