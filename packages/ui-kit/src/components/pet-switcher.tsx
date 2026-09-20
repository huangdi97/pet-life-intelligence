import { cx } from "../lib/cx";

export interface PetOption {
  id: string;
  name: string;
}

/** Native-select pet switcher with a visible label. */
export function PetSwitcher({
  pets,
  value,
  onChange,
  label = "宠物",
  disabled = false,
  className,
}: {
  pets: PetOption[];
  value: string;
  onChange: (petId: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={cx("pli-switcher", className)}>
      <span className="pli-switcher-label">{label}</span>
      <select
        value={value}
        disabled={disabled || pets.length === 0}
        onChange={(e) => onChange(e.target.value)}
      >
        {pets.length === 0 ? (
          <option value="">暂无宠物</option>
        ) : (
          pets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))
        )}
      </select>
    </label>
  );
}
