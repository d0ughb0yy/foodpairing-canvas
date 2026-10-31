import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { Ingredient } from "../types";
import { Canvas, CARD_HEADER_H, CARD_W } from "./Canvas";

const FRUITY_PAIR: Ingredient[] = [
  {
    id: "s-1",
    name: "strawberry",
    x: 20,
    y: 30,
    profile: { fruity: ["berry", "tropical"], green: ["cucumber"] },
  },
  {
    id: "c-1",
    name: "chocolate",
    x: 300,
    y: 220,
    profile: { caramellic: ["maple"], fruity: ["berry"] },
  },
];

describe("Canvas connection lines", () => {
  it("draws one strong line when a descriptor is shared", () => {
    render(
      <Canvas
        ingredients={FRUITY_PAIR}
        showConnections={true}
        onChangeIngredient={vi.fn()}
      />,
    );
    const line = screen.getByTestId("conn-line");
    expect(line).toHaveAttribute("data-strong", "true");
    const title = line.querySelector("title");
    expect(title?.textContent).toContain("Fruity (berry)");
  });

  it("draws one weak line when only a type is shared", () => {
    render(
      <Canvas
        ingredients={[
          FRUITY_PAIR[0],
          { ...FRUITY_PAIR[1], profile: { caramellic: ["maple"], fruity: ["apple"] } },
        ]}
        showConnections={true}
        onChangeIngredient={vi.fn()}
      />,
    );
    const line = screen.getByTestId("conn-line");
    expect(line).toHaveAttribute("data-strong", "false");
    expect(line.querySelector("title")?.textContent).toContain("Fruity");
  });

  it("draws no lines when the connection toggle is off", () => {
    render(
      <Canvas
        ingredients={FRUITY_PAIR}
        showConnections={false}
        onChangeIngredient={vi.fn()}
      />,
    );
    expect(screen.queryAllByTestId("conn-line")).toHaveLength(0);
  });

  it("draws no lines when profiles share nothing", () => {
    render(
      <Canvas
        ingredients={[
          FRUITY_PAIR[0],
          { ...FRUITY_PAIR[1], profile: { herbal: ["mint"] } },
        ]}
        showConnections={true}
        onChangeIngredient={vi.fn()}
      />,
    );
    expect(screen.queryAllByTestId("conn-line")).toHaveLength(0);
  });

  it("draws one line per pair (3 for three ingredients sharing fruity)", () => {
    render(
      <Canvas
        ingredients={[
          FRUITY_PAIR[0],
          FRUITY_PAIR[1],
          { id: "m-1", name: "melon", x: 400, y: 60, profile: { fruity: ["tropical"] } },
        ]}
        showConnections={true}
        onChangeIngredient={vi.fn()}
      />,
    );
    expect(screen.getAllByTestId("conn-line")).toHaveLength(3);
  });

  it("draws one colored line per shared flavor type between a pair", () => {
    render(
      <Canvas
        ingredients={[
          {
            id: "a-1",
            name: "apple pie",
            x: 20,
            y: 30,
            profile: { fruity: ["apple"], caramellic: ["honey"] },
          },
          {
            id: "b-1",
            name: "ice cream",
            x: 300,
            y: 220,
            profile: { fruity: [], caramellic: [] },
          },
        ]}
        showConnections={true}
        onChangeIngredient={vi.fn()}
      />,
    );

    const lines = screen.getAllByTestId("conn-line");
    expect(lines).toHaveLength(2);

    const fruity = lines.find((l) => l.getAttribute("data-type") === "fruity");
    const caramel = lines.find(
      (l) => l.getAttribute("data-type") === "caramellic",
    );
    expect(fruity).not.toBeNull();
    expect(caramel).not.toBeNull();
    expect(fruity!.getAttribute("stroke")).toBe("#f9b615");
    expect(caramel!.getAttribute("stroke")).toBe("#d76e25");
    // Type-only sharing stays a thin line (the book's small dot).
    expect(fruity!.getAttribute("stroke-width")).toBe("1.5");
  });

  it("fans parallel flavor lines apart from each other", () => {
    render(
      <Canvas
        ingredients={[
          {
            id: "a-1",
            name: "apple pie",
            x: 20,
            y: 30,
            profile: { fruity: ["apple"], caramellic: ["honey"] },
          },
          {
            id: "b-1",
            name: "ice cream",
            x: 300,
            y: 220,
            profile: { fruity: [], caramellic: [] },
          },
        ]}
        showConnections={true}
        onChangeIngredient={vi.fn()}
      />,
    );

    const [d1, d2] = screen
      .getAllByTestId("conn-line")
      .map((l) => l.getAttribute("d"));
    expect(d1).not.toEqual(d2);
  });

  it("fades the line dim in and out gently instead of snapping", () => {
    // jsdom does not animate, so the fade is pinned at the stylesheet level:
    // the line rules must declare a short opacity transition (applied to both
    // the dim-in and the undim).
    const css = readFileSync("src/components/Canvas.css", "utf8");
    const lineRule = css.match(/\.canvas-lines path\s*{[^}]*}/)?.[0] ?? "";
    expect(lineRule).toMatch(/transition:\s*opacity\s+180ms\s+ease/);
  });

  it("dims lines the hovered card is not part of, and undims on leave", () => {
    render(
      <Canvas
        ingredients={[
          { id: "s-1", name: "strawberry", x: 20, y: 30, profile: { fruity: ["tropical"] } },
          { id: "c-1", name: "chocolate", x: 320, y: 30, profile: { caramellic: ["maple"] } },
          { id: "m-1", name: "melon", x: 170, y: 240, profile: { caramellic: ["maple"], fruity: ["tropical"] } },
        ]}
        showConnections={true}
        onChangeIngredient={vi.fn()}
      />,
    );

    fireEvent.pointerEnter(screen.getByTestId("card-s-1"));
    const fruityLine = screen
      .getAllByTestId("conn-line")
      .find((l) => l.getAttribute("data-type") === "fruity");
    const caramelLine = screen
      .getAllByTestId("conn-line")
      .find((l) => l.getAttribute("data-type") === "caramellic");
    expect(fruityLine).toHaveAttribute("data-dim", "false");
    expect(caramelLine).toHaveAttribute("data-dim", "true");

    fireEvent.pointerLeave(screen.getByTestId("card-s-1"));
    for (const l of screen.getAllByTestId("conn-line")) {
      expect(l).toHaveAttribute("data-dim", "false");
    }
  });

  it("anchors lines at the card's top center", () => {
    render(
      <Canvas
        ingredients={FRUITY_PAIR}
        showConnections={true}
        onChangeIngredient={vi.fn()}
      />,
    );
    const line = screen.getByTestId("conn-line");
    // Curved path: M {ax} {ay} Q {cx} {cy} {bx} {by}
    expect(line.getAttribute("d")?.startsWith(
      `M ${20 + CARD_W / 2} ${30 + CARD_HEADER_H / 2} `,
    )).toBe(true);
  });

  it("renders the empty hint when there are no ingredients", () => {
    render(
      <Canvas
        ingredients={[]}
        showConnections={true}
        onChangeIngredient={vi.fn()}
        emptyHint="double-click empty canvas to add an ingredient"
      />,
    );
    expect(screen.getByText(/double-click empty canvas/i)).toBeVisible();
  });
});

describe("Canvas name editing", () => {
  it("lets a click on the name focus it and rename the card", async () => {
    const user = userEvent.setup();
    const onChangeIngredient = vi.fn();
    render(
      <Canvas
        ingredients={[
          { id: "s-1", name: "strawberry", x: 10, y: 10, profile: {} },
        ]}
        showConnections={false}
        onChangeIngredient={onChangeIngredient}
      />,
    );

    const input = screen.getByDisplayValue("strawberry");
    await user.click(input);
    await user.keyboard("X");

    expect(onChangeIngredient).toHaveBeenLastCalledWith("s-1", {
      name: "strawberryX",
    });
  });
});

describe("Canvas drag hygiene", () => {
  it("starts drags only on the primary button", () => {
    const onChangeIngredient = vi.fn();
    render(
      <Canvas
        ingredients={FRUITY_PAIR}
        showConnections={false}
        onChangeIngredient={onChangeIngredient}
      />,
    );

    const header = screen.getByTestId("drag-s-1");
    fireEvent.pointerDown(header, { button: 2, pointerId: 1 });
    fireEvent.pointerUp(header, { clientX: 500, clientY: 500, pointerId: 1 });

    expect(onChangeIngredient).not.toHaveBeenCalled();
  });

  it("ignores other pointers while a drag is active", () => {
    const onChangeIngredient = vi.fn();
    render(
      <Canvas
        ingredients={FRUITY_PAIR}
        showConnections={false}
        onChangeIngredient={onChangeIngredient}
      />,
    );

    const header = screen.getByTestId("drag-s-1");
    fireEvent.pointerDown(header, { pointerId: 1, clientX: 100, clientY: 100 });
    // A second finger lands on the card while finger 1 is still down.
    fireEvent.pointerDown(header, { pointerId: 2, clientX: 999, clientY: 999 });
    // Finger 1 releases — the single legitimate commit.
    fireEvent.pointerUp(header, { pointerId: 1, clientX: 115, clientY: 105 });
    // Finger 2 releases afterwards — must not drive or duplicate the drag.
    fireEvent.pointerUp(header, { pointerId: 2, clientX: 500, clientY: 500 });

    expect(onChangeIngredient).toHaveBeenCalledTimes(1);
    expect(onChangeIngredient).toHaveBeenCalledWith("s-1", { x: 35, y: 35 });
  });

  it("aborts the drag on pointercancel without committing", () => {
    const onChangeIngredient = vi.fn();
    render(
      <Canvas
        ingredients={FRUITY_PAIR}
        showConnections={false}
        onChangeIngredient={onChangeIngredient}
      />,
    );

    const header = screen.getByTestId("drag-s-1");
    fireEvent.pointerDown(header, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerCancel(header, { pointerId: 1 }); // browser took over the gesture
    fireEvent.pointerMove(header, { pointerId: 1, clientX: 300, clientY: 300 });
    fireEvent.pointerUp(header, { pointerId: 1, clientX: 300, clientY: 300 });

    expect(onChangeIngredient).not.toHaveBeenCalled();
  });
});

describe("Canvas line layer extent", () => {
  it("sizes the line layer so far-off cards stay connected", () => {
    render(
      <Canvas
        ingredients={[
          {
            id: "s-1",
            name: "strawberry",
            x: 20,
            y: 30,
            profile: { fruity: ["berry"] },
          },
          {
            id: "f-1",
            name: "far berry",
            x: 3000,
            y: 2000,
            profile: { fruity: ["berry"] },
          },
        ]}
        showConnections={true}
        onChangeIngredient={vi.fn()}
      />,
    );

    const line = screen.getByTestId("conn-line");
    // Curved path "M {ax} {ay} Q {cx} {cy} {bx} {by}" starts at the near
    // card's top-center anchor and ends at the far card's.
    const d = line.getAttribute("d") ?? "";
    expect(d.startsWith(`M ${20 + CARD_W / 2} ${30 + CARD_HEADER_H / 2} `)).toBe(
      true,
    );
    expect(Number(d.split(" ").pop())).toBe(2000 + CARD_HEADER_H / 2);
    const layer = (line as unknown as Element).parentElement as unknown as SVGSVGElement;
    expect(Number(layer.getAttribute("width"))).toBeGreaterThanOrEqual(
      3000 + CARD_W,
    );
    expect(Number(layer.getAttribute("height"))).toBeGreaterThanOrEqual(2000);
  });
});

describe("Canvas delete", () => {
  it("asks the parent to remove the ingredient via the card's delete button", () => {
    const onRemoveIngredient = vi.fn();
    render(
      <Canvas
        ingredients={FRUITY_PAIR}
        showConnections={false}
        onChangeIngredient={vi.fn()}
        onRemoveIngredient={onRemoveIngredient}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /delete chocolate/i }));
    expect(onRemoveIngredient).toHaveBeenCalledWith("c-1");
  });
});

describe("Canvas grip dragging", () => {
  it("starts the drag when pressing directly on the grip dots", () => {
    const onChangeIngredient = vi.fn();
    render(
      <Canvas
        ingredients={FRUITY_PAIR}
        showConnections={false}
        onChangeIngredient={onChangeIngredient}
      />,
    );

    const grip = within(screen.getByTestId("drag-s-1")).getByText("⋮");
    fireEvent.pointerDown(grip, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerUp(grip, { clientX: 115, clientY: 105, button: 0 });

    // base (20,30) + delta (15, 5) = (35, 35)
    expect(onChangeIngredient).toHaveBeenCalledWith("s-1", { x: 35, y: 35 });
  });
});

describe("Canvas dragging", () => {
  it("moves connected lines live while the card is being dragged", () => {
    render(
      <Canvas
        ingredients={FRUITY_PAIR}
        showConnections={true}
        onChangeIngredient={vi.fn()}
      />,
    );

    const header = screen.getByTestId("drag-s-1");
    fireEvent.pointerDown(header, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(header, { clientX: 115, clientY: 105 });

    // Strawberry base (20,30) + delta (15,5) = (35,35): its line anchor is at
    // (35 + CARD_W/2, 35 + CARD_HEADER_H/2) = (155, 53) mid-gesture — before
    // pointerup.
    const d = screen.getByTestId("conn-line").getAttribute("d") ?? "";
    expect(d.startsWith(`M ${20 + 15 + CARD_W / 2} ${35 + CARD_HEADER_H / 2} `)).toBe(
      true,
    );

    fireEvent.pointerUp(header, { clientX: 115, clientY: 105 });
    // After release the drag position is committed via onChangeIngredient
    // (pinned by the "commits the dragged position" test). This harness mocks
    // that callback without feeding the update back into the props, so the
    // drawn line falls back to the still-uncommitted base position (20,30).
    const dAfter = screen.getByTestId("conn-line").getAttribute("d") ?? "";
    expect(dAfter.startsWith(`M ${20 + CARD_W / 2} ${30 + CARD_HEADER_H / 2} `)).toBe(
      true,
    );
  });

  it("commits the dragged position on pointerup", () => {
    const onChangeIngredient = vi.fn();
    render(
      <Canvas
        ingredients={FRUITY_PAIR}
        showConnections={false}
        onChangeIngredient={onChangeIngredient}
      />,
    );

    const header = screen.getByTestId("drag-s-1");
    fireEvent.pointerDown(header, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(header, { clientX: 115, clientY: 105 });
    fireEvent.pointerUp(header, { clientX: 115, clientY: 105 });

    // base (20,30) + delta (15, 5) = (35, 35)
    expect(onChangeIngredient).toHaveBeenCalledWith("s-1", {
      x: 35,
      y: 35,
    });
  });
  // RTL's fireEvent.pointerDown does not forward pointerType in jsdom, so
  // touch taps are dispatched as real PointerEvents (fireEvent still wraps
  // them in act()).
  const touchDown = (el: Element, pointerId: number) =>
    fireEvent(
      el,
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId,
        pointerType: "touch",
      }),
    );

  it("taps a card on touch to toggle the focus dim", () => {
    render(
      <Canvas
        ingredients={[
          { id: "s-1", name: "strawberry", x: 20, y: 30, profile: { fruity: ["tropical"] } },
          { id: "c-1", name: "chocolate", x: 320, y: 30, profile: { caramellic: ["maple"] } },
          { id: "m-1", name: "melon", x: 170, y: 240, profile: { caramellic: ["maple"], fruity: ["tropical"] } },
        ]}
        showConnections={true}
        onChangeIngredient={vi.fn()}
      />,
    );

    // First tap focuses: strawberry's own line stays bright, chocolate's dims.
    touchDown(screen.getByTestId("card-s-1"), 1);
    expect(
      screen
        .getAllByTestId("conn-line")
        .find((l) => l.getAttribute("data-type") === "fruity"),
    ).toHaveAttribute("data-dim", "false");
    expect(
      screen
        .getAllByTestId("conn-line")
        .find((l) => l.getAttribute("data-type") === "caramellic"),
    ).toHaveAttribute("data-dim", "true");

    // Second tap on the same card clears the focus.
    touchDown(screen.getByTestId("card-s-1"), 2);
    for (const l of screen.getAllByTestId("conn-line")) {
      expect(l).toHaveAttribute("data-dim", "false");
    }
  });

  it("tapping the canvas background clears the touch focus", () => {
    render(
      <Canvas
        ingredients={[
          { id: "s-1", name: "strawberry", x: 20, y: 30, profile: { fruity: ["tropical"] } },
          { id: "c-1", name: "chocolate", x: 320, y: 30, profile: { caramellic: ["maple"] } },
          { id: "m-1", name: "melon", x: 170, y: 240, profile: { caramellic: ["maple"], fruity: ["tropical"] } },
        ]}
        showConnections={true}
        onChangeIngredient={vi.fn()}
      />,
    );

    touchDown(screen.getByTestId("card-s-1"), 1);
    touchDown(screen.getByTestId("canvas"), 2);
    for (const l of screen.getAllByTestId("conn-line")) {
      expect(l).toHaveAttribute("data-dim", "false");
    }
    // End the background gesture so no window listeners outlive the test.
    fireEvent(
      screen.getByTestId("canvas"),
      new PointerEvent("pointerup", {
        bubbles: true,
        pointerId: 2,
        pointerType: "touch",
      }),
    );
  });
});

describe("Canvas pinch zoom", () => {
  const renderCanvas = () => {
    const onChangeIngredient = vi.fn();
    render(
      <Canvas
        ingredients={FRUITY_PAIR}
        showConnections={false}
        onChangeIngredient={onChangeIngredient}
      />,
    );
    // Take the newest canvas in case older renders linger in this test.
    const canvas = screen.getAllByTestId("canvas").pop()!;
    const world = () => within(canvas).getByTestId("canvas-world");
    return { canvas, world, onChangeIngredient };
  };

  it("zooms in with ctrl+wheel at the cursor", () => {
    const { canvas, world } = renderCanvas();
    fireEvent.wheel(canvas, { deltaY: -120, ctrlKey: true });
    expect(world().style.transform).toBe("scale(1.2)");
  });

  it("zooms out with ctrl+wheel", () => {
    const { canvas, world } = renderCanvas();
    fireEvent.wheel(canvas, { deltaY: 120, ctrlKey: true });
    expect(world().style.transform).toBe("scale(0.8333333333333334)");
  });

  it("clamps zoom within its bounds", () => {
    const { canvas, world } = renderCanvas();
    for (let i = 0; i < 7; i++) {
      fireEvent.wheel(canvas, { deltaY: -120, ctrlKey: true });
    }
    expect(world().style.transform).toBe("scale(3)");

    const { canvas: canvas2, world: world2 } = renderCanvas();
    for (let i = 0; i < 4; i++) {
      fireEvent.wheel(canvas2, { deltaY: 120, ctrlKey: true });
    }
    expect(world2().style.transform).toBe("scale(0.5)");
  });

  it("pinches with two fingers to zoom around the finger midpoint", () => {
    const { canvas, world } = renderCanvas();
    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: "touch", clientX: 160, clientY: 200 });
    fireEvent.pointerDown(canvas, { pointerId: 2, pointerType: "touch", clientX: 260, clientY: 200 });
    // Spread from 100px apart to 150px apart, midpoint fixed at (210,200).
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 135, clientY: 200 });
    fireEvent.pointerMove(canvas, { pointerId: 2, clientX: 285, clientY: 200 });
    expect(world().style.transform).toBe("scale(1.5)");
  });

  it("ends the pinch cleanly so a fresh one still works", () => {
    const { canvas, world } = renderCanvas();
    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: "touch", clientX: 160, clientY: 200 });
    fireEvent.pointerDown(canvas, { pointerId: 2, pointerType: "touch", clientX: 260, clientY: 200 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 135, clientY: 200 });
    fireEvent.pointerMove(canvas, { pointerId: 2, clientX: 285, clientY: 200 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 2 });

    fireEvent.pointerDown(canvas, { pointerId: 3, pointerType: "touch", clientX: 160, clientY: 200 });
    fireEvent.pointerDown(canvas, { pointerId: 4, pointerType: "touch", clientX: 260, clientY: 200 });
    fireEvent.pointerMove(canvas, { pointerId: 3, clientX: 135, clientY: 200 });
    fireEvent.pointerMove(canvas, { pointerId: 4, clientX: 285, clientY: 200 });
    expect(world().style.transform).toBe("scale(2.25)");
  });

  it("drags cards accurately while zoomed (delta divided by zoom)", () => {
    const { canvas, world, onChangeIngredient } = renderCanvas();
    // Zoom to 1.5 via the pinch gesture.
    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: "touch", clientX: 160, clientY: 200 });
    fireEvent.pointerDown(canvas, { pointerId: 2, pointerType: "touch", clientX: 260, clientY: 200 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 135, clientY: 200 });
    fireEvent.pointerMove(canvas, { pointerId: 2, clientX: 285, clientY: 200 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 2 });
    expect(world().style.transform).toBe("scale(1.5)");

    // Drag strawberry 45px on screen = 45/1.5 = 30 canvas units.
    const header = screen.getByTestId("drag-s-1");
    fireEvent.pointerDown(header, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(header, { clientX: 145, clientY: 145 });
    fireEvent.pointerUp(header, { clientX: 145, clientY: 145 });

    // base (20,30) + 30 = (50,60)
    expect(onChangeIngredient).toHaveBeenCalledWith("s-1", { x: 50, y: 60 });
  });

  it("keeps the empty hint as a viewport overlay, outside the pannable world", () => {
    render(
      <Canvas
        ingredients={[]}
        showConnections={false}
        onChangeIngredient={vi.fn()}
        emptyHint="Add your first ingredient to start planning the dish"
      />,
    );

    const hint = screen.getByText("Add your first ingredient to start planning the dish");
    // Not inside the scaled/pannable world, or it scrolls and zooms away with
    // the canvas and can sit outside a narrow viewport.
    expect(hint.closest('[data-testid="canvas-world"]')).toBeNull();
    expect(hint.closest('[data-testid="canvas"]')).toBeNull();
  });

  it("pins the touch gestures stylesheet rules", () => {
    const css = readFileSync("src/components/Canvas.css", "utf8");
    const scrollRule = css.match(/\.canvas-scroll\s*{[^}]*}/)?.[0] ?? "";
    expect(scrollRule).toContain("touch-action: none");
    const worldRule = css.match(/\.canvas-world\s*{[^}]*}/)?.[0] ?? "";
    expect(worldRule).toContain("transform-origin");
  });

  it("disables browser pinch zoom (the app now owns zooming)", () => {
    const html = readFileSync("index.html", "utf8");
    expect(html).toContain("user-scalable=no");
    expect(html).toContain("maximum-scale=1");
  });
});

