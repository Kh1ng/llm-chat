import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import AuthBuilder from "../../src/components/AuthBuilder";
import { Auth } from "../../src/types/types";

describe("AuthBuilder Component", () => {
  it("renders with default bearer auth type", () => {
    const mockOnChange = vi.fn();
    render(<AuthBuilder onChange={mockOnChange} />);

    const authTypeSelect = screen.getByDisplayValue("Bearer");
    expect(authTypeSelect).toBeInTheDocument();
  });

  it("calls onChange when auth type changes", () => {
    const mockOnChange = vi.fn();
    render(<AuthBuilder onChange={mockOnChange} />);

    const authTypeSelect = screen.getByDisplayValue("Bearer");
    fireEvent.change(authTypeSelect, { target: { value: "basic" } });

    expect(mockOnChange).toHaveBeenCalledWith({
      type: "basic",
      value: "",
      headerName: undefined,
    });
  });

  it("calls onChange when value changes", () => {
    const mockOnChange = vi.fn();
    render(<AuthBuilder onChange={mockOnChange} />);

    const tokenInput = screen.getByPlaceholderText("your token...");
    fireEvent.change(tokenInput, { target: { value: "test-token" } });

    expect(mockOnChange).toHaveBeenCalledWith({
      type: "bearer",
      value: "test-token",
      headerName: undefined,
    });
  });

  it("shows custom header name input for custom auth type", () => {
    const mockOnChange = vi.fn();
    const auth: Auth = { type: "custom", value: "test-key", headerName: "X-API-Key" };
    render(<AuthBuilder auth={auth} onChange={mockOnChange} />);

    const headerNameInput = screen.getByPlaceholderText("e.g. X-API-Key");
    expect(headerNameInput).toBeInTheDocument();
    expect(headerNameInput).toHaveValue("X-API-Key");
  });

  it("calls onChange when custom header name changes", () => {
    const mockOnChange = vi.fn();
    const auth: Auth = { type: "custom", value: "test-key", headerName: "X-API-Key" };
    render(<AuthBuilder auth={auth} onChange={mockOnChange} />);

    const headerNameInput = screen.getByPlaceholderText("e.g. X-API-Key");
    fireEvent.change(headerNameInput, { target: { value: "X-Secret-Key" } });

    expect(mockOnChange).toHaveBeenCalledWith({
      type: "custom",
      value: "test-key",
      headerName: "X-Secret-Key",
    });
  });

  it("shows header preview when showHeaderPreview is true and value exists", () => {
    const mockOnChange = vi.fn();
    const auth: Auth = { type: "bearer", value: "test-token" };
    render(<AuthBuilder auth={auth} onChange={mockOnChange} showHeaderPreview={true} />);

    const preview = screen.getByText("Authorization: Bearer test-token");
    expect(preview).toBeInTheDocument();
  });

  it("shows basic auth preview correctly", () => {
    const mockOnChange = vi.fn();
    const auth: Auth = { type: "basic", value: "user:pass" };
    render(<AuthBuilder auth={auth} onChange={mockOnChange} showHeaderPreview={true} />);

    const expectedEncoded = btoa("user:pass");
    const preview = screen.getByText(`Authorization: Basic ${expectedEncoded}`);
    expect(preview).toBeInTheDocument();
  });

  it("shows custom auth preview correctly", () => {
    const mockOnChange = vi.fn();
    const auth: Auth = { type: "custom", value: "secret-key", headerName: "X-API-Key" };
    render(<AuthBuilder auth={auth} onChange={mockOnChange} showHeaderPreview={true} />);

    const preview = screen.getByText("X-API-Key: secret-key");
    expect(preview).toBeInTheDocument();
  });

  it("doesn't show preview when showHeaderPreview is false", () => {
    const mockOnChange = vi.fn();
    const auth: Auth = { type: "bearer", value: "test-token" };
    render(<AuthBuilder auth={auth} onChange={mockOnChange} showHeaderPreview={false} />);

    const preview = screen.queryByText("Authorization: Bearer test-token");
    expect(preview).not.toBeInTheDocument();
  });

  it("doesn't show preview when value is empty", () => {
    const mockOnChange = vi.fn();
    const auth: Auth = { type: "bearer", value: "" };
    render(<AuthBuilder auth={auth} onChange={mockOnChange} showHeaderPreview={true} />);

    const preview = screen.queryByText(/Authorization:/);
    expect(preview).not.toBeInTheDocument();
  });
});