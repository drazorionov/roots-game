"use client";
import {
  ChevronRight,
  Compass,
  Copy,
  LockKeyhole,
  MapPin,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { type Campaign, type Hero, stats } from "@/lib/sheet";
import { effectiveStats } from "@/lib/playbooks";
import { useTranslation } from "@/lib/i18n";
import { Portrait } from "./art";
import AttributeIcon from "./attribute-icon";

export function CampaignCollection({
  campaigns,
  userId,
  choosing = false,
  busy,
  create,
  join,
  select,
  copy,
  remove,
}: {
  campaigns: Campaign[];
  userId?: string;
  choosing?: boolean;
  busy: boolean;
  create: () => void;
  join: () => void;
  select: (campaign: Campaign) => void;
  copy: (campaign: Campaign) => void;
  remove: (campaign: Campaign) => void;
}) {
  const { t, players } = useTranslation();
  return (
    <section className="journey-picker collection-page campaigns-collection">
      {choosing && (
        <div className="journey-progress">
          <strong>{t("1 · Choose your campaign")}</strong>
          <ChevronRight size={16} />
          <span>{t("2 · Choose your character")}</span>
        </div>
      )}
      <div className="page-heading">
        <div>
          <h1>{t("My campaigns")}</h1>
          <p>
            {t(
              choosing
                ? "Choose a campaign for this game, or bring a new party together."
                : "Join your friends or start your own campaign.",
            )}
          </p>
        </div>
        <div className="campaign-actions">
          <button className="btn primary" disabled={busy} onClick={join}>
            <Users size={18} />
            {t("Join a campaign")}
          </button>
          <button className="btn" disabled={busy} onClick={create}>
            <Plus size={18} />
            {t("Create campaign")}
          </button>
        </div>
      </div>
      <div className="campaign-list">
        {campaigns.map((c) => (
          <article className="campaign-card" key={c.id}>
            <div className="campaign-card-top">
              <span className="campaign-emblem" aria-hidden="true">
                <Compass size={28} />
              </span>
              <span className="campaign-role">
                {t(c.owner_id === userId ? "Your campaign" : "Joined campaign")}
              </span>
            </div>
            <h2>{c.name}</h2>
            <div className="campaign-facts">
              <span>
                <Users size={15} />
                {players(c.members)}
              </span>
              {c.clearing && (
                <span>
                  <MapPin size={15} />
                  {c.clearing}
                </span>
              )}
            </div>
            {c.description && (
              <p className="campaign-description">{c.description}</p>
            )}
            <div className="campaign-card-actions">
              <button
                className={`btn ${choosing ? "primary campaign-choice" : ""}`}
                disabled={busy}
                onClick={() => select(c)}
              >
                {t(choosing ? "Choose campaign" : "My characters")}
                <ChevronRight size={16} />
              </button>
              {!choosing && (
                <>
                  <button
                    className="icon-btn"
                    aria-label={t("Copy invite code")}
                    onClick={() => copy(c)}
                  >
                    <Copy size={19} />
                  </button>
                  {c.owner_id === userId && (
                    <button
                      className="icon-btn delete-control"
                      aria-label={t("Delete {name}", { name: c.name })}
                      onClick={() => remove(c)}
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      {!campaigns.length && (
        <p className="empty-note">{t("No campaigns yet")}</p>
      )}
    </section>
  );
}

export function CharacterCollection({
  heroes,
  campaigns,
  choosing = false,
  campaign,
  filter,
  busy,
  create,
  select,
  remove,
  changeCampaign,
  clearFilter,
}: {
  heroes: Hero[];
  campaigns: Campaign[];
  choosing?: boolean;
  campaign?: Campaign;
  filter?: Campaign;
  busy: boolean;
  create: () => void;
  select: (hero: Hero) => void;
  remove: (hero: Hero) => void;
  changeCampaign: () => void;
  clearFilter: () => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="journey-picker collection-page characters-collection">
      {choosing && (
        <div className="journey-progress campaign-selection">
          <button className="text-link" onClick={changeCampaign}>
            {t("Change campaign")}
          </button>
          <ChevronRight size={16} />
          <strong>{t("2 · Choose your character")}</strong>
          <span>{campaign?.name}</span>
        </div>
      )}
      <div className="page-heading">
        <div>
          <h1>{t("My characters")}</h1>
          <p>
            {t(
              choosing
                ? "Choose an existing hero or create one for this campaign. Saved stats are kept."
                : "Create a character. Save it. Play.",
            )}
          </p>
        </div>
        <button className="btn primary" disabled={busy} onClick={create}>
          <Plus size={18} />
          {t("Create a character")}
        </button>
      </div>
      {choosing && (
        <p className="assignment-note">
          <LockKeyhole size={17} />
          {t(
            "Joining a campaign locks character setup. Finish your choices before joining; play tracking stays available.",
          )}
        </p>
      )}
      {filter && !choosing && (
        <div className="filter-bar">
          <span>{filter.name}</span>
          <button className="text-link" onClick={clearFilter}>
            {t("All characters")}
          </button>
        </div>
      )}
      <div className="character-list">
        {heroes.map((h) => (
          <div className="character-row" key={h.id}>
            <button
              className="character-tile"
              disabled={busy}
              onClick={() => select(h)}
            >
              <span className="tile-portrait">
                <Portrait
                  species={h.sheet.species}
                  playbook={h.sheet.playbook}
                />
              </span>
              <span className="tile-copy">
                <strong>{h.sheet.name}</strong>
                <span>
                  {t(h.sheet.species)} · {t(h.sheet.playbook)}
                </span>
                <small>
                  {choosing && h.campaign_id && h.campaign_id !== campaign?.id
                    ? t("Move from {campaign}", {
                        campaign:
                          campaigns.find((c) => c.id === h.campaign_id)?.name ||
                          t("Campaign"),
                      })
                    : campaigns.find((c) => c.id === h.campaign_id)?.name ||
                      t("No campaign yet")}
                </small>
                {h.campaign_id && (
                  <span className="setup-lock-tag">
                    <LockKeyhole size={12} />
                    {t("Setup locked")}
                  </span>
                )}
              </span>
              <span className="character-attributes">
                {stats.map((stat) => {
                  const value = effectiveStats(h.sheet)[stat];
                  return (
                    <span key={stat}>
                      <AttributeIcon stat={stat} />
                      <span>{t(stat)}</span>
                      <strong>
                        {value > 0 ? "+" : ""}
                        {value}
                      </strong>
                    </span>
                  );
                })}
              </span>
              <span className="character-open">
                {t(
                  choosing ? "Play as this character" : "Open character sheet",
                )}
                <ChevronRight size={17} />
              </span>
              <ChevronRight className="tile-arrow" size={20} />
            </button>
            {!choosing && (
              <button
                className="icon-btn delete-control"
                aria-label={t("Delete {name}", { name: h.sheet.name })}
                onClick={() => remove(h)}
              >
                <Trash2 size={17} />
              </button>
            )}
          </div>
        ))}
      </div>
      {!heroes.length && (
        <p className="empty-note">{t("Your first character starts here.")}</p>
      )}
    </section>
  );
}
