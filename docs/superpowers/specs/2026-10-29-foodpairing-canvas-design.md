# Foodpairing Dish Canvas — Design (short)

**Source:** conversation design, approved 2026-10-29. Book: *The Art & Science of Foodpairing* (Coucquyt, Lahousse, Langenbick) — its color key is the Foodpairing aroma-wheel system.

**Intent & why:** A personal, visual tool for planning dishes. Enter ingredients on a canvas with their flavor profiles; colors come from the book's 14 aroma types; a toggle reveals connection lines between ingredients sharing flavors — to *see* which parts of a dish hang together.

**Goals**
- Ingredient cards: editable name + toggles for the 14 aroma types (fruity, citrus, floral, green, vegetable, herbal, caramellic, roasted, nutty, spicy, woody, cheesy, animal, chemical), each colored per the book (editable values).
- Two-tier profiles: descriptors under each enabled type, autocomplete seeded from the book's descriptor vocabulary (~70 terms), free-form allowed, empty allowed.
- Freely draggable cards; one master toggle draws lines between pairs sharing ≥1 aroma type; line drawn stronger when they share a descriptor; hover shows exactly what's shared (matches the book's dot/dot logic in pairing grids).
- Autosave in the browser (localStorage) + JSON export/import.

**Non-goals / anti-goals (v1)**
- No accounts, no database, no multi-device sync; nothing networked.
- No recipe/text/PDF export, no ingredient library re-use, no aroma-intensity weighting, no pre-loaded flavor database — profiles are user-entered.
- Anti-goals: heavy framework stacks, dependency bloat, anything that makes the tool hard to run with zero ceremony beyond `npm run dev`.

**Constraints**
- Book's 14 aroma types verbatim; all colors and descriptor seeds in one editable config file (`src/config.ts`) so they can be nudged to the printed book.
- Runtime deps limited to react + react-dom.

**Approaches considered (from conversation)**
1. Single self-contained HTML file, vanilla JS — simplest, but harder to grow (rejected: user expects future features).
2. Small Vite + React + TypeScript app — chosen: room to grow, still lightweight, editable.
3. Framework-heavy / canvas-library stack — rejected: overkill for a personal prototype.

**Calls made by the assistant** (tunable, flagged for user review): colors are close approximations of the book's wheel, not sampled from it; connection anchor at card top-center; descriptor seeds drafted from Foodpairing's published system; import replaces the canvas (with alert on invalid file); no automated drag tests (verified manually).
