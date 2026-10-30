import { AROMA_TYPES } from "../config";
import type { Profile, SharedFlavor } from "../types";

function normalizeDescriptors(values: string[] | undefined): Set<string> {
  return new Set(
    (values ?? [])
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d.length > 0),
  );
}

/**
 * Flavor bridges between two ingredients: one entry per aroma type present in
 * BOTH profiles, in the book's aroma type order. Shared descriptors are the
 * intersection of the two descriptor lists, trimmed and lowercased.
 */
export function sharedFlavors(a: Profile, b: Profile): SharedFlavor[] {
  const result: SharedFlavor[] = [];

  for (const { id } of AROMA_TYPES) {
    if (a[id] === undefined || b[id] === undefined) continue;

    const aSet = normalizeDescriptors(a[id]);
    const bSet = normalizeDescriptors(b[id]);
    const shared: string[] = [];
    for (const d of aSet) {
      if (bSet.has(d)) shared.push(d);
    }

    result.push({ type: id, sharedDescriptors: shared });
  }

  return result;
}

/** The book's "big dot": a link is strong when a specific descriptor is shared. */
export function hasStrongLink(flavors: SharedFlavor[]): boolean {
  return flavors.some((f) => f.sharedDescriptors.length > 0);
}
