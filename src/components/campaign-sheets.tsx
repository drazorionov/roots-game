"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/client-api";
import { useTranslation } from "@/lib/i18n";
import { useHeroSaves } from "@/lib/use-hero-saves";
import type { Campaign, Hero, Sheet } from "@/lib/sheet";
import CharacterControls from "./character-controls";
import CharacterEditor from "./character-editor";

export default function CampaignSheets({
  campaign,
  initialHeroId = "",
  canManage,
  returnFocus,
  close,
  onSaved,
}: {
  campaign: Campaign;
  initialHeroId?: string;
  canManage: boolean;
  returnFocus: HTMLElement | null;
  close: () => void;
  onSaved: (hero: Hero) => void;
}) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [selected, setSelected] = useState(initialHeroId);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Hero | null>(null);
  const [step, setStep] = useState(0);
  const [dirty, setDirty] = useState(false);
  function updated(hero: Hero) {
    setHeroes((current) => current.map((h) => (h.id === hero.id ? hero : h)));
    onSaved(hero);
  }
  const { queueFor, pending } = useHeroSaves(updated);
  const hero = heroes.find((h) => h.id === selected);
  useEffect(() => {
    const previous = returnFocus;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      requestAnimationFrame(() => previous?.focus());
    };
  }, [returnFocus]);
  useEffect(() => {
    const controller = new AbortController();
    api(
      `heroes?campaign=${encodeURIComponent(campaign.id)}`,
      "GET",
      undefined,
      controller.signal,
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        setHeroes(data.heroes);
        setSelected((current) =>
          data.heroes.some((h: Hero) => h.id === current)
            ? current
            : data.heroes[0]?.id || "",
        );
        setLoading(false);
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [campaign.id, attempt]);
  function canLeave() {
    if (busy) return false;
    if (pending.length) {
      setError("Save or reload your unsaved character changes first.");
      return false;
    }
    return !dirty || window.confirm(t("Close this form without saving?"));
  }
  async function save(sheet: Sheet) {
    if (!canManage || !editing || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await api("heroes", "POST", {
        id: editing.id,
        campaignId: campaign.id,
        version: editing.version,
        sheet,
      });
      updated(data.hero);
      queueFor(data.hero).receive(data.hero);
      setDirty(false);
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="modal campaign-sheets-dialog"
      aria-label={t("Player sheets")}
      onCancel={(event) => {
        event.preventDefault();
        if (canLeave()) close();
      }}
    >
      <div className="modal-title">
        <div>
          <h2>{t("Player sheets")}</h2>
          <p>{campaign.name}</p>
        </div>
        <button
          className="icon-btn"
          aria-label={t("Close dialog")}
          disabled={busy}
          onClick={() => {
            if (canLeave()) close();
          }}
        >
          <X size={22} />
        </button>
      </div>
      <p className="field-hint">
        {t(
          canManage
            ? "As campaign master, you can edit every campaign sheet. Personal base characters stay unchanged."
            : "Read-only. You can view all character sheets in this campaign.",
        )}
      </p>
      {loading ? (
        <p role="status">{t("Loading…")}</p>
      ) : (
        <>
          <div className="campaign-sheet-toolbar">
            <label>
              {t("Character")}
              <select
                aria-label={t("Character")}
                value={selected}
                disabled={busy || !!editing || pending.length > 0}
                onChange={(event) => {
                  setSelected(event.target.value);
                  setError("");
                }}
              >
                {!heroes.length && (
                  <option value="">
                    {t("No characters in this campaign yet.")}
                  </option>
                )}
                {heroes.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.sheet.name} · {h.player}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="btn"
              disabled={busy || pending.length > 0}
              onClick={() => {
                if (!canLeave()) return;
                setEditing(null);
                setDirty(false);
                setError("");
                setLoading(true);
                setAttempt((n) => n + 1);
              }}
            >
              {t("Reload saved sheet")}
            </button>
            {editing && (
              <button
                className="btn"
                disabled={busy}
                onClick={() => {
                  if (canLeave()) {
                    setEditing(null);
                    setDirty(false);
                    setError("");
                  }
                }}
              >
                {t("Back to character")}
              </button>
            )}
          </div>
          {error && (
            <p className="error" role="alert">
              {t(error)}
            </p>
          )}
          {editing ? (
            <CharacterEditor
              key={editing.id}
              initial={editing.sheet}
              initialStep={step}
              editing
              save={save}
              busy={busy}
              error=""
              markDirty={() => setDirty(true)}
            />
          ) : (
            hero && (
              <CharacterControls
                key={hero.id}
                hero={hero}
                management={canManage}
                readOnly={!canManage}
                saveQueue={canManage ? queueFor(hero) : undefined}
                edit={(nextStep = 0) => {
                  if (!canManage || !canLeave()) return;
                  setError("");
                  setStep(nextStep);
                  setEditing(queueFor(hero).getSnapshot().hero);
                }}
              />
            )
          )}
        </>
      )}
    </dialog>
  );
}
