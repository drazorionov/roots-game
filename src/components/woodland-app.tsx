"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  BookOpen,
  Compass,
  Dices,
  Feather,
  Leaf,
  LogOut,
  MapPin,
  Plus,
  Search,
  Shield,
  Sprout,
  Users,
  X,
  ArrowUpRight,
  Copy,
  Check,
  ChevronRight,
  ScrollText,
  Heart,
  Backpack,
  Menu,
} from "lucide-react";
import {
  blankSheet,
  demoCampaign,
  demoHeroes,
  playbooks,
  species,
  stats,
  type Campaign,
  type Hero,
  type Sheet,
  type User,
} from "@/lib/sheet";
import { Forest, Portrait } from "./art";
async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(`/api/${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Something went wrong. Please retry.");
  return data;
}
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLDialogElement>("dialog");
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      aria-label={title}
      className={wide ? "modal wide" : "modal"}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-inner">
        <div className="modal-title">
          <h2>{title}</h2>
          <button
            className="icon-btn"
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
function Track({
  label,
  value,
  max = 4,
  onChange,
}: {
  label: string;
  value: number;
  max?: number;
  onChange?: (n: number) => void;
}) {
  return (
    <div className="track">
      <span>{label}</span>
      <div>
        {Array.from({ length: max }, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={!onChange}
            aria-label={`${label} ${i + 1}`}
            aria-pressed={i < value}
            className={i < value ? "pip filled" : "pip"}
            onClick={() => onChange?.(value === i + 1 ? i : i + 1)}
          />
        ))}
      </div>
      <small>
        {value}/{max}
      </small>
    </div>
  );
}
export default function WoodlandApp() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [campaigns, setCampaigns] = useState<Campaign[]>([]),
    [selected, setSelected] = useState(""),
    [heroes, setHeroes] = useState<Hero[]>([]);
  const [modal, setModal] = useState<
      "auth" | "campaign" | "join" | "hero" | "guide" | null
    >(null),
    [authMode, setAuthMode] = useState("signup"),
    [activeHero, setActiveHero] = useState<Hero | null>(null),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All playbooks"),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false),
    [tab, setTab] = useState("party"),
    [loadedCampaign, setLoadedCampaign] = useState("");
  const loadingHeroes = !!user && !!selected && loadedCampaign !== selected;
  const campaign = user
    ? campaigns.find((c) => c.id === selected)
    : demoCampaign;
  const party = user
    ? heroes.filter((h) => h.campaign_id === selected)
    : demoHeroes;
  async function loadCampaigns(preferred?: string) {
    const d = await api("campaigns");
    setCampaigns(d.campaigns);
    setSelected((current) => preferred || current || d.campaigns[0]?.id || "");
  }
  useEffect(() => {
    api("auth")
      .then(async (d) => {
        setUser(d.user);
        if (d.user) await loadCampaigns();
      })
      .catch((e) => setError(e.message))
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!user || !selected) return;
    let cancelled = false;
    async function refresh() {
      try {
        const d = await api(`heroes?campaign=${selected}`);
        if (!cancelled) setHeroes(d.heroes);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoadedCampaign(selected);
      }
    }
    void refresh();
    const interval = setInterval(refresh, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, selected]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  function open(m: typeof modal) {
    setError("");
    setModal(m);
    setMobile(false);
  }
  function newHero() {
    if (!user) {
      open("auth");
      return;
    }
    if (!campaign) {
      open("campaign");
      return;
    }
    setActiveHero(null);
    open("hero");
  }
  async function submitAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const d = await api("auth", "POST", {
        action: authMode,
        name: f.get("name") || undefined,
        email: f.get("email"),
        password: f.get("password"),
      });
      setUser(d.user);
      await loadCampaigns();
      setModal(null);
      setNotice(`Welcome to the woodland, ${d.user.name}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submitCampaign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const d = await api(
        "campaigns",
        "POST",
        modal === "join"
          ? { action: "join", code: f.get("code") }
          : {
              action: "create",
              name: f.get("name"),
              description: f.get("description"),
              clearing: f.get("clearing"),
            },
      );
      await loadCampaigns(d.id);
      setHeroes([]);
      setModal(null);
      setTab("party");
      setNotice(
        modal === "join"
          ? "You joined the party."
          : "Your next chapter begins.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveHero(sheet: Sheet) {
    setBusy(true);
    setError("");
    try {
      const d = await api("heroes", "POST", {
        id: activeHero?.id,
        campaignId: campaign?.id,
        version: activeHero?.version,
        sheet,
      });
      setHeroes((current) =>
        activeHero
          ? current.map((h) => (h.id === activeHero.id ? d.hero : h))
          : [...current, d.hero],
      );
      setModal(null);
      setNotice("Character sheet saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const visible = party.filter(
    (h) =>
      (filter === "All playbooks" || h.sheet.playbook === filter) &&
      `${h.sheet.name} ${h.sheet.species} ${h.player}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Sprout size={30} />
          </span>
          <span>
            root<span className="brand-helper">helper</span>
          </span>
        </Link>
        <div className="sidebar-caption">THE WOODLAND COMPANION</div>
        <div className="nav-label">YOUR ADVENTURE</div>
        <button
          className={`nav-item ${tab === "party" ? "active" : ""}`}
          onClick={() => {
            setTab("party");
            setMobile(false);
          }}
        >
          <Users size={19} />
          The party<span className="nav-count">{party.length}</span>
        </button>
        <button
          className={`nav-item ${tab === "campaigns" ? "active" : ""}`}
          onClick={() => {
            setTab("campaigns");
            setMobile(false);
          }}
        >
          <Compass size={19} />
          Campaigns
        </button>
        <button className="nav-item" onClick={() => open("guide")}>
          <BookOpen size={19} />
          Field guide
          <ArrowUpRight size={15} className="push" />
        </button>
        <div className="nav-label campaign-label">
          YOUR CAMPAIGNS
          <button
            className="icon-btn"
            aria-label="Create campaign"
            onClick={() => open(user ? "campaign" : "auth")}
          >
            <Plus size={16} />
          </button>
        </div>
        {(user ? campaigns : [demoCampaign]).map((c) => (
          <button
            className={`campaign-nav ${campaign?.id === c.id ? "chosen" : ""}`}
            key={c.id}
            onClick={() => {
              setSelected(c.id);
              setTab("party");
              setMobile(false);
            }}
          >
            <span className="campaign-dot" />
            <span>{c.name}</span>
          </button>
        ))}
        <button
          className="join-nav"
          onClick={() => open(user ? "join" : "auth")}
        >
          <Plus size={15} />
          Join a campaign
        </button>
        <div className="sidebar-note">
          <Leaf size={24} />
          <p>
            Every great story starts
            <br />
            with a little wander.
          </p>
          <span>Make this one yours.</span>
        </div>
        <div className="user-box">
          <span className="user-avatar">
            {user ? user.name[0].toUpperCase() : <Feather size={19} />}
          </span>
          <div>
            <strong>{user?.name || "A wandering visitor"}</strong>
            <small>{user ? "Ready for adventure" : "Take a look around"}</small>
          </div>
          <button
            className="icon-btn"
            aria-label={user ? "Sign out" : "Sign in"}
            onClick={async () => {
              if (!user) {
                setAuthMode("login");
                open("auth");
                return;
              }
              try {
                await api("auth", "DELETE");
                setUser(null);
                setCampaigns([]);
                setHeroes([]);
                setSelected("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            {user ? <LogOut size={17} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-btn menu"
            aria-label="Toggle navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <div className="breadcrumbs">
            Your woodland
            <ChevronRight size={14} />
            <strong>{tab === "party" ? "The party" : "Campaigns"}</strong>
          </div>
          <div className="topbar-right">
            <span className="edition">ROOT: THE ROLEPLAYING GAME</span>
            {!user && (
              <button
                className="btn small"
                onClick={() => {
                  setAuthMode("login");
                  open("auth");
                }}
              >
                Sign in
                <ArrowUpRight size={14} />
              </button>
            )}
          </div>
        </header>
        <main>
          <section className="welcome">
            <div>
              <div className="eyebrow">
                <span />A PLACE FOR YOUR PARTY
              </div>
              <h1>Your woodland, together.</h1>
              <p>
                Less paper. More adventure. Keep your vagabonds close
                <br className="desktop-break" /> and let the next chapter
                unfold.
              </p>
              <button className="text-link" onClick={() => open("guide")}>
                A little help for the journey
                <ArrowUpRight size={15} />
              </button>
            </div>
            <Forest />
          </section>
          {!ready && (
            <div className="status-banner">Finding your woodland…</div>
          )}
          {!user && ready && (
            <div className="demo-banner">
              <span>
                <Sprout size={17} />
                <strong>A peek into the woodland.</strong> You’re exploring a
                sample party.
              </span>
              <button
                onClick={() => {
                  setAuthMode("signup");
                  open("auth");
                }}
              >
                Start your own adventure
                <ArrowUpRight size={15} />
              </button>
            </div>
          )}
          {error && !modal && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          {tab === "campaigns" ? (
            <>
              <div className="section-heading">
                <div>
                  <div className="eyebrow">STORIES WORTH TELLING</div>
                  <h2>Your campaigns</h2>
                </div>
                <button
                  className="btn primary"
                  onClick={() => open(user ? "campaign" : "auth")}
                >
                  <Plus size={17} />
                  New campaign
                </button>
              </div>
              <div className="campaign-grid">
                {(user ? campaigns : [demoCampaign]).map((c) => (
                  <button
                    className="campaign-tile"
                    key={c.id}
                    onClick={() => {
                      setSelected(c.id);
                      setTab("party");
                    }}
                  >
                    <Compass size={30} />
                    <h3>{c.name}</h3>
                    <p>{c.description || "A new story in the woodland."}</p>
                    <span>
                      <MapPin size={14} />
                      {c.clearing || "Somewhere in the woodland"}
                    </span>
                    <small>
                      {c.members} {c.members === 1 ? "player" : "players"}
                      <ArrowUpRight size={16} />
                    </small>
                  </button>
                ))}
                <button
                  className="campaign-tile new-campaign"
                  onClick={() => open(user ? "join" : "auth")}
                >
                  <Plus size={30} />
                  <h3>There’s room at the table.</h3>
                  <p>Have an invite code? Join your friends.</p>
                </button>
              </div>
            </>
          ) : (
            <>
              <section className="campaign-heading">
                <div className="campaign-symbol">
                  <Compass size={26} />
                </div>
                <div>
                  <div className="eyebrow">
                    {user ? "CURRENT CAMPAIGN" : "SAMPLE CAMPAIGN"}
                  </div>
                  <h2>{campaign?.name || "Your story starts here"}</h2>
                  <div className="campaign-meta">
                    <span>
                      <MapPin size={14} />
                      {campaign?.clearing || "Choose your first clearing"}
                    </span>
                    <span className="meta-divider" />
                    <span>
                      <Users size={14} />
                      {campaign?.members || 0} players
                    </span>
                    <span className="campaign-status">
                      {campaign ? "On the road" : "A new beginning"}
                    </span>
                  </div>
                </div>
                {user && campaign && (
                  <button
                    className="btn invite"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          campaign.invite_code,
                        );
                        setNotice(
                          "Invite code copied. Share it with your party.",
                        );
                      } catch {
                        setNotice(`Invite code: ${campaign.invite_code}`);
                      }
                    }}
                  >
                    <Copy size={15} />
                    Invite players
                  </button>
                )}
              </section>
              <div className="section-heading">
                <div className="party-title">
                  <h2>The vagabonds</h2>
                  <span className="pill">{party.length}</span>
                </div>
                <button className="btn primary" onClick={newHero}>
                  <Plus size={17} />
                  Create a character
                </button>
              </div>
              <div className="filters">
                <label className="search">
                  <Search size={17} />
                  <input
                    placeholder="Find a vagabond…"
                    aria-label="Find a vagabond"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Filter by playbook"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option>All playbooks</option>
                  {playbooks.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <span className="filter-caption">
                  A few unlikely heroes. One shared story.
                </span>
              </div>
              <div className="hero-grid">
                {loadingHeroes ? (
                  <div className="empty-state">
                    <Leaf />
                    <h3>Gathering the party…</h3>
                  </div>
                ) : (
                  visible.map((hero, i) => (
                    <button
                      className="hero-card"
                      key={hero.id}
                      onClick={() => {
                        setActiveHero(hero);
                        open("hero");
                      }}
                    >
                      <div className={`card-art art-${i % 3}`}>
                        <span className="playbook-badge">
                          <Feather size={12} />
                          {hero.sheet.playbook}
                        </span>
                        <Portrait species={hero.sheet.species} variant={i} />
                        <span className="card-arrow">
                          <ArrowUpRight size={17} />
                        </span>
                      </div>
                      <div className="card-body">
                        <div className="hero-name">
                          <h3>{hero.sheet.name}</h3>
                          <span>{hero.sheet.pronouns}</span>
                        </div>
                        <div className="species-line">
                          {hero.sheet.species} · {hero.sheet.playbook}
                        </div>
                        <p className="hero-description">
                          {hero.sheet.description ||
                            "A new face on the woodland paths."}
                        </p>
                        <div className="stat-row">
                          {stats.map((s) => (
                            <div key={s}>
                              <span>{s.slice(0, 3)}</span>
                              <strong>{signed(hero.sheet.stats[s])}</strong>
                            </div>
                          ))}
                        </div>
                        <div className="mini-tracks">
                          {(["injury", "exhaustion", "depletion"] as const).map(
                            (t) => (
                              <div key={t}>
                                <span>{t}</span>
                                <div>
                                  {[1, 2, 3, 4].map((v) => (
                                    <i
                                      key={v}
                                      className={
                                        v <= hero.sheet[t] ? "marked" : ""
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                        <div className="card-footer">
                          <span>
                            <span className={`player-dot dot-${i % 3}`}>
                              {hero.player[0]}
                            </span>
                            {hero.player}
                          </span>
                          <span>
                            Open sheet
                            <ChevronRight size={14} />
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
                {!loadingHeroes && party.length === 0 && (
                  <div className="empty-state">
                    <Sprout size={34} />
                    <h3>The woodland is waiting.</h3>
                    <p>
                      {campaign
                        ? "Create your first character and invite your friends."
                        : "Create a campaign to give your vagabonds a home."}
                    </p>
                    <button
                      className="btn"
                      onClick={() => (campaign ? newHero() : open("campaign"))}
                    >
                      {campaign ? "Create a character" : "Create a campaign"}
                      <Plus size={16} />
                    </button>
                  </div>
                )}
                {party.length > 0 && visible.length === 0 && !loadingHeroes && (
                  <div className="empty-state">
                    <Search />
                    <h3>No vagabonds found.</h3>
                    <p>Try a different name or playbook.</p>
                  </div>
                )}
              </div>
              <div className="journey-note">
                <span className="note-icon">
                  <ScrollText size={24} />
                </span>
                <div>
                  <h3>A character is more than their stats.</h3>
                  <p>
                    Give them a past, a few bonds, and something worth wandering
                    for.
                  </p>
                </div>
                <button className="text-link" onClick={() => open("guide")}>
                  Explore the field guide
                  <ArrowUpRight size={15} />
                </button>
              </div>
            </>
          )}
          <footer>
            <span>
              <Sprout size={15} />
              Made for stories around the table.
            </span>
            <span>
              Unofficial fan companion · Root © Leder Games / Magpie Games
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
      {modal === "auth" && (
        <Modal
          title={
            authMode === "signup"
              ? "A seat at the table."
              : "Welcome back, wanderer."
          }
          close={() => !busy && setModal(null)}
        >
          <p className="modal-subtitle">
            Save your characters and share the adventure with your party.
          </p>
          <form onSubmit={submitAuth}>
            {authMode === "signup" && (
              <label>
                Your name
                <input
                  name="name"
                  required
                  maxLength={60}
                  autoComplete="name"
                  placeholder="What should we call you?"
                />
              </label>
            )}
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                minLength={8}
                maxLength={128}
                required
                autoComplete={
                  authMode === "signup" ? "new-password" : "current-password"
                }
                placeholder="At least 8 characters"
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button disabled={busy} className="btn primary full">
              {busy
                ? "Opening the gate…"
                : authMode === "signup"
                  ? "Begin your adventure"
                  : "Sign in"}
              <ArrowUpRight size={17} />
            </button>
            <p className="switch-auth">
              {authMode === "signup"
                ? "Already have an account?"
                : "New to the woodland?"}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "signup" ? "login" : "signup");
                  setError("");
                }}
              >
                {authMode === "signup" ? "Sign in" : "Create an account"}
              </button>
            </p>
            <small className="auth-note">
              Keep your password safe. Email recovery is not available in this
              first version.
            </small>
          </form>
        </Modal>
      )}
      {(modal === "campaign" || modal === "join") && (
        <Modal
          title={modal === "join" ? "Find your party." : "Begin a new chapter."}
          close={() => !busy && setModal(null)}
        >
          <form onSubmit={submitCampaign}>
            {modal === "join" ? (
              <>
                <p className="modal-subtitle">
                  Ask someone in your campaign for their invite code.
                </p>
                <label>
                  Campaign invite code
                  <input
                    name="code"
                    required
                    minLength={16}
                    maxLength={16}
                    placeholder="16-character invite code"
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  Campaign name
                  <input
                    name="name"
                    required
                    maxLength={100}
                    placeholder="Whispers of the Woodland"
                  />
                </label>
                <label>
                  Current clearing
                  <input
                    name="clearing"
                    maxLength={80}
                    placeholder="Pellenicky Glade"
                  />
                </label>
                <label>
                  A little about the adventure
                  <textarea
                    name="description"
                    maxLength={500}
                    rows={3}
                    placeholder="What brings this unlikely party together?"
                  />
                </label>
              </>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button disabled={busy} className="btn primary full">
              {busy
                ? "Saving…"
                : modal === "join"
                  ? "Join the campaign"
                  : "Create campaign"}
              <ArrowUpRight size={16} />
            </button>
          </form>
        </Modal>
      )}
      {modal === "hero" && (
        <SheetEditor
          key={activeHero?.id || "new"}
          hero={activeHero}
          editable={!!user && (!activeHero || activeHero.owner_id === user.id)}
          busy={busy}
          error={error}
          close={() => !busy && setModal(null)}
          save={saveHero}
        />
      )}
      {modal === "guide" && (
        <Modal title="A little field guide." close={() => setModal(null)}>
          <div className="guide">
            <Compass />
            <h3>Gather your party</h3>
            <p>
              Create an account, start a campaign, and share its invite code.
              Your friends can join from the sidebar.
            </p>
            <Feather />
            <h3>Make a vagabond</h3>
            <p>
              Pick a name, species, and playbook. Fill in your attributes,
              nature, drives, bonds, and moves using your playbook. New sheets
              start with neutral stats; this is not a rules-validated character
              builder.
            </p>
            <Heart />
            <h3>Keep the story close</h3>
            <p>
              Mark injury, exhaustion, and depletion, track equipment wear and
              faction reputation, then save your sheet. Your party sees saved
              changes within 15 seconds.
            </p>
            <Dices />
            <h3>Let the dice tell the story</h3>
            <p>
              The sheet includes a 2d6 roller with your chosen attribute. Follow
              your playbook and your GM’s interpretation for the result.
            </p>
            <a
              className="btn"
              href="https://magpiegames.com/collections/root"
              target="_blank"
              rel="noreferrer"
            >
              Official Root RPG resources
              <ArrowUpRight size={16} />
            </a>
            <small>
              This is an independent fan tool, not an official game or a
              replacement for the rulebook.
            </small>
          </div>
        </Modal>
      )}
    </div>
  );
}
function SheetEditor({
  hero,
  editable,
  close,
  save,
  busy,
  error,
}: {
  hero: Hero | null;
  editable: boolean;
  close: () => void;
  save: (sheet: Sheet) => void;
  busy: boolean;
  error: string;
}) {
  const [sheet, setSheet] = useState<Sheet>(() =>
      hero ? structuredClone(hero.sheet) : blankSheet(),
    ),
    [page, setPage] = useState("Character"),
    [roll, setRoll] = useState(""),
    [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false);
  useEffect(() => {
    if (!dirty || !editable) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, editable]);
  function change<K extends keyof Sheet>(key: K, value: Sheet[K]) {
    setSheet((s) => ({ ...s, [key]: value }));
    setDirty(true);
  }
  function requestClose() {
    if (dirty && editable) setDiscard(true);
    else close();
  }
  function note(
    key:
      | "nature"
      | "drives"
      | "bonds"
      | "biography"
      | "moves"
      | "feats"
      | "weaponSkills",
    label: string,
    placeholder: string,
  ) {
    return (
      <label>
        {label}
        <textarea
          aria-label={label}
          disabled={!editable}
          rows={key === "biography" ? 5 : 3}
          maxLength={6000}
          value={sheet[key]}
          placeholder={placeholder}
          onChange={(e) => change(key, e.target.value)}
        />
      </label>
    );
  }
  return (
    <Modal
      wide
      title={
        hero ? `${sheet.name}’s character sheet` : "Meet your next vagabond."
      }
      close={requestClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(sheet);
        }}
      >
        <div className="sheet-intro">
          <div className="sheet-portrait">
            <Portrait species={sheet.species} />
          </div>
          <div>
            <div className="eyebrow">
              {hero ? `${hero.player}’S VAGABOND` : "A NEW STORY BEGINS"}
            </div>
            <h3>{sheet.name || "An unlikely hero"}</h3>
            <p>
              {sheet.species} · {sheet.playbook}
            </p>
            {!editable && (
              <small>
                {hero?.id.startsWith("demo")
                  ? "Sample sheet · Create an account to make your own."
                  : "Party view · Only this character’s player can edit."}
              </small>
            )}
          </div>
        </div>
        <div className="sheet-tabs">
          {["Character", "Story & moves", "Equipment", "Reputation"].map(
            (p) => (
              <button
                type="button"
                key={p}
                className={page === p ? "selected" : ""}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ),
          )}
        </div>
        <fieldset disabled={!editable || busy}>
          <div hidden={page !== "Character"}>
            <div className="form-grid">
              <label>
                Name
                <input
                  required
                  maxLength={80}
                  value={sheet.name}
                  placeholder="Rowan, Bramble, Moss…"
                  onChange={(e) => change("name", e.target.value)}
                />
              </label>
              <label>
                Pronouns
                <input
                  maxLength={40}
                  value={sheet.pronouns}
                  placeholder="they / them"
                  onChange={(e) => change("pronouns", e.target.value)}
                />
              </label>
              <label>
                Species
                <select
                  aria-label="Species"
                  value={sheet.species}
                  onChange={(e) => change("species", e.target.value)}
                >
                  {species.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Playbook
                <select
                  aria-label="Playbook"
                  value={sheet.playbook}
                  onChange={(e) => change("playbook", e.target.value)}
                >
                  {playbooks.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              A few words about them
              <input
                maxLength={240}
                value={sheet.description}
                placeholder="A quiet pathfinder with a debt to the forest."
                onChange={(e) => change("description", e.target.value)}
              />
            </label>
            <h4>
              <Shield size={16} />
              Attributes
            </h4>
            <div className="attribute-inputs">
              {stats.map((s) => (
                <label key={s}>
                  {s}
                  <select
                    aria-label={s}
                    value={sheet.stats[s]}
                    onChange={(e) =>
                      change("stats", {
                        ...sheet.stats,
                        [s]: Number(e.target.value),
                      })
                    }
                  >
                    {[-3, -2, -1, 0, 1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {signed(n)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p className="field-hint">
              Set starting attributes from your chosen playbook.
            </p>
            <h4>
              <Heart size={16} />
              The cost of adventure
            </h4>
            <div className="harm-tracks">
              {(["injury", "exhaustion", "depletion"] as const).map((t) => (
                <Track
                  key={t}
                  label={t}
                  value={sheet[t]}
                  onChange={editable ? (n) => change(t, n) : undefined}
                />
              ))}
            </div>
            <label className="advancement">
              Advancement marks
              <input
                type="number"
                min={0}
                max={20}
                value={sheet.advancement}
                onChange={(e) => change("advancement", Number(e.target.value))}
              />
            </label>
          </div>
          <div hidden={page !== "Story & moves"}>
            <div className="form-grid">
              {note(
                "nature",
                "Nature",
                "What restores them? What is their instinct?",
              )}
              {note("drives", "Drives", "What keeps them moving?")}
            </div>
            {note(
              "bonds",
              "Bonds",
              "Who do they trust? Who knows their secrets?",
            )}
            {note(
              "biography",
              "Biography",
              "Where did they come from, and what did they leave behind?",
            )}
            {note(
              "moves",
              "Moves",
              "Record your playbook moves and their effects.",
            )}
            <div className="form-grid">
              {note("feats", "Roguish feats", "Acrobatics, lockpicking…")}
              {note(
                "weaponSkills",
                "Weapon skills",
                "Record your trained weapon skills.",
              )}
            </div>
          </div>
          <div hidden={page !== "Equipment"}>
            <h4>
              <Backpack size={17} />
              Carried equipment{" "}
              <span className="push">
                Total load: {sheet.equipment.reduce((a, e) => a + e.load, 0)}
              </span>
            </h4>
            {sheet.equipment.length === 0 && (
              <p className="field-hint">
                Every traveler starts with a story and a few belongings.
              </p>
            )}
            {sheet.equipment.map((item, i) => (
              <div className="equipment-item" key={i}>
                <div className="equipment-title">
                  <label>
                    Item name
                    <input
                      maxLength={100}
                      value={item.name}
                      onChange={(e) =>
                        change(
                          "equipment",
                          sheet.equipment.map((x, j) =>
                            j === i ? { ...x, name: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                  {editable && (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Remove ${item.name || "item"}`}
                      onClick={() =>
                        change(
                          "equipment",
                          sheet.equipment.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <label>
                  Details & tags
                  <input
                    maxLength={500}
                    value={item.details}
                    onChange={(e) =>
                      change(
                        "equipment",
                        sheet.equipment.map((x, j) =>
                          j === i ? { ...x, details: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
                <div className="equipment-bottom">
                  <Track
                    label="Wear"
                    value={item.wear}
                    onChange={
                      editable
                        ? (n) =>
                            change(
                              "equipment",
                              sheet.equipment.map((x, j) =>
                                j === i ? { ...x, wear: n } : x,
                              ),
                            )
                        : undefined
                    }
                  />
                  <label>
                    Load
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={item.load}
                      onChange={(e) =>
                        change(
                          "equipment",
                          sheet.equipment.map((x, j) =>
                            j === i
                              ? { ...x, load: Number(e.target.value) }
                              : x,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
            {editable && (
              <button
                className="btn"
                type="button"
                disabled={sheet.equipment.length >= 30}
                onClick={() =>
                  change("equipment", [
                    ...sheet.equipment,
                    { name: "", details: "", wear: 0, load: 1 },
                  ])
                }
              >
                <Plus size={16} />
                Add equipment
              </button>
            )}
          </div>
          <div hidden={page !== "Reputation"}>
            <p className="field-hint">
              Keep faction standing and the prestige / notoriety marks from your
              paper sheet. Apply reputation changes according to your rulebook.
            </p>
            {sheet.reputation.map((f, i) => (
              <div className="reputation-item" key={i}>
                <label>
                  Faction
                  <input
                    maxLength={80}
                    value={f.faction}
                    onChange={(e) =>
                      change(
                        "reputation",
                        sheet.reputation.map((x, j) =>
                          j === i ? { ...x, faction: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
                <div className="form-grid reputation-numbers">
                  {(["standing", "prestige", "notoriety"] as const).map((k) => (
                    <label key={k}>
                      {k}
                      <input
                        type="number"
                        min={k === "standing" ? -3 : 0}
                        max={k === "standing" ? 3 : 15}
                        value={f[k]}
                        onChange={(e) =>
                          change(
                            "reputation",
                            sheet.reputation.map((x, j) =>
                              j === i
                                ? { ...x, [k]: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
                {editable && (
                  <button
                    type="button"
                    className="text-link"
                    onClick={() =>
                      change(
                        "reputation",
                        sheet.reputation.filter((_, j) => j !== i),
                      )
                    }
                  >
                    Remove faction
                  </button>
                )}
              </div>
            ))}
            {editable && (
              <button
                className="btn"
                type="button"
                disabled={sheet.reputation.length >= 12}
                onClick={() =>
                  change("reputation", [
                    ...sheet.reputation,
                    { faction: "", standing: 0, prestige: 0, notoriety: 0 },
                  ])
                }
              >
                <Plus size={16} />
                Add faction
              </button>
            )}
          </div>
        </fieldset>
        <div className="dice-area">
          <div>
            <Dices size={17} />
            <strong>Roll 2d6 +</strong>
            {stats.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  const die = () => {
                    const v = new Uint32Array(1);
                    do {
                      crypto.getRandomValues(v);
                    } while (v[0] >= 4294967292);
                    return (v[0] % 6) + 1;
                  };
                  const a = die(),
                    b = die();
                  setRoll(
                    `${a} + ${b} ${signed(sheet.stats[s])} (${s}) = ${a + b + sheet.stats[s]}`,
                  );
                }}
              >
                {s}
              </button>
            ))}
          </div>
          {roll && <p role="status">{roll}</p>}
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {discard ? (
          <div className="discard-prompt">
            <p>You have unsaved changes.</p>
            <button
              className="btn"
              type="button"
              onClick={() => setDiscard(false)}
            >
              Keep editing
            </button>
            <button className="btn" type="button" onClick={close}>
              Discard changes
            </button>
          </div>
        ) : (
          <div className="sheet-actions">
            <span>
              {editable
                ? dirty
                  ? "Unsaved changes"
                  : "Your story, safely kept."
                : "A little glimpse into another story."}
            </span>
            <button className="btn" type="button" onClick={requestClose}>
              Close
            </button>
            {editable && (
              <button className="btn primary" disabled={busy}>
                {busy ? "Saving…" : "Save character"}
                <Check size={16} />
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
