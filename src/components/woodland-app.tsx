"use client";
import Link from "next/link";
import Image from "next/image";
import {
  useEffect,
  useState,
  useRef,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  Sprout,
  Plus,
  Users,
  UserRound,
  X,
  Copy,
  Check,
  LogOut,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslation, translate, type Locale } from "@/lib/i18n";
import { type Hero, type Campaign, type User, type Sheet } from "@/lib/sheet";
import { api } from "@/lib/client-api";
import CharacterEditor from "./character-editor";
import CharacterControls from "./character-controls";
import { Portrait } from "./art";
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useTranslation();
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
      aria-label={title}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="modal-title">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          aria-label={t("Close dialog")}
          onClick={close}
        >
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function WoodlandApp() {
  const { locale, t, players, setLocale } = useTranslation();
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [heroes, setHeroes] = useState<Hero[]>([]),
    [campaigns, setCampaigns] = useState<Campaign[]>([]),
    [tab, setTab] = useState<"characters" | "campaigns">("characters"),
    [selected, setSelected] = useState(""),
    [campaignFilter, setCampaignFilter] = useState("");
  const [modal, setModal] = useState<
      "character" | "auth" | "join" | "campaign" | "assign" | null
    >(null),
    [editing, setEditing] = useState<Hero | null>(null),
    [draft, setDraft] = useState<Sheet | undefined>(),
    [authMode, setAuthMode] = useState<"signup" | "login">("signup"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [editorDirty, setEditorDirty] = useState(false);
  const [afterAuth, setAfterAuth] = useState<"campaign" | "join" | null>(null);
  const hero = heroes.find((h) => h.id === selected);
  const campaign = campaigns.find((c) => c.id === hero?.campaign_id);
  const shown = heroes.filter(
    (h) => !campaignFilter || h.campaign_id === campaignFilter,
  );
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale, "Root Helper · Your characters");
  }, [locale]);
  useEffect(() => {
    api("auth")
      .then(async (data) => {
        setUser(data.user);
        if (data.user) {
          const [h, c] = await Promise.all([api("heroes"), api("campaigns")]);
          setHeroes(h.heroes);
          setCampaigns(c.campaigns);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const data = await api("heroes");
        if (!cancelled)
          setHeroes((current) =>
            data.heroes.map((h: Hero) => {
              const old = current.find((x) => x.id === h.id);
              return old && old.version > h.version ? old : h;
            }),
          );
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  function open(next: typeof modal) {
    setError("");
    setModal(next);
  }
  function updated(h: Hero) {
    setHeroes((current) =>
      current.some((x) => x.id === h.id)
        ? current.map((x) => (x.id === h.id ? h : x))
        : [...current, h],
    );
  }
  function newCharacter() {
    setAfterAuth(null);
    setEditorDirty(false);
    setEditing(null);
    setDraft(undefined);
    open("character");
  }
  function closeModal() {
    if (busy) return;
    if (modal === "auth" && draft) {
      open("character");
      return;
    }
    if (
      modal === "character" &&
      editorDirty &&
      !window.confirm(t("Close this form without saving?"))
    )
      return;
    setModal(null);
    setError("");
  }
  async function persist(
    sheet: Sheet,
    campaignId: string | null = editing?.campaign_id || null,
  ) {
    const data = await api("heroes", "POST", {
      id: editing?.id,
      campaignId,
      version: editing?.version,
      sheet,
    });
    updated(data.hero);
    setSelected(data.hero.id);
    setCampaignFilter("");
    setTab("characters");
    setDraft(undefined);
    setModal(null);
    setNotice("Character sheet saved.");
  }
  async function saveCharacter(sheet: Sheet) {
    setDraft(sheet);
    if (!user) {
      setAuthMode("signup");
      open("auth");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await persist(sheet);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const auth = await api("auth", "POST", {
        action: authMode,
        name: data.get("name") || undefined,
        email: data.get("email"),
        password: data.get("password"),
      });
      setUser(auth.user);
      const [h, c] = await Promise.all([api("heroes"), api("campaigns")]);
      setHeroes(h.heroes);
      setCampaigns(c.campaigns);
      if (draft) {
        try {
          await persist(draft);
        } catch (e) {
          setModal("character");
          setError((e as Error).message);
        }
      } else {
        setModal(afterAuth);
        setAfterAuth(null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const data = await api(
        "campaigns",
        "POST",
        modal === "join"
          ? { action: "join", code: form.get("code") }
          : {
              action: "create",
              name: form.get("name"),
              description: "",
              clearing: form.get("clearing") || "",
            },
      );
      const campaigns = await api("campaigns");
      setCampaigns(campaigns.campaigns);
      setModal(null);
      setTab("campaigns");
      setNotice(
        modal === "join" ? "You joined the party." : "Campaign created.",
      );
      setCampaignFilter(data.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hero) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const data = await api("heroes", "POST", {
        id: hero.id,
        version: hero.version,
        campaignId: form.get("campaign") || null,
        sheet: hero.sheet,
      });
      updated(data.hero);
      setModal(null);
      setNotice("Character sheet saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function needsAccount(next: "campaign" | "join") {
    if (!user) {
      setAfterAuth(next);
      setDraft(undefined);
      setAuthMode("signup");
      open("auth");
      return;
    }
    open(next);
  }
  return (
    <div className="simple-app">
      <header className="app-header">
        <Link className="brand" href="/" aria-label="Root Helper">
          <Sprout size={25} />
          <span>
            root <small>helper</small>
          </span>
        </Link>
        <div className="header-actions">
          <select
            className="language-select"
            value={locale}
            aria-label={t("Language")}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            <option value="en">English</option>
            <option value="ru">Русский</option>
            <option value="de">Deutsch</option>
          </select>
          {user ? (
            <button
              className="icon-btn"
              aria-label={t("Sign out")}
              onClick={async () => {
                try {
                  await api("auth", "DELETE");
                  setUser(null);
                  setHeroes([]);
                  setCampaigns([]);
                  setSelected("");
                  setCampaignFilter("");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <LogOut size={19} />
            </button>
          ) : (
            <button
              className="btn small"
              onClick={() => {
                setAfterAuth(null);
                setDraft(undefined);
                setAuthMode("login");
                open("auth");
              }}
            >
              {t("Sign in")}
            </button>
          )}
        </div>
      </header>
      <nav className="main-tabs" aria-label={t("Navigation")}>
        <button
          aria-current={tab === "characters" ? "page" : undefined}
          onClick={() => {
            setTab("characters");
            setCampaignFilter("");
          }}
        >
          <UserRound size={19} />
          {t("Characters")}
        </button>
        <button
          aria-current={tab === "campaigns" ? "page" : undefined}
          onClick={() => setTab("campaigns")}
        >
          <Users size={19} />
          {t("Campaigns")}
        </button>
      </nav>
      <main className="simple-main">
        {error && !modal && (
          <p className="error" role="alert">
            {t(error)}
          </p>
        )}
        {loading ? (
          <p className="loading" role="status">
            {t("Loading…")}
          </p>
        ) : tab === "characters" ? (
          <>
            {hero ? (
              <>
                <div className="character-toolbar">
                  <button className="text-link" onClick={() => setSelected("")}>
                    <ArrowLeft size={17} />
                    {t("All characters")}
                  </button>
                  <button className="btn small" onClick={() => open("assign")}>
                    {campaign?.name || t("Choose campaign")}
                    <ChevronRight size={15} />
                  </button>
                </div>
                <CharacterControls
                  key={hero.id}
                  hero={hero}
                  edit={() => {
                    setEditorDirty(false);
                    setEditing(hero);
                    setDraft(undefined);
                    open("character");
                  }}
                  onSaved={updated}
                />
              </>
            ) : (
              <>
                <div className="page-heading">
                  <div>
                    <h1>{t("My characters")}</h1>
                    <p>{t("Create a character. Save it. Play.")}</p>
                  </div>
                  <button className="btn primary" onClick={newCharacter}>
                    <Plus size={18} />
                    {t("Create a character")}
                  </button>
                </div>
                {campaignFilter && (
                  <div className="filter-bar">
                    <span>
                      {campaigns.find((c) => c.id === campaignFilter)?.name}
                    </span>
                    <button
                      className="text-link"
                      onClick={() => setCampaignFilter("")}
                    >
                      {t("All characters")}
                    </button>
                  </div>
                )}
                {shown.length ? (
                  <div className="character-list">
                    {shown.map((h) => (
                      <button
                        key={h.id}
                        className="character-tile"
                        onClick={() => setSelected(h.id)}
                      >
                        <span className="tile-portrait">
                          <Portrait species={h.sheet.species} />
                        </span>
                        <span className="tile-copy">
                          <strong>{h.sheet.name}</strong>
                          <span>
                            {t(h.sheet.species)} · {t(h.sheet.playbook)}
                          </span>
                          <small>
                            {campaigns.find((c) => c.id === h.campaign_id)
                              ?.name || t("No campaign yet")}
                          </small>
                        </span>
                        <ChevronRight size={20} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state illustrated-empty">
                    <Image
                      className="woodland-illustration"
                      src="/art/woodland-travelers.webp"
                      alt=""
                      width={960}
                      height={640}
                      sizes="(max-width: 760px) 300px, 420px"
                    />
                    <h2>{t("Your first character starts here.")}</h2>
                    <p>
                      {t(
                        "Pick a name, species, and playbook. You can choose a campaign later.",
                      )}
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <div className="page-heading">
              <div>
                <h1>{t("Campaigns")}</h1>
                <p>{t("Join your friends or start your own campaign.")}</p>
              </div>
            </div>
            <div className="campaign-actions">
              <button
                className="btn primary"
                onClick={() => needsAccount("join")}
              >
                <Users size={18} />
                {t("Join a campaign")}
              </button>
              <button className="btn" onClick={() => needsAccount("campaign")}>
                <Plus size={18} />
                {t("Create campaign")}
              </button>
            </div>
            {campaigns.length ? (
              <div className="campaign-list">
                {campaigns.map((c) => (
                  <article className="campaign-card" key={c.id}>
                    <h2>{c.name}</h2>
                    <p>
                      {players(c.members)}
                      {c.clearing ? ` · ${c.clearing}` : ""}
                    </p>
                    <div className="campaign-card-actions">
                      <button
                        className="btn"
                        onClick={() => {
                          setSelected("");
                          setCampaignFilter(c.id);
                          setTab("characters");
                        }}
                      >
                        {t("My characters")}
                        <ChevronRight size={16} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={t("Copy invite code")}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(c.invite_code);
                            setNotice(
                              "Invite code copied. Share it with your party.",
                            );
                          } catch {
                            setNotice(
                              t("Invite code: {code}", { code: c.invite_code }),
                            );
                          }
                        }}
                      >
                        <Copy size={19} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state illustrated-empty">
                <Image
                  className="woodland-illustration"
                  src="/art/woodland-travelers.webp"
                  alt=""
                  width={960}
                  height={640}
                  sizes="(max-width: 760px) 300px, 420px"
                />
                <h2>{t("No campaigns yet")}</h2>
                <p>
                  {t(
                    "Use an invite code to join, or create a campaign and invite your friends.",
                  )}
                </p>
              </div>
            )}
          </>
        )}
      </main>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {t(notice)}
        </div>
      )}
      {modal === "character" && (
        <Modal
          title={t(editing ? "Edit character" : "Create a character")}
          close={closeModal}
        >
          <CharacterEditor
            initial={draft || editing?.sheet}
            save={saveCharacter}
            busy={busy}
            error={error}
            markDirty={() => setEditorDirty(true)}
          />
        </Modal>
      )}
      {modal === "auth" && (
        <Modal
          title={t(authMode === "signup" ? "Create an account" : "Sign in")}
          close={closeModal}
        >
          <p className="field-hint">
            {t(
              draft
                ? "Sign in to save your character. Your draft is kept while you sign in."
                : "Save your characters and access them on any device.",
            )}
          </p>
          <form onSubmit={authenticate}>
            {authMode === "signup" && (
              <label>
                {t("Your name")}
                <input
                  name="name"
                  required
                  maxLength={60}
                  autoComplete="name"
                />
              </label>
            )}
            <label>
              {t("Email")}
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label>
              {t("Password")}
              <input
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete={
                  authMode === "signup" ? "new-password" : "current-password"
                }
                placeholder={t("At least 8 characters")}
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {t(error)}
              </p>
            )}
            <button className="btn primary full" disabled={busy}>
              {t(
                busy
                  ? "Saving…"
                  : authMode === "signup"
                    ? "Create an account"
                    : "Sign in",
              )}
            </button>
            <button
              className="text-link auth-switch"
              type="button"
              onClick={() => {
                setAuthMode(authMode === "signup" ? "login" : "signup");
                setError("");
              }}
            >
              {t(
                authMode === "signup"
                  ? "Already have an account?"
                  : "Create an account",
              )}
            </button>
            <p className="field-hint">
              {t(
                "Keep your password safe. Email recovery is not available in this first version.",
              )}
            </p>
          </form>
        </Modal>
      )}
      {(modal === "campaign" || modal === "join") && (
        <Modal
          title={t(modal === "join" ? "Join a campaign" : "Create campaign")}
          close={closeModal}
        >
          <form onSubmit={saveCampaign}>
            {modal === "join" ? (
              <label>
                {t("Campaign invite code")}
                <input
                  name="code"
                  required
                  minLength={16}
                  maxLength={16}
                  placeholder={t("16-character invite code")}
                />
              </label>
            ) : (
              <>
                <label>
                  {t("Campaign name")}
                  <input name="name" required maxLength={100} />
                </label>
                <label>
                  {t("Current clearing")}
                  <input name="clearing" maxLength={80} />
                </label>
              </>
            )}
            {error && (
              <p className="error" role="alert">
                {t(error)}
              </p>
            )}
            <button className="btn primary full" disabled={busy}>
              {t(
                busy
                  ? "Saving…"
                  : modal === "join"
                    ? "Join the campaign"
                    : "Create campaign",
              )}
            </button>
          </form>
        </Modal>
      )}
      {modal === "assign" && hero && (
        <Modal title={t("Choose campaign")} close={closeModal}>
          <form onSubmit={assign}>
            <label>
              {t("Campaign")}
              <select
                name="campaign"
                aria-label={t("Campaign")}
                defaultValue={hero.campaign_id || ""}
              >
                <option value="">{t("No campaign yet")}</option>
                {campaigns.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {!campaigns.length && (
              <p className="field-hint">
                {t("Join or create a campaign from the Campaigns tab first.")}
              </p>
            )}
            {error && (
              <p className="error" role="alert">
                {t(error)}
              </p>
            )}
            <button className="btn primary full" disabled={busy}>
              {t(busy ? "Saving…" : "Save")}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
