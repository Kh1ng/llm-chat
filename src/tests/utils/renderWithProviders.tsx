import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, RenderOptions } from "@testing-library/react";

export function renderWithProviders(
  ui: React.ReactElement,
  { route = "/", ...options }: { route?: string } & RenderOptions = {}
) {
  window.history.pushState({}, "Test page", route);
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>, options);
}
