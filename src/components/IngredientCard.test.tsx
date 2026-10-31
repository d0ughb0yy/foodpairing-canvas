import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { Ingredient } from "../types";
import IngredientCard from "./IngredientCard";

const WITHOUT_PROFILE: Ingredient = {
  id: "s-1",
  name: "strawberry",
  x: 10,
  y: 20,
  profile: {},
};

describe("IngredientCard touch targets", () => {
  it("grows the tappable controls on coarse-pointer devices", () => {
    const css = readFileSync("src/components/IngredientCard.css", "utf8");
    // Capture the whole at-rule: its last line is a lone closing brace.
    const block =
      css.match(/@media \(pointer: coarse\)\s*{([\s\S]*?)\n}/)?.[1] ?? "";
    // Type chip: the everyday toggle, doubles up to a thumb-sized circle.
    expect(block).toMatch(/\.type-chip[^}]*width:\s*26px/s);
    expect(block).toMatch(/\.type-chip[^}]*height:\s*26px/s);
    // Delete x: a padded hit area rather than a bare glyph.
    expect(block).toMatch(/\.card-delete[^}]*padding:\s*0 10px/s);
    // Grip: a wide drag zone.
    expect(block).toMatch(/\.card-grip[^}]*padding:\s*6px 10px/s);
  });
});

function renderCard(ingredient: Ingredient) {
  const onChange = vi.fn();
  const onDragStart = vi.fn();
  render(
    <IngredientCard
      ingredient={ingredient}
      onChange={onChange}
      onDragStart={onDragStart}
    />,
  );
  return { onChange };
}

describe("IngredientCard", () => {
  it("shows the ingredient name in an editable input", () => {
    renderCard(WITHOUT_PROFILE);
    expect(screen.getByDisplayValue("strawberry")).toBeVisible();
  });

  it("renames the ingredient when the name is clicked and typed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <IngredientCard
        ingredient={WITHOUT_PROFILE}
        onChange={onChange}
        onDragStart={vi.fn()}
      />,
    );

    const input = screen.getByDisplayValue("strawberry");
    await user.click(input);
    await user.keyboard("X");

    expect(onChange).toHaveBeenLastCalledWith({ name: "strawberryX" });
  });

  it("toggles an aroma type on and off via its chip", async () => {
    const user = userEvent.setup();
    const { onChange } = renderCard(WITHOUT_PROFILE);

    const fruity = screen.getByTitle("Fruity");
    expect(fruity).toHaveAttribute("aria-pressed", "false");
    await user.click(fruity);
    expect(onChange).toHaveBeenLastCalledWith({ profile: { fruity: [] } });
  });

  it("toggles off a type that is present in the profile", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <IngredientCard
        ingredient={{ ...WITHOUT_PROFILE, profile: { fruity: ["berry"] } }}
        onChange={onChange}
        onDragStart={vi.fn()}
      />,
    );

    await user.click(screen.getByTitle("Fruity"));
    expect(onChange).toHaveBeenLastCalledWith({ profile: {} });
  });

  it("shows active chips in their aroma color", () => {
    renderCard({
      ...WITHOUT_PROFILE,
      profile: { fruity: ["berry"] },
    });
    const fruity = screen.getByTitle("Fruity");
    expect(fruity).toHaveAttribute("aria-pressed", "true");
    expect(fruity.style.backgroundColor).toBe("rgb(249, 182, 21)"); // #f9b615, user's cover sampling
  });

  it("adds a descriptor for an enabled type and reports the new profile", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <IngredientCard
        ingredient={{ ...WITHOUT_PROFILE, profile: { fruity: [] } }}
        onChange={onChange}
        onDragStart={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText(/add/i);
    await user.type(input, "tropical");
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenLastCalledWith({
      profile: { fruity: ["tropical"] },
    });
  });

  it("removes a descriptor via its × button", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <IngredientCard
        ingredient={{ ...WITHOUT_PROFILE, profile: { fruity: ["berry"] } }}
        onChange={onChange}
        onDragStart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /remove berry/i }));
    expect(onChange).toHaveBeenLastCalledWith({ profile: { fruity: [] } });
  });

  it("wires a descriptor input to the type's autocomplete datalist", () => {
    render(
      <IngredientCard
        ingredient={{ ...WITHOUT_PROFILE, profile: { fruity: [] } }}
        onChange={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );
    expect(
      screen.getByPlaceholderText(/add/i).getAttribute("list"),
    ).toBe("desc-fruity");
    expect(document.getElementById("desc-fruity")).not.toBeNull();
  });
});
