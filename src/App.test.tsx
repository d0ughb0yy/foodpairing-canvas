import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const STORAGE_KEY = "foodpairing-canvas-v1";

afterEach(() => {
  localStorage.clear();
});

describe("App header", () => {
  it("wraps its controls on narrow screens", () => {
    const css = require('fs').readFileSync("src/App.css", "utf8");
    const block =
      css.match(/@media \(max-width: 480px\)\s*{([\s\S]*?)\n}/)?.[1] ?? "";
    expect(block).toMatch(/\.app-header[^}]*flex-wrap:\s*wrap/s);
    expect(block).toMatch(/\.app-header[^}]*gap:\s*8px/s);
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
    const parsed = JSON.parse(raw as string);
    expect(parsed.dishes).toHaveLength(1);
    expect(parsed.dishes[0].ingredients).toHaveLength(1);
    expect(parsed.dishes[0].ingredients[0].name).toBe("New ingredient");
  });

  it("restores a saved state on mount (migration from old format)", () => {
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
    
    // Find the delete button on the ingredient card by aria-label
    const deleteButtons = screen.getAllByRole("button", { name: /Delete/ });
    await user.click(deleteButtons[0]);
    
    expect(screen.queryByDisplayValue("New ingredient")).toBeNull();
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.dishes[0].ingredients).toHaveLength(0);
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

describe("TabBar", () => {
  it("creates and switches between dishes", async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Initially one dish (New Dish from default state) should exist
    expect(screen.getAllByRole("tab")).toHaveLength(1);
    
    // Create a new dish
    const newDishButton = screen.getByTitle("New dish");
    await user.click(newDishButton);
    
    // Now there should be two dishes
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    
    // Click the second tab (New Dish)
    await user.click(screen.getAllByRole("tab")[1]);
    
    // The second dish should be active
    expect(screen.getByRole("tab", { name: /New Dish, 0 ingredients/ })).toHaveAttribute("aria-selected", "true");
  });

  it("renames a dish on double-click", async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Find the first tab (New Dish) and double-click it using the aria-label
    const firstTab = screen.getAllByRole("tab")[0];
    const tabName = firstTab.querySelector(".tab-name");
    await user.dblClick(tabName as HTMLElement);
    
    const input = screen.getByRole("textbox");
    await user.type(input, " {backspace}My New Dish");
    await user.keyboard("{Enter}");
    
    expect(screen.getByRole("tab", { name: /My New Dish, 0 ingredients/ })).toBeInTheDocument();
  });

  it("closes a dish", async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Add a second dish
    await user.click(screen.getByTitle("New dish"));
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    
    // Close the first dish (New Dish) - find the close button in the first tab
    const firstTab = screen.getAllByRole("tab")[0];
    const closeButton = firstTab.querySelector(".tab-close");
    await user.click(closeButton as HTMLElement);
    
    // Only one dish should remain (the second New Dish)
    expect(screen.getAllByRole("tab")).toHaveLength(1);
    expect(screen.getByRole("tab", { name: /New Dish, 0 ingredients/ })).toBeInTheDocument();
  });
});