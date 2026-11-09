import { describe, expect, it } from "vitest";
import { AROMA_TYPES } from "./config";

const EXPECTED = [
  "fruity", "citrus", "floral", "green", "herbal", "vegetable",
  "caramellic", "roasted", "nutty", "woody", "spicy", "cheesy",
  "animal", "chemical",
] as const;

describe("AROMA_TYPES", () => {
  it("is the book's 14 aroma types in order", () => {
    const ids = AROMA_TYPES.map((t) => t.id);
    expect(ids).toEqual(EXPECTED);
  });

  it("has unique ids", () => {
    const ids = AROMA_TYPES.map((t) => t.id);
    expect(new Set(ids).size).toBe(14);
  });

  it("has a capitalized label and 6-digit hex color for every type", () => {
    for (const t of AROMA_TYPES) {
      expect(t.label).toMatch(/^[A-Z]/);
      expect(t.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
