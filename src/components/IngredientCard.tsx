import { AROMA_TYPES } from "../config";
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

function toggleProfileType(profile: Profile, type: AromaTypeId): Profile {
  const next: Profile = { ...profile };
  if (next[type] === undefined) {
    next[type] = true;
  } else {
    delete next[type];
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
              onClick={() => onChange({ profile: toggleProfileType(profile, id) })}
            />
          );
        })}
      </div>
    </div>
  );
}

export default IngredientCard;
