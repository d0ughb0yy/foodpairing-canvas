"use client";

import { useState, useEffect, useRef } from "react";
import type { Dish } from "../types";
import "./TabBar.css";

export type TabBarProps = {
  dishes: Dish[];
  activeDishId: string;
  onSwitchDish: (dishId: string) => void;
  onCreateDish: () => void;
  onRenameDish: (dishId: string, name: string) => void;
  onCloseDish: (dishId: string) => void;
};

export default function TabBar({
  dishes,
  activeDishId,
  onSwitchDish,
  onCreateDish,
  onRenameDish,
  onCloseDish,
}: TabBarProps) {
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const activeDish = dishes.find((d) => d.id === activeDishId);

  useEffect(() => {
    if (editingDishId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingDishId]);

  const startEditing = (dishId: string, currentName: string) => {
    setEditingDishId(dishId);
    setEditingName(currentName);
  };

  const finishEditing = () => {
    if (editingDishId && editingName.trim()) {
      onRenameDish(editingDishId, editingName.trim());
    }
    setEditingDishId(null);
    setEditingName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      finishEditing();
    } else if (e.key === "Escape") {
      setEditingDishId(null);
      setEditingName("");
    }
  };

  const handleInputBlur = () => {
    finishEditing();
  };

  return (
    <div className="tab-bar" role="tablist" aria-label="Dishes">
      {dishes.map((dish) => (
        <button
          key={dish.id}
          type="button"
          className={`tab ${dish.id === activeDishId ? "active" : ""}`}
          onClick={() => onSwitchDish(dish.id)}
          role="tab"
          aria-selected={dish.id === activeDishId}
          aria-label={`${dish.name}, ${dish.ingredients.length} ingredients`}
        >
          {editingDishId === dish.id ? (
            <input
              ref={inputRef}
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleInputBlur}
              className="tab-name-input"
              aria-label={`Rename ${dish.name}`}
              role="textbox"
            />
          ) : (
            <span
              className="tab-name"
              onDoubleClick={() => startEditing(dish.id, dish.name)}
              title="Double-click to rename"
            >
              {dish.name}
            </span>
          )}
          {dishes.length > 1 && (
            <button
              type="button"
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onCloseDish(dish.id);
              }}
              title="Close dish"
              aria-label={`Close ${dish.name}`}
            >
              ×
            </button>
          )}
        </button>
      ))}
      <button
        type="button"
        className="tab-new"
        onClick={onCreateDish}
        title="New dish"
        aria-label="Create new dish"
      >
        + New Dish
      </button>
    </div>
  );
}