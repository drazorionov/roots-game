"use client";

import { useSyncExternalStore } from "react";

function getGameTime() {
  const hour = new Date().getHours();
  if (hour < 6) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "day";
  return "evening";
}

function subscribe(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  function refresh() {
    clearTimeout(timer);
    onChange();
    // Align updates to the local clock's minute boundary, including 00/06/12/18.
    timer = setTimeout(refresh, 60_000 - (Date.now() % 60_000));
  }
  refresh();
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  return () => {
    clearTimeout(timer);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}

const noSubscribe = () => () => {};
const getServerSnapshot = () => null;

export function useGameTime(enabled: boolean) {
  const time = useSyncExternalStore(
    enabled ? subscribe : noSubscribe,
    getGameTime,
    getServerSnapshot,
  );
  return enabled ? time : undefined;
}
