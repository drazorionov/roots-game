"use client";
import { useRef, useState } from "react";
import {
  Check,
  Edit3,
  LockKeyhole,
  Swords,
  BookOpen,
  Flag,
  ScrollText,
} from "lucide-react";
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
import AttributeIcon from "./attribute-icon";
import { HarmMark, DiceIcon } from "./game-icons";
import DiceDialog, { type AttributeRoll } from "./dice-dialog";
import GearPanel from "./gear-panel";
import { MovesPanel, BackgroundPanel, ReputationPanel } from "./sheet-panels";
export default function CharacterControls({
  hero,
  edit,
  onSaved,
  saveLocal,
}: {
  hero: Hero;
  edit: (step?: number) => void;
  onSaved: (h: Hero) => void;
  saveLocal?: (sheet: Sheet) => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const locked = useRef(false);
  const setupLocked = !!hero.campaign_id;
  const [roll, setRoll] = useState<AttributeRoll | null>(null);
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
      if (saveLocal) {
        saveLocal({ ...sheet, ...patch });
      } else {
        const data = await api("heroes", "POST", {
          id: hero.id,
          campaignId: hero.campaign_id,
          version: hero.version,
          sheet: { ...sheet, ...patch },
        });
        onSaved(data.hero);
      }
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
    const returnFocus = document.activeElement as HTMLElement | null;
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
    setRoll({
      returnFocus,
      stat,
      dice,
      attribute: attributes[stat],
      forward: sheet.forward,
      ongoing: sheet.ongoing,
      modifier,
      total: dice[0] + dice[1] + modifier,
    });
  }
  return (
    <div className="play-sheet field-sheet">
      <div className="character-command">
        <section className="character-portrait-card">
          <div className="portrait-caption">
            <span>{t(sheet.playbook)}</span>
            <span>{t("Character sheet")}</span>
          </div>
          <div className="hero-art">
            <Portrait
              species={sheet.species}
              playbook={sheet.playbook}
              sizes="(max-width: 600px) 280px, 380px"
            />
          </div>
          <div className="hero-caption">
            <h2>{sheet.name}</h2>
            <p>
              {t(sheet.species)}
              {sheet.pronouns && ` · ${sheet.pronouns}`}
            </p>
            {!setupLocked && (
              <button
                className="text-link"
                disabled={busy}
                onClick={() => edit()}
              >
                <Edit3 size={14} />
                {t("Edit character")}
              </button>
            )}
          </div>
        </section>
        <div className="character-vitals">
          <section className="condition-section" aria-labelledby="harm-title">
            <div className="field-section-heading">
              <div>
                <span className="eyebrow">{t("Current condition")}</span>
                <h3 id="harm-title">{t("Harm")}</h3>
              </div>
              <span className="section-number" aria-hidden="true">
                01
              </span>
            </div>
            <p className="field-hint">
              {t("Tap a symbol to mark or clear harm.")}
            </p>
            {harmTracks.map((track) => (
              <div className={`condition-track ${track}`} key={track}>
                <div className="condition-label">
                  <strong>{t(track)}</strong>
                  <span>
                    {sheet[track]} / {harmCapacity(sheet, track)}
                  </span>
                </div>
                <div className="condition-tokens">
                  {Array.from(
                    { length: harmCapacity(sheet, track) },
                    (_, i) => i + 1,
                  ).map((n) => (
                    <button
                      className={`harm-token ${sheet[track] >= n ? "marked" : ""}`}
                      key={n}
                      aria-label={`${t(track)} ${n}`}
                      aria-pressed={sheet[track] >= n}
                      disabled={busy}
                      onClick={() =>
                        void update({ [track]: sheet[track] === n ? n - 1 : n })
                      }
                    >
                      <HarmMark />
                    </button>
                  ))}
                  {sheet[track] === harmCapacity(sheet, track) && (
                    <small className="track-full">{t("Track full")}</small>
                  )}
                </div>
              </div>
            ))}
          </section>
          <section
            className="modifier-section"
            aria-labelledby="modifier-title"
          >
            <h3 id="modifier-title">{t("Hold & modifiers")}</h3>
            <div className="modifier-counters">
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
            </div>
            <p className="field-hint">
              {t(
                "Attribute rolls include forward and ongoing. Forward is cleared after one roll; hold is spent manually.",
              )}
            </p>
          </section>
        </div>
      </div>
      <section className="attribute-section" aria-labelledby="attribute-title">
        <div className="field-section-heading">
          <div>
            <span className="eyebrow">{t("Take a chance")}</span>
            <h3 id="attribute-title">{t("Roll an attribute")}</h3>
          </div>
          <p>{t("2d6 + attribute + modifiers")}</p>
        </div>
        <div className="attribute-rolls">
          {stats.map((stat) => (
            <button
              type="button"
              className="attribute-roll"
              key={stat}
              aria-label={t("Roll {stat}", { stat: t(stat) })}
              disabled={busy}
              onClick={() => void rollAttribute(stat)}
            >
              <AttributeIcon stat={stat} />
              <span>{t(stat)}</span>
              <strong>
                {attributes[stat] >= 0 ? "+" : ""}
                {attributes[stat]}
              </strong>
              <span className="attribute-dice">
                <DiceIcon />
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="equipment-section" aria-labelledby="equipment-title">
        <div className="field-section-heading">
          <div>
            <span className="eyebrow">{t("Ready for the road")}</span>
            <h3 id="equipment-title">
              <Swords size={21} />
              {t("Weapons & equipment")}
            </h3>
          </div>
          <span className="section-number" aria-hidden="true">
            02
          </span>
        </div>
        <GearPanel
          sheet={sheet}
          busy={busy}
          update={update}
          roll={(stat) => void rollAttribute(stat)}
        />
      </section>
      <div className="character-details">
        <details className="sheet-subsection" open>
          <summary>
            <Flag size={19} />
            {t("Reputation")}
          </summary>
          <ReputationPanel sheet={sheet} busy={busy} update={update} />
        </details>
        <details className="sheet-subsection">
          <summary>
            <BookOpen size={19} />
            {t("Character info & moves")}
          </summary>
          {sheet.description && (
            <p className="character-description">{sheet.description}</p>
          )}
          {setupLocked && (
            <div className="setup-locked-note">
              <LockKeyhole size={16} />
              <span>
                {t("Setup locked")} ·{" "}
                {t(
                  "Harm, rolls, equipment, and session progress stay available.",
                )}
              </span>
            </div>
          )}
          {!setupLocked && remaining.length > 0 && (
            <div className="setup-checklist">
              <strong>
                {t("Finish setup")} · {remaining.length}
              </strong>
              <ul>
                {remaining.map((message) => (
                  <li key={message}>{t(message)}</li>
                ))}
              </ul>
              <button className="text-link" onClick={() => edit()}>
                {t("Continue character setup")}
              </button>
            </div>
          )}
          {sheet.nature && (
            <div className="nature-card">
              <h4>
                {t("Nature")} · {t(sheet.nature)}
              </h4>
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
            </div>
          )}
          <MovesPanel
            setupLocked={setupLocked}
            sheet={sheet}
            busy={busy}
            roll={(stat) => void rollAttribute(stat)}
          />
        </details>
        <details className="sheet-subsection">
          <summary>
            <ScrollText size={19} />
            {t("Background")}
          </summary>
          <BackgroundPanel
            sheet={sheet}
            busy={busy}
            update={update}
            edit={setupLocked ? undefined : () => edit(1)}
          />
        </details>
      </div>
      {roll && <DiceDialog roll={roll} close={() => setRoll(null)} />}
      <div className="quick-save-status" role="status">
        {busy ? (
          t("Saving…")
        ) : saved ? (
          <>
            <Check size={15} />
            {t(
              saveLocal
                ? "Saved only in this browser tab."
                : "Character sheet saved.",
            )}
          </>
        ) : (
          t(
            saveLocal
              ? "Saved only in this browser tab."
              : "Changes save automatically.",
          )
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
