import { AROMA_TYPES } from "../config";
import type { AppState, Ingredient, Profile } from "../types";

const STORAGE_KEY = "foodpairing-canvas-v1";

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, exportJson(state));
  } catch {
    // Storage unavailable or full — keep the canvas running; autosave resumes
    // automatically once space frees up.
  }
}

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

function isValidIngredient(value: unknown): value is Ingredient {
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

function isValidState(value: unknown): value is AppState {
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

function normalizeState(parsed: AppState): AppState {
  return {
    ingredients: parsed.ingredients.map((i) => ({
      ...i,
      profile: i.profile ?? {},
    })),
  };
}

export function loadState(): AppState {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { ingredients: [] };
  }
  if (raw === null) return { ingredients: [] };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isValidState(parsed)) return normalizeState(parsed);
    return { ingredients: [] };
  } catch {
    return { ingredients: [] };
  }
}

export function exportJson(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function parseImport(text: string): AppState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("invalid canvas file");
  }

  if (!isValidState(parsed)) throw new Error("invalid canvas file");

  return normalizeState(parsed);
}

export function downloadExport(state: AppState): void {
  const blob = new Blob([exportJson(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "foodpairing-canvas.json";
  a.click();
  URL.revokeObjectURL(url);
}
