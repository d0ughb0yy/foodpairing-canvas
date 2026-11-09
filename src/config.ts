import type { AromaTypeId } from "./types";

// The book's 14 aroma types (The Art & Science of Foodpairing).
// Colors: user's sampling of the book cover (2026-10-30), applied verbatim —
// including Chemical as slate grey (#586878; an earlier "pure black" reading
// was corrected by the user).
export const AROMA_TYPES: readonly {
  id: AromaTypeId;
  label: string;
  color: string;
}[] = [
  { id: "fruity", label: "Fruity", color: "#f9b615" },
  { id: "citrus", label: "Citrus", color: "#dada20" },
  { id: "floral", label: "Floral", color: "#a0217e" },
  { id: "green", label: "Green", color: "#009846" },
  { id: "herbal", label: "Herbal", color: "#207f81" },
  { id: "vegetable", label: "Vegetable", color: "#a1c637" },
  { id: "caramellic", label: "Caramel", color: "#d76e25" },
  { id: "roasted", label: "Roasted", color: "#6d3618" },
  { id: "nutty", label: "Nutty", color: "#d9ad29" },
  { id: "woody", label: "Woody", color: "#9b321f" },
  { id: "spicy", label: "Spicy", color: "#e63b23" },
  { id: "cheesy", label: "Cheesy", color: "#ffe000" },
  { id: "animal", label: "Animal", color: "#d31d57" },
  { id: "chemical", label: "Chemical", color: "#586878" },
] as const;

