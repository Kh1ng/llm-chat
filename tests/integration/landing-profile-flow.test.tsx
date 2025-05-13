import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import LandingPage from "@/pages/LandingPage";
import * as profileStore from "@/store/profileStore";

vi.mock("@/store/profileStore", async () => {
  const actual = await vi.importActual<typeof profileStore>(
    "@/store/profileStore"
  );
  return {
    ...actual,
    loadProfiles: vi.fn(),
    saveOrUpdateProfile: vi.fn(),
  };
});

describe("Landing Profile Flow", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows profile form when no profiles are found", async () => {
    (
      profileStore.loadProfiles as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue([]);
    render(<LandingPage onOpenChat={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/No profiles available/i)).toBeInTheDocument();
    });
  });

  it("loads profile list if profiles exist", async () => {
    (
      profileStore.loadProfiles as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue([
      { name: "test", address: "localhost", models: ["mistral"] },
    ]);
    render(<LandingPage onOpenChat={() => {}} />);

    await waitFor(() => {
      expect(
        screen.getByText((content) => content.includes("test") && content.includes("localhost"))
      ).toBeInTheDocument();
    });
  });

  vi.mock("@tauri-apps/api/core", () => ({
    invoke: vi.fn().mockResolvedValue(undefined),
  }));

  it("sends magic packet when Wake LLM is clicked", async () => {
    const mockProfile = {
      name: "test",
      address: "localhost",
      models: ["mistral"],
      macAddress: "00:11:22:33:44:55",
    };

    (
      profileStore.loadProfiles as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue([mockProfile]);

    const { invoke } = await import("@tauri-apps/api/core");

    render(<LandingPage onOpenChat={() => {}} />);

    const wakeButton = await screen.findByRole("button", { name: /Wake LLM/i });
    fireEvent.click(wakeButton);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("wake_on_lan", {
        profile: mockProfile,
      });
    });
  });
});
