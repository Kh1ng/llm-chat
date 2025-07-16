import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProfileForm from "../../src/components/ProfileForm";
import { toast } from "sonner";
import { saveOrUpdateProfile } from "../../src/store/profileStore";

vi.mock("../../src/utils/validation", async () => {
  const actual = await vi.importActual("../../src/utils/validation");
  return {
    ...actual,
    isValidMacAddress: vi.fn((input) => /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(input)),
    isValidAddress: vi.fn((input) => /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d{2,5})?$/.test(input)),
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

describe("ProfileForm Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    console.log("Mocks reset");
  });

  it("shows error for invalid MAC address", async () => {
    render(<ProfileForm />);
    console.log("ProfileForm rendered");

    // Toggle advanced settings to render the checkbox
    const advancedButton = screen.getByText(/Show Advanced Settings/i);
    fireEvent.click(advancedButton);
    console.log("Advanced settings toggled");

    const wakeOnLanCheckbox = screen.getByLabelText(/Enable Wake-on-LAN/i);
    fireEvent.click(wakeOnLanCheckbox);
    console.log("Wake-on-LAN enabled");

    const macInput = screen.getByPlaceholderText(/MAC address/i) as HTMLInputElement;
    fireEvent.change(macInput, { target: { value: "ZZ:ZZ:ZZ:ZZ:ZZ:ZZ" } });
    console.log("Invalid MAC address entered");

    const submitButton = screen.getByText(/Save Profile/i);
    fireEvent.click(submitButton);
    console.log("Submit button clicked");

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Invalid MAC address. Please enter a valid format (e.g. AA:BB:CC:DD:EE:FF)."
      );
      console.log("Error toast validated");
    });
  });

  it("shows error for missing port in address", async () => {
    render(<ProfileForm />);
    console.log("ProfileForm rendered");

    const addressInput = screen.getByPlaceholderText(/LLM URL or IP/i) as HTMLInputElement;
    fireEvent.change(addressInput, { target: { value: "192.168.1.1" } });
    console.log("Address input changed");

    const submitButton = screen.getByText(/Save Profile/i);
    fireEvent.click(submitButton);
    console.log("Submit button clicked");

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Please enter a valid IP Address or domain."
      );
      console.log("Error toast validated");
    });
  });

  it("saves profile with valid inputs", async () => {
    render(<ProfileForm />);
    console.log("ProfileForm rendered");

    // Toggle advanced settings to render the checkbox
    const advancedButton = screen.getByText(/Show Advanced Settings/i);
    fireEvent.click(advancedButton);
    console.log("Advanced settings toggled");

    const wakeOnLanCheckbox = screen.getByLabelText(/Enable Wake-on-LAN/i);
    fireEvent.click(wakeOnLanCheckbox);
    console.log("Wake-on-LAN enabled");

    const nameInput = screen.getByPlaceholderText(/Profile name/i) as HTMLInputElement;
    const addressInput = screen.getByPlaceholderText(/LLM URL or IP/i) as HTMLInputElement;
    const macInput = screen.getByPlaceholderText(/MAC address/i) as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: "Test Profile" } });
    console.log("Name input changed");
    fireEvent.change(addressInput, { target: { value: "192.168.1.1:8080" } });
    console.log("Address input changed");
    fireEvent.change(macInput, { target: { value: "AA:BB:CC:DD:EE:FF" } });
    console.log("MAC address input changed");

    const submitButton = screen.getByText(/Save Profile/i);
    fireEvent.click(submitButton);
    console.log("Submit button clicked");

    await waitFor(() => {
      expect(saveOrUpdateProfile).toHaveBeenCalledWith({
        name: "Test Profile",
        address: "192.168.1.1:8080",
        macAddress: "AA:BB:CC:DD:EE:FF",
        port: 8080,
      });
      console.log("saveOrUpdateProfile validated");
      expect(toast.success).toHaveBeenCalledWith("Profile saved!");
      console.log("Success toast validated");
    });
  });
});
