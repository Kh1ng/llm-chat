import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ThemeToggle from "../../src/components/ThemeToggle";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe("ThemeToggle Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock document.documentElement.setAttribute
    vi.spyOn(document.documentElement, 'setAttribute').mockImplementation(() => {});
  });

  it("defaults to dark theme when no stored theme", () => {
    localStorageMock.getItem.mockReturnValue(null);
    render(<ThemeToggle />);
    
    const toggleButton = screen.getByRole("button", { name: "Toggle theme" });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute("title", "Switch to light mode");
  });

  it("uses stored light theme", () => {
    localStorageMock.getItem.mockReturnValue("light");
    render(<ThemeToggle />);
    
    const toggleButton = screen.getByRole("button", { name: "Toggle theme" });
    expect(toggleButton).toHaveAttribute("title", "Switch to dark mode");
  });

  it("uses stored dark theme", () => {
    localStorageMock.getItem.mockReturnValue("dark");
    render(<ThemeToggle />);
    
    const toggleButton = screen.getByRole("button", { name: "Toggle theme" });
    expect(toggleButton).toHaveAttribute("title", "Switch to light mode");
  });

  it("toggles from light to dark theme", () => {
    localStorageMock.getItem.mockReturnValue("light");
    render(<ThemeToggle />);
    
    const toggleButton = screen.getByRole("button", { name: "Toggle theme" });
    
    fireEvent.click(toggleButton);
    
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith("data-theme", "dark");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "dark");
  });

  it("toggles from dark to light theme", () => {
    localStorageMock.getItem.mockReturnValue("dark");
    render(<ThemeToggle />);
    
    const toggleButton = screen.getByRole("button", { name: "Toggle theme" });
    
    fireEvent.click(toggleButton);
    
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith("data-theme", "light");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "light");
  });

  it("sets data-theme attribute on mount", () => {
    localStorageMock.getItem.mockReturnValue("light");
    render(<ThemeToggle />);
    
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith("data-theme", "light");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "light");
  });

  it("ignores invalid stored theme values", () => {
    localStorageMock.getItem.mockReturnValue("invalid-theme");
    render(<ThemeToggle />);
    
    const toggleButton = screen.getByRole("button", { name: "Toggle theme" });
    // Should default to dark when invalid value
    expect(toggleButton).toHaveAttribute("title", "Switch to light mode");
  });
});