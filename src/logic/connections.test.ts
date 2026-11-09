import { describe, expect, it } from "vitest";
import { sharedAromaTypes } from "./connections";

describe("sharedAromaTypes", () => {
  it("returns the aroma types both ingredients have enabled", () => {
    expect(
      sharedAromaTypes(
        { fruity: true, citrus: true },
        { citrus: true, fruity: true },
      ),
    ).toEqual(["fruity", "citrus"]);
  });

  it("returns [] when profiles share nothing", () => {
    expect(sharedAromaTypes({ fruity: true }, { spicy: true })).toEqual([]);
  });

  it("orders results by the book's aroma type order", () => {
    expect(
      sharedAromaTypes(
        { caramellic: true, citrus: true, fruity: true },
        { fruity: true, citrus: true, caramellic: true },
      ),
    ).toEqual(["fruity", "citrus", "caramellic"]);
  });

  it("counts a type that is enabled on both sides", () => {
    expect(sharedAromaTypes({ herbal: true }, { herbal: true })).toEqual([
      "herbal",
    ]);
  });

  it("ignores types enabled on only one side", () => {
    expect(
      sharedAromaTypes({ fruity: true, green: true }, { fruity: true }),
    ).toEqual(["fruity"]);
  });
});
