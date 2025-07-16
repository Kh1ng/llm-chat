import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { saveOrUpdateProfile, sendWakePacket, sendMessage } from "../../src/store/profileStore";

// Mock the mock-server module completely
vi.mock("../../tests/setup/mock-server.cjs", () => ({
  startTestServer: vi.fn(() => Promise.resolve({ url: "http://localhost:11434" })),
  stopTestServer: vi.fn(() => Promise.resolve()),
}));

// Mock the profileStore functions
vi.mock("../../src/store/profileStore", () => ({
  saveOrUpdateProfile: vi.fn(() => Promise.resolve({ success: true })),
  sendWakePacket: vi.fn(() => Promise.resolve("Magic packet sent!")),
  sendMessage: vi.fn(() => Promise.resolve("Hello from LLM!")),
  loadProfiles: vi.fn(),
  saveProfiles: vi.fn(),
  updateProfileModels: vi.fn(),
}));

describe("Profile Store Integration", () => {
  const testServerUrl = "http://localhost:11434";

  beforeEach(async () => {
    vi.clearAllMocks();
    console.log("Mocks reset");
  });

  afterEach(async () => {
    console.log("Test server stopped");
  });

  it("should add a profile, send a wake packet, and send a message to the LLM", async () => {
    const profile = {
      name: "Test Profile",
      address: "192.168.1.1:8080",
      macAddress: "AA:BB:CC:DD:EE:FF",
      port: 8080,
      models: [],
    };

    console.log("Profile to save:", profile);

    // Save profile
    await saveOrUpdateProfile(profile);
    console.log("saveOrUpdateProfile called");
    expect(saveOrUpdateProfile).toHaveBeenCalledWith(profile);

    // Send wake packet
    const wakeResponse = await sendWakePacket(profile);
    console.log("Wake packet response:", wakeResponse);
    expect(sendWakePacket).toHaveBeenCalledWith(profile);
    expect(wakeResponse).toBe("Magic packet sent!");

    // Send message
    const messageResponse = await sendMessage(testServerUrl, "Hello LLM");
    expect(sendMessage).toHaveBeenCalledWith(testServerUrl, "Hello LLM");
    expect(messageResponse).toBe("Hello from LLM!");
  });
});
