"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { BookOpen, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { rules } from "@/lib/rules";

export default function RuleHelp({
  name,
  summary,
  page,
  children,
  className = "",
}: {
  name: string;
  summary?: string;
  page?: number;
  children?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const text = summary ?? rules[name]?.summary;
  const sourcePage = page ?? rules[name]?.page;
  if (!text) return <span className={className}>{children ?? t(name)}</span>;
  return (
    <>
      <button
        type="button"
        className={`rule-name ${className}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {children ?? t(name)}
      </button>
      {open && (
        <RuleDialog
          name={name}
          summary={text}
          page={sourcePage}
          close={() => setOpen(false)}
        />
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
  page?: number;
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
      <h2 id={title}>{t(name)}</h2>
      <p>{t(summary)}</p>
      {page && (
        <small className="rule-source">
          {t("Player handouts · p. {page}", { page })}
        </small>
      )}
    </dialog>
  );
}
