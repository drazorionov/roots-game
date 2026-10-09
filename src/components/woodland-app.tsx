"use client";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useState,
  useRef,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  Home,
  Compass,
  RotateCcw,
  MoreHorizontal,
  Users,
  UserRound,
  X,
  Check,
  LogOut,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslation, translate, type Locale } from "@/lib/i18n";
import {
  sheetSchema,
  type Hero,
  type Campaign,
  type User,
  type Sheet,
} from "@/lib/sheet";
import { api } from "@/lib/client-api";
import { prepareQuickOffline } from "@/lib/quick-offline";
import CharacterEditor from "./character-editor";
import CharacterControls from "./character-controls";
import ActiveGame from "./active-game";
import { CampaignCollection, CharacterCollection } from "./collections";
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
  return (
    <Suspense>
      <WoodlandWorkspace />
    </Suspense>
  );
}
function WoodlandWorkspace() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const creatingCharacter = pathname === "/characters/new";
  const creatingCampaign = pathname === "/campaigns/new";
  const editingCharacter = pathname === "/characters/edit";
  const characterForm = creatingCharacter || editingCharacter;
  const creating = characterForm || creatingCampaign;
  const { locale, t, setLocale } = useTranslation();
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [heroes, setHeroes] = useState<Hero[]>([]),
    [campaigns, setCampaigns] = useState<Campaign[]>([]),
    [tab, setTab] = useState<"home" | "characters" | "campaigns" | "play">(
      searchParams.get("from") === "play"
        ? "play"
        : characterForm
          ? "characters"
          : creatingCampaign
            ? "campaigns"
            : "home",
    ),
    [selected, setSelected] = useState(
      editingCharacter ? searchParams.get("id") || "" : "",
    ),
    [campaignFilter, setCampaignFilter] = useState("");
  const [modal, setModal] = useState<"auth" | "join" | null>(null),
    [editingSnapshot, setEditing] = useState<Hero | null>(null),
    [draft, setDraft] = useState<Sheet | undefined>(),
    [authMode, setAuthMode] = useState<"signup" | "login">("signup"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [quickOfflineReady, setQuickOfflineReady] = useState(false);
  const [quickMode, setQuickMode] = useState(
    searchParams.get("mode") === "quick",
  );
  const [quickHero, setQuickHero] = useState<Hero | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "character" | "campaign";
    id: string;
    name: string;
    version?: number;
  } | null>(null);
  const gameMenu = useRef<HTMLDetailsElement>(null);
  const [leaveTarget, setLeaveTarget] = useState<Campaign | null>(null);
  const [resumeId, setResumeId] = useState("");
  const [gameStep, setGameStep] = useState<"campaign" | "character" | "sheet">(
    searchParams.get("campaign") ? "character" : "campaign",
  );
  const [gameCampaignId, setGameCampaignId] = useState(
    searchParams.get("campaign") || "",
  );
  const [editorStep, setEditorStep] = useState(0);
  const [editorDirty, setEditorDirty] = useState(false);
  const [afterAuth, setAfterAuth] = useState<"campaign" | "join" | null>(null);
  const editing = editingCharacter
    ? editingSnapshot ||
      (quickMode
        ? quickHero
        : heroes.find((h) => h.id === searchParams.get("id"))) ||
      null
    : null;
  const editingAssigned = !!(
    editing?.campaign_id ||
    heroes.find((h) => h.id === editing?.id)?.campaign_id
  );
  const draftCampaign = useRef<string | null>(null);
  const hero = quickMode ? quickHero : heroes.find((h) => h.id === selected);
  const campaign = campaigns.find((c) => c.id === hero?.campaign_id);
  const shown = heroes.filter(
    (h) => !campaignFilter || h.campaign_id === campaignFilter,
  );
  const resumable = heroes.find(
    (h) => h.id === resumeId && campaigns.some((c) => c.id === h.campaign_id),
  );
  const gameCampaign = campaigns.find((c) => c.id === gameCampaignId);
  const activeGame =
    !creating &&
    (quickMode
      ? !!quickHero
      : tab === "play" &&
        gameStep === "sheet" &&
        !!hero &&
        !!campaign &&
        campaign.id === gameCampaignId);
  const scenic = !creating && !quickMode && (!user || tab === "home");
  const scene = creatingCampaign
    ? "campaigns-scene"
    : characterForm
      ? "characters-scene"
      : quickMode
        ? "game-scene"
        : !user
          ? "welcome-scene"
          : tab === "home"
            ? "camp-scene"
            : activeGame
              ? "game-scene"
              : tab === "campaigns" ||
                  (tab === "play" && (gameStep === "campaign" || !gameCampaign))
                ? "campaigns-scene"
                : "characters-scene";
  function exitToMain() {
    if (creating && !leaveCreation()) return;
    setQuickMode(false);
    try {
      sessionStorage.removeItem("root-quick-active");
    } catch {}
    setTab("home");
    setError("");
    if (gameMenu.current) gameMenu.current.open = false;
  }
  function saveQuick(sheet: Sheet) {
    const parsed = sheetSchema.parse(sheet);
    try {
      sessionStorage.setItem("root-quick-sheet", JSON.stringify(parsed));
      sessionStorage.setItem("root-quick-active", "1");
    } catch {
      throw new Error(
        "This browser cannot save the quick game. Check browser storage settings.",
      );
    }
    setQuickHero({
      id: "quick-game",
      owner_id: "local",
      player: "",
      campaign_id: null,
      version: 1,
      sheet: parsed,
    });
  }
  function startQuickGame() {
    setQuickMode(true);
    setTab("play");
    setError("");
    try {
      sessionStorage.setItem("root-quick-active", "1");
    } catch {}
    newCharacter(true);
  }
  function restartGame() {
    if (gameMenu.current) gameMenu.current.open = false;
    setError("");
    if (quickMode) {
      newCharacter();
      return;
    }
    setSelected("");
    setGameStep("character");
  }
  async function deleteItem() {
    if (!deleteTarget || busy) return;
    setBusy(true);
    setError("");
    try {
      await api(
        deleteTarget.type === "character" ? "heroes" : "campaigns",
        "DELETE",
        {
          id: deleteTarget.id,
          ...(deleteTarget.version ? { version: deleteTarget.version } : {}),
        },
      );
      if (deleteTarget.type === "character") {
        setHeroes((current) => current.filter((h) => h.id !== deleteTarget.id));
        if (selected === deleteTarget.id) setSelected("");
        if (resumeId === deleteTarget.id) remember("");
      } else {
        setCampaigns((current) =>
          current.filter((c) => c.id !== deleteTarget.id),
        );
        setCampaignFilter("");
        setHeroes((await api("heroes")).heroes);
        if (gameCampaignId === deleteTarget.id) {
          setGameCampaignId("");
          setGameStep("campaign");
        }
      }
      setDeleteTarget(null);
      setNotice("Deleted.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function askToLeave(c: Campaign) {
    setError("");
    setLeaveTarget(c);
    if (gameMenu.current) gameMenu.current.open = false;
  }
  async function leaveGame() {
    if (!leaveTarget || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await api("campaigns", "POST", {
        action: "leave",
        id: leaveTarget.id,
      });
      const detached = data.heroes as Hero[];
      setCampaigns((current) => current.filter((c) => c.id !== leaveTarget.id));
      setHeroes((current) =>
        current.map((h) => detached.find((d) => d.id === h.id) || h),
      );
      if (campaignFilter === leaveTarget.id) setCampaignFilter("");
      if (detached.some((h) => h.id === resumeId)) remember("");
      if (gameCampaignId === leaveTarget.id) {
        setGameCampaignId("");
        setGameStep("campaign");
        setSelected("");
      }
      setLeaveTarget(null);
      setNotice("You left the game. Your characters and progress are kept.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function remember(id: string, userId = user?.id) {
    setResumeId(id);
    if (userId)
      try {
        localStorage.setItem(`root-session-${userId}`, id);
      } catch {}
  }
  function startNewGame() {
    if (gameMenu.current) gameMenu.current.open = false;
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
    if (!quickMode) return;
    let disposed = false;
    void prepareQuickOffline().then((ready) => {
      if (!disposed) setQuickOfflineReady(ready);
    });
    return () => {
      disposed = true;
    };
  }, [quickMode]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [tab, selected, gameStep, pathname]);
  useEffect(() => {
    if (!loading) document.getElementById("creation-title")?.focus();
  }, [pathname, loading]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = creating
      ? `${translate(locale, editingCharacter ? "Edit character" : creatingCharacter ? "Create a character" : "Create campaign")} · Root Helper`
      : translate(locale, "Root Helper · Your characters");
  }, [locale, creating, creatingCharacter, editingCharacter]);
  useEffect(() => {
    Promise.resolve()
      .then(async () => {
        const initialUrl = new URL(window.location.href);
        const restoringQuick =
          initialUrl.pathname === "/" ||
          initialUrl.searchParams.get("mode") === "quick";
        try {
          const raw = sessionStorage.getItem("root-quick-sheet");
          const parsed = raw ? sheetSchema.safeParse(JSON.parse(raw)) : null;
          if (parsed?.success) {
            setQuickHero({
              id: "quick-game",
              owner_id: "local",
              player: "",
              campaign_id: null,
              version: 1,
              sheet: parsed.data,
            });
            if (
              restoringQuick &&
              sessionStorage.getItem("root-quick-active") === "1"
            ) {
              setQuickMode(true);
              setTab("play");
              return;
            }
          }
        } catch {}
        if (new URLSearchParams(window.location.search).get("mode") === "quick")
          return;
        const data = await api("auth");
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
    if (!user || quickMode) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const [data, campaignData] = await Promise.all([
          api("heroes"),
          api("campaigns"),
        ]);
        if (!cancelled) setCampaigns(campaignData.campaigns);
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
  }, [user, quickMode]);
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
  // Native history keeps the workspace mounted and quick-game navigation offline.
  function navigateCreation(path: string) {
    setError("");
    setModal(null);
    window.history.pushState(null, "", path);
  }
  function newCharacter(quick = quickMode) {
    setAfterAuth(null);
    setEditorDirty(false);
    setEditing(null);
    setEditorStep(0);
    setDraft(undefined);
    const params = new URLSearchParams();
    if (quick) params.set("mode", "quick");
    else if (tab === "play") {
      params.set("from", "play");
      if (gameCampaignId) params.set("campaign", gameCampaignId);
    }
    navigateCreation(`/characters/new${params.size ? `?${params}` : ""}`);
  }
  function newCampaign() {
    setEditorDirty(false);
    navigateCreation(`/campaigns/new${tab === "play" ? "?from=play" : ""}`);
  }
  function leaveCreation() {
    if (
      busy ||
      (editorDirty && !window.confirm(t("Close this form without saving?")))
    )
      return false;
    setError("");
    setDraft(undefined);
    setEditorDirty(false);
    window.history.replaceState(null, "", "/");
    return true;
  }
  function finishCreation() {
    setEditorDirty(false);
    if (creating) window.history.replaceState(null, "", "/");
  }
  function editCharacter(h: Hero, step = 0) {
    if (h.campaign_id) return;
    setEditing(h);
    setEditorStep(step);
    setEditorDirty(false);
    setDraft(undefined);
    const params = new URLSearchParams({ id: h.id });
    if (quickMode) params.set("mode", "quick");
    navigateCreation(`/characters/edit?${params}`);
  }
  function closeModal() {
    if (busy) return;
    setModal(null);
    setError("");
  }
  async function persist(
    sheet: Sheet,
    campaignId: string | null = (!creatingCharacter && editing?.campaign_id) ||
      (tab === "play" ? gameCampaignId : null),
  ) {
    const data = await api("heroes", "POST", {
      id: creatingCharacter ? undefined : editing?.id,
      campaignId,
      version: creatingCharacter ? undefined : editing?.version,
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
    finishCreation();
    setNotice("Character sheet saved.");
  }
  async function saveCharacter(sheet: Sheet, joinCampaign = false) {
    if (editingAssigned) {
      setError(
        "Character setup is locked while assigned to a campaign. You can still track harm, rolls, equipment, and session progress.",
      );
      return;
    }
    draftCampaign.current =
      editing?.campaign_id ||
      (joinCampaign && tab === "play" ? gameCampaignId : null);
    if (quickMode) {
      try {
        saveQuick(sheet);
        setModal(null);
        setDraft(undefined);
        finishCreation();
        setNotice("Saved only in this browser tab.");
      } catch (e) {
        setError((e as Error).message);
      }
      return;
    }
    setDraft(sheet);
    if (!user) {
      setAuthMode("signup");
      open("auth");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await persist(sheet, draftCampaign.current);
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
          await persist(draft, draftCampaign.current);
        } catch (e) {
          setModal(null);
          setError((e as Error).message);
        }
      } else {
        if (afterAuth === "campaign") {
          setModal(null);
          if (!creatingCampaign) newCampaign();
        } else setModal(afterAuth);
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
    if (!user) {
      needsAccount("campaign");
      return;
    }
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
      finishCreation();
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
    if (next === "campaign") newCampaign();
    else open(next);
  }
  return (
    <div
      className={`simple-app scene-app ${scene} ${!scenic ? "workspace-scene" : ""}`}
    >
      <header className="app-header">
        <button className="brand" aria-label={t("Home")} onClick={exitToMain}>
          <Image
            src="/brand/root-helper-light.webp"
            width={360}
            height={120}
            alt="Root Helper"
            className="brand-logo"
            priority
            unoptimized
          />
        </button>
        <div className="header-actions">
          <select
            className="language-select"
            value={locale}
            aria-label={t("Language")}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            <option value="en" aria-label="English">
              EN
            </option>
            <option value="ru" aria-label="Русский">
              RU
            </option>
            <option value="de" aria-label="Deutsch">
              DE
            </option>
          </select>
          {activeGame && (
            <details
              className="game-menu"
              ref={gameMenu}
              onKeyDown={(e) => {
                if (e.key === "Escape") e.currentTarget.open = false;
              }}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget))
                  e.currentTarget.open = false;
              }}
            >
              <summary aria-label={t("Game menu")} title={t("Game menu")}>
                <MoreHorizontal size={22} />
              </summary>
              <div className="game-menu-items">
                {!quickMode && campaign && campaign.owner_id !== user?.id && (
                  <button disabled={busy} onClick={() => askToLeave(campaign)}>
                    <LogOut size={17} />
                    {t("Leave game")}
                  </button>
                )}
                <button onClick={exitToMain}>
                  <Home size={17} />
                  {t("Exit to main")}
                </button>
                <button onClick={restartGame}>
                  <RotateCcw size={17} />
                  {t("Restart game")}
                </button>
                {!quickMode && (
                  <button onClick={startNewGame}>
                    <Compass size={17} />
                    {t("Start new game")}
                  </button>
                )}
              </div>
            </details>
          )}
          {user ? (
            <button
              className="icon-btn"
              aria-label={t("Sign out")}
              onClick={async () => {
                try {
                  await api("auth", "DELETE");
                  exitToMain();
                  setUser(null);
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
      <main className="simple-main">
        {error && !characterForm && !modal && !deleteTarget && (
          <p className="error" role="alert">
            {t(error)}
          </p>
        )}
        {loading ? (
          <p className="loading" role="status">
            {t("Loading…")}
          </p>
        ) : creating ? (
          <section
            className={`journey-picker creation-page ${creatingCampaign ? "campaign-creation" : "character-creation"}`}
            aria-labelledby="creation-title"
          >
            <button
              className="text-link creation-back"
              disabled={busy}
              onClick={leaveCreation}
            >
              <ArrowLeft size={16} />
              {t("Back")}
            </button>
            <h1 id="creation-title" tabIndex={-1}>
              {t(
                editingCharacter
                  ? "Edit character"
                  : creatingCharacter
                    ? "Create a character"
                    : "Create campaign",
              )}
            </h1>
            {characterForm ? (
              editingCharacter && (!editing || editingAssigned) ? (
                <div className="locked-editor">
                  <p>
                    {t(
                      editingAssigned
                        ? "Character setup is locked while assigned to a campaign. You can still track harm, rolls, equipment, and session progress."
                        : "This character is not available. Sign in with its owner account.",
                    )}
                  </p>
                  <button className="btn" onClick={leaveCreation}>
                    {t("Back")}
                  </button>
                </div>
              ) : (
                <CharacterEditor
                  key={editing?.id || "new"}
                  initial={draft || editing?.sheet}
                  initialStep={editingCharacter ? editorStep : 0}
                  editing={editingCharacter}
                  campaignName={
                    !editingCharacter && tab === "play"
                      ? gameCampaign?.name
                      : undefined
                  }
                  save={saveCharacter}
                  busy={busy}
                  error={modal ? "" : error}
                  markDirty={() => setEditorDirty(true)}
                />
              )
            ) : (
              <form
                onSubmit={saveCampaign}
                onChange={() => setEditorDirty(true)}
              >
                <fieldset disabled={busy}>
                  <label>
                    {t("Campaign name")}
                    <input name="name" required maxLength={100} />
                  </label>
                  <label>
                    {t("Current clearing")}
                    <input name="clearing" maxLength={80} />
                  </label>
                </fieldset>
                {user ? (
                  <button className="btn primary full" disabled={busy}>
                    {t(busy ? "Saving…" : "Create campaign")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn primary full"
                    onClick={() => needsAccount("campaign")}
                  >
                    {t("Sign in")}
                  </button>
                )}
              </form>
            )}
          </section>
        ) : !user && !quickMode ? (
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
            <button
              className="text-link welcome-draft"
              onClick={startQuickGame}
            >
              {t("Quick game")}
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
            {!activeGame && (
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
            <ActiveGame
              enabled={activeGame}
              key={hero!.id}
              hero={hero!}
              campaign={activeGame ? campaign : undefined}
              heading={
                activeGame ? (
                  <header className="game-heading">
                    <div className="campaign-heading">
                      <h1>{quickMode ? t("Quick game") : campaign?.name}</h1>
                      {quickMode && (
                        <p className="quick-game-note">
                          {t(
                            "No account. No campaign. Saved only in this browser tab.",
                          )}
                          {quickOfflineReady && (
                            <span className="offline-ready">
                              {t("Ready for offline play.")}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </header>
                ) : undefined
              }
            >
              <CharacterControls
                key={hero!.id}
                hero={hero!}
                edit={(step = 0) => editCharacter(hero!, step)}
                onSaved={updated}
                saveLocal={quickMode ? saveQuick : undefined}
              />
            </ActiveGame>
          </>
        ) : quickMode ? (
          <section className="journey-picker">
            <h1>{t("Quick game")}</h1>
            <p>
              {t("No account. No campaign. Saved only in this browser tab.")}
            </p>
            <button className="btn primary" onClick={() => newCharacter()}>
              {t("Create a character")}
            </button>
          </section>
        ) : tab === "campaigns" ||
          (tab === "play" && (gameStep === "campaign" || !gameCampaign)) ? (
          <CampaignCollection
            leave={askToLeave}
            campaigns={campaigns}
            userId={user?.id}
            choosing={tab === "play"}
            busy={busy}
            create={() => needsAccount("campaign")}
            join={() => needsAccount("join")}
            select={(c) => {
              if (tab === "play") chooseCampaign(c.id);
              else {
                setSelected("");
                setCampaignFilter(c.id);
                setTab("characters");
              }
            }}
            copy={async (c) => {
              try {
                await navigator.clipboard.writeText(c.invite_code);
                setNotice("Invite code copied. Share it with your party.");
              } catch {
                setNotice(t("Invite code: {code}", { code: c.invite_code }));
              }
            }}
            remove={(c) => {
              setError("");
              setDeleteTarget({ type: "campaign", id: c.id, name: c.name });
            }}
          />
        ) : (
          <CharacterCollection
            heroes={tab === "play" ? heroes : shown}
            campaigns={campaigns}
            choosing={tab === "play"}
            campaign={gameCampaign}
            filter={campaigns.find((c) => c.id === campaignFilter)}
            busy={busy}
            create={() => newCharacter()}
            select={(h) => void pickCharacter(h)}
            remove={(h) => {
              setError("");
              setDeleteTarget({
                type: "character",
                id: h.id,
                name: h.sheet.name,
                version: h.version,
              });
            }}
            changeCampaign={() => setGameStep("campaign")}
            clearFilter={() => setCampaignFilter("")}
          />
        )}
      </main>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {t(notice)}
        </div>
      )}
      {leaveTarget && (
        <Modal
          title={t("Leave game")}
          close={() => {
            if (!busy) {
              setLeaveTarget(null);
              setError("");
            }
          }}
        >
          <p className="delete-explanation">
            {t(
              "Leave {name}? Your characters and progress will be kept. You can rejoin with an invite code.",
              { name: leaveTarget.name },
            )}
          </p>
          {error && (
            <p className="error" role="alert">
              {t(error)}
            </p>
          )}
          <div className="form-actions">
            <button
              className="btn"
              disabled={busy}
              onClick={() => {
                setLeaveTarget(null);
                setError("");
              }}
            >
              {t("Cancel")}
            </button>
            <button
              className="btn primary"
              disabled={busy}
              onClick={() => void leaveGame()}
            >
              {t(busy ? "Saving…" : "Leave game")}
            </button>
          </div>
        </Modal>
      )}
      {deleteTarget && (
        <Modal
          title={t(
            deleteTarget.type === "character"
              ? "Delete character"
              : "Delete campaign",
          )}
          close={() => {
            if (!busy) {
              setDeleteTarget(null);
              setError("");
            }
          }}
        >
          <p className="delete-explanation">
            {t(
              deleteTarget.type === "character"
                ? "Delete {name}? This permanently removes the character."
                : "Delete {name}? The campaign is removed for everyone. Characters are kept.",
              { name: deleteTarget.name },
            )}
          </p>
          {error && (
            <p className="error" role="alert">
              {t(error)}
            </p>
          )}
          <div className="form-actions">
            <button
              className="btn"
              disabled={busy}
              onClick={() => {
                setDeleteTarget(null);
                setError("");
              }}
            >
              {t("Cancel")}
            </button>
            <button
              className="btn danger"
              disabled={busy}
              onClick={() => void deleteItem()}
            >
              {t("Delete")}
            </button>
          </div>
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
      {modal === "join" && (
        <Modal title={t("Join a campaign")} close={closeModal}>
          <form onSubmit={saveCampaign}>
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
            {error && (
              <p className="error" role="alert">
                {t(error)}
              </p>
            )}
            <button className="btn primary full" disabled={busy}>
              {t(busy ? "Saving…" : "Join the campaign")}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
