"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Dices, ScrollText, X } from "lucide-react";
import { api } from "@/lib/client-api";
import { useTranslation } from "@/lib/i18n";
import {
  describeChanges,
  describeRoll,
  sheetChanges,
  type ActivityRoll,
  type GameActivity,
} from "@/lib/game-activity";
import type { Hero, Sheet } from "@/lib/sheet";

const ActivityContext = createContext<{
  recordRoll: (roll: ActivityRoll) => void;
  recordChange: (before: Sheet, after: Sheet) => void;
}>({ recordRoll: () => {}, recordChange: () => {} });
export const useGameActivity = () => useContext(ActivityContext);
type Notification = GameActivity & { failed?: boolean; sending?: boolean };

export default function GameActivityFeed({
  hero,
  children,
}: {
  hero: Hero;
  children: ReactNode;
}) {
  const { t, locale } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connectionError, setConnectionError] = useState(false);
  const stack = useRef<HTMLOListElement>(null);
  const newestId = notifications[0]?.id;
  useEffect(() => {
    // A new roll must remain visible even after browsing older notifications.
    if (stack.current) stack.current.scrollTop = 0;
  }, [newestId]);
  const seen = useRef(new Set<string>());
  const mounted = useRef(true);
  const campaignId = hero.campaign_id;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!campaignId) return;
    let disposed = false;
    let pending = false;
    let cursor: string | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function refresh() {
      if (disposed || pending || document.visibilityState !== "visible") return;
      clearTimeout(timer);
      pending = true;
      let delay = 3000;
      try {
        const data = await api(
          `activity?campaign=${encodeURIComponent(campaignId!)}${cursor === undefined ? "" : `&after=${cursor}`}`,
          "GET",
          undefined,
          controller.signal,
        );
        if (disposed) return;
        if (!Array.isArray(data.events) || typeof data.cursor !== "string")
          throw new Error("Invalid activity response");
        cursor = data.cursor;
        const fresh = (data.events as GameActivity[]).filter((event) => {
          if (seen.current.has(event.id)) return false;
          seen.current.add(event.id);
          return true;
        });
        if (fresh.length)
          setNotifications((current) => [...fresh.reverse(), ...current]);
        setConnectionError(false);
        if (data.events.length === 100) delay = 0;
      } catch {
        if (!disposed) setConnectionError(true);
      } finally {
        pending = false;
        if (!disposed) timer = setTimeout(refresh, delay);
      }
    }
    void refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => {
      disposed = true;
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [campaignId]);

  function add(event: GameActivity) {
    seen.current.add(event.id);
    setNotifications((current) => [event, ...current]);
  }
  async function share(event: GameActivity) {
    setNotifications((current) =>
      current.map((item) =>
        item.id === event.id ? { ...item, failed: false, sending: true } : item,
      ),
    );
    try {
      await api("activity", "POST", {
        id: event.id,
        campaignId,
        heroId: hero.id,
        roll: event.roll,
      });
      if (mounted.current)
        setNotifications((current) =>
          current.map((item) =>
            item.id === event.id
              ? { ...item, sending: false, failed: false }
              : item,
          ),
        );
    } catch {
      if (mounted.current)
        setNotifications((current) =>
          current.map((item) =>
            item.id === event.id
              ? { ...item, sending: false, failed: true }
              : item,
          ),
        );
    }
  }
  const identity = () => ({
    id: crypto.randomUUID(),
    player: hero.player,
    character: hero.sheet.name,
    created_at: new Date().toISOString(),
  });
  return (
    <ActivityContext.Provider
      value={{
        recordRoll(roll) {
          const event: GameActivity = { ...identity(), kind: "roll", roll };
          add(event);
          if (campaignId) void share(event);
        },
        recordChange(before, after) {
          // Campaign changes come from the database only after a successful save.
          if (campaignId) return;
          const changes = sheetChanges(before, after);
          if (changes.length) add({ ...identity(), kind: "change", changes });
        },
      }}
    >
      {children}
      <aside className="game-activity" aria-label={t("Game activity")}>
        {connectionError && (
          <p className="activity-connection" role="status">
            {t("Activity unavailable. Retrying…")}
          </p>
        )}
        {notifications.length > 0 && (
          <div className="activity-toolbar">
            <span>
              <ScrollText size={14} aria-hidden="true" />
              {t("Game activity")} <b>{notifications.length}</b>
            </span>
            <button type="button" onClick={() => setNotifications([])}>
              {t("Hide all")} <X size={13} aria-hidden="true" />
            </button>
          </div>
        )}
        <ol
          ref={stack}
          className="activity-stack"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label={t("Recent activity")}
        >
          {notifications.map((event) => (
            <li
              className={`activity-popup activity-${event.kind}`}
              key={event.id}
            >
              <span className="activity-symbol" aria-hidden="true">
                {event.kind === "roll" ? (
                  <Dices size={19} />
                ) : (
                  <ScrollText size={18} />
                )}
              </span>
              <div className="activity-copy">
                <div className="activity-meta">
                  <strong>{event.character}</strong>
                  <time dateTime={event.created_at}>
                    {new Date(event.created_at).toLocaleTimeString(locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <span className="activity-player">
                  {event.player || t("You")} ·{" "}
                  {t(
                    event.kind === "roll" ? "Rolled dice" : "Updated character",
                  )}
                </span>
                <p>
                  {event.roll
                    ? describeRoll(event.roll, t)
                    : describeChanges(event.changes ?? [], t).join(" · ")}
                </p>
                {event.sending && <small>{t("Sharing roll…")}</small>}
                {event.failed && (
                  <div className="activity-share-error">
                    <small>
                      {t("Roll not shared. Retry to notify the party.")}
                    </small>
                    <button
                      className="text-link"
                      onClick={() => void share(event)}
                    >
                      {t("Retry")}
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="activity-dismiss"
                aria-label={t("Hide notification from {name}", {
                  name: event.character,
                })}
                onClick={() =>
                  setNotifications((current) =>
                    current.filter((item) => item.id !== event.id),
                  )
                }
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      </aside>
    </ActivityContext.Provider>
  );
}
