"use client";
import { Fragment } from "react";
import Image from "next/image";
import { Flag } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { factionIcon } from "@/lib/factions";
import { type Sheet } from "@/lib/sheet";
import { type UpdateSheet } from "./gear-panel";
import RuleHelp from "./rule-help";
import SheetCounter from "./sheet-counter";
import { HarmBox } from "./game-icons";

export function ReputationPanel({
  sheet,
  busy,
  update,
}: {
  sheet: Sheet;
  busy: boolean;
  update: UpdateSheet;
}) {
  const { t } = useTranslation();

  function change(
    index: number,
    key: "standing" | "prestige" | "notoriety",
    value: number,
  ) {
    void update({
      reputation: sheet.reputation.map((f, i) =>
        i === index ? { ...f, [key]: value } : f,
      ),
    });
  }

  return (
    <section className="play-panel reputation-panel">
      <h3>{t("Reputation")}</h3>
      <details className="reputation-notes" open>
        <summary>{t("Starting reputation")}</summary>
        <p className="field-hint">
          {t(
            "For a new character: mark 2 prestige with the faction you served most, and 1 notoriety with your enemy.",
          )}
        </p>
      </details>
      <div className="reputation-ledger">
        {sheet.reputation.map((f, i) => {
          const icon = factionIcon(f.faction);
          function standing(value: number) {
            return (
              <button
                type="button"
                className="reputation-standing"
                aria-label={t("{faction}: Standing {value}", {
                  faction: t(f.faction),
                  value: value > 0 ? `+${value}` : value,
                })}
                aria-pressed={f.standing === value}
                disabled={busy}
                onClick={() => change(i, "standing", value)}
              >
                {value >= 0 ? "+" : "−"}
                {Math.abs(value)}
              </button>
            );
          }
          function box(key: "prestige" | "notoriety", value: number) {
            return (
              <button
                type="button"
                className={`reputation-box ${key}`}
                key={value}
                aria-label={t("{faction}: {track} {value}", {
                  faction: t(f.faction),
                  track: t(key === "prestige" ? "Prestige" : "Notoriety"),
                  value,
                })}
                aria-pressed={f[key] >= value}
                disabled={busy}
                onClick={() =>
                  change(i, key, f[key] >= value ? value - 1 : value)
                }
              >
                <HarmBox variant={value - 1} />
              </button>
            );
          }
          return (
            <div
              className="faction-card reputation-row"
              key={`${i}-${f.faction}`}
              role="group"
              aria-label={t(f.faction)}
            >
              <div className="reputation-faction">
                {icon ? (
                  <Image
                    className="faction-icon"
                    src={`/art/factions/${icon}.webp`}
                    width={64}
                    height={64}
                    unoptimized
                    alt=""
                  />
                ) : (
                  <Flag
                    className="faction-icon faction-icon-fallback"
                    aria-hidden="true"
                  />
                )}
                <strong>{t(f.faction)}</strong>
                <span className="reputation-current" aria-label={t("Standing")}>
                  {f.standing >= 0 ? "+" : "−"}
                  {Math.abs(f.standing)}
                </span>
              </div>
              <div className="reputation-tracks">
                <div className="reputation-negative">
                  <span className="reputation-track-label">
                    <RuleHelp name="Notoriety" /> <small>{f.notoriety}/9</small>
                  </span>
                  <div className="reputation-track-buttons">
                    {[-3, -2, -1].map((n) => (
                      <Fragment key={n}>
                        {standing(n)}
                        {[0, 1, 2].map((offset) =>
                          box("notoriety", -n * 3 - offset),
                        )}
                      </Fragment>
                    ))}
                  </div>
                </div>
                <div className="reputation-zero">{standing(0)}</div>
                <div className="reputation-positive">
                  <span className="reputation-track-label">
                    <RuleHelp name="Prestige" /> <small>{f.prestige}/15</small>
                  </span>
                  <div className="reputation-track-buttons">
                    {[1, 2, 3].map((n) => (
                      <Fragment key={n}>
                        {[1, 2, 3, 4, 5].map((offset) =>
                          box("prestige", (n - 1) * 5 + offset),
                        )}
                        {standing(n)}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
              {f.notoriety > 9 && (
                <div className="reputation-legacy">
                  <p className="field-hint">
                    {t(
                      "This sheet has more than 9 notoriety marks. The saved value is preserved; resolve it with your table.",
                    )}
                  </p>
                  <SheetCounter
                    label={t("Notoriety")}
                    value={f.notoriety}
                    min={0}
                    max={15}
                    busy={busy}
                    change={(value) => change(i, "notoriety", value)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
