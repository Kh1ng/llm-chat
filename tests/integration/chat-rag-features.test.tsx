import * as React from "react";
import { describe, it, beforeEach, beforeAll, vi, expect } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import ChatPage from "../../src/pages/ChatPage";
import { type Profile } from "@/types/types";

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  },
}));

import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

beforeAll(() => {
  // Mock scrollIntoView to prevent test crash
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  
  // Mock File API for upload tests
  global.FileReader = class {
    readAsArrayBuffer = vi.fn();
    onload = vi.fn();
    result = new ArrayBuffer(8);
    constructor() {
      setTimeout(() => {
        this.onload?.({ target: { result: this.result } });
      }, 0);
    }
  } as any;
  
  // Mock File.prototype.arrayBuffer for upload tests
  global.File.prototype.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
});

describe("ChatPage RAG Features", () => {
  const mockProfile: Profile = {
    name: "test-profile",
    address: "localhost",
    port: 11434,
    models: ["mistral"],
  };

  const model = "mistral";
  const mockedInvoke = invoke as unknown as ReturnType<typeof vi.fn>;
  const mockedToast = toast as unknown as Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    mockedInvoke.mockImplementation((command, args) => {
      switch (command) {
        case "get_documents":
          return Promise.resolve([]);
        case "create_conversation":
          return Promise.resolve("conversation-123");
        case "send_prompt":
          return Promise.resolve("AI response");
        default:
          return Promise.resolve();
      }
    });
  });

  describe("Basic Rendering and Setup", () => {
    it("renders without documents and shows no RAG indicator", async () => {
      await act(async () => {
        render(<ChatPage profile={mockProfile} model={model} />);
      });

      expect(screen.getByText("Welcome to LLM Chat")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Message...")).toBeInTheDocument();
      expect(screen.getByTitle("Documents (0)")).toBeInTheDocument();
      
      // Should not show RAG indicator when no documents
      expect(screen.queryByText("RAG")).not.toBeInTheDocument();
    });

    it("shows RAG indicator when documents are available", async () => {
      const mockDocuments = [
        { id: "doc1", filename: "test.pdf", file_size: 1024 },
        { id: "doc2", filename: "guide.txt", file_size: 512 }
      ];

      mockedInvoke.mockImplementation((command) => {
        if (command === "get_documents") {
          return Promise.resolve(mockDocuments);
        }
        return Promise.resolve("AI response");
      });

      await act(async () => {
        render(<ChatPage profile={mockProfile} model={model} />);
      });

      await waitFor(() => {
        expect(screen.getByText("RAG")).toBeInTheDocument();
        expect(screen.getByTitle("Documents (2)")).toBeInTheDocument();
      });
    });
  });

  describe("Document Management", () => {
    it("opens documents dropdown when documents button is clicked", async () => {
      await act(async () => {
        render(<ChatPage profile={mockProfile} model={model} />);
      });

      const documentsButton = screen.getByTitle("Documents (0)");
      
      await act(async () => {
        fireEvent.click(documentsButton);
      });

      expect(screen.getByText("No documents uploaded")).toBeInTheDocument();
      expect(screen.getByText("Upload PDFs or TXT files for RAG")).toBeInTheDocument();
    });

    it("displays uploaded documents in dropdown", async () => {
      const mockDocuments = [
        { id: "doc1", filename: "research.pdf", file_size: 2048 },
        { id: "doc2", filename: "notes.txt", file_size: 1024 }
      ];

      mockedInvoke.mockImplementation((command) => {
        if (command === "get_documents") {
          return Promise.resolve(mockDocuments);
        }
        return Promise.resolve();
      });

      await act(async () => {
        render(<ChatPage profile={mockProfile} model={model} />);
      });

      const documentsButton = await screen.findByTitle("Documents (2)");
      
      await act(async () => {
        fireEvent.click(documentsButton);
      });

      expect(screen.getByText("research.pdf")).toBeInTheDocument();
      expect(screen.getByText("notes.txt")).toBeInTheDocument();
      expect(screen.getByText("2.0 KB")).toBeInTheDocument();
      expect(screen.getByText("1.0 KB")).toBeInTheDocument();
    });

    it("handles file upload successfully", async () => {
      mockedInvoke.mockImplementation((command, args) => {
        if (command === "get_documents") {
          return Promise.resolve([]);
        }
        if (command === "upload_document") {
          // Simulate successful upload
          return Promise.resolve();
        }
        return Promise.resolve();
      });

      await act(async () => {
        render(<ChatPage profile={mockProfile} model={model} />);
      });

      // Click documents button to open dropdown
      const documentsButton = screen.getByTitle("Documents (0)");
      await act(async () => {
        fireEvent.click(documentsButton);
      });

      // Find the file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).not.toBeNull();

      // Create mock file with arrayBuffer method
      const mockFile = new File(["test content"], "test.pdf", { type: "application/pdf" });
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      });

      // Wait for the upload to process
      await waitFor(
        () => {
          expect(mockedInvoke).toHaveBeenCalledWith("upload_document", expect.objectContaining({
            filename: "test.pdf"
          }));
        },
        { timeout: 3000 }
      );
    });

    it("rejects invalid file types", async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<ChatPage profile={mockProfile} model={model} />);
      });

      const documentsButton = screen.getByTitle("Documents (0)");
      await user.click(documentsButton);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const mockFile = new File(["test"], "test.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      });

      expect(mockedToast.error).toHaveBeenCalledWith("Only PDF and TXT files are supported");
    });

    it("handles document deletion with toast confirmation", async () => {
      const mockDocuments = [
        { id: "doc1", filename: "test.pdf", file_size: 1024 }
      ];

      mockedInvoke.mockImplementation((command) => {
        if (command === "get_documents") {
          return Promise.resolve(mockDocuments);
        }
        return Promise.resolve();
      });

      await act(async () => {
        render(<ChatPage profile={mockProfile} model={model} />);
      });

      const documentsButton = await screen.findByTitle("Documents (1)");
      await act(async () => {
        fireEvent.click(documentsButton);
      });

      const deleteButton = screen.getByTitle("Delete document");
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      expect(mockedToast.warning).toHaveBeenCalledWith(
        'Delete "test.pdf"?',
        expect.objectContaining({
          action: expect.objectContaining({
            label: "Delete"
          })
        })
      );
    });
  });

  describe("RAG Integration", () => {
    it("sends RAG-enabled requests when documents are available", async () => {
      const mockDocuments = [
        { id: "doc1", filename: "context.pdf", file_size: 1024 }
      ];

      mockedInvoke.mockImplementation((command, args) => {
        if (command === "get_documents") {
          return Promise.resolve(mockDocuments);
        }
        if (command === "send_prompt") {
          expect(args.useRag).toBe(true);
          return Promise.resolve("RAG-enhanced response");
        }
        return Promise.resolve("conversation-123");
      });

      await act(async () => {
        render(<ChatPage profile={mockProfile} model={model} />);
      });

      await waitFor(() => {
        expect(screen.getByText("RAG")).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("Message...");
      
      await act(async () => {
        fireEvent.change(input, { target: { value: "Test message" } });
        fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      });

      await waitFor(() => {
        expect(mockedInvoke).toHaveBeenCalledWith("send_prompt", expect.objectContaining({
          useRag: true,
          prompt: "Test message"
        }));
      });
    });

    it("sends non-RAG requests when no documents are available", async () => {
      mockedInvoke.mockImplementation((command, args) => {
        if (command === "get_documents") {
          return Promise.resolve([]);
        }
        if (command === "send_prompt") {
          expect(args.useRag).toBe(false);
          return Promise.resolve("Standard response");
        }
        return Promise.resolve("conversation-123");
      });

      await act(async () => {
        render(<ChatPage profile={mockProfile} model={model} />);
      });

      const input = screen.getByPlaceholderText("Message...");
      
      await act(async () => {
        fireEvent.change(input, { target: { value: "Test message" } });
        fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      });

      await waitFor(() => {
        expect(mockedInvoke).toHaveBeenCalledWith("send_prompt", expect.objectContaining({
          useRag: false,
          prompt: "Test message"
        }));
      });
    });
  });

  describe("RAG Tooltip", () => {
    it("shows informative tooltip when hovering over RAG indicator", async () => {
      const mockDocuments = [
        { id: "doc1", filename: "test.pdf", file_size: 1024 },
        { id: "doc2", filename: "guide.txt", file_size: 512 }
      ];

      mockedInvoke.mockImplementation((command) => {
        if (command === "get_documents") {
          return Promise.resolve(mockDocuments);
        }
        return Promise.resolve();
      });

      await act(async () => {
        render(<ChatPage profile={mockProfile} model={model} />);
      });

      await waitFor(() => {
        const ragIndicator = screen.getByText("RAG");
        expect(ragIndicator).toBeInTheDocument();
        
        // Check tooltip content is in DOM (hidden by default)
        expect(screen.getByText("RAG Mode Active")).toBeInTheDocument();
        expect(screen.getByText((content) => 
          content.includes("using 2 uploaded documents")
        )).toBeInTheDocument();
      });
    });

    it("adjusts tooltip text for single document", async () => {
      const mockDocuments = [
        { id: "doc1", filename: "single.pdf", file_size: 1024 }
      ];

      mockedInvoke.mockImplementation((command) => {
        if (command === "get_documents") {
          return Promise.resolve(mockDocuments);
        }
        return Promise.resolve();
      });

      await act(async () => {
        render(<ChatPage profile={mockProfile} model={model} />);
      });

      await waitFor(() => {
        expect(screen.getByText((content) => 
          content.includes("using 1 uploaded document")
        )).toBeInTheDocument();
      });
    });
  });

  describe("Settings and Chat Controls", () => {
    it("opens settings dropdown when settings button is clicked", async () => {
      await act(async () => {
        render(<ChatPage profile={mockProfile} model={model} />);
      });

      const settingsButton = screen.getAllByRole("button").find(btn => 
        btn.className.includes('settings-button')
      );
      
      if (settingsButton) {
        await act(async () => {
          fireEvent.click(settingsButton);
        });

        expect(screen.getByText("Clear History")).toBeInTheDocument();
      }
    });

    it("clears chat history when clear button is clicked", async () => {
      // Add some messages first
      mockedInvoke.mockResolvedValue("Test response");

      await act(async () => {
        render(<ChatPage profile={mockProfile} model={model} />);
      });

      // Send a message to create history
      const input = screen.getByPlaceholderText("Message...");
      
      await act(async () => {
        fireEvent.change(input, { target: { value: "Test message" } });
        fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      });

      await waitFor(() => {
        expect(screen.getByText("Test message")).toBeInTheDocument();
        expect(screen.getByText("Test response")).toBeInTheDocument();
      });

      // Now clear history
      const settingsButton = screen.getAllByRole("button").find(btn => 
        btn.querySelector('svg circle[cx="12"][cy="12"]')
      );
      
      if (settingsButton) {
        await act(async () => {
          fireEvent.click(settingsButton);
        });

        const clearButton = screen.getByText("Clear History");
        await act(async () => {
          fireEvent.click(clearButton);
        });

        // Messages should be cleared
        expect(screen.queryByText("Test message")).not.toBeInTheDocument();
        expect(screen.queryByText("Test response")).not.toBeInTheDocument();
        expect(screen.getByText("Welcome to LLM Chat")).toBeInTheDocument();
      }
    });
  });

  describe("Error Handling", () => {
    it("shows error message when document upload fails", async () => {
      mockedInvoke.mockImplementation((command) => {
        if (command === "get_documents") {
          return Promise.resolve([]);
        }
        if (command === "upload_document") {
          return Promise.reject(new Error("Upload failed"));
        }
        return Promise.resolve();
      });

      await act(async () => {
        render(<ChatPage profile={mockProfile} model={model} />);
      });

      const documentsButton = screen.getByTitle("Documents (0)");
      await act(async () => {
        fireEvent.click(documentsButton);
      });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const mockFile = new File(["test"], "test.pdf", { type: "application/pdf" });
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      });

      await waitFor(() => {
        expect(mockedToast.error).toHaveBeenCalledWith(expect.stringContaining("Upload failed:"));
      });
    });

    it("shows error message when document loading fails", async () => {
      mockedInvoke.mockImplementation((command) => {
        if (command === "get_documents") {
          return Promise.reject(new Error("Failed to load documents"));
        }
        return Promise.resolve();
      });

      // Spy on console.error to verify error logging
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await act(async () => {
        render(<ChatPage profile={mockProfile} model={model} />);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("Failed to load documents:", expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });
});
