"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { stats } from "@/lib/sheet";
import { DiceIcon, DieFace } from "./game-icons";

export type AttributeRoll = {
  returnFocus: HTMLElement | null;
  stat: (typeof stats)[number];
  dice: number[];
  attribute: number;
  forward: number;
  ongoing: number;
  modifier: number;
  total: number;
};

export default function DiceDialog({
  roll,
  close,
}: {
  roll: AttributeRoll;
  close: () => void;
}) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const [rolling, setRolling] = useState(true);
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const previous = roll.returnFocus;
    const element = dialog.current;
    element?.showModal();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const interval = reduced
      ? undefined
      : setInterval(() => setFrame((n) => n + 1), 90);
    const timer = setTimeout(
      () => {
        clearInterval(interval);
        setRolling(false);
      },
      reduced ? 0 : 900,
    );
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
      element?.close();
      previous?.focus();
    };
  }, [roll]);
  const signed = (value: number) =>
    `${value >= 0 ? "+" : "−"}${Math.abs(value)}`;
  return (
    <dialog
      ref={dialog}
      className="modal dice-dialog"
      aria-labelledby="dice-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="modal-title">
        <span className="eyebrow">{t("Roll an attribute")}</span>
        <button
          className="icon-btn"
          onClick={close}
          aria-label={t("Close dialog")}
        >
          <X size={22} />
        </button>
      </div>
      <h2 id="dice-title">
        {t(roll.stat)} <span>{signed(roll.attribute)}</span>
      </h2>
      <p className="dice-invitation">{t("Let the Woodland decide.")}</p>
      <div className={`dice-tray ${rolling ? "is-rolling" : "is-settled"}`}>
        <span className="dice-orbit" aria-hidden="true" />
        {roll.dice.map((value, i) => (
          <div className={`rolling-die die-${i}`} key={i}>
            <DieFace value={rolling ? ((frame + i * 3) % 6) + 1 : value} />
          </div>
        ))}
      </div>
      <div
        className={`dice-outcome ${roll.total >= 10 ? "strong-hit" : roll.total >= 7 ? "mixed-hit" : "miss"}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {rolling ? (
          <p className="rolling-label">{t("Rolling…")}</p>
        ) : (
          <>
            <span className="eyebrow">{t("Total")}</span>
            <strong className="dice-total">{roll.total}</strong>

            <span
              className={`outcome-badge ${roll.total >= 10 ? "strong-hit" : roll.total >= 7 ? "mixed-hit" : "miss"}`}
            >
              {t(
                roll.total >= 10
                  ? "10+: strong hit"
                  : roll.total >= 7
                    ? "7–9: mixed hit"
                    : "6−: miss",
              )}
            </span>
            <p className="dice-equation">
              {roll.dice.join(" + ")} {signed(roll.modifier)} = {roll.total}
            </p>
          </>
        )}
      </div>
      <div className="dice-modifiers">
        <span>
          {t(roll.stat)} <b>{signed(roll.attribute)}</b>
        </span>
        <span>
          {t("Forward")} <b>{signed(roll.forward)}</b>
        </span>
        <span>
          {t("Ongoing")} <b>{signed(roll.ongoing)}</b>
        </span>
      </div>
      {roll.forward !== 0 && (
        <p className="field-hint">
          {t("Forward used for this roll and cleared.")}
        </p>
      )}
      <button className="btn primary full" onClick={close}>
        <DiceIcon />
        {t("Back to character")}
      </button>
    </dialog>
  );
}
