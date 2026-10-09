"use client";
import { useEffect, useState, type ReactNode } from "react";
import { MapPin, RefreshCw } from "lucide-react";
import { api } from "@/lib/client-api";
import { useTranslation } from "@/lib/i18n";
import {
  type Hero,
  type Campaign,
  harmTracks,
  harmCapacity,
} from "@/lib/sheet";
import { Portrait } from "./art";
import { MasterPortrait } from "./notebook-doodles";
import CampaignPresence, { type Player } from "./campaign-presence";

export default function ActiveGame({
  campaign,
  hero,
  children,
  heading,
  enabled = true,
}: {
  enabled?: boolean;
  campaign?: Campaign;
  hero: Hero;
  children: ReactNode;
  heading?: ReactNode;
}) {
  const [onlinePlayers, setOnlinePlayers] = useState<Player[] | undefined>();
  if (!enabled) return children;
  return (
    <div className="active-game">
      <div className="session-heading">
        {heading}
        {campaign && (
          <CampaignPresence
            key={campaign.id}
            campaignId={campaign.id}
            onChange={setOnlinePlayers}
          />
        )}
      </div>
      <CampaignRoster
        key={campaign?.id || "quick"}
        campaign={campaign}
        hero={hero}
        onlinePlayers={onlinePlayers}
      />
      {children}
    </div>
  );
}

function CampaignRoster({
  campaign,
  hero,
  onlinePlayers,
}: {
  campaign?: Campaign;
  hero: Hero;
  onlinePlayers?: Player[];
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
  // Keep this player's latest saved values ahead of the roster poll.
  const members = [hero, ...party.filter((member) => member.id !== hero.id)];
  const status = (ownerId: string) =>
    onlinePlayers === undefined
      ? t("Status unknown")
      : onlinePlayers.some((player) => player.id === ownerId)
        ? t("Online")
        : t("Offline");
  return (
    <section className="session-party" aria-label={t("Your travelling party")}>
      {campaign?.clearing && (
        <span className="clearing-badge">
          <MapPin size={14} />
          {campaign.clearing}
        </span>
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
      <div className="session-roster">
        <div
          className="session-players"
          tabIndex={0}
          role="group"
          aria-label={t("Party characters")}
        >
          {members.map((member) => {
            const sheet = member.sheet;
            const own = member.id === hero.id;
            const online = onlinePlayers?.some(
              (player) => player.id === member.owner_id,
            );
            return (
              <article
                key={member.id}
                className={`session-tile party-card ${own ? "own-character" : ""}`}
                aria-label={`${sheet.name} · ${own ? t("You") : member.player}`}
              >
                <div className="session-portrait">
                  <Portrait
                    species={sheet.species}
                    playbook={sheet.playbook}
                    sizes="64px"
                  />
                  {campaign && (
                    <span
                      className={`presence-dot ${onlinePlayers === undefined ? "unknown" : online ? "online" : "offline"}`}
                      title={status(member.owner_id)}
                      role="img"
                      aria-label={status(member.owner_id)}
                    />
                  )}
                </div>
                <div className="session-tile-copy">
                  <h3 title={sheet.name}>{sheet.name}</h3>
                  <small title={member.player}>
                    {own ? t("You") : member.player}
                  </small>
                  <div className="party-conditions">
                    {harmTracks.map((track) => (
                      <div
                        className={track}
                        key={track}
                        title={`${t(track)}: ${sheet[track]} / ${harmCapacity(sheet, track)}`}
                      >
                        <progress
                          aria-label={`${sheet.name}: ${t(track)}`}
                          value={sheet[track]}
                          max={harmCapacity(sheet, track)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {campaign && (
          <article className="session-tile master-tile">
            <div className="master-portrait">
              <MasterPortrait />
              <span
                className={`presence-dot ${onlinePlayers === undefined ? "unknown" : onlinePlayers.some((p) => p.id === campaign.owner_id) ? "online" : "offline"}`}
                title={status(campaign.owner_id)}
                role="img"
                aria-label={status(campaign.owner_id)}
              />
            </div>
            <div className="session-tile-copy">
              <small>{t("Campaign master")}</small>
              <h3 title={campaign.master_name}>
                {campaign.master_name || t("Campaign master")}
              </h3>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
