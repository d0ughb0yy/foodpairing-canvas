import { useRef, useState } from "react";
import { AROMA_TYPES } from "../config";
import { sharedFlavors } from "../logic/connections";
import type { Ingredient } from "../types";
import IngredientCard from "./IngredientCard";
import "./Canvas.css";

export const CARD_W = 240;
// Height of the draggable header; lines anchor at the card's top center.
export const CARD_HEADER_H = 36;

const ANCHOR_X = CARD_W / 2;
const ANCHOR_Y = CARD_HEADER_H / 2;

export type CanvasProps = {
  ingredients: Ingredient[];
  showConnections: boolean;
  onChangeIngredient: (id: string, patch: Partial<Ingredient>) => void;
  onRemoveIngredient?: (id: string) => void;
  emptyHint?: string;
};

const TYPE_LABELS: ReadonlyMap<string, string> = new Map(
  AROMA_TYPES.map((t) => [t.id, t.label]),
);

const TYPE_COLORS: ReadonlyMap<string, string> = new Map(
  AROMA_TYPES.map((t) => [t.id, t.color]),
);

function flavorTitle(f: { type: string; sharedDescriptors: string[] }) {
  const label = TYPE_LABELS.get(f.type) ?? f.type;
  return f.sharedDescriptors.length > 0
    ? `${label} (${f.sharedDescriptors.join(", ")})`
    : label;
}

// Perpendicular offset between parallel flavor lines of the same pair.
const FAN_STEP = 22;

type DragState = {
  id: string;
  pointerId: number | undefined;
  startX: number;
  startY: number;
  baseX: number;
  baseY: number;
};

export function Canvas({
  ingredients,
  showConnections,
  onChangeIngredient,
  onRemoveIngredient,
  emptyHint,
}: CanvasProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const startDrag = (e: React.PointerEvent, ing: Ingredient) => {
    // Clicks on editable controls are for editing, not dragging: leaving the
    // default action intact is what lets the input receive focus.
    const target = e.target as HTMLElement | null;
    if (target && target.tagName === "INPUT") return;
    // One drag at a time, primary button only (prototype: no touch doctoring).
    if (dragRef.current !== null || e.button !== 0) return;
    e.preventDefault();

    const state: DragState = {
      id: ing.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: ing.x,
      baseY: ing.y,
    };
    dragRef.current = state;
    setDragId(state.id);

    // Capture the gesture so releases outside the window still reach us.
    const el = e.currentTarget;
    if (typeof el.setPointerCapture === "function") {
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // No capture available (e.g. test DOM) — window listeners cover it.
      }
    }

    const done = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
      dragRef.current = null;
      setDragId(null);
      setDragPos(null);
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== state.pointerId) return;
      setDragPos({
        x: state.baseX + (ev.clientX - state.startX),
        y: state.baseY + (ev.clientY - state.startY),
      });
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== state.pointerId) return;
      done();
      onChangeIngredient(ing.id, {
        x: state.baseX + (ev.clientX - state.startX),
        y: state.baseY + (ev.clientY - state.startY),
      });
    };
    const cancel = (ev: Event) => {
      const pid = (ev as PointerEvent).pointerId;
      if (pid !== state.pointerId && ev.type !== "blur") return;
      done();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
  };

  const lines: React.ReactNode[] = [];
  const extentW = Math.max(
    CARD_W + 240,
    ...ingredients.map((i) => i.x + CARD_W + 240),
  );
  const extentH = Math.max(
    600,
    ...ingredients.map((i) => i.y + 320),
  );
  if (showConnections) {
    for (let i = 0; i < ingredients.length; i++) {
      for (let j = i + 1; j < ingredients.length; j++) {
        const a = ingredients[i];
        const b = ingredients[j];
        // Lines read the same live position the cards use mid-drag, so the
        // connections follow the card instead of snapping on release.
        const posOf = (ing: Ingredient) =>
          dragId === ing.id && dragPos ? dragPos : { x: ing.x, y: ing.y };
        const apos = posOf(a);
        const bpos = posOf(b);
        const shared = sharedFlavors(a.profile, b.profile);
        if (shared.length === 0) continue;

        const ax = apos.x + ANCHOR_X;
        const ay = apos.y + ANCHOR_Y;
        const bx = bpos.x + ANCHOR_X;
        const by = bpos.y + ANCHOR_Y;
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;
        const dx = bx - ax;
        const dy = by - ay;
        const len = Math.hypot(dx, dy) || 1;
        const px = -dy / len;
        const py = dx / len;
        // Dim every line this pair's flavor lines don't belong to when a card
        // is hovered (focus mode).
        const dim =
          hoveredId !== null && hoveredId !== a.id && hoveredId !== b.id;

        shared.forEach((flavor, fi) => {
          const offset = (fi - (shared.length - 1) / 2) * FAN_STEP;
          const cx = mx + px * offset;
          const cy = my + py * offset;
          const strong = flavor.sharedDescriptors.length > 0;
          lines.push(
            <path
              key={`${a.id}--${b.id}--${flavor.type}`}
              d={`M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`}
              stroke={TYPE_COLORS.get(flavor.type) ?? "#8a8f98"}
              strokeWidth={strong ? 3 : 1.5}
              data-strong={strong ? "true" : "false"}
              data-type={flavor.type}
              data-dim={dim ? "true" : "false"}
              data-testid="conn-line"
            >
              <title>{flavorTitle(flavor)}</title>
            </path>,
          );
        });
      }
    }
  }

  return (
    <div className="canvas">
      <svg
        className="canvas-lines"
        width={extentW}
        height={extentH}
        style={{ overflow: "visible" }}
        aria-hidden="true"
      >
        {lines}
      </svg>
      {ingredients.length === 0 && emptyHint ? (
        <div className="canvas-empty">{emptyHint}</div>
      ) : null}
      {ingredients.map((ing) => {
        const isDragging = dragId === ing.id;
        const x = isDragging && dragPos ? dragPos.x : ing.x;
        const y = isDragging && dragPos ? dragPos.y : ing.y;
        return (
          <div
            key={ing.id}
            className="canvas-item"
            style={{ left: x, top: y }}
            data-testid={`card-${ing.id}`}
            onPointerEnter={() => setHoveredId(ing.id)}
            onPointerLeave={() => setHoveredId(null)}
          >
            <IngredientCard
              ingredient={ing}
              onChange={(patch) => onChangeIngredient(ing.id, patch)}
              onDragStart={(e) => startDrag(e, ing)}
              dragTestId={`drag-${ing.id}`}
              onDelete={
                onRemoveIngredient
                  ? () => onRemoveIngredient(ing.id)
                  : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
}

export default Canvas;
