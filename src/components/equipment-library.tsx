"use client";
import { useState } from "react";
import Image from "next/image";
import { BookOpen, Swords } from "lucide-react";
import {
  equipmentCatalogue,
  equipmentVisual,
  harmLabels,
  specialTags,
  weaponSkillCatalogue,
} from "@/lib/equipment";
import { useTranslation } from "@/lib/i18n";
import RuleHelp from "./rule-help";

export function EquipmentArt({
  id,
  className = "",
}: {
  id: string;
  className?: string;
}) {
  const art = equipmentVisual(id);
  return art ? (
    <Image
      className={`equipment-art ${className}`}
      src={`/art/equipment/${art.id}.webp`}
      alt=""
      unoptimized
      width={329}
      height={450}
    />
  ) : null;
}
export function SpecialTagHelp({ id }: { id: string }) {
  const tag = specialTags.find((tag) => tag.id === id);
  return tag ? (
    <RuleHelp
      name={tag.name}
      summary={tag.description}
      source="Equipment deck"
      page={tag.page}
    />
  ) : (
    <span>{id}</span>
  );
}
export function EquipmentLibrary({
  choose,
  busy,
}: {
  choose: (id: string) => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const entries = equipmentCatalogue.filter(
    (entry) =>
      (kind === "all" || kind === entry.kind) &&
      [
        entry.name,
        t(entry.name),
        ...entry.skillTags.map((name) => t(name)),
        ...entry.specialTags.map((id) =>
          t(specialTags.find((tag) => tag.id === id)!.name),
        ),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="equipment-catalogue" aria-label={t("Equipment catalogue")}>
      <p>
        {t(
          "Choosing a card fills its default settings. Customize them below before adding the item.",
        )}
      </p>
      <div className="library-filters">
        <label>
          {t("Search equipment")}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          {t("Filter equipment type")}
          <select
            aria-label={t("Filter equipment type")}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="all">{t("All")}</option>
            <option value="weapon">{t("Weapon")}</option>
            <option value="item">{t("Item")}</option>
          </select>
        </label>
      </div>
      <div className="equipment-catalogue-grid">
        {entries.map((entry) => (
          <button
            type="button"
            className="equipment-choice"
            key={entry.id}
            disabled={busy}
            onClick={() => choose(entry.id)}
            aria-label={t("Choose {item}", { item: t(entry.name) })}
          >
            <EquipmentArt id={entry.id} />
            <strong>{t(entry.name)}</strong>
            <small>
              {t(entry.kind === "weapon" ? "Weapon" : "Item")} · {t("Value")}:{" "}
              {entry.value}
            </small>
            <small>
              {entry.range
                .split(", ")
                .map((r) => t(r))
                .join(" · ") || "—"}{" "}
              ·{" "}
              {entry.harmType === "none"
                ? "—"
                : `${entry.harm || ""} ${t(harmLabels[entry.harmType as keyof typeof harmLabels])}`}
            </small>
          </button>
        ))}
      </div>
      {!entries.length && <p role="status">{t("No matching equipment.")}</p>}
      <small className="library-source">
        {t(
          "Equipment deck · 35 cards. Load is not specified in the deck; set it with your GM.",
        )}
      </small>
    </div>
  );
}
export function WeaponSkillLibrary({ learned }: { learned: string[] }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [onlyLearned, setOnlyLearned] = useState(false);
  const entries = weaponSkillCatalogue.filter(
    (skill) =>
      (!onlyLearned || learned.includes(skill.name)) &&
      `${skill.name} ${t(skill.name)} ${t(skill.description)}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <details className="equipment-library weapon-skill-library">
      <summary>
        <BookOpen size={18} /> {t("Special weapon skills catalogue")}{" "}
        <span>{weaponSkillCatalogue.length}</span>
      </summary>
      <p>
        {t(
          "Special weapon moves normally require both the learned skill and a weapon with its matching tag and range. Follow each move’s exceptions. All vagabonds can engage, grapple, or target with a suitable weapon; unarmed harm defaults to 1 exhaustion, armed harm to 1 injury.",
        )}
      </p>
      <div className="library-filters">
        <label>
          {t("Search weapon skills")}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="inline-check">
          <input
            type="checkbox"
            checked={onlyLearned}
            onChange={(e) => setOnlyLearned(e.target.checked)}
          />
          {t("Learned skills only")}
        </label>
      </div>
      <div className="skill-reference-grid">
        {entries.map((skill) => (
          <article key={skill.name}>
            <h4>
              <Swords size={16} />
              <RuleHelp name={skill.name} />
              {learned.includes(skill.name) && <small>{t("Learned")}</small>}
            </h4>
            <p>{t(skill.description)}</p>
            <small>
              {skill.deckPage
                ? t("{source} · p. {page}", {
                    source: t("Equipment deck"),
                    page: skill.deckPage,
                  })
                : t("Player handouts · p. {page}", { page: skill.page })}
            </small>
          </article>
        ))}
      </div>
      {!entries.length && <p role="status">{t("No matching skills.")}</p>}
    </details>
  );
}
