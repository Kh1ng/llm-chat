import * as React from "react";
import { describe, it, beforeEach, beforeAll, vi, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ChatPage from "../../src/pages/ChatPage.tsx";
import { type Profile } from "@/types/types";
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));
import { invoke } from "@tauri-apps/api/core";

beforeAll(() => {
  // Mock scrollIntoView to prevent test crash
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe("ChatPage", () => {
  const mockProfile: Profile = {
    name: "local",
    address: "localhost:11434",
    models: ["mistral"],
  };

  let model = "mistral";
  const mockedInvoke = invoke as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the ChatPage with profile and model info", () => {
    render(React.createElement(ChatPage, { profile: mockProfile, model }));
    expect(screen.getByText(`Chat with ${model}`)).toBeInTheDocument();
    expect(
      screen.getByText(`Using profile: ${mockProfile.name} (${mockProfile.address})`)
    ).toBeInTheDocument();
  });

  it("submits user input and shows bot reply", async () => {
    const fakeReply = "Hello, world!";
    mockedInvoke.mockResolvedValue(fakeReply);

    render(React.createElement(ChatPage, { profile: mockProfile, model }));

    const input = screen.getByPlaceholderText("Type your message") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "Hi" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText("You:")).toBeInTheDocument();
      expect(screen.getByText("Hi")).toBeInTheDocument();
      expect(screen.getByText(`${model}:`)).toBeInTheDocument();
      expect(screen.getByText(fakeReply)).toBeInTheDocument();
    });
  });

  it("handles LLM request failure gracefully", async () => {
    mockedInvoke.mockRejectedValue(new Error("fail"));

    render(React.createElement(ChatPage, { profile: mockProfile, model }));

    const input = screen.getByPlaceholderText("Type your message") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "Hi" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText("⚠️ Failed to get response.")).toBeInTheDocument();
    });
  });

  it("shows fallback message when no profile or model", () => {
    render(React.createElement(ChatPage, { profile: null as any, model: "" }));
    expect(
      screen.getByText(/Missing profile or model info/i)
    ).toBeInTheDocument();
  });
});