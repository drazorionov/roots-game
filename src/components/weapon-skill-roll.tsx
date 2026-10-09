"use client";
import { useState } from "react";
import type { Sheet } from "@/lib/sheet";
import { effectiveStats } from "@/lib/playbooks";
import { useTranslation } from "@/lib/i18n";
import { weaponRolls, type RollWeaponSkill } from "@/lib/weapon-rolls";
import { DiceIcon } from "./game-icons";
import RuleHelp from "./rule-help";

export default function WeaponSkillRoll({
  name,
  sheet,
  busy,
  roll,
  showName = true,
}: {
  name: string;
  sheet: Sheet;
  busy: boolean;
  roll: RollWeaponSkill;
  showName?: boolean;
}) {
  const { t } = useTranslation();
  const [bonus, setBonus] = useState(0);
  const move = weaponRolls[name];
  if (!move) return null;
  const stat = move.kind === "attribute" ? move.stat : null;
  const value = stat ? effectiveStats(sheet)[stat] : bonus;
  return (
    <div
      className={`weapon-skill-roll${move.kind === "paired" ? " weapon-skill-roll-paired" : ""}`}
    >
      <div className="weapon-skill-roll-label">
        {showName && <RuleHelp name={name} />}
        {stat && <span>{t(stat)}</span>}
      </div>
      {move.kind === "modifier" ? (
        <p className="field-hint">
          {t("Enhances another far-range move. Roll that move with Might.")}
        </p>
      ) : (
        <div className="weapon-skill-roll-controls">
          {move.kind === "paired" ? (
            <select
              aria-label={t("Paired Fighting bonus")}
              value={bonus}
              disabled={busy}
              onChange={(event) => setBonus(Number(event.target.value))}
            >
              {[0, 1, 2, 3].map((value) => (
                <option key={value} value={value}>
                  +{value}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            className="weapon-skill-roll-button"
            aria-label={t("Roll {move}", { move: t(name) })}
            disabled={busy}
            onClick={() => roll(stat, name, value)}
          >
            {stat && (
              <strong>
                {value >= 0 ? "+" : ""}
                {value}
              </strong>
            )}
            <span className="attribute-dice">
              <DiceIcon />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
