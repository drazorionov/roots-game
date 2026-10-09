"use client";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client-api";
import { useTranslation } from "@/lib/i18n";

export default function PasswordRecovery({
  initialStep,
  back,
}: {
  initialStep: "request" | "code" | "password";
  back: () => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(initialStep);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setError("");
    if (step === "password" && form.get("password") !== form.get("confirm")) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (step === "request") {
        await api("recovery", "POST", { action: "request", email });
        setMessage(
          "If this account is eligible, a temporary code will arrive by email. Check your spam folder too.",
        );
        setStep("code");
      } else if (step === "code") {
        await api("recovery", "POST", {
          action: "verify",
          email,
          code: form.get("code"),
        });
        setMessage("");
        setStep("password");
      } else {
        await api("recovery", "POST", {
          action: "complete",
          password: form.get("password"),
        });
        setDone(true);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <>
        <p role="status">
          {t(
            "Password updated. Sign in with your new password. All previous sessions have ended.",
          )}
        </p>
        <button className="btn primary full" onClick={back}>
          {t("Sign in")}
        </button>
      </>
    );
  return (
    <form onSubmit={submit}>
      <p className="field-hint">
        {t(
          step === "password"
            ? "Choose a new password to finish recovery. Your temporary code cannot access your account."
            : "We will email a single-use temporary code. It expires in 15 minutes.",
        )}
      </p>
      {message && (
        <p className="field-hint" role="status">
          {t(message)}
        </p>
      )}
      <fieldset disabled={busy}>
        {step !== "password" && (
          <label>
            {t("Email")}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
              autoComplete="email"
            />
          </label>
        )}
        {step === "code" && (
          <label>
            {t("Temporary code")}
            <input
              name="code"
              autoComplete="one-time-code"
              required
              maxLength={128}
              autoCapitalize="characters"
              spellCheck={false}
            />
          </label>
        )}
        {step === "password" && (
          <>
            <label>
              {t("New password")}
              <input
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
            <label>
              {t("Confirm new password")}
              <input
                name="confirm"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
          </>
        )}
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
      <button className="btn primary full" disabled={busy}>
        {t(
          busy
            ? "Saving…"
            : step === "request"
              ? "Send temporary code"
              : step === "code"
                ? "Verify code"
                : "Save new password",
        )}
      </button>
      {step !== "request" && (
        <button
          className="text-link auth-switch"
          type="button"
          disabled={busy}
          onClick={() => {
            setStep("request");
            setMessage("");
            setError("");
          }}
        >
          {t("Request a new code")}
        </button>
      )}
      <button
        className="text-link auth-switch"
        type="button"
        disabled={busy}
        onClick={back}
      >
        {t("Back to sign in")}
      </button>
    </form>
  );
}
