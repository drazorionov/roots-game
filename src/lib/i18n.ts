"use client";
import { useSyncExternalStore } from "react";
import ru from "./locales/ru.json";
import de from "./locales/de.json";
export type Locale = "en" | "ru" | "de";
const dictionaries: Record<Locale, Record<string, string>> = {
  en: {
    "player.one": "player",
    "player.other": "players",
    injury: "Injury",
    exhaustion: "Exhaustion",
    depletion: "Depletion",
  },
  ru,
  de,
};
const key = "root-helper-language";
let memoryLocale: Locale = "en";
export function getLocale(): Locale {
  try {
    const saved = localStorage.getItem(key);
    return saved === "ru" || saved === "de" || saved === "en"
      ? saved
      : memoryLocale;
  } catch {
    return memoryLocale;
  }
}
export function setLocale(locale: Locale) {
  memoryLocale = locale;
  try {
    localStorage.setItem(key, locale);
  } catch {
    /* Keep the choice for this session if storage is unavailable. */
  }
  window.dispatchEvent(new Event("root-language-change"));
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("root-language-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("root-language-change", callback);
  };
}
export function translate(
  locale: Locale,
  message: string,
  values: Record<string, string | number> = {},
) {
  return (dictionaries[locale][message] ?? message).replace(
    /\{(\w+)\}/g,
    (match, name) => String(values[name] ?? match),
  );
}
export function useTranslation() {
  const locale = useSyncExternalStore(
    subscribe,
    getLocale,
    () => "en" as Locale,
  );
  const t = (message: string, values?: Record<string, string | number>) =>
    translate(locale, message, values);
  const players = (count: number) =>
    `${count} ${t(`player.${new Intl.PluralRules(locale).select(count)}`)}`;
  return { locale, t, players, setLocale };
}
