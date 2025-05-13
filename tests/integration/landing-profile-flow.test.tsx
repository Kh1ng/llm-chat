import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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
      profileStore.loadProfiles as vi.MockedFunction<
        typeof profileStore.loadProfiles
      >
    ).mockResolvedValue([]);
    render(<LandingPage onOpenChat={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/No profiles available/i)).toBeInTheDocument();
    });
  });

  it("loads profile list if profiles exist", async () => {
    (
      profileStore.loadProfiles as vi.MockedFunction<
        typeof profileStore.loadProfiles
      >
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
});
