"use client";
import { useTranslation } from "@/lib/i18n";
import {
  Dices,
  BookOpen,
  KeyRound,
  Swords,
  Compass,
  MapPin,
  Users,
  ScrollText,
} from "lucide-react";
import { type Sheet, stats } from "@/lib/sheet";
import {
  allMoves,
  driveHints,
  effectiveFeats,
  effectiveWeapons,
} from "@/lib/playbooks";
import RuleHelp from "./rule-help";
import { rules } from "@/lib/rules";
import { playbookData } from "@/lib/playbooks";
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
      {!sheet.moveIds.length && (
        <p className="field-hint">
          {t(
            setupLocked
              ? "No playbook moves selected."
              : "Choose moves in Edit character → Abilities.",
          )}
        </p>
      )}
      <div className="feature-grid move-grid">
        {sheet.moveIds.map((name) => {
          const move = allMoves.find((x) => x.name === name);
          return (
            <article className="feature-tile move-tile" key={name}>
              <BookOpen className="feature-icon" aria-hidden="true" />
              <h4>
                <RuleHelp
                  name={name}
                  summary={move?.summary}
                  page={
                    (Object.values(playbookData).find((book) =>
                      book.moves.some((entry) => entry.name === name),
                    )?.page ?? 1) + 2
                  }
                />
              </h4>
              <p className={expanded ? "" : "feature-preview"}>
                {move ? t(move.summary) : name}
              </p>
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
            </article>
          );
        })}
      </div>
      {sheet.moves && (
        <div className="written-note">
          <h4>{t("Move notes")}</h4>
          <p>{sheet.moves}</p>
        </div>
      )}
      <h4>
        <RuleHelp name="Roguish feats" />
      </h4>
      <div className="feature-grid skill-grid">
        {effectiveFeats(sheet).map((name) => (
          <article className="feature-tile" key={name}>
            <KeyRound className="feature-icon" aria-hidden="true" />
            <h4>
              <RuleHelp
                name={name}
                summary={
                  rules[name]
                    ? `${t(rules[name].summary)}\n\n${t(rules["Roguish feats"].summary)}`
                    : undefined
                }
                page={115}
              />
            </h4>
            <p className="feature-preview">{t(rules[name]?.summary || name)}</p>
          </article>
        ))}
      </div>
      {sheet.feats && <p className="written-note">{sheet.feats}</p>}
      <h4>
        <RuleHelp name="Weapon skills" />
      </h4>
      <div className="feature-grid skill-grid">
        {effectiveWeapons(sheet).map((name) => (
          <article className="feature-tile" key={name}>
            <Swords className="feature-icon" aria-hidden="true" />
            <h4>
              <RuleHelp
                name={name}
                summary={
                  rules[name]
                    ? `${t(rules[name].summary)}\n\n${t(rules["Weapon skills"].summary)}`
                    : undefined
                }
                page={rules[name]?.page}
              />
            </h4>
            <p className="feature-preview">{t(rules[name]?.summary || name)}</p>
          </article>
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
      <h4>
        <RuleHelp name="Drives" />
      </h4>
      <div className="feature-grid drive-grid">
        {sheet.driveIds.map((name) => (
          <article className="feature-tile" key={name}>
            <Compass className="feature-icon" aria-hidden="true" />
            <h4>
              <RuleHelp name={name} summary={driveHints[name]} page={108} />
            </h4>
            <p>{t(driveHints[name] || "")}</p>
            <button
              className="drive-check"
              key={name}
              disabled={
                busy ||
                sheet.driveMarks.includes(name) ||
                sheet.advancement >= 100
              }
              aria-label={t("Mark {drive} fulfilled", { drive: t(name) })}
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
              <span>{t("Mark fulfilled")}</span>
            </button>
          </article>
        ))}
      </div>
      {sheet.drives && <p className="written-note">{sheet.drives}</p>}
      <SheetCounter
        label={t("Advancements")}
        help={<RuleHelp name="Advancements" />}
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
      <div className="feature-grid background-grid">
        {[
          ["Where do you call home?", sheet.background.home],
          ["Why are you a vagabond?", sheet.background.motivation],
          ["Whom did you leave behind?", sheet.background.leftBehind],
          ["Connections", sheet.bonds],
          ["Notes", sheet.biography],
        ].map(
          ([label, value]) =>
            value && (
              <article className="feature-tile" key={label}>
                {label === "Connections" ? (
                  <Users className="feature-icon" aria-hidden="true" />
                ) : label === "Where do you call home?" ? (
                  <MapPin className="feature-icon" aria-hidden="true" />
                ) : (
                  <ScrollText className="feature-icon" aria-hidden="true" />
                )}
                <h4>
                  <RuleHelp name={label} />
                </h4>
                <p>{value}</p>
              </article>
            ),
        )}
      </div>
    </section>
  );
}
export { ReputationPanel } from "./reputation-panel";
