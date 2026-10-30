export type AromaTypeId =
  | "fruity"
  | "citrus"
  | "floral"
  | "green"
  | "vegetable"
  | "herbal"
  | "caramellic"
  | "roasted"
  | "nutty"
  | "spicy"
  | "woody"
  | "cheesy"
  | "animal"
  | "chemical";

// Key present = type enabled; value = descriptors (may be empty).
export type Profile = Partial<Record<AromaTypeId, string[]>>;

export type Ingredient = {
  id: string;
  name: string;
  x: number;
  y: number;
  profile: Profile;
};

export type AppState = { ingredients: Ingredient[] };

export type SharedFlavor = {
  type: AromaTypeId;
  sharedDescriptors: string[];
};
