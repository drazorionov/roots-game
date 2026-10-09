"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  allMoves,
  playbookData,
  natureHints,
  driveHints,
  feats,
  weaponSkills,
} from "@/lib/playbooks";
import { BookOpen, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { rules } from "@/lib/rules";

export default function RuleHelp({
  name,
  summary,
  page,
  children,
  className = "",
  ariaLabel,
}: {
  name: string;
  summary?: string;
  page?: number | string;
  children?: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const move = allMoves.find((move) => move.name === name);
  const moveBook =
    move &&
    Object.values(playbookData).find((book) => book.moves.includes(move));
  const ruleText =
    rules[name] &&
    [
      rules[name].summary,
      feats.includes(name)
        ? rules["Roguish feats"].summary
        : weaponSkills.includes(name)
          ? rules["Weapon skills"].summary
          : undefined,
    ]
      .filter((message): message is string => !!message)
      .map((message) => t(message))
      .join("\n\n");
  const text =
    summary ??
    ruleText ??
    playbookData[name]?.summary ??
    move?.summary ??
    natureHints[name] ??
    driveHints[name];
  const sourcePage =
    page ??
    rules[name]?.page ??
    playbookData[name]?.page ??
    (moveBook
      ? moveBook.page + 2
      : natureHints[name]
        ? "105–107"
        : driveHints[name]
          ? 108
          : undefined);
  if (!text) return <span className={className}>{children ?? t(name)}</span>;
  return (
    <>
      <button
        type="button"
        className={`rule-name ${className}`}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {children ?? t(name)}
      </button>
      {open &&
        createPortal(
          <RuleDialog
            name={name}
            summary={text}
            page={sourcePage}
            close={() => setOpen(false)}
          />,
          document.body,
        )}
    </>
  );
}

function RuleDialog({
  name,
  summary,
  page,
  close,
}: {
  name: string;
  summary: string;
  page?: number | string;
  close: () => void;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal rule-dialog"
      aria-labelledby={title}
      aria-describedby={`${title}-description`}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="modal-title">
        <BookOpen size={22} aria-hidden="true" />
        <button
          type="button"
          className="icon-btn"
          onClick={close}
          aria-label={t("Close dialog")}
        >
          <X size={22} />
        </button>
      </div>
      <h2 className="rule-title" id={title}>
        {t(name)}
      </h2>
      <p className="rule-description" id={`${title}-description`}>
        {t(summary)}
      </p>
      {page && (
        <small className="rule-source">
          {t("Player handouts · p. {page}", { page })}
        </small>
      )}
    </dialog>
  );
}
