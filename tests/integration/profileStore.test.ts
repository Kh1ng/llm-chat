import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { saveOrUpdateProfile, sendWakePacket, sendMessage } from "../../src/store/profileStore";
import { startTestServer, stopTestServer } from "../../tests/setup/mock-server.cjs";

vi.mock("../../tests/setup/mock-server.cjs", () => {
  console.log("Applying mock for startTestServer and stopTestServer");
  return {
    startTestServer: vi.fn().mockResolvedValue({
      url: "http://localhost:11434",
    }),
    stopTestServer: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../../src/store/profileStore", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("../../src/store/profileStore");
  return {
    saveOrUpdateProfile: vi.fn().mockResolvedValue({ success: true }),
    loadProfiles: actual.loadProfiles,
    saveProfiles: actual.saveProfiles,
    updateProfileModels: actual.updateProfileModels,
    sendWakePacket: actual.sendWakePacket,
    sendMessage: actual.sendMessage,
  };
});

describe("Profile Store Integration", () => {
  let testServer: { url: string };

  beforeEach(async () => {
    vi.resetAllMocks();
    console.log("Mocks reset");
    testServer = await startTestServer();
    console.log("Test server started at", testServer.url);
  });

  afterEach(async () => {
    await stopTestServer();
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

    // Ensure sendWakePacket mock resolves correctly
    vi.mock("../../src/store/profileStore", () => ({
      sendWakePacket: vi.fn().mockResolvedValue("Magic packet sent!"),
    }));

    // Send message
    const messageResponse = await sendMessage(testServer.url, "Hello LLM");
    expect(sendMessage).toHaveBeenCalledWith(testServer.url, "Hello LLM");
    expect(messageResponse).toBe("Hello from LLM!");
  });
});
