"use client";
import Image from "next/image";
import dynamic from "next/dynamic";
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
  Shield,
  BookOpen,
  ArrowRightLeft,
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
import { useGameTime } from "@/lib/use-game-time";
import { useHeroSaves } from "@/lib/use-hero-saves";
import CharacterControls from "./character-controls";
import ActiveGame from "./active-game";
import CharacterEditor from "./character-editor";
import { CampaignCollection, CharacterCollection } from "./collections";
const AdminPanel = dynamic(() => import("./admin-panel"));
const PasswordRecovery = dynamic(() => import("./password-recovery"));
const CampaignSheets = dynamic(() => import("./campaign-sheets"));
function Modal({
  title,
  children,
  close,
  className = "",
}: {
  className?: string;
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
      className={`modal ${className}`}
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
    [tab, setTab] = useState<
      "home" | "characters" | "campaigns" | "play" | "admin"
    >(
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
  const [recoveryStep, setRecoveryStep] = useState<
    "request" | "code" | "password" | null
  >(null);
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
  const [managedCampaignId, setManagedCampaignId] = useState("");
  const [sheetCampaignId, setSheetCampaignId] = useState("");
  const [sheetHeroId, setSheetHeroId] = useState("");
  const sheetNavigationGuard = useRef<(() => boolean) | null>(null);
  const [transferCampaignId, setTransferCampaignId] = useState("");
  const [transferUserId, setTransferUserId] = useState("");
  const [memberTarget, setMemberTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [switchTarget, setSwitchTarget] = useState<{
    id: string;
    name: string;
    resume: boolean;
  } | null>(null);
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
  const { queueFor, pending: pendingSaves } = useHeroSaves(updated);
  const hero = quickMode
    ? quickHero
    : (pendingSaves
        .find((q) => q.getSnapshot().hero.id === selected)
        ?.getSnapshot().hero ?? heroes.find((h) => h.id === selected));
  const campaign = campaigns.find((c) => c.id === hero?.campaign_id);
  const shown = heroes.filter((h) =>
    campaignFilter ? h.campaign_id === campaignFilter : !h.campaign_id,
  );
  const resumable = heroes.find(
    (h) => h.id === resumeId && campaigns.some((c) => c.id === h.campaign_id),
  );
  const gameCampaign = campaigns.find((c) => c.id === gameCampaignId);
  const managedCampaign = campaigns.find(
    (c) => c.id === managedCampaignId && c.owner_id === user?.id,
  );
  const campaignHeroes = heroes.filter((h) => h.campaign_id === gameCampaignId);
  const sheetCampaign = campaigns.find((c) => c.id === sheetCampaignId);
  const transferCampaign = campaigns.find(
    (c) => c.id === transferCampaignId && c.owner_id === user?.id,
  );
  const selectableHeroes = [
    ...campaignHeroes,
    ...heroes.filter(
      (h) =>
        !h.campaign_id &&
        !campaignHeroes.some((copy) => copy.source_hero_id === h.id),
    ),
  ];
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
          : tab === "admin"
            ? "admin-scene"
            : tab === "home"
              ? "camp-scene"
              : activeGame
                ? "game-scene"
                : tab === "campaigns" ||
                    (tab === "play" &&
                      (gameStep === "campaign" || !gameCampaign))
                  ? "campaigns-scene"
                  : "characters-scene";
  const gameTime = useGameTime(scene === "game-scene");
  function leavePlayerSheets() {
    if (sheetCampaign && sheetNavigationGuard.current?.() === false)
      return false;
    setSheetCampaignId("");
    return true;
  }
  function exitToMain() {
    if (!leavePlayerSheets()) return;
    if (creating && !leaveCreation()) return;
    setQuickMode(false);
    try {
      sessionStorage.removeItem("root-quick-active");
    } catch {}
    setTab("home");
    setError("");
    if (gameMenu.current) gameMenu.current.open = false;
  }
  function backToPreviousScreen() {
    if (sheetCampaign) {
      leavePlayerSheets();
      return;
    }
    setError("");
    if (tab === "play" && !quickMode) {
      if (activeGame) {
        exitToMain();
        return;
      }
      if (gameStep === "character" && gameCampaign) {
        setGameStep("campaign");
        return;
      }
    }
    if (tab === "characters" && campaignFilter) {
      setCampaignFilter("");
      setTab("campaigns");
      return;
    }
    exitToMain();
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
    if (!leavePlayerSheets()) return;
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
    if (pendingSaves.length) {
      setError("Save or reload your unsaved character changes first.");
      return;
    }
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
    if (!leavePlayerSheets()) return;
    setError("");
    setLeaveTarget(c);
    if (gameMenu.current) gameMenu.current.open = false;
  }
  function openPlayerSheets(c: Campaign, heroId = "") {
    if (!leavePlayerSheets()) return;
    if (activeGame && heroId === hero?.id) return;
    if (pendingSaves.length) {
      setError("Save or reload your unsaved character changes first.");
      return;
    }
    setError("");
    setSheetHeroId(heroId);
    setSheetCampaignId(c.id);
    if (gameMenu.current) gameMenu.current.open = false;
  }
  function openTransfer(c: Campaign) {
    if (!leavePlayerSheets()) return;
    setError("");
    setTransferUserId("");
    setTransferCampaignId(c.id);
    if (gameMenu.current) gameMenu.current.open = false;
  }
  async function transferOwnership() {
    if (!transferCampaign || !transferUserId || busy) return;
    if (pendingSaves.length) {
      setError("Save or reload your unsaved character changes first.");
      return;
    }
    const next = transferCampaign.member_list?.find(
      (m) => m.id === transferUserId && m.id !== user?.id,
    );
    if (!next) return;
    setBusy(true);
    setError("");
    try {
      await api("campaigns", "POST", {
        action: "transfer",
        id: transferCampaign.id,
        userId: next.id,
      });
      setCampaigns((current) =>
        current.map((c) =>
          c.id === transferCampaign.id
            ? {
                ...c,
                owner_id: next.id,
                master_name: next.name,
                member_list: null,
              }
            : c,
        ),
      );
      setTransferCampaignId("");
      setTransferUserId("");
      setNotice("Campaign transferred. You remain a member.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function removeMember() {
    if (!managedCampaign || !memberTarget || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("campaigns", "POST", {
        action: "removeMember",
        id: managedCampaign.id,
        userId: memberTarget.id,
      });
      setCampaigns((current) =>
        current.map((c) => {
          if (c.id !== managedCampaign.id) return c;
          const members = (c.member_list || []).filter(
            (m) => m.id !== memberTarget.id,
          );
          return { ...c, member_list: members, members: members.length };
        }),
      );
      setMemberTarget(null);
      setNotice("Player removed. Their characters and progress are kept.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function leaveGame() {
    if (!leaveTarget || busy) return;
    if (pendingSaves.length) {
      setError("Save or reload your unsaved character changes first.");
      return;
    }
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
    if (!leavePlayerSheets()) return;
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
  function enterCampaign(id: string, resume: boolean) {
    const saved = heroes.filter((h) => h.campaign_id === id);
    const previous = resume
      ? saved.find((h) => h.id === resumeId) ||
        (saved.length === 1 ? saved[0] : undefined)
      : undefined;
    setGameCampaignId(id);
    setGameStep(previous ? "sheet" : "character");
    setSelected(previous?.id || "");
    setTab("play");
    setQuickMode(false);
    if (previous) remember(previous.id);
    setError("");
  }
  function chooseCampaign(
    id: string,
    resume = false,
    name = campaigns.find((c) => c.id === id)?.name || "",
  ) {
    if (resumable?.campaign_id && resumable.campaign_id !== id) {
      setSwitchTarget({ id, name, resume });
      return;
    }
    enterCampaign(id, resume);
  }
  async function pickCharacter(h: Hero) {
    if (tab !== "play") {
      if (h.campaign_id) {
        setTab("play");
        setGameCampaignId(h.campaign_id);
        setSelected(h.id);
        remember(h.id);
        setGameStep("sheet");
      } else {
        editCharacter(h);
      }
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
        const data = await api("auth?bootstrap=1");
        setUser(data.user);
        if (data.user) {
          // Older deployments can still answer auth while a new client is loading.
          const [h, c] =
            data.heroes && data.campaigns
              ? [{ heroes: data.heroes }, { campaigns: data.campaigns }]
              : await Promise.all([api("heroes"), api("campaigns")]);
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
    let pending = false;
    const controller = new AbortController();
    async function refresh() {
      if (pending || document.visibilityState !== "visible") return;
      pending = true;
      try {
        const [data, campaignData] = await Promise.all([
          api("heroes", "GET", undefined, controller.signal),
          api("campaigns", "GET", undefined, controller.signal),
        ]);
        if (!cancelled)
          setCampaigns((current) =>
            JSON.stringify(current) === JSON.stringify(campaignData.campaigns)
              ? current
              : campaignData.campaigns,
          );
        if (!cancelled)
          setHeroes((current) => {
            const next = data.heroes.map((h: Hero) => {
              const old = current.find((x) => x.id === h.id);
              return old && old.version >= h.version ? old : h;
            });
            return next.length === current.length &&
              next.every((h: Hero, i: number) => h === current[i])
              ? current
              : next;
          });
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        pending = false;
      }
    }
    const timer = setInterval(() => void refresh(), 15000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
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
    if (h.campaign_id)
      setCampaigns((current) =>
        current.map((c) =>
          c.id === h.campaign_id && !c.started_at
            ? { ...c, started_at: new Date().toISOString() }
            : c,
        ),
      );
    setHeroes((current) =>
      current.some((x) => x.id === h.id)
        ? current.map((x) => (x.id === h.id && x.version <= h.version ? h : x))
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
    if (data.baseHero) updated(data.baseHero);
    updated(data.hero);
    setSelected(data.hero.campaign_id ? data.hero.id : "");
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
        "This campaign copy has locked setup. Your base character stays editable in My characters. You can still track harm, rolls, equipment, and session progress.",
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
      if (auth.requiresPasswordChange) {
        setRecoveryStep("password");
        return;
      }
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
      if (tab === "play")
        chooseCampaign(
          data.id,
          false,
          campaigns.campaigns.find((c: Campaign) => c.id === data.id)?.name,
        );
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
  const playerSheets = sheetCampaign ? (
    <CampaignSheets
      key={`${sheetCampaign.id}:${sheetHeroId}`}
      campaign={sheetCampaign}
      initialHeroId={sheetHeroId}
      inGame={activeGame}
      navigationGuard={sheetNavigationGuard}
      backLabel={t(activeGame ? "Back to character" : "Back")}
      canManage={sheetCampaign.owner_id === user?.id}
      close={() => {
        leavePlayerSheets();
      }}
      onSaved={(saved) => {
        if (saved.owner_id === user?.id) updated(saved);
      }}
    />
  ) : null;
  return (
    <div
      className={`simple-app scene-app ${scene} ${!scenic ? "workspace-scene" : ""}`}
      data-game-time={gameTime}
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
          {(activeGame || user?.isAdmin) && (
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
              <summary
                aria-label={t(activeGame ? "Game menu" : "More options")}
                title={t(activeGame ? "Game menu" : "More options")}
              >
                <MoreHorizontal size={22} />
              </summary>
              <div className="game-menu-items">
                {user?.isAdmin && (
                  <button
                    onClick={() => {
                      if (!leavePlayerSheets()) return;
                      if (creating && !leaveCreation()) return;
                      setQuickMode(false);
                      setTab("admin");
                      setError("");
                      if (gameMenu.current) gameMenu.current.open = false;
                    }}
                  >
                    <Shield size={17} />
                    {t("Administration")}
                  </button>
                )}
                {activeGame && (
                  <>
                    {!quickMode && campaign && (
                      <>
                        <button
                          disabled={busy}
                          onClick={() => openPlayerSheets(campaign)}
                        >
                          <BookOpen size={17} aria-hidden="true" />
                          {t("Player sheets")}
                        </button>
                        {campaign.owner_id === user?.id && (
                          <button
                            disabled={busy}
                            onClick={() => openTransfer(campaign)}
                          >
                            <ArrowRightLeft size={17} aria-hidden="true" />
                            {t("Transfer campaign")}
                          </button>
                        )}
                      </>
                    )}
                    {!quickMode &&
                      campaign &&
                      campaign.owner_id !== user?.id && (
                        <button
                          disabled={busy}
                          onClick={() => askToLeave(campaign)}
                        >
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
                  </>
                )}
              </div>
            </details>
          )}
          {user ? (
            <button
              className="icon-btn"
              aria-label={t("Sign out")}
              onClick={async () => {
                if (!leavePlayerSheets()) return;
                if (pendingSaves.length) {
                  setError(
                    "Save or reload your unsaved character changes first.",
                  );
                  return;
                }
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
        {pendingSaves
          .filter((q) => !activeGame || q.getSnapshot().hero.id !== hero?.id)
          .map((q) => {
            const state = q.getSnapshot();
            return (
              <p
                key={state.hero.id}
                role="status"
                className={state.error ? "error" : "notice"}
              >
                {t(
                  state.error
                    ? "Unsaved changes for {name}."
                    : "Saving changes for {name}…",
                  { name: state.hero.sheet.name },
                )}{" "}
                <button
                  className="text-link"
                  onClick={() => {
                    if (creating && !leaveCreation()) return;
                    setQuickMode(false);
                    setTab("play");
                    setGameStep("sheet");
                    setGameCampaignId(state.hero.campaign_id || "");
                    setSelected(state.hero.id);
                    if (creating) window.history.pushState(null, "", "/");
                  }}
                >
                  {t("Return to game")}
                </button>
                {state.error && (
                  <button
                    className="text-link"
                    onClick={() => {
                      if (window.confirm(t("Discard unsaved changes")))
                        q.discard();
                    }}
                  >
                    {t("Discard unsaved changes")}
                  </button>
                )}
              </p>
            );
          })}
        {!loading && !creating && (quickMode || (user && tab !== "home")) && (
          <button
            className="text-link workspace-back"
            disabled={busy}
            onClick={backToPreviousScreen}
          >
            <ArrowLeft size={16} />
            {t("Back")}
          </button>
        )}
        {error && !characterForm && !modal && !deleteTarget && (
          <p className="error" role="alert">
            {t(error)}
          </p>
        )}
        {loading ? (
          <p className="loading" role="status">
            {t("Loading…")}
          </p>
        ) : playerSheets && !activeGame ? (
          playerSheets
        ) : creating ? (
          <section
            className={`journey-picker creation-page ${creatingCampaign ? "campaign-creation" : "character-creation"}`}
            aria-labelledby="creation-title"
          >
            <button
              className="text-link workspace-back creation-back"
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
                        ? "This campaign copy has locked setup. Your base character stays editable in My characters. You can still track harm, rolls, equipment, and session progress."
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
        ) : tab === "admin" && user?.isAdmin ? (
          <AdminPanel />
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
        ) : activeGame ? (
          <ActiveGame
            openSheet={
              campaign
                ? (member) => openPlayerSheets(campaign, member.id)
                : undefined
            }
            enabled
            key={hero!.id}
            hero={hero!}
            campaign={campaign}
            heading={
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
            }
          >
            {playerSheets || (
              <CharacterControls
                key={hero!.id}
                hero={hero!}
                edit={(step = 0) => editCharacter(hero!, step)}
                saveLocal={quickMode ? saveQuick : undefined}
                saveQueue={quickMode ? undefined : queueFor(hero!)}
              />
            )}
          </ActiveGame>
        ) : quickMode ? (
          <section className="journey-picker quick-start-page">
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
            playerSheets={openPlayerSheets}
            transfer={openTransfer}
            managePlayers={(c) => {
              setError("");
              setMemberTarget(null);
              setManagedCampaignId(c.id);
            }}
            leave={askToLeave}
            campaigns={campaigns}
            userId={user?.id}
            currentCampaignId={resumable?.campaign_id || undefined}
            choosing={tab === "play"}
            busy={busy}
            create={() => needsAccount("campaign")}
            join={() => needsAccount("join")}
            select={(c) => chooseCampaign(c.id, true, c.name)}
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
            heroes={tab === "play" ? selectableHeroes : shown}
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
      {switchTarget && (
        <Modal
          title={t("Switch campaign?")}
          close={() => setSwitchTarget(null)}
        >
          <p className="delete-explanation">
            {t(
              "Switch from {current} to {next}? Your characters and progress in both campaigns will be kept.",
              {
                current:
                  campaigns.find((c) => c.id === resumable?.campaign_id)
                    ?.name || "",
                next: switchTarget.name,
              },
            )}
          </p>
          <div className="form-actions">
            <button className="btn" onClick={() => setSwitchTarget(null)}>
              {t("Cancel")}
            </button>
            <button
              className="btn primary"
              onClick={() => {
                enterCampaign(switchTarget.id, switchTarget.resume);
                setSwitchTarget(null);
              }}
            >
              {t("Switch campaign")}
            </button>
          </div>
        </Modal>
      )}
      {transferCampaign && (
        <Modal
          title={t("Transfer campaign")}
          className="campaign-transfer-dialog"
          close={() => {
            if (!busy) {
              setTransferCampaignId("");
              setError("");
            }
          }}
        >
          <p className="transfer-campaign-name">
            <Compass size={18} aria-hidden="true" />
            {transferCampaign.name}
          </p>
          <label className="transfer-player-field">
            <span>{t("New campaign master")}</span>
            <select
              aria-label={t("New campaign master")}
              aria-describedby="transfer-consequences"
              value={transferUserId}
              disabled={busy}
              onChange={(e) => setTransferUserId(e.target.value)}
            >
              <option value="">{t("Choose a player")}</option>
              {(transferCampaign.member_list || [])
                .filter((m) => m.id !== user?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </label>
          {(transferCampaign.member_list || []).filter((m) => m.id !== user?.id)
            .length === 0 && (
            <p className="field-hint">
              {t("Invite another player before transferring this campaign.")}
            </p>
          )}
          <p className="transfer-consequences" id="transfer-consequences">
            {t(
              "The selected player will become the campaign owner and can edit all player sheets, manage players, and delete the campaign. You will remain a regular member.",
            )}
          </p>
          <div className="form-actions">
            <button
              className="btn"
              disabled={busy}
              onClick={() => {
                setTransferCampaignId("");
                setError("");
              }}
            >
              {t("Cancel")}
            </button>
            <button
              className="btn primary"
              disabled={busy || !transferUserId}
              onClick={() => void transferOwnership()}
            >
              {t(busy ? "Saving…" : "Confirm transfer")}
            </button>
          </div>
          {error && (
            <p className="error" role="alert">
              {t(error)}
            </p>
          )}
        </Modal>
      )}
      {managedCampaign && (
        <Modal
          title={t(memberTarget ? "Remove player" : "Manage players")}
          close={() => {
            if (!busy) {
              setManagedCampaignId("");
              setMemberTarget(null);
              setError("");
            }
          }}
        >
          <p className="delete-explanation">{managedCampaign.name}</p>
          {memberTarget ? (
            <>
              <p className="delete-explanation">
                {t(
                  "Remove {name} from this campaign? Their characters and progress will be kept outside the campaign. They can rejoin with an invite code.",
                  { name: memberTarget.name },
                )}
              </p>
              <div className="form-actions">
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() => {
                    setMemberTarget(null);
                    setError("");
                  }}
                >
                  {t("Cancel")}
                </button>
                <button
                  className="btn danger"
                  disabled={busy}
                  onClick={() => void removeMember()}
                >
                  {t(busy ? "Saving…" : "Remove player")}
                </button>
              </div>
            </>
          ) : (
            <ul className="campaign-member-list">
              {(managedCampaign.member_list || []).map((member) => (
                <li key={member.id}>
                  <span>{member.name}</span>
                  {member.id === managedCampaign.owner_id ? (
                    <small>{t("Campaign master")}</small>
                  ) : (
                    <button
                      className="btn"
                      disabled={busy}
                      aria-label={t("Remove {name}", { name: member.name })}
                      onClick={() => {
                        setError("");
                        setMemberTarget(member);
                      }}
                    >
                      {t("Remove player")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p className="error" role="alert">
              {t(error)}
            </p>
          )}
        </Modal>
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
          title={t(
            recoveryStep
              ? "Recover password"
              : authMode === "signup"
                ? "Create an account"
                : "Sign in",
          )}
          close={() => {
            closeModal();
            setRecoveryStep(null);
          }}
        >
          {recoveryStep ? (
            <PasswordRecovery
              initialStep={recoveryStep}
              back={() => {
                setRecoveryStep(null);
                setAuthMode("login");
                setError("");
              }}
            />
          ) : (
            <>
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
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                  />
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
                      authMode === "signup"
                        ? "new-password"
                        : "current-password"
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
                {authMode === "login" && (
                  <>
                    <button
                      className="text-link auth-switch"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setRecoveryStep("request");
                        setError("");
                      }}
                    >
                      {t("Forgot password?")}
                    </button>
                    <button
                      className="text-link auth-switch"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setRecoveryStep("code");
                        setError("");
                      }}
                    >
                      {t("Use a temporary code")}
                    </button>
                  </>
                )}
              </form>
            </>
          )}
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
