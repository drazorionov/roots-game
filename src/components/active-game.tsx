"use client";
import { useEffect, useState, type ReactNode } from "react";
import { MapPin, Users, UserRound, ArrowRight, RefreshCw } from "lucide-react";
import { api } from "@/lib/client-api";
import { useTranslation } from "@/lib/i18n";
import {
  type Hero,
  type Campaign,
  stats,
  harmTracks,
  harmCapacity,
} from "@/lib/sheet";
import { effectiveStats } from "@/lib/playbooks";
import { Portrait } from "./art";
import AttributeIcon from "./attribute-icon";

export default function ActiveGame({
  campaign,
  hero,
  children,
  enabled = true,
}: {
  enabled?: boolean;
  campaign?: Campaign;
  hero: Hero;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const [view, setView] = useState("character");
  if (!enabled) return children;
  return (
    <div className="active-game">
      <nav className="game-views" aria-label={t("Game views")}>
        <button
          aria-current={view === "campaign" ? "page" : undefined}
          onClick={() => setView("campaign")}
        >
          <Users size={18} />
          {t("Campaign overview")}
        </button>
        <button
          aria-current={view === "character" ? "page" : undefined}
          onClick={() => setView("character")}
        >
          <UserRound size={18} />
          {t("My character")}
        </button>
      </nav>
      {view === "campaign" && (
        <CampaignOverview
          key={campaign?.id || "quick"}
          campaign={campaign}
          hero={hero}
          openCharacter={() => setView("character")}
        />
      )}
      <div hidden={view !== "character"}>{children}</div>
    </div>
  );
}

function CampaignOverview({
  campaign,
  hero,
  openCharacter,
}: {
  campaign?: Campaign;
  hero: Hero;
  openCharacter: () => void;
}) {
  const { t } = useTranslation();
  const [party, setParty] = useState<Hero[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const campaignId = campaign?.id;
  useEffect(() => {
    if (!campaignId) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const data = await api(
          `heroes?campaign=${encodeURIComponent(campaignId!)}`,
        );
        if (!disposed) {
          setParty(data.heroes);
          setLoaded(true);
          setError("");
        }
      } catch (e) {
        if (!disposed) setError((e as Error).message);
      } finally {
        if (!disposed) timer = setTimeout(refresh, 15000);
      }
    }
    void refresh();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [campaignId, attempt]);
  // The active sheet may have saved more recently than the roster poll.
  const members = [hero, ...party.filter((member) => member.id !== hero.id)];
  return (
    <section
      className="campaign-overview collection-page characters-collection"
      aria-labelledby="party-title"
    >
      <header className="party-heading">
        <div>
          <h2 id="party-title">{t("Your travelling party")}</h2>
        </div>
        {campaign?.clearing && (
          <span className="clearing-badge">
            <MapPin size={17} />
            {campaign.clearing}
          </span>
        )}
      </header>
      {campaign?.description && (
        <p className="campaign-description">{campaign.description}</p>
      )}
      {!campaign && (
        <p className="party-notice">
          {t(
            "Quick game is a solo sheet. Join a campaign to see your party here.",
          )}
        </p>
      )}
      {campaign && !loaded && !error && (
        <p role="status" className="party-notice">
          {t("Loading party…")}
        </p>
      )}
      {error && (
        <div className="error" role="alert">
          {t(error)}{" "}
          <button
            className="text-link"
            onClick={() => setAttempt((n) => n + 1)}
          >
            <RefreshCw size={14} />
            {t("Retry")}
          </button>
        </div>
      )}
      <div className="character-list">
        {members.map((member) => {
          const sheet = member.sheet;
          const attributes = effectiveStats(sheet);
          const own = member.id === hero.id;
          return (
            <div className="character-row" key={member.id}>
              <article
                className={`character-tile party-card ${own ? "own-character" : ""}`}
              >
                <span className="tile-portrait">
                  <Portrait species={sheet.species} playbook={sheet.playbook} />
                </span>
                <div className="tile-copy">
                  <h3>{sheet.name}</h3>
                  <span>
                    {t(sheet.species)} · {t(sheet.playbook)}
                  </span>
                  <small className={own ? "party-owner" : undefined}>
                    {own ? t("You") : member.player}
                  </small>
                </div>
                <div className="character-attributes">
                  {stats.map((stat) => (
                    <span key={stat}>
                      <AttributeIcon stat={stat} />
                      <span>{t(stat)}</span>
                      <strong>
                        {attributes[stat] > 0 ? "+" : ""}
                        {attributes[stat]}
                      </strong>
                    </span>
                  ))}
                </div>
                <div className="party-conditions">
                  {harmTracks.map((track) => (
                    <div key={track} className={track}>
                      <span>
                        {t(track)}
                        <b>
                          {sheet[track]} / {harmCapacity(sheet, track)}
                        </b>
                      </span>
                      <progress
                        aria-label={t(track)}
                        value={sheet[track]}
                        max={harmCapacity(sheet, track)}
                      />
                    </div>
                  ))}
                </div>
                {own && (
                  <button
                    className="text-link character-open party-open"
                    onClick={openCharacter}
                  >
                    {t("Open character sheet")}
                    <ArrowRight size={16} />
                  </button>
                )}
              </article>
            </div>
          );
        })}
      </div>
      {campaign && loaded && !error && members.length === 1 && (
        <p className="party-notice">
          {t("Your companions have not added characters to this campaign yet.")}
        </p>
      )}
    </section>
  );
}
