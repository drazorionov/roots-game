"use client";
import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export type Player = { id: string; name: string };
export default function CampaignPresence({
  campaignId,
  onChange,
}: {
  campaignId: string;
  onChange?: (players: Player[] | undefined) => void;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<{
    campaignId: string;
    players?: Player[];
  }>();
  useEffect(() => {
    let disposed = false;
    let pending = false;
    const controller = new AbortController();
    async function heartbeat() {
      if (pending || document.visibilityState !== "visible") return;
      pending = true;
      try {
        const response = await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("presence");
        const data = await response.json();
        if (!disposed) {
          setState({ campaignId, players: data.players });
          onChange?.(data.players);
        }
      } catch {
        if (!disposed) {
          setState({ campaignId });
          onChange?.(undefined);
        }
      } finally {
        pending = false;
      }
    }
    void heartbeat();
    const interval = window.setInterval(() => void heartbeat(), 20000);
    document.addEventListener("visibilitychange", heartbeat);
    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", heartbeat);
    };
  }, [campaignId, onChange]);
  const current = state?.campaignId === campaignId ? state : undefined;
  return (
    <div
      className="campaign-presence"
      data-state={current?.players?.length ? "online" : "offline"}
      title={t("Players viewing this campaign. Updates every 20 seconds.")}
    >
      <p role="status">
        <Users size={17} aria-hidden="true" />
        {current?.players
          ? t("Online: {count}", { count: current.players.length })
          : t("Offline")}
      </p>
      {!!current?.players?.length && (
        <p className="online-names">
          {current.players.map((p) => p.name).join(", ")}
        </p>
      )}
    </div>
  );
}
