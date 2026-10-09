"use client";
import { useState, useEffect, useRef } from "react";
import RuleHelp from "./rule-help";
import { Portrait } from "./art";
import PortraitPicker from "./portrait-picker";
import AttributeIcon from "./attribute-icon";
import GearPanel from "./gear-panel";
import { ReputationPanel } from "./sheet-panels";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  Backpack,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
  species,
  playbooks,
  stats,
  harmTracks,
  harmCapacity,
  withReputationFactions,
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
  editing = false,
  campaignName,
  save,
  busy,
  error,
  markDirty,
}: {
  initial?: Sheet;
  initialStep?: number;
  editing?: boolean;
  campaignName?: string;
  save: (s: Sheet, joinCampaign?: boolean) => void;
  busy: boolean;
  error: string;
  markDirty: () => void;
}) {
  const { t } = useTranslation();
  const [sheet, setSheet] = useState<Sheet>(() => {
    const starting = structuredClone(initial || newCharacterSheet());
    return { ...starting, reputation: withReputationFactions(starting.reputation) };
  });
  const [baseline] = useState(() => JSON.stringify(sheet));
  const [step, setStep] = useState(initialStep),
    [localError, setLocalError] = useState("");
  const top = useRef<HTMLDivElement>(null);
  const [served, setServed] = useState(
    () => initial?.reputation.find((f) => f.prestige === 2)?.faction || "",
  );
  const [enemy, setEnemy] = useState(
    () => initial?.reputation.find((f) => f.notoriety === 1)?.faction || "",
  );
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
      return false;
    const next = applyPlaybook(sheet, name);
    if (harmTracks.some((track) => next[track] > harmCapacity(next, track))) {
      setLocalError(
        "Clear harm before removing the move that provides those boxes.",
      );
      return false;
    }
    patch({
      ...next,
      ...(!editing && !sheet.equipment.length
        ? { coin: playbookData[name].value }
        : {}),
    });
    return true;
  }
  function chooseBonus(value: Sheet["startingBonus"]) {
    const next = { ...sheet.stats };
    if (sheet.startingBonus) next[sheet.startingBonus] -= 1;
    if (value) next[value] += 1;
    patch({ startingBonus: value, stats: next });
  }
  const remaining = setupRemaining(sheet);
  const totals = effectiveStats(sheet);

  const steps = [
    "Identity",
    "Background",
    "Nature & drives",
    "Abilities",
    "Equipment",
    "Review & connections",
  ];
  const hints = [
    "Choose a playbook, give your vagabond a name, and add +1 to an attribute.",
    "Decide where you came from and how the factions remember you.",
    "Choose what restores you and what you want from the Woodland.",
    "Choose your special moves, roguish feats, and weapon skills.",
    "Spend your starting value on weapons and supplies. Keep the rest as coin.",
    "Introduce your vagabond, make connections, and review your choices.",
  ];
  function submit(joinCampaign = false) {
    if (busy) return;
    if (!sheet.name.trim()) {
      setLocalError("Give your character a name.");
      go(0);
      return;
    }
    save(sheet, joinCampaign);
  }
  function startingReputation(kind: "prestige" | "notoriety", faction: string) {
    const previous = kind === "prestige" ? served : enemy;
    const amount = kind === "prestige" ? 2 : 1;
    patch({
      reputation: sheet.reputation.map((f) => ({
        ...f,
        [kind]: Math.max(
          0,
          Math.min(
            15,
            f[kind] -
              (f.faction === previous ? amount : 0) +
              (f.faction === faction ? amount : 0),
          ),
        ),
      })),
    });
    if (kind === "prestige") setServed(faction);
    else setEnemy(faction);
  }
  return (
    <div className="character-wizard character-builder">
      <aside className="builder-sidebar">
        <div className="builder-profile">
          <div className="builder-portrait">
            <Portrait species={sheet.species} playbook={sheet.playbook} />
          </div>
          <div>
            <strong>{sheet.name || t("Your vagabond")}</strong>
            <span>
              {t(sheet.species)} · {t(sheet.playbook)}
            </span>
          </div>
        </div>
        <nav className="wizard-steps" aria-label={t("Character creation")}>
          {steps.map((label, i) => (
            <button
              key={label}
              type="button"
              disabled={busy}
              aria-current={step === i ? "step" : undefined}
              onClick={() => go(i)}
            >
              <span>{i + 1}</span>
              <strong>{t(label)}</strong>
              <ChevronRight size={15} />
            </button>
          ))}
        </nav>
        <div className="builder-summary">
          <span>{t("Your progress")}</span>
          <strong>
            {t("{count} choices left", { count: remaining.length })}
          </strong>
          <p>{t("Save at any step. You can finish your choices later.")}</p>
          <div>
            <Backpack size={17} />
            <RuleHelp name="Coin" />: {sheet.coin} · <RuleHelp name="Load" />:{" "}
            {sheet.equipment.reduce((sum, item) => sum + item.load, 0)}
          </div>
        </div>
      </aside>
      <div className="builder-canvas">
        <header ref={top} className="wizard-top builder-section-heading">
          <p className="eyebrow">
            {t("Step {step} of {total}", {
              step: step + 1,
              total: steps.length,
            })}
          </p>
          <h2>{t(steps[step])}</h2>
          <p>{t(hints[step])}</p>
        </header>
        <fieldset disabled={busy}>
          {step === 0 && (
            <>
              <PortraitPicker
                label={t("Playbook")}
                value={sheet.playbook}
                initiallyOpen={!editing}
                options={playbooks.map((name) => ({
                  value: name,
                  label: t(name),
                  species: sheet.species,
                  playbook: name,
                  description: t(playbookData[name].summary),
                }))}
                onSelect={choosePlaybook}
              />
              <PortraitPicker
                label={t("Species")}
                value={sheet.species}
                initiallyOpen={!editing}
                options={species.map((name) => ({
                  value: name,
                  label: t(name),
                  species: name,
                  playbook: sheet.playbook,
                }))}
                onSelect={(name) => patch({ species: name })}
              />

              <div className="editor-identity">
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
              <h3 className="form-section">
                <RuleHelp name="Attributes" />
              </h3>
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
              <div className="builder-stats">
                {stats.map((stat) => (
                  <div key={stat}>
                    <AttributeIcon stat={stat} />
                    <RuleHelp name={stat} />
                    <strong>
                      {totals[stat] > 0 ? "+" : ""}
                      {totals[stat]}
                    </strong>
                  </div>
                ))}
              </div>
              <details className="optional-details">
                <summary>{t("Custom attributes")}</summary>{" "}
                <div className="attribute-inputs">
                  {stats.map((stat) => (
                    <div className="rule-field" key={stat}>
                      <RuleHelp name={stat} />
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
                        {(editing
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
                    </div>
                  ))}
                </div>
              </details>
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

              <h3>
                <RuleHelp name="Starting reputation" />
              </h3>
              {!editing ? (
                <div className="form-grid">
                  <label>
                    {t("Which faction did you serve?")}
                    <select
                      aria-label={t("Which faction did you serve?")}
                      value={served}
                      onChange={(e) =>
                        startingReputation("prestige", e.target.value)
                      }
                    >
                      <option value="">{t("Choose later")}</option>
                      {sheet.reputation.map((f) => (
                        <option key={f.faction} value={f.faction}>
                          {t(f.faction)}
                        </option>
                      ))}
                    </select>
                    <small>{t("Mark 2 prestige with this faction.")}</small>
                  </label>
                  <label>
                    {t("Which faction is your enemy?")}
                    <select
                      aria-label={t("Which faction is your enemy?")}
                      value={enemy}
                      onChange={(e) =>
                        startingReputation("notoriety", e.target.value)
                      }
                    >
                      <option value="">{t("Choose later")}</option>
                      {sheet.reputation.map((f) => (
                        <option key={f.faction} value={f.faction}>
                          {t(f.faction)}
                        </option>
                      ))}
                    </select>
                    <small>{t("Mark 1 notoriety with this faction.")}</small>
                  </label>
                </div>
              ) : null}
              <details className="optional-details">
                <summary>{t("Reputation")}</summary>
                <ReputationPanel
                  sheet={sheet}
                  busy={busy}
                  update={async (values) => {
                    patch(values);
                    return true;
                  }}
                />
              </details>
            </>
          )}
          {step === 2 && (
            <>
              <h3>
                <RuleHelp name="Nature" />
              </h3>
              <p className="field-hint">
                {t("Choose how you clear exhaustion.")}
              </p>
              <div className="choice-list">
                {(book?.natures || []).map((name) => (
                  <article className="choice-card" key={name}>
                    <div className="rule-choice">
                      <input
                        type="checkbox"
                        aria-label={t(name)}
                        checked={sheet.nature === name}
                        onChange={() =>
                          patch({ nature: sheet.nature === name ? "" : name })
                        }
                      />
                      <strong>
                        <RuleHelp
                          name={name}
                          summary={natureHints[name]}
                          page="105–107"
                        />
                      </strong>
                    </div>
                    <p>{t(natureHints[name])}</p>
                  </article>
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
                <RuleHelp name="Drives" />{" "}
                <small>{sheet.driveIds.length}/2</small>
              </h3>
              <p className="field-hint">
                {t(
                  "Choose two goals. Each can earn one advancement per session.",
                )}
              </p>
              <div className="choice-list">
                {(book?.drives || []).map((name) => (
                  <article className="choice-card" key={name}>
                    <div className="rule-choice">
                      <input
                        type="checkbox"
                        aria-label={t(name)}
                        checked={sheet.driveIds.includes(name)}
                        disabled={
                          !sheet.driveIds.includes(name) &&
                          sheet.driveIds.length >= 2
                        }
                        onChange={() => toggle("driveIds", name, 2)}
                      />
                      <strong>
                        <RuleHelp
                          name={name}
                          summary={driveHints[name]}
                          page={108}
                        />
                      </strong>
                    </div>
                    <p>{t(driveHints[name])}</p>
                  </article>
                ))}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              {" "}
              <h3>
                <RuleHelp name="Playbook moves" />{" "}
                <small>{sheet.moveIds.length}/3</small>
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
                    <div className="choice-heading">
                      <input
                        type="checkbox"
                        aria-label={t(move.name)}
                        checked={sheet.moveIds.includes(move.name)}
                        disabled={
                          book.requiredMoves.includes(move.name) ||
                          (!sheet.moveIds.includes(move.name) &&
                            sheet.moveIds.length >= (editing ? 7 : 3))
                        }
                        onChange={() =>
                          toggle("moveIds", move.name, editing ? 7 : 3)
                        }
                      />
                      <span>
                        <RuleHelp
                          name={move.name}
                          summary={move.summary}
                          page={book.page + 2}
                        />
                        {book.requiredMoves.includes(move.name) && (
                          <small>{t("Included")}</small>
                        )}
                      </span>
                    </div>
                    <p>{t(move.summary)}</p>
                  </div>
                ))}
              </div>
              <details className="optional-details" open={!!book?.chooseFeats}>
                <summary>
                  <RuleHelp name="Roguish feats" /> · {sheet.featIds.length}/
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
                    <div className="rule-choice" key={name}>
                      <input
                        type="checkbox"
                        aria-label={t(name)}
                        checked={sheet.featIds.includes(name)}
                        disabled={
                          !editing &&
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
                            editing
                              ? 14
                              : (book?.feats.length || 0) +
                                  (book?.chooseFeats || 0),
                          )
                        }
                      />
                      <RuleHelp name={name} />
                    </div>
                  ))}
                </div>
              </details>
              <details className="optional-details" open>
                <summary>
                  <RuleHelp name="Weapon skills" />
                </summary>
                <p className="field-hint">
                  {t(
                    "Choose one starting skill. Dirty Fighter grants two additional choices.",
                  )}
                </p>
                <div className="skill-picker">
                  {(editing
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
                    <div className="rule-choice" key={name}>
                      <input
                        type="checkbox"
                        aria-label={t(name)}
                        checked={sheet.weaponSkillIds.includes(name)}
                        disabled={
                          !editing &&
                          !sheet.weaponSkillIds.includes(name) &&
                          sheet.weaponSkillIds.length >=
                            (sheet.moveIds.includes("Dirty Fighter") ? 3 : 1)
                        }
                        onChange={() =>
                          toggle(
                            "weaponSkillIds",
                            name,
                            editing
                              ? 24
                              : sheet.moveIds.includes("Dirty Fighter")
                                ? 3
                                : 1,
                          )
                        }
                      />
                      <RuleHelp name={name} />
                    </div>
                  ))}
                </div>
              </details>
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
                    <div className="rule-field" key={track}>
                      <RuleHelp name={track} />
                      <select
                        aria-label={t("{track} base boxes", {
                          track: t(track),
                        })}
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
                    </div>
                  ))}
                </div>
              </details>
            </>
          )}
          {step === 4 && (
            <GearPanel
              sheet={sheet}
              busy={busy}
              starting={!editing}
              update={async (values) => {
                patch(values);
                return true;
              }}
            />
          )}
          {step === 5 && (
            <>
              <div className="review-identity">
                <div className="review-portrait">
                  <Portrait species={sheet.species} playbook={sheet.playbook} />
                </div>
                <div>
                  <strong>{sheet.name || t("Your vagabond")}</strong>
                  <p>
                    {t(sheet.species)} · {t(sheet.playbook)}
                  </p>
                </div>
              </div>
              <div className="builder-stats">
                {stats.map((stat) => (
                  <div key={stat}>
                    <AttributeIcon stat={stat} />
                    <RuleHelp name={stat} />
                    <strong>
                      {totals[stat] > 0 ? "+" : ""}
                      {totals[stat]}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="review-choices">
                <div>
                  <h3>
                    <RuleHelp name="Nature" />
                  </h3>
                  <p>
                    <RuleHelp name={sheet.nature || "Choose later"} />
                  </p>
                </div>
                <div>
                  <h3>
                    <RuleHelp name="Drives" />
                  </h3>
                  <p>
                    {sheet.driveIds.length ? (
                      <span className="review-rule-list">
                        {sheet.driveIds.map((name) => (
                          <RuleHelp key={name} name={name} />
                        ))}
                      </span>
                    ) : (
                      t("Choose later")
                    )}
                  </p>
                </div>
                <div>
                  <h3>
                    <RuleHelp name="Playbook moves" />
                  </h3>
                  <p>
                    {sheet.moveIds.length ? (
                      <span className="review-rule-list">
                        {sheet.moveIds.map((name) => (
                          <RuleHelp key={name} name={name} />
                        ))}
                      </span>
                    ) : (
                      t("Choose later")
                    )}
                  </p>
                </div>
                <div>
                  <h3>{t("Equipment")}</h3>
                  <p>
                    {sheet.equipment.map((item) => item.name).join(" · ") ||
                      t("No equipment yet")}
                  </p>
                </div>
              </div>
              <p className="field-hint">
                {t(
                  "Introduce your character to the table, then write your connections together.",
                )}
              </p>
              <div className="rule-field">
                <RuleHelp name="Connections" />
                <textarea
                  aria-label={t("Connections")}
                  rows={2}
                  maxLength={6000}
                  value={sheet.bonds}
                  placeholder={t(
                    "Name your companions and the bonds between you.",
                  )}
                  onChange={(e) => patch({ bonds: e.target.value })}
                />
              </div>
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

              {remaining.length > 0 && (
                <div className="review-remaining">
                  <h3>{t("Finish setup")}</h3>
                  <ul>
                    {remaining.map((message) => (
                      <li key={message}>{t(message)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {campaignName && (
                <p className="assignment-note">
                  <LockKeyhole size={18} />
                  {t(
                    "Joining {campaign} saves a separate copy with locked setup. Your base character stays editable in My characters; campaign progress only changes the copy.",
                    { campaign: campaignName },
                  )}
                </p>
              )}
            </>
          )}
        </fieldset>
        {(error || localError) && (
          <p className="error" role="alert">
            {t(error || localError)}
          </p>
        )}
        <footer className="wizard-footer builder-footer">
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
            <span>
              {step + 1} / {steps.length}
            </span>
            <button
              type="button"
              className="btn"
              disabled={step === steps.length - 1 || busy}
              onClick={() => go(step + 1)}
            >
              {t("Next")}
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="builder-save">
            <button
              type="button"
              disabled={busy}
              className={`btn ${campaignName ? "" : "primary"}`}
              onClick={() => submit(false)}
            >
              {t(
                busy
                  ? "Saving…"
                  : campaignName
                    ? "Save draft"
                    : "Save character",
              )}
              <Check size={17} />
            </button>
            {campaignName && step === 5 && (
              <button
                type="button"
                disabled={busy}
                className="btn primary"
                onClick={() => submit(true)}
              >
                {t("Save & join campaign")}
                <ChevronRight size={17} />
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
