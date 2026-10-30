import { describe, expect, it } from "vitest";
import { AROMA_TYPES, DESCRIPTORS } from "./config";

const EXPECTED = [
  "fruity", "citrus", "floral", "green", "vegetable", "herbal",
  "caramellic", "roasted", "nutty", "spicy", "woody", "cheesy",
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

describe("DESCRIPTORS", () => {
  it("seeds the ten core types with at least 4 descriptors each", () => {
    const required = [
      "fruity", "citrus", "floral", "green", "vegetable", "herbal",
      "caramellic", "roasted", "nutty", "spicy",
    ] as const;
    for (const id of required) {
      expect(DESCRIPTORS[id]?.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("only uses known aroma type ids as keys", () => {
    for (const id of Object.keys(DESCRIPTORS)) {
      expect(EXPECTED).toContain(id);
    }
  });

  it("stores all descriptors lowercase", () => {
    for (const list of Object.values(DESCRIPTORS)) {
      for (const d of list ?? []) {
        expect(d).toBe(d.toLowerCase());
      }
    }
  });
});
