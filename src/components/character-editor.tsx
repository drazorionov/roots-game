"use client";
import { useState, useEffect, useRef } from "react";
import { Portrait } from "./art";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
  species,
  playbooks,
  stats,
  harmTracks,
  harmCapacity,
  type Sheet,
} from "@/lib/sheet";
import {
  playbookData,
  newCharacterSheet,
  applyPlaybook,
  natureHints,
  driveHints,
  feats,
  weaponSkills,
  setupRemaining,
  effectiveStats,
} from "@/lib/playbooks";
export default function CharacterEditor({
  initial,
  initialStep = 0,
  save,
  busy,
  error,
  markDirty,
}: {
  initial?: Sheet;
  initialStep?: number;
  save: (s: Sheet) => void;
  busy: boolean;
  error: string;
  markDirty: () => void;
}) {
  const { t } = useTranslation();
  const [sheet, setSheet] = useState<Sheet>(() =>
    structuredClone(initial || newCharacterSheet()),
  );
  const [baseline] = useState(() =>
    JSON.stringify(initial || newCharacterSheet()),
  );
  const [step, setStep] = useState(initialStep),
    [localError, setLocalError] = useState("");
  const top = useRef<HTMLDivElement>(null);
  const book = playbookData[sheet.playbook];
  const dirty = JSON.stringify(sheet) !== baseline;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function patch(p: Partial<Sheet>) {
    setSheet((s) => ({ ...s, ...p }));
    markDirty();
    setLocalError("");
  }
  function go(n: number) {
    setStep(n);
    top.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  function toggle(
    key: "moveIds" | "driveIds" | "featIds" | "weaponSkillIds",
    value: string,
    max: number,
  ) {
    const current = sheet[key];
    if (current.includes(value)) {
      const next = { ...sheet, [key]: current.filter((x) => x !== value) };
      if (harmTracks.some((track) => next[track] > harmCapacity(next, track))) {
        setLocalError(
          "Clear harm before removing the move that provides those boxes.",
        );
        return;
      }
      patch({ [key]: next[key] });
    } else if (current.length < max) patch({ [key]: [...current, value] });
  }
  function choosePlaybook(name: string) {
    if (
      (initial ||
        sheet.moveIds.length ||
        sheet.nature ||
        sheet.driveIds.length) &&
      !window.confirm(
        t(
          "Load this playbook’s starting attributes and choices? Your story and equipment will be kept.",
        ),
      )
    )
      return;
    const next = applyPlaybook(sheet, name);
    if (harmTracks.some((track) => next[track] > harmCapacity(next, track))) {
      setLocalError(
        "Clear harm before removing the move that provides those boxes.",
      );
      return;
    }
    patch({
      ...next,
      ...(!initial && !sheet.equipment.length
        ? { coin: playbookData[name].value }
        : {}),
    });
  }
  function chooseBonus(value: Sheet["startingBonus"]) {
    const next = { ...sheet.stats };
    if (sheet.startingBonus) next[sheet.startingBonus] -= 1;
    if (value) next[value] += 1;
    patch({ startingBonus: value, stats: next });
  }
  const remaining = setupRemaining(sheet);
  const totals = effectiveStats(sheet);
  return (
    <form
      className="character-wizard"
      onSubmit={(e) => {
        e.preventDefault();
        if (!sheet.name.trim()) {
          setLocalError("Give your character a name.");
          go(0);
          return;
        }
        save(sheet);
      }}
    >
      <div ref={top} className="wizard-top">
        <nav className="wizard-steps" aria-label={t("Character creation")}>
          {["Identity", "Abilities", "Background"].map((label, i) => (
            <button
              key={label}
              type="button"
              aria-current={step === i ? "step" : undefined}
              onClick={() => go(i)}
            >
              <span>{i + 1}</span>
              {t(label)}
            </button>
          ))}
        </nav>
        <p className="field-hint">
          {t("Save at any step. You can finish your choices later.")}
        </p>
      </div>
      <fieldset disabled={busy}>
        {step === 0 && (
          <>
            <div className="editor-identity">
              <div className="editor-portrait">
                <Portrait species={sheet.species} />
              </div>
              <label>
                {t("Name")}
                <input
                  aria-label={t("Name")}
                  maxLength={80}
                  value={sheet.name}
                  placeholder={t("Your character’s name")}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                {t("Species")}
                <select
                  aria-label={t("Species")}
                  value={sheet.species}
                  onChange={(e) => patch({ species: e.target.value })}
                >
                  {species.map((s) => (
                    <option key={s} value={s}>
                      {t(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("Playbook")}
                <select
                  aria-label={t("Playbook")}
                  value={sheet.playbook}
                  onChange={(e) => choosePlaybook(e.target.value)}
                >
                  {!playbooks.includes(sheet.playbook) && (
                    <option value={sheet.playbook}>{sheet.playbook}</option>
                  )}
                  {playbooks.map((p) => (
                    <option key={p} value={p}>
                      {t(p)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {book && (
              <div className="playbook-intro">
                <strong>{t(sheet.playbook)}</strong>
                <p>{t(book.summary)}</p>
                <span>
                  {t("Starting equipment value: {value}", {
                    value: book.value,
                  })}
                </span>
                {!sheet.presetApplied && (
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => choosePlaybook(sheet.playbook)}
                  >
                    {t("Load starting choices")}
                  </button>
                )}
              </div>
            )}
            <h3 className="form-section">{t("Attributes")}</h3>
            {sheet.presetApplied && (
              <label className="bonus-field">
                {t("Choose your +1 attribute")}
                <select
                  aria-label={t("Starting bonus")}
                  value={sheet.startingBonus}
                  onChange={(e) =>
                    chooseBonus(e.target.value as Sheet["startingBonus"])
                  }
                >
                  <option value="">{t("Choose later")}</option>
                  {stats
                    .filter(
                      (stat) =>
                        sheet.stats[stat] -
                          (sheet.startingBonus === stat ? 1 : 0) <
                        2,
                    )
                    .map((stat) => (
                      <option key={stat} value={stat}>
                        {t(stat)}
                      </option>
                    ))}
                </select>
                <small>
                  {t(
                    "Starting attributes cannot exceed +2. Move bonuses can raise them to +3.",
                  )}
                </small>
              </label>
            )}
            <div className="attribute-inputs">
              {stats.map((stat) => (
                <label key={stat}>
                  {t(stat)}
                  <select
                    aria-label={t(stat)}
                    value={sheet.stats[stat]}
                    onChange={(e) =>
                      patch({
                        stats: {
                          ...sheet.stats,
                          [stat]: Number(e.target.value),
                        },
                        startingBonus: "",
                        presetApplied: false,
                      })
                    }
                  >
                    {(initial
                      ? [-3, -2, -1, 0, 1, 2, 3]
                      : [-3, -2, -1, 0, 1, 2]
                    ).map((n) => (
                      <option key={n} value={n}>
                        {n > 0 ? `+${n}` : n}
                      </option>
                    ))}
                  </select>
                  {totals[stat] !== sheet.stats[stat] && (
                    <small>
                      {t("With moves: {value}", { value: totals[stat] })}
                    </small>
                  )}
                </label>
              ))}
            </div>
            <details className="optional-details">
              <summary>{t("Optional details")}</summary>
              <label>
                {t("Pronouns")}
                <input
                  value={sheet.pronouns}
                  maxLength={40}
                  onChange={(e) => patch({ pronouns: e.target.value })}
                />
              </label>
              <label>
                {t("A few words about them")}
                <input
                  value={sheet.description}
                  maxLength={240}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </label>
            </details>
          </>
        )}
        {step === 1 && (
          <>
            <h3>{t("Nature")}</h3>
            <p className="field-hint">
              {t("Choose how you clear exhaustion.")}
            </p>
            <div className="choice-list">
              {(book?.natures || []).map((name) => (
                <button
                  type="button"
                  className="choice-card"
                  key={name}
                  aria-pressed={sheet.nature === name}
                  onClick={() =>
                    patch({ nature: sheet.nature === name ? "" : name })
                  }
                >
                  <strong>{t(name)}</strong>
                  <span>{t(natureHints[name])}</span>
                </button>
              ))}
            </div>
            <details className="optional-details">
              <summary>{t("Custom nature")}</summary>
              <input
                aria-label={t("Custom nature")}
                maxLength={6000}
                value={sheet.nature}
                onChange={(e) => patch({ nature: e.target.value })}
              />
            </details>
            <h3>
              {t("Drives")} <small>{sheet.driveIds.length}/2</small>
            </h3>
            <p className="field-hint">
              {t(
                "Choose two goals. Each can earn one advancement per session.",
              )}
            </p>
            <div className="choice-list">
              {(book?.drives || []).map((name) => (
                <button
                  type="button"
                  className="choice-card"
                  key={name}
                  aria-pressed={sheet.driveIds.includes(name)}
                  disabled={
                    !sheet.driveIds.includes(name) && sheet.driveIds.length >= 2
                  }
                  onClick={() => toggle("driveIds", name, 2)}
                >
                  <strong>{t(name)}</strong>
                  <span>{t(driveHints[name])}</span>
                </button>
              ))}
            </div>
            <h3>
              {t("Playbook moves")} <small>{sheet.moveIds.length}/3</small>
            </h3>
            <p className="field-hint">
              {t(
                book?.requiredMoves.length
                  ? "The marked moves are included. Choose one more."
                  : "Choose three moves. Open a move to read its reminder.",
              )}
            </p>
            <div className="move-picker">
              {book?.moves.map((move) => (
                <div className="move-choice" key={move.name}>
                  <label>
                    <input
                      type="checkbox"
                      checked={sheet.moveIds.includes(move.name)}
                      disabled={
                        book.requiredMoves.includes(move.name) ||
                        (!sheet.moveIds.includes(move.name) &&
                          sheet.moveIds.length >= (initial ? 7 : 3))
                      }
                      onChange={() =>
                        toggle("moveIds", move.name, initial ? 7 : 3)
                      }
                    />
                    <span>
                      {t(move.name)}
                      {book.requiredMoves.includes(move.name) && (
                        <small>{t("Included")}</small>
                      )}
                    </span>
                  </label>
                  <details>
                    <summary>{t("Move details")}</summary>
                    <p>{t(move.summary)}</p>
                  </details>
                </div>
              ))}
            </div>
            <details className="optional-details" open={!!book?.chooseFeats}>
              <summary>
                {t("Roguish feats")} · {sheet.featIds.length}/
                {(book?.feats.length || 0) + (book?.chooseFeats || 0)}
              </summary>
              <p className="field-hint">
                {t(
                  book?.chooseFeats
                    ? "Choose the remaining feats for your playbook."
                    : "Your playbook’s starting feats are already selected.",
                )}
              </p>
              <div className="skill-picker">
                {feats.map((name) => (
                  <label key={name}>
                    <input
                      type="checkbox"
                      checked={sheet.featIds.includes(name)}
                      disabled={
                        !initial &&
                        (!!book?.feats.includes(name) ||
                          (!sheet.featIds.includes(name) &&
                            sheet.featIds.length >=
                              (book?.feats.length || 0) +
                                (book?.chooseFeats || 0)))
                      }
                      onChange={() =>
                        toggle(
                          "featIds",
                          name,
                          initial
                            ? 14
                            : (book?.feats.length || 0) +
                                (book?.chooseFeats || 0),
                        )
                      }
                    />
                    {t(name)}
                  </label>
                ))}
              </div>
            </details>
            <details className="optional-details" open>
              <summary>{t("Weapon skills")}</summary>
              <p className="field-hint">
                {t(
                  "Choose one starting skill. Dirty Fighter grants two additional choices.",
                )}
              </p>
              <div className="skill-picker">
                {(initial
                  ? weaponSkills
                  : [
                      ...new Set([
                        ...(book?.weapons || weaponSkills),
                        ...(sheet.moveIds.includes("Dirty Fighter")
                          ? [
                              "Trick Shot",
                              "Confuse Senses",
                              "Improvise Weapon",
                              "Disarm",
                              "Vicious Strike",
                            ]
                          : []),
                      ]),
                    ]
                ).map((name) => (
                  <label key={name}>
                    <input
                      type="checkbox"
                      checked={sheet.weaponSkillIds.includes(name)}
                      disabled={
                        !initial &&
                        !sheet.weaponSkillIds.includes(name) &&
                        sheet.weaponSkillIds.length >=
                          (sheet.moveIds.includes("Dirty Fighter") ? 3 : 1)
                      }
                      onChange={() =>
                        toggle(
                          "weaponSkillIds",
                          name,
                          initial
                            ? 24
                            : sheet.moveIds.includes("Dirty Fighter")
                              ? 3
                              : 1,
                        )
                      }
                    />
                    {t(name)}
                  </label>
                ))}
              </div>
            </details>
          </>
        )}
        {step === 2 && (
          <>
            <h3>{t("Your story")}</h3>
            <p className="field-hint">
              {t("A few details to bring into your first session.")}
            </p>
            {(["home", "motivation", "leftBehind"] as const).map((key, i) => (
              <label key={key}>
                {t(
                  [
                    "Where do you call home?",
                    "Why are you a vagabond?",
                    "Whom did you leave behind?",
                  ][i],
                )}
                <textarea
                  rows={2}
                  maxLength={6000}
                  value={sheet.background[key]}
                  onChange={(e) =>
                    patch({
                      background: {
                        ...sheet.background,
                        [key]: e.target.value,
                      },
                    })
                  }
                />
              </label>
            ))}
            <label>
              {t("Connections")}
              <textarea
                rows={2}
                maxLength={6000}
                value={sheet.bonds}
                placeholder={t(
                  "Name your companions and the bonds between you.",
                )}
                onChange={(e) => patch({ bonds: e.target.value })}
              />
            </label>
            <label>
              {t("Notes")}
              <textarea
                aria-label={t("Notes")}
                rows={3}
                maxLength={6000}
                value={sheet.biography}
                onChange={(e) => patch({ biography: e.target.value })}
              />
            </label>
            <div className="playbook-intro">
              <strong>
                {t("Starting equipment value: {value}", {
                  value: book?.value || 0,
                })}
              </strong>
              <p>
                {t(
                  "Add your equipment on the working sheet. Keep unspent value as coin.",
                )}
              </p>
            </div>
            <details className="optional-details">
              <summary>{t("Custom abilities & advancement")}</summary>
              {(["moves", "feats", "weaponSkills", "drives"] as const).map(
                (key, i) => (
                  <label key={key}>
                    {t(
                      [
                        "Move notes",
                        "Additional feats",
                        "Additional weapon skills",
                        "Drive notes",
                      ][i],
                    )}
                    <textarea
                      rows={2}
                      maxLength={6000}
                      value={sheet[key]}
                      onChange={(e) => patch({ [key]: e.target.value })}
                    />
                  </label>
                ),
              )}
              <p className="field-hint">
                {t(
                  "Extra boxes from moves are added automatically. Set base tracks here after advancement.",
                )}
              </p>
              <div className="form-grid">
                {harmTracks.map((track) => (
                  <label key={track}>
                    {t(track)}
                    <select
                      aria-label={t("{track} base boxes", { track: t(track) })}
                      value={sheet.harmSlots[track]}
                      onChange={(e) => {
                        const next = {
                          ...sheet,
                          harmSlots: {
                            ...sheet.harmSlots,
                            [track]: Number(e.target.value),
                          },
                        };
                        if (next[track] <= harmCapacity(next, track))
                          patch({ harmSlots: next.harmSlots });
                        else
                          setLocalError(
                            "Clear harm before reducing this track.",
                          );
                      }}
                    >
                      {[4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </details>
          </>
        )}
      </fieldset>
      {(error || localError) && (
        <p className="error" role="alert">
          {t(error || localError)}
        </p>
      )}
      <div className="wizard-footer">
        <div className="wizard-paging">
          <button
            type="button"
            className="text-link"
            disabled={step === 0 || busy}
            onClick={() => go(step - 1)}
          >
            <ChevronLeft size={17} />
            {t("Back")}
          </button>
          <span>{step + 1} / 3</span>
          <button
            type="button"
            className="text-link"
            disabled={step === 2 || busy}
            onClick={() => go(step + 1)}
          >
            {t("Next")}
            <ChevronRight size={17} />
          </button>
        </div>
        <button disabled={busy} className="btn primary full">
          {t(busy ? "Saving…" : "Save character")}
          <Check size={18} />
        </button>
        {remaining.length > 0 && (
          <small>
            {t("{count} choices left — you can save now.", {
              count: remaining.length,
            })}
          </small>
        )}
      </div>
    </form>
  );
}
