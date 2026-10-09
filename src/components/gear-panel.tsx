"use client";
import { useState } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  Swords,
  Shield,
  Package,
  Dices,
} from "lucide-react";
import { type Sheet, type Equipment } from "@/lib/sheet";
import {
  effectiveStats,
  effectiveWeapons,
  playbookData,
} from "@/lib/playbooks";
import { useTranslation } from "@/lib/i18n";
import RuleHelp from "./rule-help";
import { CoinIcon, HarmBox } from "./game-icons";
import SheetCounter from "./sheet-counter";
import EquipmentEditor from "./equipment-editor";
import { EquipmentArt, SpecialTagHelp } from "./equipment-library";
import { newEquipment, harmLabels, splitRanges } from "@/lib/equipment";
import WeaponSkillRoll from "./weapon-skill-roll";
import type { RollWeaponSkill } from "@/lib/weapon-rolls";
export type UpdateSheet = (patch: Partial<Sheet>) => Promise<boolean>;
export default function GearPanel({
  sheet,
  busy: parentBusy,
  update,
  starting = false,
  roll,
  rollSkill,
}: {
  starting?: boolean;
  roll?: (stat: "Might" | "Finesse", source?: string) => void;
  rollSkill?: RollWeaponSkill;
  sheet: Sheet;
  busy: boolean;
  update: UpdateSheet;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<number | null>(null),
    [error, setError] = useState("");
  const [initial, setInitial] = useState<Equipment>(() => newEquipment());
  const [saving, setSaving] = useState(false);
  const busy = parentBusy || saving;
  const learnedSkills = effectiveWeapons(sheet);
  const [itemSnapshot, setItemSnapshot] = useState("");
  const load = sheet.equipment.reduce((n, x) => n + x.load, 0),
    burdened = 4 + effectiveStats(sheet).Might;
  const item =
    editing !== null && editing >= 0 ? sheet.equipment[editing] : undefined;
  function begin(index: number) {
    const current = index >= 0 ? sheet.equipment[index] : undefined;
    setInitial(current ? structuredClone(current) : newEquipment());
    setItemSnapshot(current ? JSON.stringify(current) : "");
    setEditing(index);
    setError("");
  }
  async function save(next: Equipment, pay: boolean) {
    if (busy) return;
    if (
      editing !== null &&
      editing >= 0 &&
      JSON.stringify(item) !== itemSnapshot
    ) {
      setError("This item changed. Reopen it before saving your edits.");
      return;
    }
    if (pay && next.value > sheet.coin) {
      setError("Not enough coin.");
      return;
    }
    setSaving(true);
    try {
      if (
        await update({
          equipment: item
            ? sheet.equipment.map((x, i) => (i === editing ? next : x))
            : [...sheet.equipment, next],
          coin: sheet.coin - (pay ? next.value : 0),
        })
      ) {
        setEditing(null);
        setError("");
      }
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="play-panel gear-panel">
      <h3 className="gear-section-title">{t("Equipment")}</h3>
      <div className="equipment-overview">
        <p>
          {t(
            "Carry valuable gear here. Track its load, value, and wear; weapon tags and range determine which moves it supports.",
          )}
        </p>
        <div className="load-strip">
          <span>
            <RuleHelp name="Load" />: <strong>{load}</strong>
          </span>
          <span>{t("Unburdened up to {value}", { value: burdened })}</span>
          <span>{t("Maximum {value}", { value: burdened * 2 })}</span>
          {load > burdened && (
            <strong>
              {t(load > burdened * 2 ? "Over maximum load." : "Burdened")}
            </strong>
          )}
        </div>
      </div>
      <div className="equipment-grid">
        <article className="coin-tile">
          <CoinIcon />
          <SheetCounter
            label={t("Coin")}
            help={<RuleHelp name="Coin" />}
            value={sheet.coin}
            max={9999}
            busy={busy}
            change={(coin) => {
              void update({ coin });
            }}
          />
          <p>{t("Unspent Value, ready for the road.")}</p>
          {!sheet.equipment.length && (
            <small>
              {t("Starting equipment value: {value}", {
                value: playbookData[sheet.playbook]?.value || 0,
              })}
            </small>
          )}
        </article>
        {sheet.equipment.map((item, i) => (
          <article className={`live-gear gear-${item.kind}`} key={i}>
            <div className="gear-card-heading">
              <span className="gear-kind-icon" aria-hidden="true">
                {item.kind === "weapon" ? (
                  <Swords size={20} />
                ) : item.kind === "armor" ? (
                  <Shield size={20} />
                ) : (
                  <Package size={20} />
                )}
              </span>
              <strong>
                <RuleHelp
                  name={item.name || t("item")}
                  summary={item.details || rulesSummary(item.kind)}
                />
              </strong>
              <div className="gear-card-actions">
                <button
                  className="icon-btn"
                  aria-label={t("Edit {item}", { item: item.name })}
                  disabled={busy}
                  onClick={() => {
                    begin(i);
                  }}
                >
                  <Edit3 size={16} />
                </button>
                <button
                  className="icon-btn"
                  aria-label={t("Remove {item}", {
                    item: item.name || t("item"),
                  })}
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(t("Remove this piece of equipment?")))
                      void update({
                        equipment: sheet.equipment.filter((_, j) => j !== i),
                      }).then((ok) => {
                        if (ok) setEditing(null);
                      });
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="gear-card-body">
              <EquipmentArt
                id={item.visualId}
                className="owned-equipment-art"
              />
              <div className="gear-card-properties">
                <small className="equipment-kind">
                  {t(item.kind === "weapon" ? "Weapon" : "Item")}
                </small>
                <div className="gear-facts">
                  <span>
                    <RuleHelp name="Load" />: {item.load}
                  </span>
                  <span>
                    <RuleHelp name="Value" />: {item.value}
                  </span>
                </div>
                {(item.kind === "weapon" ||
                  (item.kind === "item" && item.harmType !== "none") ||
                  item.range) && (
                  <div className="weapon-facts">
                    <span>
                      <RuleHelp name="Weapon harm" />:{" "}
                      {item.harmType === "special" || item.harmType === "none"
                        ? ""
                        : item.harm}{" "}
                      {t(harmLabels[item.harmType])}
                    </span>
                    {item.range && (
                      <span>
                        <RuleHelp name="Range" />:{" "}
                        {splitRanges(item.range)
                          .map((range) => t(range))
                          .join(", ")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {item.harmDetails && <p>{item.harmDetails}</p>}
            <div className="chosen-tags">
              {!(item.kind === "weapon" && rollSkill) &&
                item.skillTags.map((name) => (
                  <span key={name}>
                    <RuleHelp name={name} />
                  </span>
                ))}
              {item.specialTags.map((id) => (
                <span key={id}>
                  <SpecialTagHelp id={id} />
                </span>
              ))}
            </div>
            {item.tagSettings && <p>{item.tagSettings}</p>}
            {item.details && <p>{item.details}</p>}
            {item.kind === "weapon" && roll && (
              <div className="weapon-rolls">
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() => roll("Might", item.name)}
                >
                  <Dices size={15} />
                  {t("Melee · Might")}
                </button>
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() => roll("Finesse", item.name)}
                >
                  <Dices size={15} />
                  {t("Ranged · Finesse")}
                </button>
              </div>
            )}
            {item.kind === "weapon" && rollSkill && (
              <div className="weapon-special-actions">
                {item.skillTags
                  .filter((name) => learnedSkills.includes(name))
                  .map((name) => (
                    <WeaponSkillRoll
                      key={name}
                      name={name}
                      sheet={sheet}
                      busy={busy}
                      roll={(stat, action, bonus) =>
                        rollSkill(stat, action, bonus, item.name)
                      }
                    />
                  ))}
              </div>
            )}
            {([false, true] as const)
              .filter((secondary) => !secondary || item.secondaryMaxWear > 0)
              .map((secondary) => {
                const capacity = secondary
                  ? item.secondaryMaxWear
                  : item.maxWear;
                const wear = secondary ? item.secondaryWear : item.wear;
                return (
                  <div className="gear-wear" key={String(secondary)}>
                    <div className="gear-wear-heading">
                      <span>
                        {secondary ? (
                          t("Second item wear")
                        ) : (
                          <RuleHelp name="Wear" />
                        )}
                      </span>
                      <small>
                        {wear}/{capacity}
                      </small>
                    </div>
                    <div className="gear-wear-pips">
                      {Array.from({ length: capacity }, (_, j) => j + 1).map(
                        (n) => (
                          <button
                            key={n}
                            className={`pip wear-token ${wear >= n ? "filled" : ""}`}
                            aria-label={t(
                              secondary
                                ? "{item}: second item wear {value}"
                                : "{item}: wear {value}",
                              { item: item.name, value: n },
                            )}
                            aria-pressed={wear >= n}
                            disabled={busy}
                            onClick={() =>
                              void update({
                                equipment: sheet.equipment.map((x, j) =>
                                  j === i
                                    ? {
                                        ...x,
                                        [secondary ? "secondaryWear" : "wear"]:
                                          wear === n ? n - 1 : n,
                                      }
                                    : x,
                                ),
                              })
                            }
                          >
                            <HarmBox variant={n - 1} />
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                );
              })}
          </article>
        ))}
        {editing === null && (
          <button
            className="btn equipment-add-tile"
            disabled={busy || sheet.equipment.length >= 30}
            onClick={() => {
              begin(-1);
            }}
          >
            <Plus size={24} />
            {t("Add equipment")}
          </button>
        )}
      </div>
      {editing !== null && (
        <EquipmentEditor
          key={`${editing}-${itemSnapshot}`}
          initial={initial}
          existing={editing >= 0}
          starting={starting}
          busy={busy}
          learned={effectiveWeapons(sheet)}
          save={save}
          cancel={() => {
            setEditing(null);
            setError("");
          }}
        />
      )}
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
    </section>
  );
}

function rulesSummary(kind: string) {
  return kind === "weapon"
    ? "A weapon’s range and tags determine which attacks it supports. Check the move before rolling."
    : kind === "armor"
      ? "Armor can absorb injury as wear when its tags allow it. Check its tags for limits and special protection."
      : "Valuable equipment has its own load, value, tags, and wear. Record its special features in the item’s details.";
}
