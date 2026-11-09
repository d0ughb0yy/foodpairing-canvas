import { AROMA_TYPES } from "../config";
import type { AromaTypeId, Profile } from "../types";

/**
 * Aroma types both ingredients have enabled, in the book's aroma type order.
 */
export function sharedAromaTypes(a: Profile, b: Profile): AromaTypeId[] {
  return AROMA_TYPES.filter(({ id }) => a[id] !== undefined && b[id] !== undefined)
    .map(({ id }) => id);
}
