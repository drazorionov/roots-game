"use client";
import { Fragment, useId, useState } from "react";
import Image from "next/image";
import { Flag } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { factions, factionIcon } from "@/lib/factions";
import { type Sheet } from "@/lib/sheet";
import { type UpdateSheet } from "./gear-panel";
import SheetCounter from "./sheet-counter";

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
  const [name, setName] = useState("");
  const listId = useId();
  const hintId = useId();
  const canonicalName =
    factions.find((f) => t(f.name) === name.trim())?.name ?? name.trim();
  const duplicate = sheet.reputation.some(
    (f) => f.faction.toLowerCase() === canonicalName.toLowerCase(),
  );

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
      <p className="field-hint" id={hintId}>
        {t(
          "Mark boxes outward from zero. Tap a marked box to erase it and the marks beyond it. Circle your standing when the table resolves a change.",
        )}
      </p>
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
                <span aria-hidden="true">{f[key] >= value ? "×" : ""}</span>
              </button>
            );
          }
          return (
            <div
              className="faction-card reputation-row"
              key={`${i}-${f.faction}`}
              role="group"
              aria-label={t(f.faction)}
              aria-describedby={hintId}
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
                    {t("Notoriety")} <small>{f.notoriety}/9</small>
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
                    {t("Prestige")} <small>{f.prestige}/15</small>
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
      <details className="reputation-notes">
        <summary>{t("Starting reputation")}</summary>
        <p className="field-hint">
          {t(
            "For a new character: mark 2 prestige with the faction you served most, and 1 notoriety with your enemy.",
          )}
        </p>
      </details>
      <form
        className="faction-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            busy ||
            !canonicalName ||
            duplicate ||
            sheet.reputation.length >= 12
          )
            return;
          if (
            await update({
              reputation: [
                ...sheet.reputation,
                {
                  faction: canonicalName,
                  standing: 0,
                  prestige: 0,
                  notoriety: 0,
                },
              ],
            })
          )
            setName("");
        }}
      >
        <label>
          {t("Faction name")}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
            list={listId}
          />
        </label>
        <datalist id={listId}>
          {factions
            .filter((f) => !sheet.reputation.some((r) => r.faction === f.name))
            .map((f) => (
              <option key={f.name} value={t(f.name)} />
            ))}
        </datalist>
        <button
          className="btn"
          disabled={
            busy || !canonicalName || duplicate || sheet.reputation.length >= 12
          }
        >
          {t("Add faction")}
        </button>
      </form>
    </section>
  );
}
