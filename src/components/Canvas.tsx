import { useEffect, useRef, useState } from "react";
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

// Zoom the canvas itself owns — the browser page-zoom is disabled so that
// pinch gestures and ctrl+wheel always land here.
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

// Zoom the scrollable canvas around a screen point: the world point under the
// cursor/fingers must stay under it afterwards, which pins the scroll offset.
function zoomAt(
  el: HTMLElement,
  clientX: number,
  clientY: number,
  targetZoom: number,
  currentZoom: number,
  apply: (z: number) => void,
) {
  if (targetZoom === currentZoom) return;
  const rect = el.getBoundingClientRect();
  const vx = clientX - rect.left;
  const vy = clientY - rect.top;
  const wx = (el.scrollLeft + vx) / currentZoom;
  const wy = (el.scrollTop + vy) / currentZoom;
  const zoom = clampZoom(targetZoom);
  el.scrollLeft = wx * zoom - vx;
  el.scrollTop = wy * zoom - vy;
  apply(zoom);
}

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
  const [view, setView] = useState({ zoom: 1 });
  const dragRef = useRef<DragState | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  // zoomRef is written together with every setView so gesture handlers read
  // the live zoom even between a state update and its commit.
  const zoomRef = useRef(1);
  const applyZoom = (z: number) => {
    zoomRef.current = z;
    setView({ zoom: z });
  };

  // ctrl/cmd+wheel zooms the canvas around the cursor; plain wheel keeps the
  // native scroll. React attaches wheel listeners passively, so this one is
  // wired manually to be able to preventDefault the browser page-zoom.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomAt(
        el,
        e.clientX,
        e.clientY,
        zoomRef.current * Math.pow(1.2, -e.deltaY / 120),
        zoomRef.current,
        applyZoom,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pan (one finger / mouse drag on the background) and pinch-zoom (two
  // fingers), hand-rolled on window listeners because touch-action: none
  // hands gesture ownership to JS.
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ startZoom: number; startDist: number } | null>(null);
  const panRef = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const attachedRef = useRef(false);

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    // Only the primary button; touches report button 0.
    if (e.button !== 0) return;
    // Pointers that start on a card (wrapper or anything inside it) belong to
    // the card (drag, editing, tap-to-focus) and must not start panning, join
    // a pinch, or clear the touch focus.
    const target = e.target as Element | null;
    if (target && target.closest(".canvas-item")) return;

    // A tap on the empty background clears a touch focus (tap a card again to
    // toggle it off there — this covers "tap somewhere else").
    if (e.pointerType === "touch") setHoveredId(null);

    const el = canvasRef.current;
    if (!el) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const attach = () => {
      if (attachedRef.current) return;
      attachedRef.current = true;

      const detach = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        window.removeEventListener("blur", end);
        attachedRef.current = false;
        pointersRef.current.clear();
        pinchRef.current = null;
        panRef.current = null;
      };
      const move = (ev: PointerEvent) => {
        if (!pointersRef.current.has(ev.pointerId)) return;
        pointersRef.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        const canvasEl = canvasRef.current;
        if (!canvasEl) return;
        if (pointersRef.current.size >= 2 && pinchRef.current) {
          const [p0, p1] = [...pointersRef.current.values()];
          const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
          if (pinchRef.current.startDist > 0) {
            zoomAt(
              canvasEl,
              (p0.x + p1.x) / 2,
              (p0.y + p1.y) / 2,
              pinchRef.current.startZoom * (dist / pinchRef.current.startDist),
              zoomRef.current,
              applyZoom,
            );
          }
        } else if (pointersRef.current.size === 1 && panRef.current && !pinchRef.current) {
          canvasEl.scrollLeft = panRef.current.scrollLeft - (ev.clientX - panRef.current.startX);
          canvasEl.scrollTop = panRef.current.scrollTop - (ev.clientY - panRef.current.startY);
        }
      };
      const end = (ev: Event) => {
        const id = (ev as PointerEvent).pointerId;
        if (ev.type === "blur" || id === undefined || pointersRef.current.has(id)) {
          const m = pointersRef.current;
          if (ev.type !== "blur") m.delete(id);
          if (m.size < 2) pinchRef.current = null;
          if (m.size === 0) detach();
        }
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      window.addEventListener("blur", end);
    };
    attach();

    const pts = [...pointersRef.current.values()];
    if (pts.length === 2) {
      panRef.current = null;
      pinchRef.current = {
        startZoom: zoomRef.current,
        startDist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y),
      };
    } else if (pts.length === 1) {
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
      };
    }
  };

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
      // Screen delta -> canvas units at the current zoom.
      const z = zoomRef.current;
      setDragPos({
        x: state.baseX + (ev.clientX - state.startX) / z,
        y: state.baseY + (ev.clientY - state.startY) / z,
      });
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== state.pointerId) return;
      done();
      const z = zoomRef.current;
      onChangeIngredient(ing.id, {
        x: state.baseX + (ev.clientX - state.startX) / z,
        y: state.baseY + (ev.clientY - state.startY) / z,
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
      <div
        className="canvas-scroll"
        data-testid="canvas"
        ref={canvasRef}
        onPointerDown={onCanvasPointerDown}
      >
      {/* Explicit scrollable extent (zoom-independent from the scaled inner
          world): the transform-scaled children define what you see, this box
          defines how far you can pan, deterministically. */}
      <div
        className="canvas-extent"
        style={{ width: extentW * view.zoom, height: extentH * view.zoom }}
      />
      <div
        className="canvas-world"
        data-testid="canvas-world"
        style={{
          width: extentW,
          height: extentH,
          transform: `scale(${view.zoom})`,
        }}
      >
        <svg
          className="canvas-lines"
          width={extentW}
          height={extentH}
          style={{ overflow: "visible" }}
          aria-hidden="true"
        >
          {lines}
        </svg>
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
            onPointerEnter={(e) => {
              // Hover-to-focus is a mouse concept; on touch, a tap toggles it
              // via the pointerdown handler below (pointerEnter/Leave fire
              // momentary blips around a tap and would clear it immediately).
              if (e.pointerType !== "touch") setHoveredId(ing.id);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType !== "touch") setHoveredId(null);
            }}
            onPointerDown={(e) => {
              if (e.pointerType === "touch") {
                setHoveredId((current) => (current === ing.id ? null : ing.id));
              }
            }}
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
      </div>
      {/* Outside the scroller and the scaled world: always centered in the
          visible viewport, never panned or zoomed away. */}
      {ingredients.length === 0 && emptyHint ? (
        <div className="canvas-empty">{emptyHint}</div>
      ) : null}
    </div>
  );
}

export default Canvas;
