"use client";
import {
  useEffect,
  useState,
  useRef,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  Sprout,
  Home,
  Compass,
  RotateCcw,
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
    [tab, setTab] = useState<"home" | "characters" | "campaigns" | "play">(
      "home",
    ),
    [selected, setSelected] = useState(""),
    [campaignFilter, setCampaignFilter] = useState("");
  const [modal, setModal] = useState<
      "character" | "auth" | "join" | "campaign" | null
    >(null),
    [editing, setEditing] = useState<Hero | null>(null),
    [draft, setDraft] = useState<Sheet | undefined>(),
    [authMode, setAuthMode] = useState<"signup" | "login">("signup"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [gameStep, setGameStep] = useState<"campaign" | "character" | "sheet">(
    "campaign",
  );
  const [gameCampaignId, setGameCampaignId] = useState("");
  const [editorStep, setEditorStep] = useState(0);
  const [editorDirty, setEditorDirty] = useState(false);
  const [afterAuth, setAfterAuth] = useState<"campaign" | "join" | null>(null);
  const hero = heroes.find((h) => h.id === selected);
  const campaign = campaigns.find((c) => c.id === hero?.campaign_id);
  const shown = heroes.filter(
    (h) => !campaignFilter || h.campaign_id === campaignFilter,
  );
  const resumable = heroes.find(
    (h) => h.id === resumeId && campaigns.some((c) => c.id === h.campaign_id),
  );
  const gameCampaign = campaigns.find((c) => c.id === gameCampaignId);
  const activeGame =
    tab === "play" &&
    gameStep === "sheet" &&
    !!hero &&
    !!campaign &&
    campaign.id === gameCampaignId;
  const scenic = !user || tab === "home";
  function remember(id: string, userId = user?.id) {
    setResumeId(id);
    if (userId)
      try {
        localStorage.setItem(`root-session-${userId}`, id);
      } catch {}
  }
  function startNewGame() {
    setSelected("");
    setGameCampaignId("");
    setGameStep("campaign");
    setTab("play");
    setError("");
  }
  function continueGame() {
    if (!resumable) {
      startNewGame();
      return;
    }
    setSelected(resumable.id);
    setGameCampaignId(resumable.campaign_id!);
    setGameStep("sheet");
    setTab("play");
    setError("");
  }
  function chooseCampaign(id: string) {
    setGameCampaignId(id);
    setGameStep("character");
    setSelected("");
    setError("");
  }
  async function pickCharacter(h: Hero) {
    if (tab !== "play") {
      setSelected(h.id);
      return;
    }
    if (!gameCampaign || busy) return;
    setBusy(true);
    setError("");
    try {
      let chosen = h;
      if (h.campaign_id !== gameCampaign.id) {
        const data = await api("heroes", "POST", {
          id: h.id,
          version: h.version,
          campaignId: gameCampaign.id,
          sheet: h.sheet,
        });
        chosen = data.hero;
        updated(chosen);
      }
      setSelected(chosen.id);
      remember(chosen.id);
      setGameStep("sheet");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [tab, selected, gameStep]);
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
          try {
            setResumeId(
              localStorage.getItem(`root-session-${data.user.id}`) || "",
            );
          } catch {}
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
    setEditorStep(0);
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
    campaignId: string | null = editing?.campaign_id ||
      (tab === "play" ? gameCampaignId : null),
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
    if (tab !== "play") setTab("characters");
    if (tab === "play" && data.hero.campaign_id) {
      remember(data.hero.id, data.hero.owner_id);
      setGameStep("sheet");
    }
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
      try {
        setResumeId(localStorage.getItem(`root-session-${auth.user.id}`) || "");
      } catch {}
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
      if (tab !== "play") setTab("campaigns");
      setNotice(
        modal === "join" ? "You joined the party." : "Campaign created.",
      );
      setCampaignFilter(data.id);
      if (tab === "play") chooseCampaign(data.id);
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
    <div
      className={`simple-app scene-app ${user ? "camp-scene" : "welcome-scene"} ${!scenic ? "workspace-scene" : ""}`}
    >
      {!activeGame && (
        <header className="app-header">
          {scenic ? (
            <div className="brand">
              <Sprout size={25} />
              <span>
                root <small>helper</small>
              </span>
            </div>
          ) : (
            <button
              className="icon-btn home-control"
              aria-label={t("Home")}
              title={t("Home")}
              onClick={() => {
                setTab("home");
                setError("");
              }}
            >
              <Home size={20} />
            </button>
          )}
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
                    setTab("home");
                    setResumeId("");
                    setGameStep("campaign");
                    setGameCampaignId("");
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
      )}
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
        ) : !user ? (
          <section className="welcome-content">
            <p className="eyebrow">{t("Your Root RPG companion")}</p>
            <h1>{t("The Woodland awaits.")}</h1>
            <p className="welcome-copy">
              {t("Your character. Your friends. Your next adventure.")}
            </p>
            <button
              className="btn primary welcome-start"
              onClick={() => {
                setAuthMode("signup");
                setDraft(undefined);
                setAfterAuth(null);
                open("auth");
              }}
            >
              {t("Start playing")}
              <ChevronRight size={21} />
            </button>
            <button className="text-link welcome-draft" onClick={newCharacter}>
              {t("Create a character")}
            </button>
          </section>
        ) : tab === "home" ? (
          <section className="home-content">
            <p className="eyebrow">{t("Your clearing")}</p>
            <h1>{t("Ready for adventure?")}</h1>
            <div className="home-actions">
              <button
                className="home-action continue-action"
                onClick={continueGame}
              >
                <Compass size={30} />
                <span>
                  <strong>
                    {t(resumable ? "Continue game" : "Start / join a game")}
                  </strong>
                  <small>
                    {resumable
                      ? `${resumable.sheet.name} · ${campaigns.find((c) => c.id === resumable.campaign_id)?.name || t("Choose campaign")}`
                      : t("Choose a campaign, then bring your character.")}
                  </small>
                </span>
                <ChevronRight size={22} />
              </button>
              <button
                className="home-action"
                onClick={() => {
                  setTab("characters");
                  setSelected("");
                  setCampaignFilter("");
                }}
              >
                <UserRound size={25} />
                <span>
                  <strong>{t("My characters")}</strong>
                  <small>{t("Create, edit, and keep your heroes.")}</small>
                </span>
                <ChevronRight size={20} />
              </button>
              <button
                className="home-action"
                onClick={() => {
                  setTab("campaigns");
                  setCampaignFilter("");
                }}
              >
                <Users size={25} />
                <span>
                  <strong>{t("My campaigns")}</strong>
                  <small>{t("Find your party or bring one together.")}</small>
                </span>
                <ChevronRight size={20} />
              </button>
            </div>
          </section>
        ) : activeGame || (tab === "characters" && hero) ? (
          <>
            {activeGame ? (
              <nav className="game-actions" aria-label={t("Game controls")}>
                <button
                  onClick={() => {
                    setTab("home");
                    setError("");
                  }}
                >
                  <Home size={17} />
                  {t("Exit to main")}
                </button>
                <button
                  onClick={() => {
                    setSelected("");
                    setGameStep("character");
                    setError("");
                  }}
                >
                  <RotateCcw size={17} />
                  {t("Restart game")}
                </button>
                <button onClick={startNewGame}>
                  <Plus size={18} />
                  {t("Start new game")}
                </button>
              </nav>
            ) : (
              <div className="character-toolbar">
                <button className="text-link" onClick={() => setSelected("")}>
                  <ArrowLeft size={16} />
                  {t("All characters")}
                </button>
                <button className="btn small" onClick={startNewGame}>
                  {t("Start / join a game")}
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
            <CharacterControls
              key={hero!.id}
              hero={hero!}
              campaignName={activeGame ? campaign?.name : undefined}
              edit={(step = 0) => {
                setEditorStep(step);
                setEditorDirty(false);
                setEditing(hero!);
                setDraft(undefined);
                open("character");
              }}
              onSaved={updated}
            />
          </>
        ) : tab === "play" && (gameStep === "campaign" || !gameCampaign) ? (
          <section className="journey-picker">
            <p className="eyebrow">{t("1 · Choose your campaign")}</p>
            <h1>{t("Where will you play?")}</h1>
            <div className="campaign-actions">
              <button
                className="btn primary"
                disabled={busy}
                onClick={() => open("join")}
              >
                <Users size={18} />
                {t("Join a campaign")}
              </button>
              <button
                className="btn"
                disabled={busy}
                onClick={() => open("campaign")}
              >
                <Plus size={18} />
                {t("Create campaign")}
              </button>
            </div>
            <div className="campaign-list">
              {campaigns.map((c) => (
                <button
                  key={c.id}
                  className="campaign-choice"
                  disabled={busy}
                  onClick={() => chooseCampaign(c.id)}
                >
                  <span>
                    <strong>{c.name}</strong>
                    <small>
                      {players(c.members)}
                      {c.clearing ? ` · ${c.clearing}` : ""}
                    </small>
                  </span>
                  <ChevronRight size={20} />
                </button>
              ))}
            </div>
            {!campaigns.length && (
              <p className="field-hint">
                {t(
                  "Join with an invite code, or create a campaign for your friends.",
                )}
              </p>
            )}
          </section>
        ) : tab === "characters" || tab === "play" ? (
          <section className="journey-picker">
            {tab === "play" && (
              <div className="campaign-selection">
                <p className="eyebrow">{t("2 · Choose your character")}</p>
                <strong>{gameCampaign?.name}</strong>
                <button
                  className="text-link"
                  onClick={() => setGameStep("campaign")}
                >
                  {t("Change campaign")}
                </button>
              </div>
            )}
            <div className="page-heading">
              <div>
                <h1>
                  {t(tab === "play" ? "Who will you be?" : "My characters")}
                </h1>
                <p>
                  {t(
                    tab === "play"
                      ? "Choose an existing hero or create one for this campaign. Saved stats are kept."
                      : "Create a character. Save it. Play.",
                  )}
                </p>
              </div>
              <button className="btn primary" onClick={newCharacter}>
                <Plus size={18} />
                {t("Create a character")}
              </button>
            </div>
            {campaignFilter && tab === "characters" && (
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
            <div className="character-list">
              {(tab === "play" ? heroes : shown).map((h) => (
                <button
                  key={h.id}
                  className="character-tile"
                  disabled={busy}
                  onClick={() => void pickCharacter(h)}
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
                      {tab === "play" &&
                      h.campaign_id &&
                      h.campaign_id !== gameCampaignId
                        ? t("Move from {campaign}", {
                            campaign:
                              campaigns.find((c) => c.id === h.campaign_id)
                                ?.name || t("Campaign"),
                          })
                        : campaigns.find((c) => c.id === h.campaign_id)?.name ||
                          t("No campaign yet")}
                    </small>
                  </span>
                  <ChevronRight size={20} />
                </button>
              ))}
            </div>
            {!(tab === "play" ? heroes : shown).length && (
              <p className="empty-note">
                {t("Your first character starts here.")}
              </p>
            )}
          </section>
        ) : (
          <section className="journey-picker">
            <div className="page-heading">
              <div>
                <h1>{t("My campaigns")}</h1>
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
            {!campaigns.length && (
              <p className="empty-note">{t("No campaigns yet")}</p>
            )}
          </section>
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
            initialStep={editorStep}
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
    </div>
  );
}
