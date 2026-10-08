"use client";
import { useState, type FormEvent } from "react";
import { Plus, Trash2, Edit3 } from "lucide-react";
import { type Sheet } from "@/lib/sheet";
import { effectiveStats, playbookData } from "@/lib/playbooks";
import { useTranslation } from "@/lib/i18n";
import SheetCounter from "./sheet-counter";
export type UpdateSheet = (patch: Partial<Sheet>) => Promise<boolean>;
export default function GearPanel({
  sheet,
  busy,
  update,
}: {
  sheet: Sheet;
  busy: boolean;
  update: UpdateSheet;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<number | null>(null),
    [error, setError] = useState("");
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
      <div className="panel-heading">
        <h3>{t("Equipment")}</h3>
        <span className="pill">
          {t("Total load:")} {load}
        </span>
      </div>
      <div className="load-strip">
        <span>{t("Unburdened up to {value}", { value: burdened })}</span>
        <span>{t("Maximum {value}", { value: burdened * 2 })}</span>
      </div>
      {load > burdened && (
        <p className="field-hint">
          {t(load > burdened * 2 ? "Over maximum load." : "Burdened")}
        </p>
      )}
      <SheetCounter
        label={t("Coin")}
        value={sheet.coin}
        max={9999}
        busy={busy}
        change={(coin) => {
          void update({ coin });
        }}
      />
      {!sheet.equipment.length && (
        <p className="field-hint">
          {t("Starting equipment value: {value}", {
            value: playbookData[sheet.playbook]?.value || 0,
          })}
        </p>
      )}
      {sheet.equipment.map((item, i) => (
        <div className="live-gear" key={i}>
          <div>
            <strong>{item.name || t("item")}</strong>
            <span>
              {t("Load")}: {item.load}
            </span>
            <button
              className="icon-btn"
              aria-label={t("Edit {item}", { item: item.name })}
              disabled={busy}
              onClick={() => {
                setItemSnapshot(JSON.stringify(item));
                setEditing(i);
                setError("");
              }}
            >
              <Edit3 size={16} />
            </button>
            <button
              className="icon-btn"
              aria-label={t("Remove {item}", { item: item.name || t("item") })}
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
          {item.details && <p>{item.details}</p>}
          <div className="gear-wear">
            <span>{t("Wear")}</span>
            {Array.from({ length: item.maxWear }, (_, j) => j + 1).map((n) => (
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
                      j === i ? { ...x, wear: x.wear === n ? n - 1 : n } : x,
                    ),
                  })
                }
              />
            ))}
            <small>
              {item.wear}/{item.maxWear}
            </small>
          </div>
        </div>
      ))}
      {editing !== null ? (
        <form className="quick-gear-form" key={editing} onSubmit={save}>
          <fieldset disabled={busy}>
            <label>
              {t("Item name")}
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={item?.name || ""}
              />
            </label>
            <label>
              {t("Details & tags")}
              <input
                name="details"
                maxLength={500}
                defaultValue={item?.details || ""}
              />
            </label>
            <div className="gear-form-numbers">
              <label>
                {t("Load")}
                <input
                  name="load"
                  type="number"
                  min={0}
                  max={10}
                  defaultValue={item?.load ?? 1}
                  required
                />
              </label>
              <label>
                {t("Value")}
                <input
                  name="value"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={item?.value ?? 0}
                  required
                />
              </label>
              <label>
                {t("Wear boxes")}
                <input
                  name="maxWear"
                  type="number"
                  min={0}
                  max={8}
                  defaultValue={item?.maxWear ?? 4}
                  required
                />
              </label>
            </div>
            {!item && (
              <label className="inline-check">
                <input type="checkbox" name="pay" />
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
      ) : (
        <button
          className="btn"
          disabled={busy || sheet.equipment.length >= 30}
          onClick={() => {
            setEditing(-1);
            setError("");
          }}
        >
          <Plus size={16} />
          {t("Add equipment")}
        </button>
      )}
    </section>
  );
}
