import { AROMA_TYPES } from "../config";
import type { AppState, Profile, Dish, MultiDishState } from "../types";

const STORAGE_KEY = "foodpairing-canvas-v1";

const AROMA_IDS: ReadonlySet<string> = new Set(AROMA_TYPES.map((t) => t.id));

export function isValidProfile(value: unknown): value is Profile {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  for (const [key, list] of Object.entries(value)) {
    if (!AROMA_IDS.has(key)) return false;
    if (!Array.isArray(list) || list.some((d) => typeof d !== "string")) {
      return false;
    }
  }
  return true;
}

function hasValidProfile(value: { profile: unknown }): boolean {
  return value.profile === undefined || isValidProfile(value.profile);
}

function isValidIngredient(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    v.id.length > 0 &&
    typeof v.name === "string" &&
    typeof v.x === "number" &&
    Number.isFinite(v.x) &&
    typeof v.y === "number" &&
    Number.isFinite(v.y) &&
    hasValidProfile({ profile: v.profile })
  );
}

function isValidAppState(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.ingredients)) return false;
  const ids = new Set<string>();
  for (const ing of v.ingredients) {
    if (!isValidIngredient(ing)) return false;
    if (ids.has(ing.id)) return false; // duplicate ids corrupt every update
    ids.add(ing.id);
  }
  return true;
}

function normalizeAppState(parsed: AppState): AppState {
  return {
    ingredients: parsed.ingredients.map((i) => ({
      ...i,
      profile: i.profile ?? {},
    })),
  };
}

function isValidDish(value: unknown): value is Dish {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || v.id.length === 0) return false;
  if (typeof v.name !== "string" || v.name.length === 0) return false;
  if (!Array.isArray(v.ingredients)) return false;
  
  const ingIds = new Set<string>();
  for (const ing of v.ingredients) {
    if (!isValidIngredient(ing)) return false;
    if (ingIds.has(ing.id)) return false;
    ingIds.add(ing.id);
  }
  
  return true;
}

function isValidMultiDishState(value: unknown): value is MultiDishState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  
  if (!Array.isArray(v.dishes)) return false;
  if (v.dishes.length === 0) return false;
  
  const dishIds = new Set<string>();
  for (const dish of v.dishes) {
    if (!isValidDish(dish)) return false;
    if (dishIds.has(dish.id)) return false;
    dishIds.add(dish.id);
  }
  
  if (typeof v.activeDishId !== "string" || v.activeDishId.length === 0) {
    return false;
  }
  
  if (!v.dishes.some((d) => d.id === v.activeDishId)) {
    return false;
  }
  
  return true;
}

function normalizeDish(dish: unknown): Dish {
  if (!isValidDish(dish)) {
    throw new Error("Invalid dish structure");
  }
  return {
    ...dish,
    ingredients: dish.ingredients.map((i) => ({
      ...i,
      profile: i.profile ?? {},
    })),
  };
}

export function loadState(): MultiDishState {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Return a default dish if storage is unavailable
    const defaultDish: Dish = {
      id: crypto.randomUUID(),
      name: "Dish 1",
      ingredients: [],
    };
    return {
      dishes: [defaultDish],
      activeDishId: defaultDish.id,
    };
  }
  if (raw === null) {
    // Return a default dish if nothing is saved
    const defaultDish: Dish = {
      id: crypto.randomUUID(),
      name: "Dish 1",
      ingredients: [],
    };
    return {
      dishes: [defaultDish],
      activeDishId: defaultDish.id,
    };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    
    // Check if this is the new multi-dish format
    if (isValidMultiDishState(parsed)) {
      return normalizeMultiDishState(parsed as MultiDishState);
    }
    
    // Check if this is the old single-appstate format
    if (isValidAppState(parsed)) {
      const oldState = normalizeAppState(parsed as AppState);
      const newDish: Dish = {
        id: crypto.randomUUID(),
        name: "Dish 1",
        ingredients: oldState.ingredients,
      };
      return {
        dishes: [newDish],
        activeDishId: newDish.id,
      };
    }
    
    // Data is invalid - return a default dish
    const defaultDish: Dish = {
      id: crypto.randomUUID(),
      name: "Dish 1",
      ingredients: [],
    };
    return {
      dishes: [defaultDish],
      activeDishId: defaultDish.id,
    };
  } catch {
    // Invalid JSON or parsing error - return a default dish
    const defaultDish: Dish = {
      id: crypto.randomUUID(),
      name: "Dish 1",
      ingredients: [],
    };
    return {
      dishes: [defaultDish],
      activeDishId: defaultDish.id,
    };
  }
}

function normalizeMultiDishState(parsed: MultiDishState): MultiDishState {
  return {
    dishes: parsed.dishes.map(normalizeDish),
    activeDishId: parsed.activeDishId,
  };
}

export function saveState(state: MultiDishState): void {
  try {
    localStorage.setItem(STORAGE_KEY, exportMultiDishJson(state));
  } catch {
    // Storage unavailable or full — keep the canvas running; autosave resumes
    // automatically once space frees up.
  }
}

export function exportJson(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

function exportMultiDishJson(state: MultiDishState): string {
  return JSON.stringify(state, null, 2);
}

export function parseImport(text: string): MultiDishState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("invalid canvas file");
  }

  if (!isValidMultiDishState(parsed)) {
    throw new Error("invalid canvas file");
  }

  return normalizeMultiDishState(parsed as MultiDishState);
}

export function downloadExport(state: MultiDishState): void {
  const blob = new Blob([exportMultiDishJson(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "foodpairing-dishes.json";
  a.click();
  URL.revokeObjectURL(url);
}

