import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Button from "../../src/components/Button";

describe("Button Component", () => {
  it("renders button with default props", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-gray-100");
    expect(button).toHaveClass("text-base");
  });

  it("renders primary variant", () => {
    render(<Button variant="primary">Primary</Button>);
    const button = screen.getByRole("button", { name: "Primary" });
    expect(button).toHaveClass("bg-teal-600");
    expect(button).toHaveClass("text-white");
  });

  it("renders secondary variant", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole("button", { name: "Secondary" });
    expect(button).toHaveClass("bg-gray-100");
  });

  it("renders ghost variant", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole("button", { name: "Ghost" });
    expect(button).toHaveClass("bg-transparent");
  });

  it("renders danger variant", () => {
    render(<Button variant="danger">Danger</Button>);
    const button = screen.getByRole("button", { name: "Danger" });
    expect(button).toHaveClass("bg-red-500/10");
  });

  it("renders small size", () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole("button", { name: "Small" });
    expect(button).toHaveClass("text-sm");
    expect(button).toHaveClass("px-3");
  });

  it("renders medium size (default)", () => {
    render(<Button size="md">Medium</Button>);
    const button = screen.getByRole("button", { name: "Medium" });
    expect(button).toHaveClass("text-base");
    expect(button).toHaveClass("px-4");
  });

  it("renders large size", () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole("button", { name: "Large" });
    expect(button).toHaveClass("text-lg");
    expect(button).toHaveClass("px-6");
  });

  it("applies custom className", () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole("button", { name: "Custom" });
    expect(button).toHaveClass("custom-class");
  });

  it("handles disabled state", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:opacity-50");
  });

  it("forwards button props", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);
    const button = screen.getByRole("button", { name: "Clickable" });
    
    button.click();
    expect(handleClick).toHaveBeenCalledOnce();
  });
});