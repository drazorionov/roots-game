"use client";
import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type Player = { id: string; name: string };
export default function CampaignPresence({
  campaignId,
}: {
  campaignId: string;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<{
    campaignId: string;
    players?: Player[];
    failed?: boolean;
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
        if (!disposed) setState({ campaignId, players: data.players });
      } catch {
        if (!disposed) setState({ campaignId, failed: true });
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
  }, [campaignId]);
  const current = state?.campaignId === campaignId ? state : undefined;
  return (
    <div
      className="campaign-presence"
      title={t("Players viewing this campaign. Updates every 20 seconds.")}
    >
      <p role="status">
        <Users size={14} />
        {current?.failed
          ? t("Online status unavailable.")
          : current?.players
            ? t("Online: {count}", { count: current.players.length })
            : t("Checking players…")}
      </p>
      {!!current?.players?.length && (
        <p className="online-names">
          {current.players.map((p) => p.name).join(", ")}
        </p>
      )}
    </div>
  );
}
