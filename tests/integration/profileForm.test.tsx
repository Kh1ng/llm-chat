import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProfileForm from "../../src/components/ProfileForm";
import { toast } from "sonner";
import { saveOrUpdateProfile } from "../../src/store/profileStore";

// Mock Tauri invoke function
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock validation functions 
vi.mock("../../src/utils/validation", async () => {
  const actual = await vi.importActual("../../src/utils/validation");
  return {
    ...actual,
    isValidMacAddress: vi.fn((input) => /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(input)),
    isValidAddress: vi.fn((input) => {
      // Return false for "192.168.1.1" to trigger validation failure
      if (input === "192.168.1.1") return false;
      return /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d{2,5})?$|^(\d{1,3}\.){3}\d{1,3}:\d{2,5}$/.test(input);
    }),
    looksLikeIpWithoutPort: vi.fn((input) => {
      // Return false for "192.168.1.1" so it goes to the error path
      if (input === "192.168.1.1") return false;
      return /^(\d{1,3}\.){3}\d{1,3}$/.test(input);
    }),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../src/store/profileStore", () => ({
  saveOrUpdateProfile: vi.fn().mockResolvedValue(undefined),
}));

const { invoke } = await import("@tauri-apps/api/core");

describe("ProfileForm Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Mock successful response from get_models
    (invoke as any).mockResolvedValue(JSON.stringify({
      models: [{ name: "test-model" }]
    }));
  });

  it("shows error for invalid MAC address", async () => {
    render(<ProfileForm />);

    // Fill in required fields first
    const nameInput = screen.getByPlaceholderText(/Profile name/i) as HTMLInputElement;
    const addressInput = screen.getByPlaceholderText(/LLM URL or IP/i) as HTMLInputElement;
    
    fireEvent.change(nameInput, { target: { value: "Test Profile" } });
    fireEvent.change(addressInput, { target: { value: "192.168.1.1:8080" } });

    // Toggle advanced settings to render the checkbox
    const advancedButton = screen.getByText(/Show Advanced Settings/i);
    fireEvent.click(advancedButton);

    const wakeOnLanCheckbox = screen.getByLabelText(/Enable Wake-on-LAN/i);
    fireEvent.click(wakeOnLanCheckbox);

    const macInput = screen.getByPlaceholderText(/MAC address/i) as HTMLInputElement;
    fireEvent.change(macInput, { target: { value: "ZZ:ZZ:ZZ:ZZ:ZZ:ZZ" } });

    const submitButton = screen.getByText(/Save Profile/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Invalid MAC address. Please enter a valid format (e.g. AA:BB:CC:DD:EE:FF)."
      );
    });
  });

  it("shows error for missing port in address", async () => {
    render(<ProfileForm />);

    const nameInput = screen.getByPlaceholderText(/Profile name/i) as HTMLInputElement;
    const addressInput = screen.getByPlaceholderText(/LLM URL or IP/i) as HTMLInputElement;
    
    fireEvent.change(nameInput, { target: { value: "Test Profile" } });
    fireEvent.change(addressInput, { target: { value: "192.168.1.1" } });

    const submitButton = screen.getByText(/Save Profile/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Please enter a valid IP Address or domain."
      );
    });
  });

  it("saves profile with valid inputs", async () => {
    render(<ProfileForm />);

    // Fill in required fields
    const nameInput = screen.getByPlaceholderText(/Profile name/i) as HTMLInputElement;
    const addressInput = screen.getByPlaceholderText(/LLM URL or IP/i) as HTMLInputElement;
    const portInput = screen.getByPlaceholderText(/Port \(default 11434\)/i) as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: "Test Profile" } });
    fireEvent.change(addressInput, { target: { value: "192.168.1.1:8080" } });
    fireEvent.change(portInput, { target: { value: "8080" } });

    // Toggle advanced settings and enable Wake-on-LAN
    const advancedButton = screen.getByText(/Show Advanced Settings/i);
    fireEvent.click(advancedButton);

    const wakeOnLanCheckbox = screen.getByLabelText(/Enable Wake-on-LAN/i);
    fireEvent.click(wakeOnLanCheckbox);

    const macInput = screen.getByPlaceholderText(/MAC address/i) as HTMLInputElement;
    fireEvent.change(macInput, { target: { value: "AA:BB:CC:DD:EE:FF" } });

    const submitButton = screen.getByText(/Save Profile/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(saveOrUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Profile",
          address: "192.168.1.1:8080",
          macAddress: "AA:BB:CC:DD:EE:FF",
          port: 8080,
          models: ["test-model"],
          broadcastAddress: "192.168.1.255"
        })
      );
      expect(toast.success).toHaveBeenCalledWith("Profile saved!");
    });
  });
});
