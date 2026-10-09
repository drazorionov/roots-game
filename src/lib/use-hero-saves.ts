"use client";
import { useEffect, useState } from "react";
import { api } from "./client-api";
import { HeroSaveQueue } from "./hero-save-queue";
import type { Hero } from "./sheet";

export function useHeroSaves(onSaved: (hero: Hero) => void) {
  const [queues] = useState(() => new Map<string, HeroSaveQueue>());
  const [pending, setPending] = useState<HeroSaveQueue[]>([]);
  useEffect(() => {
    if (!pending.length) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending.length]);

  function queueFor(hero: Hero) {
    let queue = queues.get(hero.id);
    if (!queue) {
      queue = new HeroSaveQueue(
        hero,
        async (next) => {
          const data = await api("heroes", "POST", {
            id: next.id,
            campaignId: next.campaign_id,
            version: next.version,
            sheet: next.sheet,
          });
          return data.hero;
        },
        onSaved,
      );
      queues.set(hero.id, queue);
      queue.subscribe(() =>
        setPending([...queues.values()].filter((q) => q.getSnapshot().pending)),
      );
    }
    return queue;
  }

  return { queueFor, pending };
}
