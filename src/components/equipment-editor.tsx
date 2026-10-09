"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { equipmentSchema, type Equipment } from "@/lib/sheet";
import {
  equipmentCatalogue,
  newEquipment,
  harmLabels,
  harmTypes,
  ranges,
  specialTags,
  splitRanges,
  toggleRange,
  weaponSkillCatalogue,
} from "@/lib/equipment";
import { useTranslation } from "@/lib/i18n";
import RuleHelp from "./rule-help";
import SheetCounter from "./sheet-counter";
import {
  EquipmentArt,
  EquipmentLibrary,
  SpecialTagHelp,
  WeaponSkillLibrary,
} from "./equipment-library";

export default function EquipmentEditor({
  initial,
  existing,
  starting,
  busy,
  learned,
  save,
  cancel,
}: {
  initial: Equipment;
  existing: boolean;
  starting: boolean;
  busy: boolean;
  learned: string[];
  save: (item: Equipment, pay: boolean) => Promise<void>;
  cancel: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initial);
  const rangeChoices = [
    ...ranges,
    ...splitRanges(initial.range).filter(
      (range) =>
        !ranges.some(
          (standard) => standard.toLowerCase() === range.toLowerCase(),
        ),
    ),
  ];
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current?.scrollIntoView({ block: "start" });
    formRef.current
      ?.querySelector<HTMLInputElement>('input[name="name"]')
      ?.focus({ preventScroll: true });
  }, []);
  const [skillSearch, setSkillSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [error, setError] = useState("");
  const set = <K extends keyof Equipment>(key: K, value: Equipment[K]) =>
    setDraft((old) => ({ ...old, [key]: value }));
  const toggle = (key: "skillTags" | "specialTags", id: string) =>
    setDraft((old) => ({
      ...old,
      [key]: old[key].includes(id)
        ? old[key].filter((s) => s !== id)
        : [...old[key], id],
    }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = equipmentSchema.safeParse(draft);
    if (!parsed.success) {
      setError(
        "Check the item settings. Wear cannot exceed its available boxes.",
      );
      return;
    }
    setError("");
    await save(parsed.data, new FormData(event.currentTarget).has("pay"));
  }
  return (
    <form
      ref={formRef}
      className="quick-gear-form equipment-editor"
      onSubmit={submit}
    >
      <fieldset disabled={busy}>
        <div className="equipment-editor-heading">
          <EquipmentArt id={draft.visualId} />
          <div>
            <h4>{t(existing ? "Edit equipment" : "Prepare equipment")}</h4>
            <p>
              {t(
                "Choose the item’s properties, then save. Tags describe optional effects and costs to apply at the table.",
              )}
            </p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            {t("Equipment type")}
            <select
              aria-label={t("Equipment type")}
              name="kind"
              value={draft.kind === "weapon" ? "weapon" : "item"}
              onChange={(e) => {
                const kind = e.target.value as Equipment["kind"];
                setDraft((old) => ({
                  ...old,
                  kind,
                  ...(kind === "weapon" && old.harmType === "none"
                    ? { harmType: "injury", harm: 1 }
                    : {}),
                }));
              }}
            >
              <option value="weapon">{t("Weapon")}</option>
              <option value="item">{t("Item")}</option>
            </select>
          </label>
          <label>
            {t("Item name")}
            <input
              name="name"
              required
              maxLength={100}
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </label>
        </div>
        <details className="visual-picker">
          <summary>{t("Choose a visual")}</summary>
          {!existing ? (
            <EquipmentLibrary
              busy={busy}
              choose={(id) => setDraft(newEquipment(id))}
            />
          ) : (
            <>
              <p>
                {t("Changing the illustration keeps your item’s settings.")}
              </p>
              <div className="equipment-visual-grid">
                <button
                  type="button"
                  aria-pressed={!draft.visualId}
                  onClick={() => set("visualId", "")}
                >
                  {t("No illustration")}
                </button>
                {equipmentCatalogue.map((entry) => (
                  <button
                    type="button"
                    key={entry.id}
                    aria-label={t("Use visual: {item}", {
                      item: t(entry.name),
                    })}
                    aria-pressed={draft.visualId === entry.id}
                    onClick={() => set("visualId", entry.id)}
                  >
                    <EquipmentArt id={entry.id} />
                    <span>{t(entry.name)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </details>
        <fieldset className="equipment-range">
          <legend>
            <RuleHelp name="Range" />
          </legend>
          <div className="range-options">
            {rangeChoices.map((range) => (
              <label className="inline-check" key={range}>
                <input
                  type="checkbox"
                  checked={splitRanges(draft.range).some(
                    (r) => r.toLowerCase() === range.toLowerCase(),
                  )}
                  onChange={() => set("range", toggleRange(draft.range, range))}
                />
                {t(range)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="equipment-harm-grid">
          <label>
            {t("Harm type")}
            <select
              aria-label={t("Harm type")}
              name="harmType"
              value={draft.harmType}
              onChange={(e) =>
                set("harmType", e.target.value as Equipment["harmType"])
              }
            >
              {harmTypes.map((type) => (
                <option value={type} key={type}>
                  {t(harmLabels[type])}
                </option>
              ))}
            </select>
          </label>
          <SheetCounter
            label={t("Weapon harm")}
            help={<RuleHelp name="Weapon harm" />}
            value={draft.harm}
            max={4}
            busy={busy}
            change={(harm) => set("harm", harm)}
          />
        </div>
        <label>
          {t("Harm conditions & effects")}
          <textarea
            maxLength={500}
            value={draft.harmDetails}
            onChange={(e) => set("harmDetails", e.target.value)}
            placeholder={t(
              "Record conditional harm here; special-tag effects are shown below.",
            )}
          />
        </label>
        <div className="chosen-tags" aria-label={t("Selected tags")}>
          {draft.skillTags.map((name) => (
            <span key={name}>
              <RuleHelp name={name} />
              <button
                type="button"
                aria-label={t("Remove tag: {tag}", { tag: t(name) })}
                onClick={() => toggle("skillTags", name)}
              >
                ×
              </button>
            </span>
          ))}
          {draft.specialTags.map((id) => (
            <span key={id}>
              <SpecialTagHelp id={id} />
              <button
                type="button"
                aria-label={t("Remove tag: {tag}", {
                  tag: t(specialTags.find((tag) => tag.id === id)?.name ?? id),
                })}
                onClick={() => toggle("specialTags", id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {!existing && draft.kind === "weapon" && (
          <WeaponSkillLibrary learned={learned} />
        )}
        <details className="tag-picker">
          <summary>
            {t("Weapon skill tags")} <span>{draft.skillTags.length}</span>
          </summary>
          <p>
            {t(
              "A weapon tag supports a skill; it does not teach it to your character.",
            )}
          </p>
          <label>
            {t("Search weapon skills")}
            <input
              type="search"
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
            />
          </label>
          <div className="tag-options">
            {weaponSkillCatalogue
              .filter((skill) =>
                `${skill.name} ${t(skill.name)} ${t(skill.description)}`
                  .toLowerCase()
                  .includes(skillSearch.toLowerCase()),
              )
              .map((skill) => (
                <div key={skill.name}>
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={draft.skillTags.includes(skill.name)}
                      onChange={() => toggle("skillTags", skill.name)}
                    />
                    {t(skill.name)}{" "}
                    {learned.includes(skill.name) && (
                      <small>{t("Learned")}</small>
                    )}
                  </label>
                  <RuleHelp
                    name={skill.name}
                    ariaLabel={t("About {name}", { name: t(skill.name) })}
                  >
                    {t("Ability & rules")}
                  </RuleHelp>
                </div>
              ))}
          </div>
        </details>
        <details className="tag-picker">
          <summary>
            {t("Special tags")} <span>{draft.specialTags.length}</span>
          </summary>
          <label>
            {t("Search special tags")}
            <input
              type="search"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
            />
          </label>
          <div className="tag-options">
            {specialTags
              .filter((tag) =>
                `${tag.name} ${t(tag.name)} ${t(tag.description)}`
                  .toLowerCase()
                  .includes(tagSearch.toLowerCase()),
              )
              .map((tag) => (
                <div key={tag.id}>
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={draft.specialTags.includes(tag.id)}
                      onChange={() => toggle("specialTags", tag.id)}
                    />
                    <span
                      className={tag.value < 0 ? "tag-flaw" : "tag-benefit"}
                    >
                      {tag.value < 0 ? "−" : "+".repeat(tag.value)}
                    </span>
                    {t(tag.name)}
                  </label>
                  <p>{t(tag.description)}</p>
                </div>
              ))}
          </div>
        </details>
        {draft.specialTags.length > 0 && (
          <div className="selected-tag-effects">
            {specialTags
              .filter((tag) => draft.specialTags.includes(tag.id))
              .map((tag) => (
                <p key={tag.id}>
                  <strong>
                    <SpecialTagHelp id={tag.id} />:{" "}
                  </strong>
                  {t(tag.description)}
                </p>
              ))}
          </div>
        )}
        <label>
          {t("Tag settings")}
          <textarea
            maxLength={500}
            value={draft.tagSettings}
            onChange={(e) => set("tagSettings", e.target.value)}
            placeholder={t(
              "For example: the faction attached to Ceremonial, or a poison’s cure.",
            )}
          />
        </label>
        <div className="rule-field">
          <RuleHelp name="Details & tags" />
          <textarea
            aria-label={t("Details & tags")}
            name="details"
            maxLength={500}
            value={draft.details}
            onChange={(e) => set("details", e.target.value)}
          />
        </div>
        <div className="gear-form-numbers">
          {(
            [
              ["load", "Load", 10],
              ["value", "Value", 100],
              ["maxWear", "Wear boxes", 8],
            ] as const
          ).map(([key, label, max]) => (
            <div className="rule-field" key={key}>
              <RuleHelp name={label} />
              <input
                aria-label={t(label)}
                name={key}
                type="number"
                required
                min={0}
                max={max}
                value={draft[key]}
                onChange={(e) => set(key, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
        <label>
          {t("Second item wear boxes")}
          <input
            name="secondaryMaxWear"
            type="number"
            required
            min={0}
            max={8}
            value={draft.secondaryMaxWear}
            onChange={(e) => set("secondaryMaxWear", Number(e.target.value))}
          />
        </label>
        <small>
          {t(
            "Use a second wear track for paired items such as daggers; leave 0 for a single item.",
          )}
        </small>
        {!existing && (
          <label className="inline-check">
            <input type="checkbox" name="pay" defaultChecked={starting} />
            {t("Pay from coin")}
          </label>
        )}
        {error && (
          <p className="error" role="alert">
            {t(error)}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="btn" onClick={cancel}>
            {t("Cancel")}
          </button>
          <button className="btn primary">
            {t(existing ? "Save equipment" : "Add equipment")}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
