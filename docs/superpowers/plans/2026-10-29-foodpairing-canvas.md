# Foodpairing Dish Canvas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A personal visual canvas for planning dishes per "The Art & Science of Foodpairing" (Coucquyt/Lahousse/Langenbick): ingredient cards with color-coded aroma profiles (14 book aroma types + descriptors) and a toggle that draws connection lines between ingredients sharing flavors.

**Architecture:** Vite + React + TypeScript app, no UI or canvas libraries. App holds `AppState` (list of draggable ingredient cards). Pure logic modules compute shared flavors and handle persistence; an SVG layer under absolutely-positioned HTML cards draws the connection lines.

**Tech Stack:** Vite 7, React 19, TypeScript, Vitest + @testing-library/react (jsdom). No other runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-29-foodpairing-canvas-design.md` (design as approved in conversation; no errors/missing items raised).

## Global Constraints

- **NO GIT**: never run `git init`, `git commit`, or any git command. Plain files only.
- Zero runtime dependencies beyond `react` and `react-dom`. Dev deps allowed: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/dom`.
- The 14 aroma types must match the book exactly: fruity, citrus, floral, green, vegetable, herbal, caramellic, roasted, nutty, spicy, woody, cheesy, animal, chemical.
- Colors/descriptor lists live ONLY in `src/config.ts` (single editable source, per spec).
- All persisted state is plain JSON; no schema beyond `AppState`.
- Text/UI copy in English.

## Review Focus

- Empty/corrupt `localStorage` state must not crash the app — `loadState()` returns a default `{ ingredients: [] }` (test pins this, Task 4).
- Importing a malformed JSON file must show an alert and change nothing (pinned by `parseImport` test, Task 4; UI wiring Task 7).
- Case/whitespace in descriptors: "Tropical" vs "tropical " must match when computing shared descriptors (pinned, Task 3).
- Duplicate descriptor entries within one type must not inflate shared strength (pinned, Task 3).
- Line rendering with 2+ ingredients sharing several types must produce exactly one line per pair, listing every shared type in its tooltip (pinned, Task 6).
- Dragging is pointer-event based; if pointer capture fails on their touchpad the user will notice immediately on first use — verified manually in Task 8's smoke test, no automated test.

---

### Task 1: Project scaffold (Vite + React + TS + Vitest)

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `vitest.setup.ts`
- Create: `.gitignore` (file itself is fine — it is NOT a git action; content: `node_modules/`, `dist/`)
- Test: one trivial render test `src/App.test.tsx`

**Interfaces:**
- Produces: runnable app with `npm run dev`, `npm run build`, `npm test`; a world where subsequent tasks just add files.

- [ ] **Step 1: Write scaffold config files**

`package.json`:
```json
{
  "name": "foodpairing-canvas",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

`vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

`vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

`tsconfig.json` / `tsconfig.node.json`: standard Vite react-ts template content (call `references` from app tsconfig to node one), strict: true, moduleResolution "bundler", jsx "react-jsx".

`index.html`: root div + `/src/main.tsx` script.

- [ ] **Step 2: Install dependencies**

Run: `npm install react react-dom && npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom vitest jsdom @testing-library/react @testing-library/user-event`
Expected: successful install, no peer conflicts.

- [ ] **Step 3: Write minimal `src/main.tsx`, `src/App.tsx` and a placeholder test `src/App.test.tsx`**

Test asserts `render(<App />)` places `Hello` text on screen.

- [ ] **Step 4: Verify**

Run: `npm test`
Expected: PASS (1 test)
Run: `npm run build`
Expected: exits 0, writes `dist/`

### Task 2: Aroma types config + core types

**Files:**
- Create: `src/types.ts`
- Create: `src/config.ts`
- Test: `src/config.test.ts`

**Interfaces:**
- Produces (exact, used by every later task):
```ts
// src/types.ts
export type AromaTypeId =
  | "fruity" | "citrus" | "floral" | "green" | "vegetable" | "herbal"
  | "caramellic" | "roasted" | "nutty" | "spicy" | "woody" | "cheesy"
  | "animal" | "chemical";

// key present = type enabled; array of descriptors (may be empty)
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

// src/config.ts
export const AROMA_TYPES: readonly { id: AromaTypeId; label: string; color: string }[];
export const DESCRIPTORS: Partial<Record<AromaTypeId, string[]>>; // editable seed lists
```

- [ ] **Step 1: Write failing test `src/config.test.ts`**

Assertions (all verbatim expectations):
```ts
const EXPECTED = [
  "fruity", "citrus", "floral", "green", "vegetable", "herbal",
  "caramellic", "roasted", "nutty", "spicy", "woody", "cheesy",
  "animal", "chemical",
] as const;
- AROMA_TYPES.length === 14 and ids list equals EXPECTED in order
- every entry: `id` matches EXPECTED, has `label` (capitalized string) and `color` matching /^#[0-9a-fA-F]{6}$/
- DESCRIPTORS has seed lists (each length >= 4) for at least: fruity, citrus, floral, green, vegetable, herbal, caramellic, roasted, nutty, spicy
- every descriptor in DESCRIPTORS for type T is lowercase and every descriptor's id key is in EXPECTED
- AROMA_TYPES ids are unique
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/config.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `src/types.ts` and `src/config.ts`**

`AROMA_COLORS` values in `AROMA_TYPES` (approximations of the book's wheel — user will tune):
| id | color |
|---|---|
| fruity | #e5477f |
| citrus | #f2c230 |
| floral | #b07fd6 |
| green | #4bad47 |
| vegetable | #2c6e3a |
| herbal | #7a8a2e |
| caramellic | #c68b3f |
| roasted | #6f4e37 |
| nutty | #c9a27e |
| spicy | #d0471f |
| woody | #8a6b45 |
| cheesy | #e0a94f |
| animal | #5d4b66 |
| chemical | #9aa3a8 |

`DESCRIPTORS` seeds (from the book's descriptor vocabulary, editable):
fruity: ["apple","banana","berry","coconut","grape","melon","peach","pear","pineapple","tropical"]
citrus: ["bergamot","grapefruit","lemon","lime","mandarin","orange peel"]
floral: ["geranium","jasmine","lavender","lilac","orange blossom","rose","violet"]
green: ["cucumber","cut grass","fatty","leafy","metallic","oat","waxy"]
vegetable: ["bell pepper","cabbage","cumin","mushroom","onion","potato","sulphurous"]
herbal: ["camphor","mint","sage","straw","thyme","cedar leaf"]
caramellic: ["burnt sugar","caramel","honey","malt","maple","vanillin"]
roasted: ["chocolate","coffee","corn chip","popcorn","smoky","toast"]
nutty: ["almond","hazelnut","hay","peanut","tonka","walnut"]
spicy: ["anise","black pepper","cinnamon","clove","saffron","vanilla"]
woody: ["guaiac","pine","rosewood","sandalwood","smoked"]
cheesy: ["butter","buttermilk","cheese","rancid","yogurt"]
animal: ["fishy","game","meat","stock","sweaty"]
chemical: ["burnt","musty","petroleum","soapy","solvent"]

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/config.test.ts`
Expected: PASS

### Task 3: Shared-flavor logic (pure)

**Files:**
- Create: `src/logic/connections.ts`
- Test: `src/logic/connections.test.ts`

**Interfaces:**
- Consumes: `Profile`, `SharedFlavor` from Task 2.
- Produces:
```ts
export function sharedFlavors(a: Profile, b: Profile): SharedFlavor[];
// one entry per aroma type present in BOTH profiles (even if neither has descriptors);
// descriptors compared trimmed + case-insensitive ("Tropical" == "tropical "), deduped;
// entry order follows AROMA_TYPES order
```

- [ ] **Step 1: Write failing tests** — cases (canonicalization pin: result descriptors are always the trimmed, lowercased strings):
  - `sharedFlavors({fruity:["Tropical"]},{fruity:["tropical "]})` → `[{type:"fruity",sharedDescriptors:["tropical"]}]`
  - `sharedFlavors({fruity:["apple"]},{fruity:["berry"]})` → `[{type:"fruity",sharedDescriptors:[]}]`
  - no overlap → `[]`
  - same type, disjoint descriptors → `[{type:"fruity",sharedDescriptors:[]}]`
  - type enabled, no descriptors both sides → `[{type:"herbal",sharedDescriptors:[]}]`
  - duplicates in one side (`["berry","berry","berry"]` vs `["berry","berry"]`) → `sharedDescriptors: ["berry"]` exactly once
  - order: input profiles with citrus+fruity → result order `["fruity","citrus"]` (AROMA_TYPES order)
- [ ] **Step 2: Run test to verify it fails** (`npm test -- src/logic/connections.test.ts`, FAIL: module not found)
- [ ] **Step 3: Implement `sharedFlavors`** — iterate AROMA_TYPES; for each type present in both profiles, intersect normalized descriptor sets (Set of trimmed lowercase; result string = trimmed lowercase).
- [ ] **Step 4: Run test to verify it passes** (same command, PASS)
- [ ] **Step 5: Add helper `hasStrongLink(flavors: SharedFlavor[]): boolean`** → `flavors.some(f => f.sharedDescriptors.length > 0)`; extend tests: strong iff some descriptors shared. (Same test file, same run cycle.)

### Task 4: Persistence (localStorage + JSON export/import)

**Files:**
- Create: `src/logic/storage.ts`
- Test: `src/logic/storage.test.ts`

**Interfaces:**
- Consumes: `AppState` from Task 2.
- Produces:
```ts
const STORAGE_KEY = "foodpairing-canvas-v1";
export function saveState(state: AppState): void;         // synchronous localStorage.set
export function loadState(): AppState;                    // {} or corrupt → { ingredients: [] }
export function exportJson(state: AppState): string;      // pretty-printed JSON
export function parseImport(text: string): AppState;      // throws Error("invalid canvas file") on any non-conforming shape
export function downloadExport(state: AppState): void;    // browser download "foodpairing-canvas.json"
```

- [ ] **Step 1: Write failing tests** — round-trip `saveState` → `loadState` equals original; `loadState` with absent key → `{ingredients:[]}`; corrupt value (`"not json"` / JSON of wrong shape e.g. `{"ingredients":42}`) → `{ingredients:[]}` not a throw; `exportJson`→`parseImport` round-trip equals state; `parseImport("garbage")` throws exactly `Error("invalid canvas file")`; `parseImport` accepts valid file missing optional fields (e.g. ingredient missing `profile`) → defaults (`profile: {}`)
- [ ] **Step 2: Run to verify FAIL** (`npm test -- src/logic/storage.test.ts`)
- [ ] **Step 3: Implement storage.ts** (validation in `parseImport`/`loadState`: ingredients is array; each has id:string, name:string, x/y finite numbers; else invalid)
- [ ] **Step 4: Run to verify PASS**

### Task 5: IngredientCard component

**Files:**
- Create: `src/components/IngredientCard.tsx`
- Create: `src/components/IngredientCard.css`
- Test: `src/components/IngredientCard.test.tsx`

**Interfaces:**
- Consumes: `Ingredient`, `Profile`, `AROMA_TYPES`, `DESCRIPTORS` from Task 2.
- Produces:
```tsx
export type CardProps = {
  ingredient: Ingredient;
  onChange: (patch: Partial<Ingredient>) => void;
  // drag: parent Canvas attaches pointer handling via this callback when dragging starts
  onDragStart: (e: React.PointerEvent) => void;
};
export function IngredientCard(props: CardProps): JSX.Element;
```
Card contents (top→bottom): header row = name input (styled borderless, shows name) + drag affordance on the whole header (pointer events on header only). Then a wrap row of type-toggle chips — one per AROMA_TYPE, 10px, default `border: 1px solid #ccc; background: transparent`, active: `background: color`, `border-color: color`, `aria-pressed={enabled}` and `title={label}`. Under it, for each enabled type: descriptor chips with an × button + an add-descriptor inline input, both colored with the type color; suggestion datalist per type from DESCRIPTORS (a `<datalist id={"desc-" + type}>` next to a `<input list=...>`), allowing free-form words. All descriptor edits call `onChange({ profile: newProfile })`.

- [ ] **Step 1: Write failing tests** — render `strawberry` with `profile: {}`; click chip for "fruity" → `aria-pressed` true & a colored dot appears; click again → off; toggle fruity on, type "tropical" in its descriptor input + Enter → chip `tropical` appears; click its × → gone; all via `userEvent` (`getByTitle("fruity")`, query roles).
- [ ] **Step 2: Run to verify FAIL** (`npm test -- src/components/IngredientCard.test.tsx`, FAIL: not found)
- [ ] **Step 3: Implement** — local state only for the in-progress descriptor input text; profile shape `{[T]: string[]}` — enabling a type sets `profile[type] = []` if absent, disabling deletes the key (extra headers/dots/colors come from config; no new color values here).
- [ ] **Step 4: Run to verify PASS**

### Task 6: Canvas (lines + drag)

**Files:**
- Create: `src/components/Canvas.tsx`
- Create: `src/components/Canvas.css`
- Test: `src/components/Canvas.test.tsx`

**Interfaces:**
- Consumes: `Ingredient`,`AppState` (Task 2), `sharedFlavors`/`hasStrongLink` (Task 3), `IngredientCard` (Task 5), card geometry constants.
- Produces:
```tsx
export const CARD_W = 240;
export const CARD_HEADER_H = 28;          // line anchor: (x + CARD_W/2, y + CARD_HEADER_H/2)
export type CanvasProps = {
  ingredients: Ingredient[];
  showConnections: boolean;
  onChangeIngredient: (id: string, patch: Partial<Ingredient>) => void;
  emptyHint?: string;      // shown when ingredients.length === 0
};
export function Canvas(props: CanvasProps): JSX.Element;
```
Rendering: full-size relative container (`position:relative; width:100%; height:100%`). Backdrop SVG layer (`position:absolute; inset:0; width:100%; height:100%`) with one `<line>` per pair with non-empty `sharedFlavors` (stroke `#8a8f98`, width 1.5 (weak) or 3 (strong), `data-testid="conn-Line"`; `<title>` = list of shared types joined `", "` — persist order). Cards drawn as absolutely-positioned `<div>`s wrapping `<IngredientCard>` at `left:x, top:y`. Dragging: pointerdown on card header sets local dragState `{id, startPointOffset, startPos}`; move updates `x/y` locally during drag; pointerup commits via `onChangeIngredient(id, {x,y})`. Use `setPointerCapture` on the header element. Since dragging is position-only and local state is reset at pointercapture release, in tests we simulate with `fireEvent.pointerDown/Move/Up` on the header and assert no crash + position commits.

- [ ] **Step 1: Write failing tests** —
  - two ingredients sharing fruity w/ same descriptor at known positions + `showConnections={true}` → one `conn-Line` with `data-strong="true"` and `<title>` text containing `fruity` and the shared descriptor.
  - same render with two sharing a type but disjoint descriptors → `data-strong="false"` still one line, title contains type names.
  - `showConnections={false}` → zero `conn-Line`.
  - ON but zero profiles → zero lines.
  - triples sharing fruity → exactly 3 lines (pairs).
- [ ] **Step 2: Run to verify FAIL** (`npm test -- src/components/Canvas.test.tsx`)
- [ ] **Step 3: Implement** (algorithm: filter ingredients pairwise; `sharedFlavors(a.profile, b.profile)`; line endpoints from geometry constants above; z-order: SVG under cards via DOM order)
- [ ] **Step 4: Run to verify PASS**

### Task 7: App wiring (header, toggle, add, autosave, export/import)

**Files:**
- Modify: `src/App.tsx`, `src/App.css`
- Test: update `src/App.test.tsx`

**Interfaces:**
- Consumes: everything above (`AROMA_TYPES` labels for select — none need to be imported into App directly except via Canvas geometry; App just needs state actions).
- Produces: the complete running tool.

- [ ] **Step 1: Write failing tests** — header shows title, `Connections on|off` toggle, `Add ingredient` button, `Export` and `Import` buttons. Empty canvas shows the empty hint. Click Add → one ingredient card (name input present). Autosave: after add, `localStorage` `foodpairing-canvas-v1` parses to state with 1 ingredient; reload scenario: unmount, fresh `render(<App/>)` re-reads persisted ingredient (per `loadState`).
- [ ] **Step 2: Run to verify FAIL** (`npm test -- src/App.test.tsx`)
- [ ] **Step 3: Implement App**

State model: `const [state, setState] = useState<AppState>(() => loadState())`; effect `saveState(state)` on every change. `addIngredient`: `id = crypto.randomUUID()`, name `"new ingredient"`, `x = 40 + (n % 4) * 260`, `y = 40 + Math.floor(n / 4) * 240`. Usage: `<Canvas ingredients={} showConnections={} onChangeIngredient={} emptyHint="..." />`; export → `downloadExport(state)`. Import: hidden `<input type="file" accept=".json,text/plain">`, on change `text = await file.text()`, `parseImport(text)` (try/catch → `window.alert("That file doesn't look like a canvas export.")`, on success `setState`).

- [ ] **Step 4: Run to verify PASS**

### Task 8: Final verification & README

**Files:**
- Create: `README.md` (3 lines: purpose, `npm run dev`, colors/descriptors editable in `src/config.ts`)
- Test: full suite + production build

- [ ] **Step 1: Run full test suite** — `npm test` → all PASS.
- [ ] **Step 2: Run production build** — `npm run build` → exits 0, `dist/` written.
- [ ] **Step 3: Smoke-test the running dev server** — start `npm run dev` in background, `curl -s http://localhost:5173 | head -5` (expect HTML with root div), then verify the Vite client module loads (curl status 200 on `/src/main.tsx`), then kill the server. This is also the manual UI pass: the user should open it, add 3 card-ingredients (e.g. strawberry, chocolate/coffee, basil), play with toggles/drag/export/import once.
- [ ] **Final step:** report to the user that the prototype is ready at `npm run dev` with a note to open `src/config.ts` to tune colors/descriptor seeds, and that `dist/` can be rebuilt (+ `dist/index.html` openable directly) any time.
