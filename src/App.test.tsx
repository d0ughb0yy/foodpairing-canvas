import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import App from "./App";

const STORAGE_KEY = "foodpairing-canvas-v1";

afterEach(() => {
  localStorage.clear();
});

describe("App header", () => {
  it("wraps its controls on narrow screens", () => {
    const css = readFileSync("src/App.css", "utf8");
    const block =
      css.match(/@media \(max-width: 480px\)\s*{([\s\S]*?)\n}/)?.[1] ?? "";
    expect(block).toMatch(/\.app-header[^}]*flex-wrap:\s*wrap/s);
    expect(block).toMatch(/\.app-header[^}]*gap:\s*8px/s);
    // The action row must wrap too — five controls exceed ~420px of width.
    expect(block).toMatch(/\.app-actions[^}]*flex-wrap:\s*wrap/s);
    expect(block).toMatch(/\.app-actions[^}]*width:\s*100%/s);
  });

  it("shows title, connection toggle, add/export/import controls", () => {
    render(<App />);
    expect(screen.getByText(/foodpairing canvas/i)).toBeVisible();
    expect(screen.getByTestId("toggle-connections")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /add ingredient/i }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /export/i })).toBeVisible();
    expect(screen.getByText("Import")).toBeVisible();
    expect(screen.getByTestId("import-input")).toBeVisible();
  });

  it("defaults the connection toggle to off and shows the empty hint", () => {
    render(<App />);
    const toggle = screen.getByTestId("toggle-connections");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/first ingredient/i)).toBeVisible();
  });

  it("adds an ingredient card with a name input", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /add ingredient/i }));
    expect(screen.getByDisplayValue("New ingredient")).toBeVisible();
  });

  it("autosaves the state after adding", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /add ingredient/i }));
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).ingredients).toHaveLength(1);
  });

  it("restores a saved state on mount", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ingredients: [
          {
            id: "p-1",
            name: "strawberry",
            x: 12,
            y: 34,
            profile: { fruity: ["berry"] },
          },
        ],
      }),
    );
    render(<App />);
    expect(screen.getByDisplayValue("strawberry")).toBeVisible();
  });

  it("deletes an ingredient via the card's delete button", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /add ingredient/i }));
    await user.click(screen.getByRole("button", { name: /delete new ingredient/i }));
    expect(screen.queryByDisplayValue("New ingredient")).toBeNull();
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY) as string).ingredients,
    ).toHaveLength(0);
  });

  it("rejects an invalid import file with an alert and keeps the canvas", async () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /add ingredient/i }));

    const input = screen.getByTestId("import-input") as HTMLInputElement;
    const file = new File(["not json"], "bad.json", { type: "application/json" });
    await user.upload(input, file);

    expect(window.alert).toHaveBeenCalledWith(
      "That file doesn't look like a canvas export.",
    );
    // Canvas state untouched: the added ingredient is still there
    expect(screen.getByDisplayValue("New ingredient")).toBeVisible();

    (window.alert as ReturnType<typeof vi.spyOn>).mockRestore();
  });
});
