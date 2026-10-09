"use client";
import { useState, type FormEvent } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  Swords,
  Shield,
  Package,
  Dices,
} from "lucide-react";
import { type Sheet } from "@/lib/sheet";
import { effectiveStats, playbookData } from "@/lib/playbooks";
import { useTranslation } from "@/lib/i18n";
import RuleHelp from "./rule-help";
import { CoinIcon } from "./game-icons";
import SheetCounter from "./sheet-counter";
export type UpdateSheet = (patch: Partial<Sheet>) => Promise<boolean>;
export default function GearPanel({
  sheet,
  busy,
  update,
  starting = false,
  roll,
}: {
  starting?: boolean;
  roll?: (stat: "Might" | "Finesse") => void;
  sheet: Sheet;
  busy: boolean;
  update: UpdateSheet;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<number | null>(null),
    [error, setError] = useState("");
  const [kind, setKind] = useState("gear");
  const [itemSnapshot, setItemSnapshot] = useState("");
  const load = sheet.equipment.reduce((n, x) => n + x.load, 0),
    burdened = 4 + effectiveStats(sheet).Might;
  const item =
    editing !== null && editing >= 0 ? sheet.equipment[editing] : undefined;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      editing !== null &&
      editing >= 0 &&
      JSON.stringify(item) !== itemSnapshot
    ) {
      setError("This item changed. Reopen it before saving your edits.");
      return;
    }
    const data = new FormData(e.currentTarget);
    const value = Number(data.get("value"));
    const pay = !!data.get("pay");
    if (pay && value > sheet.coin) {
      setError("Not enough coin.");
      return;
    }
    const maxWear = Number(data.get("maxWear"));
    const next = {
      kind: data.get("kind") as "gear" | "weapon" | "armor",
      range: String(data.get("range") || ""),
      harm: Number(data.get("harm") ?? 1),
      name: String(data.get("name")),
      details: String(data.get("details")),
      load: Number(data.get("load")),
      value,
      maxWear,
      wear: Math.min(item?.wear || 0, maxWear),
    };
    if (item && item.wear > maxWear) {
      setError("Repair the item before reducing its wear boxes.");
      return;
    }
    if (
      await update({
        equipment: item
          ? sheet.equipment.map((x, i) => (i === editing ? next : x))
          : [...sheet.equipment, next],
        coin: sheet.coin - (pay ? value : 0),
      })
    ) {
      setEditing(null);
      setError("");
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
            <div>
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
              <button
                className="icon-btn"
                aria-label={t("Edit {item}", { item: item.name })}
                disabled={busy}
                onClick={() => {
                  setKind(item.kind);
                  setItemSnapshot(JSON.stringify(item));
                  setEditing(i);
                  setError("");
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
            <div className="gear-facts">
              <span>
                <RuleHelp name="Load" />: {item.load}
              </span>
              <span>
                <RuleHelp name="Value" />: {item.value}
              </span>
            </div>
            {item.kind === "weapon" && (
              <div className="weapon-facts">
                <span>
                  <RuleHelp name="Weapon harm" />: {item.harm}
                </span>
                {item.range && (
                  <span>
                    <RuleHelp name="Range" />: {t(item.range)}
                  </span>
                )}
              </div>
            )}
            {item.details && <p>{item.details}</p>}
            {item.kind === "weapon" && roll && (
              <div className="weapon-rolls">
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() => roll("Might")}
                >
                  <Dices size={15} />
                  {t("Melee · Might")}
                </button>
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() => roll("Finesse")}
                >
                  <Dices size={15} />
                  {t("Ranged · Finesse")}
                </button>
              </div>
            )}
            <div className="gear-wear">
              <span>
                <RuleHelp name="Wear" />
              </span>
              {Array.from({ length: item.maxWear }, (_, j) => j + 1).map(
                (n) => (
                  <button
                    key={n}
                    className={`pip ${item.wear >= n ? "filled" : ""}`}
                    aria-label={t("{item}: wear {value}", {
                      item: item.name,
                      value: n,
                    })}
                    aria-pressed={item.wear >= n}
                    disabled={busy}
                    onClick={() =>
                      void update({
                        equipment: sheet.equipment.map((x, j) =>
                          j === i
                            ? { ...x, wear: x.wear === n ? n - 1 : n }
                            : x,
                        ),
                      })
                    }
                  />
                ),
              )}
              <small>
                {item.wear}/{item.maxWear}
              </small>
            </div>
          </article>
        ))}
        {editing === null && (
          <button
            className="btn equipment-add-tile"
            disabled={busy || sheet.equipment.length >= 30}
            onClick={() => {
              setKind("gear");
              setEditing(-1);
              setError("");
            }}
          >
            <Plus size={24} />
            {t("Add equipment")}
          </button>
        )}
      </div>
      {editing !== null && (
        <form className="quick-gear-form" key={editing} onSubmit={save}>
          <fieldset disabled={busy}>
            <label>
              {t("Equipment type")}
              <select
                name="kind"
                aria-label={t("Equipment type")}
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option value="gear">{t("Gear")}</option>
                <option value="weapon">{t("Weapon")}</option>
                <option value="armor">{t("Armor")}</option>
              </select>
            </label>
            {kind === "weapon" && (
              <div className="form-grid">
                <div className="rule-field">
                  <RuleHelp name="Range" />
                  <input
                    aria-label={t("Range")}
                    name="range"
                    maxLength={80}
                    defaultValue={item?.range || ""}
                    placeholder={t("Close, far, or another range")}
                  />
                </div>
                <div className="rule-field">
                  <RuleHelp name="Weapon harm" />
                  <input
                    aria-label={t("Weapon harm")}
                    name="harm"
                    type="number"
                    min={0}
                    max={4}
                    defaultValue={item?.harm ?? 1}
                  />
                </div>
              </div>
            )}
            <label>
              {t("Item name")}
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={item?.name || ""}
              />
            </label>
            <div className="rule-field">
              <RuleHelp name="Details & tags" />
              <input
                aria-label={t("Details & tags")}
                name="details"
                maxLength={500}
                defaultValue={item?.details || ""}
              />
            </div>
            <div className="gear-form-numbers">
              <div className="rule-field">
                <RuleHelp name="Load" />
                <input
                  aria-label={t("Load")}
                  name="load"
                  type="number"
                  min={0}
                  max={10}
                  defaultValue={item?.load ?? 1}
                  required
                />
              </div>
              <div className="rule-field">
                <RuleHelp name="Value" />
                <input
                  aria-label={t("Value")}
                  name="value"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={item?.value ?? 0}
                  required
                />
              </div>
              <div className="rule-field">
                <RuleHelp name="Wear boxes" />
                <input
                  aria-label={t("Wear boxes")}
                  name="maxWear"
                  type="number"
                  min={0}
                  max={8}
                  defaultValue={item?.maxWear ?? 4}
                  required
                />
              </div>
            </div>
            {!item && (
              <label className="inline-check">
                <input type="checkbox" name="pay" defaultChecked={starting} />
                {t("Pay from coin")}
              </label>
            )}
            <div className="form-actions">
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setEditing(null);
                  setError("");
                }}
              >
                {t("Cancel")}
              </button>
              <button className="btn primary">
                {t(item ? "Save equipment" : "Add equipment")}
              </button>
            </div>
          </fieldset>
          {error && (
            <p className="error" role="alert">
              {t(error)}
            </p>
          )}
        </form>
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
