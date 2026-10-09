"use client";

import { Check, Info } from "lucide-react";
import RuleHelp from "./rule-help";
import { rules } from "@/lib/rules";
import { useTranslation } from "@/lib/i18n";
import { Portrait } from "./art";

type PortraitOption = {
  value: string;
  label: string;
  species: string;
  playbook: string;
  description?: string;
};

export default function PortraitPicker({
  label,
  value,
  options,
  initiallyOpen,
  onSelect,
}: {
  label: string;
  value: string;
  options: PortraitOption[];
  initiallyOpen: boolean;
  onSelect: (value: string) => boolean | void;
}) {
  const { t } = useTranslation();
  const selected = options.find((option) => option.value === value);
  return (
    <details className="portrait-catalog" open={initiallyOpen}>
      <summary>
        {label} <span>· {selected?.label || value}</span>
      </summary>
      <div className="portrait-choice-grid" role="group" aria-label={label}>
        {options.map((option) => (
          <div className="portrait-rule-option" key={option.value}>
            <button
              className="portrait-choice"
              type="button"
              aria-label={option.label}
              aria-pressed={value === option.value}
              onClick={(event) => {
                if (value !== option.value && onSelect(option.value) === false)
                  return;
                const catalog = event.currentTarget.closest("details");
                if (catalog) catalog.open = false;
              }}
            >
              <span className="portrait-choice-art" aria-hidden="true">
                <Portrait
                  species={option.species}
                  playbook={option.playbook}
                  sizes="(max-width: 767px) 40vw, 220px"
                />
              </span>
              <span className="portrait-choice-name">
                <strong>{option.label}</strong>
                {value === option.value && (
                  <Check size={18} aria-hidden="true" />
                )}
              </span>
              {option.description && <small>{option.description}</small>}
            </button>
            <RuleHelp
              name={option.value}
              summary={option.description ?? rules.Species.summary}
              page={option.description ? undefined : 149}
              ariaLabel={t("About {name}", { name: option.label })}
            >
              <Info size={18} aria-hidden="true" />
            </RuleHelp>
          </div>
        ))}
      </div>
    </details>
  );
}
