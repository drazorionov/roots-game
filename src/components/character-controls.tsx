"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { HeroSaveQueue } from "@/lib/hero-save-queue";
import {
  Check,
  Edit3,
  Leaf,
  PawPrint,
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
import { effectiveStats, natureHints, playbookData } from "@/lib/playbooks";
import { Portrait } from "./art";
import { NotebookDoodle } from "./notebook-doodles";
import RuleHelp from "./rule-help";
import SheetCounter from "./sheet-counter";
import AttributeIcon from "./attribute-icon";
import { HarmBox, DiceIcon } from "./game-icons";
import DiceDialog, { type AttributeRoll } from "./dice-dialog";
import { useGameActivity } from "./game-activity";
import GearPanel from "./gear-panel";
import { MovesPanel, BackgroundPanel, ReputationPanel } from "./sheet-panels";
export default function CharacterControls({
  hero,
  edit,
  saveLocal,
  saveQueue,
  management = false,
  readOnly = false,
}: {
  hero: Hero;
  edit: (step?: number) => void;
  saveLocal?: (sheet: Sheet) => void;
  saveQueue?: HeroSaveQueue;
  management?: boolean;
  readOnly?: boolean;
}) {
  const { t } = useTranslation();
  const activity = useGameActivity();
  const [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const state = useSyncExternalStore(
    saveQueue?.subscribe ?? subscribeLocal,
    saveQueue?.getSnapshot ?? localSnapshot,
    saveQueue?.getSnapshot ?? localSnapshot,
  );
  useEffect(() => {
    saveQueue?.receive(hero);
  }, [saveQueue, hero]);
  const busy = readOnly || recovering || (state?.conflict ?? false);
  const setupLocked = readOnly || (!!hero.campaign_id && !management);
  const canRoll = !management && !readOnly;
  const [roll, setRoll] = useState<AttributeRoll | null>(null);
  const sheet = state?.hero.sheet ?? hero.sheet,
    attributes = effectiveStats(sheet);
  async function update(patch: Partial<Sheet>) {
    if (readOnly) return false;
    if (saveQueue) return saveQueue.update(patch);
    setError("");
    setSaved(false);
    try {
      if (!saveLocal) return false;
      const next = { ...sheet, ...patch };
      saveLocal(next);
      activity.recordChange(sheet, next);
      setSaved(true);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  async function rollAttribute(
    stat: (typeof stats)[number] | null,
    action?: string,
    bonus = 0,
    source?: string,
  ) {
    if (busy || roll || !canRoll) return;
    const currentSheet = saveQueue?.getSnapshot().hero.sheet ?? sheet;
    const returnFocus = document.activeElement as HTMLElement | null;
    const attribute = stat ? attributes[stat] : bonus;
    const modifier = attribute + currentSheet.forward + currentSheet.ongoing;
    if (currentSheet.forward) {
      if (saveQueue) {
        if (!saveQueue.update({ forward: 0 })) return;
      } else if (!(await update({ forward: 0 }))) return;
    }
    const d6 = () => {
      const bytes = new Uint8Array(1);
      do {
        crypto.getRandomValues(bytes);
      } while (bytes[0] >= 252);
      return (bytes[0] % 6) + 1;
    };
    const dice: [number, number] = [d6(), d6()];
    activity.recordRoll({
      label: action ?? stat ?? "Move bonus",
      source,
      dice,
      modifier,
    });
    setRoll({
      returnFocus,
      stat,
      action,
      dice,
      attribute,
      forward: currentSheet.forward,
      ongoing: currentSheet.ongoing,
      modifier,
      total: dice[0] + dice[1] + modifier,
    });
  }
  return (
    <div className="play-sheet field-sheet">
      <div className="character-command">
        <section className="character-portrait-card">
          <div className="hero-art">
            <Portrait
              species={sheet.species}
              playbook={sheet.playbook}
              sizes="(max-width: 600px) 140px, 340px"
            />
          </div>
          <div className="hero-caption">
            <h2>{sheet.name}</h2>
            <p>
              {t(sheet.playbook)} · {t(sheet.species)}
            </p>
            {sheet.pronouns && (
              <small className="hero-pronouns">{sheet.pronouns}</small>
            )}
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
              <NotebookDoodle kind="harm" />
            </div>
            {harmTracks.map((track) => (
              <div className={`condition-track ${track}`} key={track}>
                <div className="condition-label">
                  <strong>
                    <RuleHelp name={track} />
                  </strong>
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
                      <HarmBox variant={n - 1} />
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
                  help={<RuleHelp name={["Hold", "Forward", "Ongoing"][i]} />}
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
          </section>
        </div>
      </div>
      <section className="attribute-section" aria-labelledby="attribute-title">
        <div className="field-section-heading">
          <div>
            <span className="eyebrow">
              {t(
                readOnly
                  ? "Read-only"
                  : management
                    ? "Campaign master"
                    : "Take a chance",
              )}
            </span>
            <h3 id="attribute-title">
              {t(canRoll ? "Roll an attribute" : "Attributes")}
            </h3>
          </div>
          {canRoll && (
            <div className="roll-heading-note">
              <NotebookDoodle kind="dice" />
              <p>{t("2d6 + attribute + modifiers")}</p>
            </div>
          )}
        </div>
        <div className="attribute-rolls">
          {stats.map((stat) => (
            <div className="attribute-roll" key={stat}>
              <AttributeIcon stat={stat} />
              <RuleHelp name={stat} />
              {!canRoll ? (
                <div className="attribute-roll-action">
                  <strong>
                    {attributes[stat] >= 0 ? "+" : ""}
                    {attributes[stat]}
                  </strong>
                </div>
              ) : (
                <button
                  type="button"
                  className="attribute-roll-action"
                  aria-label={t("Roll {stat}", { stat: t(stat) })}
                  disabled={busy || management}
                  onClick={() => void rollAttribute(stat)}
                >
                  <strong>
                    {attributes[stat] >= 0 ? "+" : ""}
                    {attributes[stat]}
                  </strong>
                  <span className="attribute-dice">
                    <DiceIcon />
                  </span>
                </button>
              )}
            </div>
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
          <NotebookDoodle kind="gear" />
        </div>
        <GearPanel
          sheet={sheet}
          busy={busy}
          update={update}
          roll={
            !canRoll
              ? undefined
              : (stat, source) => void rollAttribute(stat, undefined, 0, source)
          }
          rollSkill={
            !canRoll
              ? undefined
              : (stat, action, bonus, source) =>
                  void rollAttribute(stat, action, bonus, source)
          }
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
          <div className="feature-grid character-info-grid">
            <article className="feature-tile">
              <BookOpen className="feature-icon" aria-hidden="true" />
              <small>{t("Playbook")}</small>
              <h4>
                <RuleHelp
                  name={sheet.playbook}
                  summary={playbookData[sheet.playbook]?.summary}
                  page={playbookData[sheet.playbook]?.page}
                />
              </h4>
              <p>
                {t(playbookData[sheet.playbook]?.summary || sheet.playbook)}
              </p>
            </article>
            <article className="feature-tile">
              <PawPrint className="feature-icon" aria-hidden="true" />
              <small>{t("Species")}</small>
              <h4>{t(sheet.species)}</h4>
              {sheet.pronouns && <p>{sheet.pronouns}</p>}
              {sheet.description && <p>{sheet.description}</p>}
            </article>
            {sheet.nature && (
              <article className="feature-tile nature-tile">
                <Leaf className="feature-icon" aria-hidden="true" />
                <small>
                  <RuleHelp name="Nature" />
                </small>
                <h4>
                  <RuleHelp
                    name={sheet.nature}
                    summary={natureHints[sheet.nature]}
                  />
                </h4>
                <p>{t(natureHints[sheet.nature] || sheet.nature)}</p>
                <button
                  className="btn small"
                  disabled={busy || sheet.exhaustion === 0}
                  onClick={() => void update({ exhaustion: 0 })}
                >
                  {t("Fulfill nature: clear exhaustion")}
                </button>
              </article>
            )}
          </div>
          <MovesPanel
            setupLocked={setupLocked}
            sheet={sheet}
            busy={busy}
            roll={
              !canRoll
                ? undefined
                : (stat, action) => void rollAttribute(stat, action)
            }
            rollSkill={
              !canRoll
                ? undefined
                : (stat, action, bonus) =>
                    void rollAttribute(stat, action, bonus)
            }
          />
        </details>
        <details className="sheet-subsection">
          <summary>
            <ScrollText size={19} />
            {t("Background")}
            <NotebookDoodle kind="story" />
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
        {state?.saving ? (
          t("Saving…")
        ) : (state?.saved ?? saved) ? (
          <>
            <Check size={15} />
            {t(
              saveLocal
                ? "Saved only in this browser tab."
                : "Character sheet saved.",
            )}
          </>
        ) : null}
      </div>
      {(error || state?.error) && (
        <p className="error" role="alert">
          {t(error || state?.error || "")}
          {state?.error && (
            <>
              {" "}
              {t("Your unsaved changes are kept in this tab.")}{" "}
              {!state.conflict && (
                <button
                  className="btn small"
                  disabled={recovering}
                  onClick={() => {
                    setError("");
                    saveQueue?.retry();
                  }}
                >
                  {t("Retry")}
                </button>
              )}
              <button
                className="btn small"
                disabled={recovering}
                onClick={async () => {
                  if (
                    !window.confirm(
                      t("Discard unsaved changes and load the saved sheet?"),
                    )
                  )
                    return;
                  setRecovering(true);
                  try {
                    const data = await api(
                      !canRoll
                        ? `heroes?campaign=${encodeURIComponent(hero.campaign_id!)}`
                        : "heroes",
                    );
                    const latest = data.heroes.find(
                      (h: Hero) => h.id === hero.id,
                    );
                    if (!latest) throw new Error("Could not load characters.");
                    saveQueue?.discardAndReload(latest);
                    setError("");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setRecovering(false);
                  }
                }}
              >
                {t("Reload saved sheet")}
              </button>
              <button
                className="text-link"
                disabled={recovering}
                onClick={() => {
                  if (window.confirm(t("Discard unsaved changes"))) {
                    saveQueue?.discard();
                    setError("");
                  }
                }}
              >
                {t("Discard unsaved changes")}
              </button>
            </>
          )}
        </p>
      )}
    </div>
  );
}

const subscribeLocal = () => () => {};
const localSnapshot = () => null;
