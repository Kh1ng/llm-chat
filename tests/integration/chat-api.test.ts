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
    name: "test-profile",
    address: "localhost",
    port: 11434,
    models: ["test-model"],
  };

  let model = "mistral";
  const mockedInvoke = invoke as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock get_documents to return empty array by default
    mockedInvoke.mockImplementation((command) => {
      if (command === "get_documents") {
        return Promise.resolve([]);
      }
      return Promise.resolve("Mock response");
    });
  });

  it("renders the ChatPage with profile and model info", () => {
    render(React.createElement(ChatPage, { profile: mockProfile, model }));
    
    // Check for the welcome message which includes the model name
    expect(screen.getByText("Welcome to LLM Chat")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes(`Start a conversation with ${model}`))).toBeInTheDocument();
  });

  it("submits user input and shows bot reply", async () => {
    const fakeReply = "Hello, world!";
    mockedInvoke.mockImplementation((command) => {
      if (command === "get_documents") {
        return Promise.resolve([]);
      }
      return Promise.resolve(fakeReply);
    });

    render(React.createElement(ChatPage, { profile: mockProfile, model }));

    const input = screen.getByPlaceholderText("Message...") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "Hi" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    await waitFor(() => {
      // Look for the actual message text in the new UI format
      expect(screen.getByText("Hi")).toBeInTheDocument();
      expect(screen.getByText(fakeReply)).toBeInTheDocument();
    });
  });

  it("handles LLM request failure gracefully", async () => {
    mockedInvoke.mockImplementation((command) => {
      if (command === "get_documents") {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error("fail"));
    });

    render(React.createElement(ChatPage, { profile: mockProfile, model }));

    const input = screen.getByPlaceholderText("Message...") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "Hi" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText((content) => content.includes("⚠️ Failed to get response"))).toBeInTheDocument();
    });
  });

  it("shows fallback message when no profile or model", () => {
    render(React.createElement(ChatPage, { profile: null as any, model: "" }));
    expect(
      screen.getByText(/Missing profile or model info/i)
    ).toBeInTheDocument();
  });
});