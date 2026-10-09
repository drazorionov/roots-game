"use client";
import { useTranslation } from "@/lib/i18n";
import { Dices } from "lucide-react";
import { type Sheet, stats } from "@/lib/sheet";
import {
  allMoves,
  driveHints,
  effectiveFeats,
  effectiveWeapons,
} from "@/lib/playbooks";
import SheetCounter from "./sheet-counter";
import { type UpdateSheet } from "./gear-panel";
export function MovesPanel({
  sheet,
  roll,
  busy = false,
  expanded = false,
  setupLocked = false,
}: {
  sheet: Sheet;
  roll?: (stat: (typeof stats)[number]) => void;
  busy?: boolean;
  expanded?: boolean;
  setupLocked?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <section className="play-panel">
      <h3>{t("Playbook moves")}</h3>
      <p className="field-hint">
        {t(
          "Short reminders. Apply costs and situational effects when the move triggers.",
        )}
      </p>
      {!sheet.moveIds.length && (
        <p className="field-hint">
          {t(
            setupLocked
              ? "No playbook moves selected."
              : "Choose moves in Edit character → Abilities.",
          )}
        </p>
      )}
      {sheet.moveIds.map((name) => {
        const move = allMoves.find((x) => x.name === name);
        return (
          <details
            className="move-reminder"
            key={name}
            open={expanded || undefined}
          >
            <summary>
              {t(name)}
              {move?.stat && <span className="pill">{t(move.stat)}</span>}
            </summary>
            <p>{move ? t(move.summary) : name}</p>
            {move?.stat && roll && (
              <button
                className="btn small move-roll"
                aria-label={t("Roll {move}", { move: t(name) })}
                disabled={busy}
                onClick={() => roll(move.stat!)}
              >
                <Dices size={15} />
                {t("Roll {stat}", { stat: t(move.stat) })}
              </button>
            )}
          </details>
        );
      })}
      {sheet.moves && (
        <div className="written-note">
          <h4>{t("Move notes")}</h4>
          <p>{sheet.moves}</p>
        </div>
      )}
      <h4>{t("Roguish feats")}</h4>
      <div className="skill-tags">
        {effectiveFeats(sheet).map((n) => (
          <span key={n}>{t(n)}</span>
        ))}
      </div>
      {sheet.feats && <p className="written-note">{sheet.feats}</p>}
      <h4>{t("Weapon skills")}</h4>
      <div className="skill-tags">
        {effectiveWeapons(sheet).map((n) => (
          <span key={n}>{t(n)}</span>
        ))}
      </div>
      {sheet.weaponSkills && (
        <p className="written-note">{sheet.weaponSkills}</p>
      )}
    </section>
  );
}
export function BackgroundPanel({
  sheet,
  busy,
  update,
  edit,
}: {
  sheet: Sheet;
  busy: boolean;
  update: UpdateSheet;
  edit?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="play-panel">
      <div className="panel-heading">
        <h3>{t("Background")}</h3>
        {edit && (
          <button className="btn small" disabled={busy} onClick={edit}>
            {t("Edit background")}
          </button>
        )}
      </div>
      <h4>{t("Drives")}</h4>
      <p className="field-hint">
        {t(
          "Mark each fulfilled drive once per session. Each mark adds one advancement.",
        )}
      </p>
      {sheet.driveIds.map((name) => (
        <button
          className="drive-check"
          key={name}
          disabled={
            busy || sheet.driveMarks.includes(name) || sheet.advancement >= 100
          }
          aria-pressed={sheet.driveMarks.includes(name)}
          onClick={() =>
            void update({
              driveMarks: [...sheet.driveMarks, name],
              advancement: sheet.advancement + 1,
            })
          }
        >
          <span
            className={`pip ${sheet.driveMarks.includes(name) ? "filled" : ""}`}
          >
            {sheet.driveMarks.includes(name) ? "✓" : "+"}
          </span>
          <span>
            <strong>{t(name)}</strong>
            <small>{t(driveHints[name] || "")}</small>
          </span>
        </button>
      ))}
      {sheet.drives && <p className="written-note">{sheet.drives}</p>}
      <SheetCounter
        label={t("Advancements")}
        value={sheet.advancement}
        max={100}
        busy={busy}
        change={(advancement) => {
          void update({ advancement });
        }}
      />
      <button
        className="text-link"
        disabled={busy || !sheet.driveMarks.length}
        onClick={() => {
          if (
            window.confirm(
              t("Start a new session and clear fulfilled drive marks?"),
            )
          )
            void update({ driveMarks: [] });
        }}
      >
        {t("Start new session")}
      </button>
      {[
        ["Where do you call home?", sheet.background.home],
        ["Why are you a vagabond?", sheet.background.motivation],
        ["Whom did you leave behind?", sheet.background.leftBehind],
        ["Connections", sheet.bonds],
        ["Notes", sheet.biography],
      ].map(
        ([label, value]) =>
          value && (
            <div className="written-note" key={label}>
              <h4>{t(label)}</h4>
              <p>{value}</p>
            </div>
          ),
      )}
    </section>
  );
}
export { ReputationPanel } from "./reputation-panel";
