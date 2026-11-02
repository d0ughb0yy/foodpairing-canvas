import { useCallback, useEffect, useState } from "react";
import Canvas from "./components/Canvas";
import TabBar from "./components/TabBar";
import { downloadExport, loadState, parseImport, saveState } from "./logic/storage";
import type { Ingredient, Dish } from "./types";
import "./App.css";

export default function App() {
  const [multiState, setMultiState] = useState(loadState);
  const [showConnections, setShowConnections] = useState(false);

  useEffect(() => {
    saveState(multiState);
  }, [multiState]);

  const activeDish = multiState.dishes.find((d) => d.id === multiState.activeDishId);

  const createDish = useCallback(() => {
    const newDish: Dish = {
      id: crypto.randomUUID(),
      name: "New Dish",
      ingredients: [],
    };
    setMultiState((prev) => ({
      dishes: [...prev.dishes, newDish],
      activeDishId: newDish.id,
    }));
  }, []);

  const renameDish = useCallback((dishId: string, name: string) => {
    setMultiState((prev) => ({
      ...prev,
      dishes: prev.dishes.map((dish) =>
        dish.id === dishId ? { ...dish, name } : dish
      ),
    }));
  }, []);

  const closeDish = useCallback((dishId: string) => {
    setMultiState((prev) => {
      if (prev.dishes.length <= 1) return prev; // Never close the last dish
      
      const newDishes = prev.dishes.filter((d) => d.id !== dishId);
      const newActiveId = prev.activeDishId === dishId 
        ? newDishes[0].id 
        : prev.activeDishId;
      
      return {
        dishes: newDishes,
        activeDishId: newActiveId,
      };
    });
  }, []);

  const addIngredient = () => {
    if (!activeDish) return;
    const n = activeDish.ingredients.length;
    const ingredient: Ingredient = {
      id: crypto.randomUUID(),
      name: "New ingredient",
      x: 40 + (n % 4) * 260,
      y: 40 + Math.floor(n / 4) * 260,
      profile: {},
    };
    setMultiState((prev) => ({
      ...prev,
      dishes: prev.dishes.map((dish) =>
        dish.id === activeDish.id
          ? { ...dish, ingredients: [...dish.ingredients, ingredient] }
          : dish
      ),
    }));
  };

  const onChangeIngredient = useCallback(
    (id: string, patch: Partial<Ingredient>) => {
      setMultiState((prev) => ({
        ...prev,
        dishes: prev.dishes.map((dish) =>
          dish.id === activeDish?.id
            ? {
                ...dish,
                ingredients: dish.ingredients.map((i) =>
                  i.id === id ? { ...i, ...patch } : i
                ),
              }
            : dish
        ),
      }));
    },
    [activeDish?.id],
  );

  const onRemoveIngredient = useCallback((id: string) => {
    setMultiState((prev) => ({
      ...prev,
      dishes: prev.dishes.map((dish) =>
        dish.id === activeDish?.id
          ? { ...dish, ingredients: dish.ingredients.filter((i) => i.id !== id) }
          : dish
      ),
    }));
  }, [activeDish?.id]);

  const onImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const text = await files[0].text();
      const imported = parseImport(text);
      setMultiState(imported);
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
          <button type="button" onClick={() => downloadExport(multiState)}>
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
      <TabBar
        dishes={multiState.dishes}
        activeDishId={multiState.activeDishId}
        onSwitchDish={(dishId) => setMultiState((prev) => ({ ...prev, activeDishId: dishId }))}
        onCreateDish={createDish}
        onRenameDish={renameDish}
        onCloseDish={closeDish}
      />
      <main className="app-canvas">
        <Canvas
          ingredients={activeDish?.ingredients || []}
          showConnections={showConnections}
          onChangeIngredient={onChangeIngredient}
          onRemoveIngredient={onRemoveIngredient}
          emptyHint="Add your first ingredient to start planning the dish"
        />
      </main>
    </div>
  );
}
