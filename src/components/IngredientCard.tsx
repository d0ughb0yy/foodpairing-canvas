import { useState } from "react";
import { AROMA_TYPES, DESCRIPTORS } from "../config";
import type { AromaTypeId, Ingredient, Profile } from "../types";
import "./IngredientCard.css";

export type CardProps = {
  ingredient: Ingredient;
  onChange: (patch: Partial<Ingredient>) => void;
  // test hook for the card header (used by Canvas tests)
  dragTestId?: string;
  // when provided, the card shows a delete button and calls it on click
  onDelete?: () => void;
};

function setProfileType(
  profile: Profile,
  type: AromaTypeId,
  descriptors: string[] | undefined,
): Profile {
  const next: Profile = { ...profile };
  if (descriptors === undefined) {
    delete next[type];
  } else {
    next[type] = descriptors;
  }
  return next;
}

export function IngredientCard({
  ingredient,
  onChange,
  dragTestId,
  onDelete,
}: CardProps) {
  const { profile } = ingredient;
  const [draft, setDraft] = useState<Partial<Record<AromaTypeId, string>>>({});

  const toggleType = (type: AromaTypeId) => {
    if (profile[type] === undefined) {
      onChange({ profile: setProfileType(profile, type, []) });
    } else {
      onChange({ profile: setProfileType(profile, type, undefined) });
    }
  };

  const addDescriptor = (type: AromaTypeId) => {
    const raw = (draft[type] ?? "").trim();
    if (raw === "") return;
    const current = profile[type] ?? [];
    if (current.some((d) => d.trim().toLowerCase() === raw.toLowerCase())) {
      setDraft((d) => ({ ...d, [type]: "" }));
      return;
    }
    onChange({
      profile: setProfileType(profile, type, [...current, raw]),
    });
    setDraft((d) => ({ ...d, [type]: "" }));
  };

  const removeDescriptor = (type: AromaTypeId, index: number) => {
    const current = profile[type] ?? [];
    onChange({
      profile: setProfileType(
        profile,
        type,
        current.filter((_, i) => i !== index),
      ),
    });
  };

  return (
    <div className="card">
      <div
        className="card-header"
        data-testid={dragTestId}
        style={{ cursor: "grab" }}
      >
        <span className="card-grip" aria-hidden="true">
          ⋮
        </span>
        <input
          className="card-name"
          value={ingredient.name}
          onChange={(e) => onChange({ name: e.target.value })}
          aria-label="ingredient name"
        />
        {onDelete ? (
          <button
            type="button"
            className="card-delete"
            aria-label={`Delete ${ingredient.name}`}
            title={`Delete ${ingredient.name}`}
            onClick={onDelete}
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="card-types">
        {AROMA_TYPES.map(({ id, label, color }) => {
          const active = profile[id] !== undefined;
          return (
            <button
              key={id}
              type="button"
              className="type-chip"
              title={label}
              aria-pressed={active}
              aria-label={label}
              style={
                active
                  ? { backgroundColor: color, borderColor: color }
                  : undefined
              }
              onClick={() => toggleType(id)}
            />
          );
        })}
      </div>
      <div className="card-descriptors">
        {AROMA_TYPES.map(({ id, label, color }) => {
          if (profile[id] === undefined) return null;
          const listId = `desc-${id}`;
          const seed = DESCRIPTORS[id] ?? [];
          return (
            <div key={id} className="descriptor-group">
              <span className="descriptor-type" style={{ color }}>
                {label}
              </span>
              <span className="descriptor-chips">
                {profile[id]!.map((d, i) => (
                  <span
                    key={`${d}-${i}`}
                    className="descriptor-chip"
                    style={{ borderColor: color }}
                  >
                    {d}
                    <button
                      type="button"
                      aria-label={`remove ${d}`}
                      onClick={() => removeDescriptor(id, i)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  className="descriptor-input"
                  style={{ borderColor: color }}
                  placeholder={`Add ${label}…`}
                  list={listId}
                  value={draft[id] ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, [id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDescriptor(id);
                    }
                  }}
                />
                <datalist id={listId}>
                  {seed.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default IngredientCard;
