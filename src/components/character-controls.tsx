"use client";
import { useState, type FormEvent } from "react";
import { Backpack, Check, Edit3, Heart, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/client-api";
import { useTranslation } from "@/lib/i18n";
import { type Hero, type Sheet, stats } from "@/lib/sheet";
import { Portrait } from "./art";
export default function CharacterControls({
  hero,
  edit,
  onSaved,
}: {
  hero: Hero;
  edit: () => void;
  onSaved: (h: Hero) => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [adding, setAdding] = useState(false);
  async function update(patch: Partial<Sheet>) {
    if (busy) return false;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const data = await api("heroes", "POST", {
        id: hero.id,
        campaignId: hero.campaign_id,
        version: hero.version,
        sheet: { ...hero.sheet, ...patch },
      });
      onSaved(data.hero);
      setSaved(true);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function addGear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (
      await update({
        equipment: [
          ...hero.sheet.equipment,
          {
            name: String(data.get("name")),
            details: String(data.get("details")),
            load: Number(data.get("load")),
            wear: 0,
          },
        ],
      })
    ) {
      form.reset();
      setAdding(false);
    }
  }
  return (
    <div className="play-sheet">
      <div className="play-identity">
        <div className="play-portrait">
          <Portrait species={hero.sheet.species} />
        </div>
        <div>
          <div className="eyebrow">{t("YOUR VAGABOND")}</div>
          <h3>{hero.sheet.name}</h3>
          <p>
            {t(hero.sheet.species)} · {t(hero.sheet.playbook)}
          </p>
          <small>{hero.sheet.pronouns}</small>
        </div>
        <button className="btn" disabled={busy} onClick={edit}>
          <Edit3 size={15} />
          {t("Edit character")}
        </button>
      </div>
      <div className="play-stats">
        {stats.map((stat) => (
          <div key={stat}>
            <span>{t(stat)}</span>
            <strong>
              {hero.sheet.stats[stat] > 0 ? "+" : ""}
              {hero.sheet.stats[stat]}
            </strong>
          </div>
        ))}
      </div>
      <div className="play-columns">
        <section className="play-panel">
          <h3>
            <Heart size={20} />
            {t("The cost of adventure")}
          </h3>
          <p className="field-hint">
            {t("Mark or clear a box. Each change saves immediately.")}
          </p>
          {(["injury", "exhaustion", "depletion"] as const).map((track) => (
            <div className={`live-track ${track}`} key={track}>
              <div>
                <strong>{t(track)}</strong>
                <span>{hero.sheet[track]} / 4</span>
              </div>
              <div className="live-track-controls">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    className={`live-pip ${hero.sheet[track] >= n ? "filled" : ""}`}
                    key={n}
                    aria-label={`${t(track)} ${n}`}
                    aria-pressed={hero.sheet[track] >= n}
                    disabled={busy}
                    onClick={() =>
                      update({ [track]: hero.sheet[track] === n ? n - 1 : n })
                    }
                  >
                    {hero.sheet[track] >= n && <Check size={17} />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
        <section className="play-panel">
          <div className="panel-heading">
            <h3>
              <Backpack size={20} />
              {t("Equipment")}
            </h3>
            <span className="pill">
              {t("Total load:")}{" "}
              {hero.sheet.equipment.reduce((sum, item) => sum + item.load, 0)}
            </span>
          </div>
          {!hero.sheet.equipment.length && (
            <p className="field-hint">
              {t("Every traveler starts with a story and a few belongings.")}
            </p>
          )}
          {hero.sheet.equipment.map((item, i) => (
            <div className="live-gear" key={i}>
              <div>
                <strong>{item.name || t("item")}</strong>
                <span>
                  {t("Load")}: {item.load}
                </span>
                <button
                  className="icon-btn"
                  disabled={busy}
                  aria-label={t("Remove {item}", {
                    item: item.name || t("item"),
                  })}
                  onClick={() => {
                    if (window.confirm(t("Remove this piece of equipment?")))
                      void update({
                        equipment: hero.sheet.equipment.filter(
                          (_, j) => j !== i,
                        ),
                      });
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {item.details && <p>{item.details}</p>}
              <div className="gear-wear">
                <span>{t("Wear")}</span>
                {[1, 2, 3, 4].map((n) => (
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
                      update({
                        equipment: hero.sheet.equipment.map((x, j) =>
                          j === i
                            ? { ...x, wear: x.wear === n ? n - 1 : n }
                            : x,
                        ),
                      })
                    }
                  />
                ))}
                <small>{item.wear}/4</small>
              </div>
            </div>
          ))}
          {adding ? (
            <form className="quick-gear-form" onSubmit={addGear}>
              <label>
                {t("Item name")}
                <input name="name" required maxLength={100} />
              </label>
              <label>
                {t("Details & tags")}
                <input name="details" maxLength={500} />
              </label>
              <label>
                {t("Load")}
                <input
                  name="load"
                  type="number"
                  min={0}
                  max={10}
                  defaultValue={1}
                  required
                />
              </label>
              <div className="form-actions">
                <button
                  className="btn"
                  type="button"
                  onClick={() => setAdding(false)}
                  disabled={busy}
                >
                  {t("Cancel")}
                </button>
                <button className="btn primary" disabled={busy}>
                  {t("Add equipment")}
                </button>
              </div>
            </form>
          ) : (
            <button
              className="btn"
              disabled={busy || hero.sheet.equipment.length >= 30}
              onClick={() => setAdding(true)}
            >
              <Plus size={16} />
              {t("Add equipment")}
            </button>
          )}
        </section>
      </div>
      <div className="quick-save-status" role="status">
        {busy ? (
          t("Saving…")
        ) : saved ? (
          <>
            <Check size={15} />
            {t("Character sheet saved.")}
          </>
        ) : (
          t("Changes save automatically.")
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
    </div>
  );
}
