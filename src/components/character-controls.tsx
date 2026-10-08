"use client";
import { useRef, useState } from "react";
import { Check, Edit3, Heart, Dices } from "lucide-react";
import { api } from "@/lib/client-api";
import { useTranslation } from "@/lib/i18n";
import {
  type Hero,
  type Sheet,
  stats,
  harmTracks,
  harmCapacity,
} from "@/lib/sheet";
import { effectiveStats, natureHints, setupRemaining } from "@/lib/playbooks";
import { Portrait } from "./art";
import SheetCounter from "./sheet-counter";
import GearPanel from "./gear-panel";
import { MovesPanel, BackgroundPanel, ReputationPanel } from "./sheet-panels";
export default function CharacterControls({
  hero,
  edit,
  onSaved,
}: {
  hero: Hero;
  edit: (step?: number) => void;
  onSaved: (h: Hero) => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [tab, setTab] = useState("Equipment");
  const locked = useRef(false);
  const [roll, setRoll] = useState<{
    stat: string;
    dice: number[];
    modifier: number;
    total: number;
  } | null>(null);
  const sheet = hero.sheet,
    attributes = effectiveStats(sheet),
    remaining = setupRemaining(sheet);
  async function update(patch: Partial<Sheet>) {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const data = await api("heroes", "POST", {
        id: hero.id,
        campaignId: hero.campaign_id,
        version: hero.version,
        sheet: { ...sheet, ...patch },
      });
      onSaved(data.hero);
      setSaved(true);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function rollAttribute(stat: (typeof stats)[number]) {
    if (locked.current) return;
    const modifier = attributes[stat] + sheet.forward + sheet.ongoing;
    if (sheet.forward && !(await update({ forward: 0 }))) return;
    const d6 = () => {
      const bytes = new Uint8Array(1);
      do {
        crypto.getRandomValues(bytes);
      } while (bytes[0] >= 252);
      return (bytes[0] % 6) + 1;
    };
    const dice = [d6(), d6()];
    setRoll({ stat, dice, modifier, total: dice[0] + dice[1] + modifier });
  }
  return (
    <div className="play-sheet">
      <div className="play-identity">
        <div className="play-portrait">
          <Portrait species={sheet.species} />
        </div>
        <div>
          <h3>{sheet.name}</h3>
          <p>
            {t(sheet.species)} · {t(sheet.playbook)}
          </p>
          <small>{sheet.pronouns}</small>
        </div>
        <button className="btn" disabled={busy} onClick={() => edit()}>
          <Edit3 size={15} />
          {t("Edit character")}
        </button>
      </div>
      {remaining.length > 0 && (
        <details className="setup-checklist">
          <summary>
            {t("Finish setup")} · {remaining.length}
          </summary>
          <ul>
            {remaining.map((message) => (
              <li key={message}>{t(message)}</li>
            ))}
          </ul>
          <button className="text-link" onClick={() => edit()}>
            {t("Continue character setup")}
          </button>
        </details>
      )}
      <div className="play-stats">
        {stats.map((stat) => (
          <button
            type="button"
            key={stat}
            aria-label={t("Roll {stat}", { stat: t(stat) })}
            disabled={busy}
            onClick={() => void rollAttribute(stat)}
          >
            <span>{t(stat)}</span>
            <strong>
              {attributes[stat] > 0 ? "+" : ""}
              {attributes[stat]}
            </strong>
            <Dices size={13} />
          </button>
        ))}
      </div>
      {roll && (
        <div className="roll-result" role="status">
          <Dices size={20} />
          <span>
            <strong>
              {t(roll.stat)}: {roll.total}
            </strong>
            <small>
              {roll.dice.join(" + ")} {roll.modifier >= 0 ? "+" : "−"}{" "}
              {Math.abs(roll.modifier)} ·{" "}
              {t(
                roll.total >= 10
                  ? "10+: strong hit"
                  : roll.total >= 7
                    ? "7–9: mixed hit"
                    : "6−: miss",
              )}
            </small>
          </span>
          <button className="text-link" onClick={() => setRoll(null)}>
            {t("Dismiss")}
          </button>
        </div>
      )}
      <div className="play-columns working-columns">
        <aside className="play-panel harm-panel">
          <h3>
            <Heart size={20} />
            {t("Harm")}
          </h3>
          <p className="field-hint">{t("Tap a box to mark or clear it.")}</p>
          {harmTracks.map((track) => (
            <div className={`live-track ${track}`} key={track}>
              <div>
                <strong>{t(track)}</strong>
                <span>
                  {sheet[track]} / {harmCapacity(sheet, track)}
                </span>
              </div>
              <div className="live-track-controls">
                {Array.from(
                  { length: harmCapacity(sheet, track) },
                  (_, i) => i + 1,
                ).map((n) => (
                  <button
                    className={`live-pip ${sheet[track] >= n ? "filled" : ""}`}
                    key={n}
                    aria-label={`${t(track)} ${n}`}
                    aria-pressed={sheet[track] >= n}
                    disabled={busy}
                    onClick={() =>
                      void update({ [track]: sheet[track] === n ? n - 1 : n })
                    }
                  >
                    {sheet[track] >= n && <Check size={17} />}
                  </button>
                ))}
              </div>
              {sheet[track] === harmCapacity(sheet, track) && (
                <small className="track-full">{t("Track full")}</small>
              )}
            </div>
          ))}
          <details className="session-resources">
            <summary>{t("Hold & modifiers")}</summary>
            {(["hold", "forward", "ongoing"] as const).map((key, i) => (
              <SheetCounter
                key={key}
                label={t(["Hold", "Forward", "Ongoing"][i])}
                value={sheet[key]}
                min={key === "hold" ? 0 : -3}
                max={key === "hold" ? 99 : 3}
                busy={busy}
                change={(value) => {
                  void update({ [key]: value });
                }}
              />
            ))}
            <p className="field-hint">
              {t(
                "Attribute rolls include forward and ongoing. Forward is cleared after one roll; hold is spent manually.",
              )}
            </p>
          </details>
          {sheet.nature && (
            <details className="nature-card">
              <summary>
                {t("Nature")} · {t(sheet.nature)}
              </summary>
              <p>
                {natureHints[sheet.nature]
                  ? t(natureHints[sheet.nature])
                  : sheet.nature}
              </p>
              <button
                className="btn small"
                disabled={busy || sheet.exhaustion === 0}
                onClick={() => void update({ exhaustion: 0 })}
              >
                {t("Fulfill nature: clear exhaustion")}
              </button>
            </details>
          )}
        </aside>
        <div className="sheet-workspace">
          <nav
            className="sheet-tabs"
            aria-label={t("Character sheet sections")}
          >
            {["Equipment", "Moves", "Background", "Reputation"].map((name) => (
              <button
                key={name}
                aria-current={tab === name ? "page" : undefined}
                onClick={() => setTab(name)}
              >
                {t(name)}
              </button>
            ))}
          </nav>
          <div className="sheet-tab-content">
            {tab === "Equipment" ? (
              <GearPanel sheet={sheet} busy={busy} update={update} />
            ) : tab === "Moves" ? (
              <MovesPanel sheet={sheet} />
            ) : tab === "Background" ? (
              <BackgroundPanel
                sheet={sheet}
                busy={busy}
                update={update}
                edit={() => edit(2)}
              />
            ) : (
              <ReputationPanel sheet={sheet} busy={busy} update={update} />
            )}
          </div>
        </div>
      </div>
      <div className="quick-save-status" role="status">
        {busy ? (
          t("Saving…")
        ) : saved ? (
          <>
            <Check size={15} />
            {t("Character sheet saved.")}
          </>
        ) : (
          t("Changes save automatically.")
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
    </div>
  );
}
