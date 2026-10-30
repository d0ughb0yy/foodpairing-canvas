import { describe, expect, it } from "vitest";
import { hasStrongLink, sharedFlavors } from "./connections";

describe("sharedFlavors", () => {
  it("returns shared descriptors as trimmed lowercase strings", () => {
    const result = sharedFlavors(
      { fruity: ["Tropical"] },
      { fruity: ["tropical "] },
    );
    expect(result).toEqual([
      { type: "fruity", sharedDescriptors: ["tropical"] },
    ]);
  });

  it("returns [] when profiles share nothing", () => {
    expect(sharedFlavors({ fruity: ["berry"] }, { spicy: ["clove"] })).toEqual(
      [],
    );
  });

  it("returns an empty descriptor list for a shared type with disjoint descriptors", () => {
    const result = sharedFlavors(
      { fruity: ["apple"] },
      { fruity: ["berry"] },
    );
    expect(result).toEqual([{ type: "fruity", sharedDescriptors: [] }]);
  });

  it("counts types enabled with no descriptors on either side", () => {
    const result = sharedFlavors({ herbal: [] }, { herbal: [] });
    expect(result).toEqual([{ type: "herbal", sharedDescriptors: [] }]);
  });

  it("does not inflate shared descriptors from duplicates on one side", () => {
    const result = sharedFlavors(
      { fruity: ["berry", "berry", "berry"] },
      { fruity: ["berry", "berry"] },
    );
    expect(result).toEqual([
      { type: "fruity", sharedDescriptors: ["berry"] },
    ]);
  });

  it("orders entries by the book's aroma type order (fruity before citrus)", () => {
    const result = sharedFlavors(
      { citrus: ["lemon"], fruity: ["tropical"] },
      { citrus: ["lemon"], fruity: ["tropical"] },
    );
    expect(result.map((f) => f.type)).toEqual(["fruity", "citrus"]);
  });
});

describe("hasStrongLink", () => {
  it("is false when only types (no descriptors) are shared", () => {
    const flavors = sharedFlavors({ fruity: [] }, { fruity: ["apple"] });
    expect(hasStrongLink(flavors)).toBe(false);
  });

  it("is true when a descriptor is shared", () => {
    const flavors = sharedFlavors(
      { caramellic: ["maple"] },
      { caramellic: ["maple", "honey"] },
    );
    expect(hasStrongLink(flavors)).toBe(true);
  });

  it("is false for an empty list", () => {
    expect(hasStrongLink([])).toBe(false);
  });
});
