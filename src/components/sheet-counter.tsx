"use client";
import { Minus, Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
export default function SheetCounter({
  label,
  value,
  min = 0,
  max = 99,
  busy,
  change,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  busy: boolean;
  change: (v: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="sheet-counter">
      <span>{label}</span>
      <div>
        <button
          type="button"
          aria-label={t("Decrease {label}", { label })}
          disabled={busy || value <= min}
          onClick={() => change(value - 1)}
        >
          <Minus size={16} />
        </button>
        <output>
          {value > 0 && min < 0 ? "+" : ""}
          {value}
        </output>
        <button
          type="button"
          aria-label={t("Increase {label}", { label })}
          disabled={busy || value >= max}
          onClick={() => change(value + 1)}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
