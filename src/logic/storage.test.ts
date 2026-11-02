import { afterEach, describe, expect, it } from "vitest";
import type { MultiDishState, AppState } from "../types";
import { loadState, parseImport, saveState } from "./storage";

const STATE: AppState = {
  ingredients: [
    { id: "a-1", name: "strawberry", x: 40, y: 60, profile: { fruity: ["berry", "tropical"] } },
    { id: "b-2", name: "basil", x: 300, y: 20, profile: {} },
  ],
};


const MULTI_STATE_TWO: MultiDishState = {
  dishes: [
    {
      id: "dish1",
      name: "Dish 1",
      ingredients: [
        { id: "a-1", name: "strawberry", x: 40, y: 60, profile: { fruity: ["berry", "tropical"] } },
        { id: "b-2", name: "basil", x: 300, y: 20, profile: {} },
      ],
    },
    {
      id: "dish2",
      name: "Dish 2",
      ingredients: [],
    },
  ],
  activeDishId: "dish1",
};


afterEach(() => {
  localStorage.clear();
});

describe("loadState migration", () => {
  it("returns a default dish when nothing is saved", () => {
    expect(loadState()).toEqual({
      dishes: [
        {
          id: expect.any(String),
          name: "Dish 1",
          ingredients: [],
        },
      ],
      activeDishId: expect.any(String),
    });
    expect(loadState().dishes).toHaveLength(1);
  });

  it("returns a default dish when the stored value is not JSON", () => {
    localStorage.setItem("foodpairing-canvas-v1", "not json");
    expect(loadState()).toEqual({
      dishes: [
        {
          id: expect.any(String),
          name: "Dish 1",
          ingredients: [],
        },
      ],
      activeDishId: expect.any(String),
    });
    expect(loadState().dishes).toHaveLength(1);
  });

  it("returns a default dish when the stored shape is wrong", () => {
    localStorage.setItem(
      "foodpairing-canvas-v1",
      JSON.stringify({ ingredients: 42 }),
    );
    expect(loadState()).toEqual({
      dishes: [
        {
          id: expect.any(String),
          name: "Dish 1",
          ingredients: [],
        },
      ],
      activeDishId: expect.any(String),
    });
    expect(loadState().dishes).toHaveLength(1);
  });

  it("migrates old single-dish format to new multi-dish format", () => {
    const originalStorage = window.localStorage;
    const mockStorage = {
      getItem: (key: string) => {
        if (key === "foodpairing-canvas-v1") {
          return JSON.stringify(STATE);
        }
        return originalStorage.getItem(key);
      },
      setItem: originalStorage.setItem,
      clear: originalStorage.clear,
    };
    Object.defineProperty(window, "localStorage", { value: mockStorage });
    
    try {
      const result = loadState();
      expect(result.dishes).toHaveLength(1);
      expect(result.dishes[0].name).toBe("Dish 1");
      expect(result.dishes[0].ingredients).toEqual(STATE.ingredients);
      expect(result.activeDishId).toBe(result.dishes[0].id);
    } finally {
      Object.defineProperty(window, "localStorage", { value: originalStorage });
    }
  });
});

describe("saveState/loadState", () => {
  it("round-trips through localStorage with multi-dish format", () => {
    saveState(MULTI_STATE_TWO);
    expect(loadState()).toEqual(MULTI_STATE_TWO);
  });

  it("accepts states with duplicate ingredient ids within a dish (validation happens during load)", () => {
    // The saveState function does not validate the state - it just saves whatever is passed to it
    const badState: MultiDishState = {
      dishes: [
        { 
          id: "dish1", 
          name: "one", 
          ingredients: [
            { id: "a", name: "x", x: 0, y: 0, profile: {} },
            { id: "a", name: "y", x: 9, y: 9, profile: {} }
          ] 
        },
      ],
      activeDishId: "dish1",
    };
    expect(() => saveState(badState)).not.toThrow();
  });

  it("returns a default dish when localStorage reads throw", () => {
    const original = Object.getOwnPropertyDescriptor(window.Storage.prototype, "getItem");
    Object.defineProperty(window.Storage.prototype, "getItem", {
      configurable: true,
      value() {
        throw new Error("storage blocked");
      },
    });
    try {
      expect(loadState()).toEqual({
        dishes: [
          {
            id: expect.any(String),
            name: "Dish 1",
            ingredients: [],
          },
        ],
        activeDishId: expect.any(String),
      });
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
      expect(() => saveState(MULTI_STATE_TWO)).not.toThrow();
    } finally {
      if (original) {
        Object.defineProperty(window.Storage.prototype, "setItem", original);
      }
    }
  });
});

describe("corrupt profiles, ids and unavailable storage", () => {
  const KEY = "foodpairing-canvas-v1";

  it("treats stored dishes with corrupt profiles as corrupt", () => {
    for (const badDish of [
      {
        id: "a",
        name: "n",
        ingredients: [{ id: "i1", name: "x", x: 0, y: 0, profile: { fruity: "berry" } }],
      },
      {
        id: "b",
        name: "n",
        ingredients: [{ id: "i2", name: "x", x: 0, y: 0, profile: { fruity: null } }],
      },
      {
        id: "c",
        name: "n",
        ingredients: [{ id: "i3", name: "x", x: 0, y: 0, profile: { fruity: [42] } }],
      },
      {
        id: "d",
        name: "n",
        ingredients: [{ id: "i4", name: "x", x: 0, y: 0, profile: { bogus: ["x"] } }],
      },
    ]) {
      localStorage.setItem(KEY, JSON.stringify({ dishes: [badDish], activeDishId: badDish.id }));
      expect(loadState()).toEqual({
        dishes: [
          {
            id: expect.any(String),
            name: "Dish 1",
            ingredients: [],
          },
        ],
        activeDishId: expect.any(String),
      });
    }
  });

  it("defaults a missing profile to {} when loading stored valid ingredients", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        dishes: [
          {
            id: "test-dish",
            name: "Test",
            ingredients: [{ id: "a", name: "n", x: 0, y: 0 }],
          },
        ],
        activeDishId: "test-dish",
      }),
    );
    expect(loadState()).toEqual({
      dishes: [
        {
          id: "test-dish",
          name: "Test",
          ingredients: [{ id: "a", name: "n", x: 0, y: 0, profile: {} }],
        },
      ],
      activeDishId: "test-dish",
    });
  });

  it("treats stored states with duplicate dish ids as corrupt", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        dishes: [
          { id: "same", name: "one", ingredients: [] },
          { id: "same", name: "two", ingredients: [] },
        ],
        activeDishId: "same",
      }),
    );
    expect(loadState()).toEqual({
      dishes: [
        {
          id: expect.any(String),
          name: "Dish 1",
          ingredients: [],
        },
      ],
      activeDishId: expect.any(String),
    });
  });
});

describe("exportJson/parseImport", () => {
  it("round-trips an export through parseImport", () => {
    expect(() => parseImport(JSON.stringify(MULTI_STATE_TWO))).not.toThrow();
    const result = parseImport(JSON.stringify(MULTI_STATE_TWO));
    expect(result.dishes).toHaveLength(2);
    expect(result.dishes[0].id).toBe("dish1");
    expect(result.dishes[1].id).toBe("dish2");
    expect(result.activeDishId).toBe("dish1");
  });

  it("rejects anything that is not a canvas file", () => {
    expect(() => parseImport("garbage")).toThrowError("invalid canvas file");
    expect(() => parseImport(JSON.stringify({ hello: 1 }))).toThrowError(
      "invalid canvas file",
    );
  });

  it("accepts a file with optional fields missing and defaults them", () => {
    const text = JSON.stringify({
      dishes: [
        {
          id: "x-1",
          name: "garlic",
          ingredients: [],
        },
      ],
      activeDishId: "x-1",
    });
    expect(parseImport(text)).toEqual({
      dishes: [
        {
          id: "x-1",
          name: "garlic",
          ingredients: [],
        },
      ],
      activeDishId: "x-1",
    });
  });
});