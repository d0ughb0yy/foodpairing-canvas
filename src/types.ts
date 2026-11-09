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

// Key present = aroma type enabled.
export type Profile = Partial<Record<AromaTypeId, true>>;

export type Ingredient = {
  id: string;
  name: string;
  x: number;
  y: number;
  profile: Profile;
};

export type AppState = { ingredients: Ingredient[] };

export type Dish = {
  id: string;
  name: string;
  ingredients: Ingredient[];
};

export type MultiDishState = {
  dishes: Dish[];
  activeDishId: string;
};