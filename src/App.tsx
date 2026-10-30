import { useCallback, useEffect, useState } from "react";
import Canvas from "./components/Canvas";
import { downloadExport, loadState, parseImport, saveState } from "./logic/storage";
import type { Ingredient } from "./types";
import "./App.css";

export default function App() {
  const [state, setState] = useState(loadState);
  const [showConnections, setShowConnections] = useState(false);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const addIngredient = () => {
    const n = state.ingredients.length;
    const ingredient: Ingredient = {
      id: crypto.randomUUID(),
      name: "New ingredient",
      x: 40 + (n % 4) * 260,
      y: 40 + Math.floor(n / 4) * 260,
      profile: {},
    };
    setState((s) => ({ ingredients: [...s.ingredients, ingredient] }));
  };

  const onChangeIngredient = useCallback(
    (id: string, patch: Partial<Ingredient>) => {
      setState((s) => ({
        ingredients: s.ingredients.map((i) =>
          i.id === id ? { ...i, ...patch } : i,
        ),
      }));
    },
    [],
  );

  const onImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const text = await files[0].text();
      const imported = parseImport(text);
      setState(imported);
    } catch {
      window.alert("That file doesn't look like a canvas export.");
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Foodpairing Canvas</h1>
        <div className="app-actions">
          <button
            type="button"
            data-testid="toggle-connections"
            aria-pressed={showConnections}
            onClick={() => setShowConnections((v) => !v)}
          >
            {showConnections ? "Connections on" : "Connections off"}
          </button>
          <button type="button" onClick={addIngredient}>
            Add ingredient
          </button>
          <button type="button" onClick={() => downloadExport(state)}>
            Export
          </button>
          <label className="import-label">
            Import
            <input
              data-testid="import-input"
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                void onImport(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </header>
      <main className="app-canvas">
        <Canvas
          ingredients={state.ingredients}
          showConnections={showConnections}
          onChangeIngredient={onChangeIngredient}
          onRemoveIngredient={(id) =>
            setState((s) => ({
              ingredients: s.ingredients.filter((i) => i.id !== id),
            }))
          }
          emptyHint="Add your first ingredient to start planning the dish"
        />
      </main>
    </div>
  );
}
