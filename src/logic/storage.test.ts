import { afterEach, describe, expect, it } from "vitest";
import type { AppState } from "../types";
import { exportJson, loadState, parseImport, saveState } from "./storage";

const STATE: AppState = {
  ingredients: [
    { id: "a-1", name: "strawberry", x: 40, y: 60, profile: { fruity: ["berry", "tropical"] } },
    { id: "b-2", name: "basil", x: 300, y: 20, profile: {} },
  ],
};

afterEach(() => {
  localStorage.clear();
});

describe("saveState/loadState", () => {
  it("round-trips through localStorage", () => {
    saveState(STATE);
    expect(loadState()).toEqual(STATE);
  });

  it("returns an empty state when nothing is saved", () => {
    expect(loadState()).toEqual({ ingredients: [] });
  });

  it("returns an empty state when the stored value is not JSON", () => {
    localStorage.setItem("foodpairing-canvas-v1", "not json");
    expect(loadState()).toEqual({ ingredients: [] });
  });

  it("returns an empty state when the stored shape is wrong", () => {
    localStorage.setItem(
      "foodpairing-canvas-v1",
      JSON.stringify({ ingredients: 42 }),
    );
    expect(loadState()).toEqual({ ingredients: [] });
  });
});

describe("corrupt profiles, ids and unavailable storage", () => {
  const KEY = "foodpairing-canvas-v1";

  it("treats stored ingredients with non-array descriptors as corrupt", () => {
    for (const badProfile of [
      { ingredients: [{ id: "a", name: "n", x: 0, y: 0, profile: { fruity: "berry" } }] },
      { ingredients: [{ id: "a", name: "n", x: 0, y: 0, profile: { fruity: null } }] },
      { ingredients: [{ id: "a", name: "n", x: 0, y: 0, profile: { fruity: [42] } }] },
      { ingredients: [{ id: "a", name: "n", x: 0, y: 0, profile: { bogus: ["x"] } }] },
    ]) {
      localStorage.setItem(KEY, JSON.stringify(badProfile));
      expect(loadState()).toEqual({ ingredients: [] });
    }
  });

  it("defaults a missing profile to {} when loading stored valid ingredients", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        ingredients: [{ id: "a", name: "n", x: 0, y: 0 }],
      }),
    );
    expect(loadState()).toEqual({
      ingredients: [{ id: "a", name: "n", x: 0, y: 0, profile: {} }],
    });
  });

  it("treats stored states with duplicate ingredient ids as corrupt", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        ingredients: [
          { id: "same", name: "one", x: 0, y: 0, profile: {} },
          { id: "same", name: "two", x: 9, y: 9, profile: {} },
        ],
      }),
    );
    expect(loadState()).toEqual({ ingredients: [] });
  });

  it("rejects imports with corrupt profiles or duplicate ids", () => {
    expect(() =>
      parseImport(
        JSON.stringify({
          ingredients: [{ id: "a", name: "n", x: 0, y: 0, profile: { fruity: "x" } }],
        }),
      ),
    ).toThrowError("invalid canvas file");
    expect(() =>
      parseImport(
        JSON.stringify({
          ingredients: [
            { id: "same", name: "one", x: 0, y: 0 },
            { id: "same", name: "two", x: 9, y: 9 },
          ],
        }),
      ),
    ).toThrowError("invalid canvas file");
  });

  it("returns an empty state when localStorage reads throw", () => {
    const original = Object.getOwnPropertyDescriptor(window.Storage.prototype, "getItem");
    Object.defineProperty(window.Storage.prototype, "getItem", {
      configurable: true,
      value() {
        throw new Error("storage blocked");
      },
    });
    try {
      expect(loadState()).toEqual({ ingredients: [] });
    } finally {
      if (original) {
        Object.defineProperty(window.Storage.prototype, "getItem", original);
      }
    }
  });

  it("does not throw when localStorage writes fail", () => {
    const original = Object.getOwnPropertyDescriptor(window.Storage.prototype, "setItem");
    Object.defineProperty(window.Storage.prototype, "setItem", {
      configurable: true,
      value() {
        throw new Error("quota exceeded");
      },
    });
    try {
      expect(() => saveState(STATE)).not.toThrow();
    } finally {
      if (original) {
        Object.defineProperty(window.Storage.prototype, "setItem", original);
      }
    }
  });
});

describe("exportJson/parseImport", () => {
  it("round-trips an export through parseImport", () => {
    expect(parseImport(exportJson(STATE))).toEqual(STATE);
  });

  it("rejects anything that is not a canvas file", () => {
    expect(() => parseImport("garbage")).toThrowError("invalid canvas file");
    expect(() => parseImport(JSON.stringify({ hello: 1 }))).toThrowError(
      "invalid canvas file",
    );
  });

  it("accepts a file with optional fields missing and defaults them", () => {
    const text = JSON.stringify({
      ingredients: [{ id: "x-1", name: "garlic", x: 0, y: 0 }],
    });
    expect(parseImport(text)).toEqual({
      ingredients: [{ id: "x-1", name: "garlic", x: 0, y: 0, profile: {} }],
    });
  });
});
