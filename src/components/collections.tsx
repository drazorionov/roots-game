"use client";
import {
  BookOpen,
  ArrowRightLeft,
  MoreHorizontal,
  ChevronRight,
  Compass,
  Copy,
  LockKeyhole,
  LogOut,
  MapPin,
  Plus,
  Trash2,
  Users,
  UserRound,
} from "lucide-react";
import { type Campaign, type Hero, stats } from "@/lib/sheet";
import { effectiveStats } from "@/lib/playbooks";
import { useTranslation } from "@/lib/i18n";
import { Portrait } from "./art";
import AttributeIcon from "./attribute-icon";

function EmptyCollectionCard({
  kind,
  label,
  hint,
  busy,
  create,
}: {
  kind: "character" | "campaign";
  label: string;
  hint: string;
  busy: boolean;
  create: () => void;
}) {
  const Icon = kind === "character" ? UserRound : Compass;
  return (
    <button
      type="button"
      className={`empty-collection-card empty-${kind}-card`}
      disabled={busy}
      onClick={create}
      aria-label={label}
    >
      <span className="empty-collection-icon" aria-hidden="true">
        <Icon size={48} strokeWidth={1.4} />
        <span>
          <Plus size={20} />
        </span>
      </span>
      <strong>{label}</strong>
      <span className="empty-collection-hint">{hint}</span>
    </button>
  );
}

export function CampaignCollection({
  campaigns,
  userId,
  currentCampaignId,
  choosing = false,
  busy,
  create,
  join,
  select,
  copy,
  remove,
  leave,
  managePlayers,
  playerSheets,
  transfer,
}: {
  campaigns: Campaign[];
  userId?: string;
  currentCampaignId?: string;
  choosing?: boolean;
  busy: boolean;
  create: () => void;
  join: () => void;
  select: (campaign: Campaign) => void;
  copy: (campaign: Campaign) => void;
  remove: (campaign: Campaign) => void;
  leave: (campaign: Campaign) => void;
  managePlayers: (campaign: Campaign) => void;
  playerSheets: (campaign: Campaign) => void;
  transfer: (campaign: Campaign) => void;
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
        {campaigns.length > 0 && (
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
        )}
      </div>
      <div className="campaign-list">
        {!campaigns.length && (
          <div className="empty-collection-slot">
            <EmptyCollectionCard
              kind="campaign"
              label={t("Create campaign")}
              hint={t("No campaigns yet")}
              busy={busy}
              create={create}
            />
            <button
              type="button"
              className="text-link empty-collection-join"
              disabled={busy}
              onClick={join}
            >
              <Users size={16} />
              {t("Join a campaign")}
            </button>
          </div>
        )}
        {campaigns.map((c) => (
          <article className="campaign-card" key={c.id}>
            <div className="campaign-card-top">
              <span className="campaign-emblem" aria-hidden="true">
                <Compass size={28} />
              </span>
              <span className="campaign-role">
                {t(c.owner_id === userId ? "Your campaign" : "Joined campaign")}
              </span>
              <details
                className="game-menu campaign-options"
                onKeyDown={(e) => {
                  if (e.key === "Escape") e.currentTarget.open = false;
                }}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget))
                    e.currentTarget.open = false;
                }}
              >
                <summary
                  aria-label={t("Campaign options for {name}", {
                    name: c.name,
                  })}
                >
                  <MoreHorizontal size={22} aria-hidden="true" />
                </summary>
                <div className="game-menu-items">
                  <button disabled={busy} onClick={() => playerSheets(c)}>
                    <BookOpen size={17} aria-hidden="true" />
                    {t("Player sheets")}
                  </button>
                  {c.owner_id === userId && (
                    <button disabled={busy} onClick={() => transfer(c)}>
                      <ArrowRightLeft size={17} aria-hidden="true" />
                      {t("Transfer campaign")}
                    </button>
                  )}
                </div>
              </details>
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
            <div className="campaign-invite">
              <span className="campaign-invite-label">
                {t("Campaign invite code")}
              </span>
              <div className="campaign-invite-code">
                <code>{c.invite_code}</code>
                <button
                  className="icon-btn"
                  type="button"
                  aria-label={t("Copy invite code")}
                  title={t("Copy invite code")}
                  onClick={() => copy(c)}
                >
                  <Copy size={19} />
                </button>
              </div>
            </div>
            <div className="campaign-card-actions">
              <button
                className={`btn ${choosing ? "primary campaign-choice" : ""}`}
                disabled={busy}
                onClick={() => select(c)}
              >
                {t(
                  c.id === currentCampaignId || c.started_at
                    ? "Continue"
                    : c.owner_id === userId
                      ? "Start"
                      : "Join",
                )}
                <ChevronRight size={16} />
              </button>
              {c.owner_id === userId && (
                <button
                  className="icon-btn"
                  type="button"
                  disabled={busy}
                  aria-label={t("Manage players")}
                  title={t("Manage players")}
                  onClick={() => managePlayers(c)}
                >
                  <Users size={19} />
                </button>
              )}
              {c.owner_id !== userId && (
                <button
                  className="icon-btn"
                  type="button"
                  disabled={busy}
                  aria-label={t("Leave game")}
                  title={t("Leave game")}
                  onClick={() => leave(c)}
                >
                  <LogOut size={19} />
                </button>
              )}
              {!choosing && c.owner_id === userId && (
                <button
                  className="icon-btn delete-control"
                  aria-label={t("Delete {name}", { name: c.name })}
                  onClick={() => remove(c)}
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
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
        {heroes.length > 0 && (
          <button className="btn primary" disabled={busy} onClick={create}>
            <Plus size={18} />
            {t("Create a character")}
          </button>
        )}
      </div>
      {choosing && (
        <p className="assignment-note">
          <LockKeyhole size={17} />
          {t(
            "Joining creates a separate campaign copy with locked setup. Your base character stays editable in My characters. Changes to either copy stay separate.",
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
        {!heroes.length && (
          <EmptyCollectionCard
            kind="character"
            label={t("Create a character")}
            hint={t("Your first character starts here.")}
            busy={busy}
            create={create}
          />
        )}
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
                  {campaigns.find((c) => c.id === h.campaign_id)?.name ||
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
                  choosing || h.campaign_id
                    ? "Play as this character"
                    : "Edit character",
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
    </section>
  );
}
