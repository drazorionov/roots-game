"use client";
import { useState, useEffect } from "react";
import { Portrait } from "./art";
import { Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { blankSheet, species, playbooks, stats, type Sheet } from "@/lib/sheet";
export default function CharacterEditor({
  initial,
  save,
  busy,
  error,
  markDirty,
}: {
  initial?: Sheet;
  save: (s: Sheet) => void;
  busy: boolean;
  error: string;
  markDirty: () => void;
}) {
  const { t } = useTranslation();
  const [sheet, setSheet] = useState<Sheet>(() =>
    structuredClone(initial || blankSheet()),
  );
  const dirty =
    JSON.stringify(sheet) !== JSON.stringify(initial || blankSheet());
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function set<K extends keyof Sheet>(key: K, value: Sheet[K]) {
    setSheet((s) => ({ ...s, [key]: value }));
    markDirty();
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(sheet);
      }}
    >
      <fieldset disabled={busy}>
        <div className="editor-identity">
          <div className="editor-portrait">
            <Portrait species={sheet.species} />
          </div>
          <label>
            {t("Name")}
            <input
              aria-label={t("Name")}
              required
              maxLength={80}
              value={sheet.name}
              placeholder={t("Your character’s name")}
              onChange={(e) => set("name", e.target.value)}
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            {t("Species")}
            <select
              aria-label={t("Species")}
              value={sheet.species}
              onChange={(e) => set("species", e.target.value)}
            >
              {species.map((s) => (
                <option value={s} key={s}>
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
              onChange={(e) => set("playbook", e.target.value)}
            >
              {playbooks.map((p) => (
                <option key={p} value={p}>
                  {t(p)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <h3 className="form-section">{t("Attributes")}</h3>
        <p className="field-hint">
          {t("Set starting attributes from your chosen playbook.")}
        </p>
        <div className="attribute-inputs">
          {stats.map((stat) => (
            <label key={stat}>
              {t(stat)}
              <select
                aria-label={t(stat)}
                value={sheet.stats[stat]}
                onChange={(e) =>
                  set("stats", {
                    ...sheet.stats,
                    [stat]: Number(e.target.value),
                  })
                }
              >
                {[-3, -2, -1, 0, 1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n > 0 ? `+${n}` : n}
                  </option>
                ))}
              </select>
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
              onChange={(e) => set("pronouns", e.target.value)}
            />
          </label>
          <label>
            {t("A few words about them")}
            <input
              value={sheet.description}
              maxLength={240}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
          <label>
            {t("Notes")}
            <textarea
              aria-label={t("Notes")}
              rows={3}
              maxLength={6000}
              value={sheet.biography}
              onChange={(e) => set("biography", e.target.value)}
            />
          </label>
        </details>
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
      <button disabled={busy} className="btn primary full">
        {t(busy ? "Saving…" : "Save character")}
        <Check size={18} />
      </button>
    </form>
  );
}
