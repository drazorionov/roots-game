"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Shield,
  RefreshCw,
  Search,
  UserRound,
  Users,
  BookOpen,
  Activity,
  Ban,
  Trash2,
  ShieldCheck,
  Mail,
} from "lucide-react";
import { api } from "@/lib/client-api";
import { useTranslation } from "@/lib/i18n";
import type { Hero, Campaign, User } from "@/lib/sheet";
import "./admin-panel.css";

type AdminUser = User & {
  created_at: string;
  banned_at: string | null;
  active_sessions: number;
  heroes: Hero[];
  campaigns: Campaign[];
  memberships: {
    campaign_id: string;
    name: string;
    last_seen: string | null;
  }[];
};
type Directory = { users: AdminUser[]; maxUsers: number };

export default function AdminPanel({ back }: { back: () => void }) {
  const { t, locale } = useTranslation();
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [purge, setPurge] = useState<AdminUser | null>(null);
  const [confirmation, setConfirmation] = useState("");
  useEffect(() => {
    let cancelled = false;
    api("admin")
      .then((data) => {
        if (!cancelled) setDirectory(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      setDirectory(await api("admin"));
    } catch (e) {
      setError((e as Error).message);
      setDirectory(null);
    } finally {
      setBusy(false);
    }
  }
  async function act(
    user: AdminUser,
    action: "ban" | "unban" | "purge" | "recover",
  ) {
    if (busy) return;
    if (
      action === "ban" &&
      !window.confirm(
        t("Ban {email}? All sessions will end immediately.", {
          email: user.email,
        }),
      )
    )
      return;
    if (
      action === "recover" &&
      !window.confirm(
        t("Send a temporary sign-in code to {email}?", { email: user.email }),
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("admin", "POST", { id: user.id, action, confirmation });
      setPurge(null);
      setConfirmation("");
      // Remove purged data before reloading so a network failure cannot leave it visible.
      setDirectory(null);
      setNotice(
        action === "recover"
          ? "If this account is eligible, a temporary code will arrive by email. Check your spam folder too."
          : "User updated.",
      );
      setDirectory(await api("admin"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const date = (value: string) => new Date(value).toLocaleString(locale);
  const users =
    directory?.users.filter((u) =>
      `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase()),
    ) || [];
  return (
    <section
      className="journey-picker collection-page admin-panel"
      aria-labelledby="admin-title"
    >
      <button className="text-link admin-back" onClick={back}>
        <ArrowLeft size={16} />
        {t("Back")}
      </button>
      <div className="page-heading admin-heading">
        <h1 id="admin-title">
          <Shield size={28} />
          {t("Administration")}
        </h1>
        <div className="admin-toolbar">
          <label className="admin-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              aria-label={t("Search users")}
              placeholder={t("Search users")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button
            className="icon-btn admin-refresh"
            disabled={busy}
            onClick={refresh}
            aria-label={t("Refresh")}
            title={t("Refresh")}
          >
            <RefreshCw size={19} />
          </button>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
      {notice && <p role="status">{t(notice)}</p>}
      {!directory && !error && <p role="status">{t("Loading…")}</p>}
      {directory && (
        <>
          <div className="admin-summary">
            <p className="admin-capacity">
              {t("{count} / {max} users", {
                count: directory.users.length,
                max: directory.maxUsers,
              })}
            </p>
            <p className="admin-limit-note">
              {t(
                "Banned accounts count toward the limit. Purging an account frees a place.",
              )}
            </p>
          </div>
          <div className="admin-users">
            {users.map((user) => (
              <article
                key={user.id}
                className={`admin-user ${user.banned_at ? "is-banned" : ""}`}
              >
                <div className="admin-user-heading">
                  <span className="admin-user-emblem" aria-hidden="true">
                    {user.isAdmin ? (
                      <Shield size={30} strokeWidth={1.5} />
                    ) : (
                      <UserRound size={30} strokeWidth={1.5} />
                    )}
                  </span>
                  <div className="admin-user-identity">
                    <h2>{user.name}</h2>
                    <p>{user.email}</p>
                  </div>
                </div>
                <strong
                  className={`admin-status ${user.banned_at ? "admin-banned" : ""}`}
                >
                  {t(
                    user.isAdmin
                      ? "Administrator"
                      : user.banned_at
                        ? "Banned"
                        : "Active",
                  )}
                </strong>
                <p className="admin-created">
                  {t("Created")}: {date(user.created_at)}
                </p>
                {user.banned_at && (
                  <p>
                    {t("Banned")}: {date(user.banned_at)}
                  </p>
                )}
                <dl className="admin-user-stats">
                  <div>
                    <dt>
                      <BookOpen size={20} aria-hidden="true" />
                      {t("Characters")}
                    </dt>
                    <dd>{user.heroes.length}</dd>
                  </div>
                  <div>
                    <dt>
                      <Users size={20} aria-hidden="true" />
                      {t("Owned campaigns")}
                    </dt>
                    <dd>{user.campaigns.length}</dd>
                  </div>
                  <div>
                    <dt>
                      <Activity size={20} aria-hidden="true" />
                      {t("Active sessions")}
                    </dt>
                    <dd>{user.active_sessions}</dd>
                  </div>
                </dl>
                <details className="admin-data">
                  <summary>{t("View all user data")}</summary>
                  <p>
                    {t("User ID")}: {user.id}
                  </p>
                  <h3>{t("Characters")}</h3>
                  {user.heroes.map((hero) => (
                    <details key={hero.id}>
                      <summary>
                        {hero.sheet.name || t("Unnamed character")}
                      </summary>
                      <pre>{JSON.stringify(hero, null, 2)}</pre>
                    </details>
                  ))}
                  <h3>{t("Owned campaigns")}</h3>
                  {user.campaigns.map((campaign) => (
                    <details key={campaign.id}>
                      <summary>{campaign.name}</summary>
                      <pre>{JSON.stringify(campaign, null, 2)}</pre>
                    </details>
                  ))}
                  <h3>{t("Campaign memberships")}</h3>
                  {user.memberships.map((membership) => (
                    <p key={membership.campaign_id}>
                      {membership.name} · {membership.campaign_id}
                      {membership.last_seen &&
                        ` · ${t("Last seen")}: ${date(membership.last_seen)}`}
                    </p>
                  ))}
                </details>
                {!user.isAdmin && (
                  <div className="admin-actions">
                    <button
                      className="btn small"
                      disabled={busy}
                      onClick={() =>
                        act(user, user.banned_at ? "unban" : "ban")
                      }
                    >
                      {user.banned_at ? (
                        <ShieldCheck size={16} />
                      ) : (
                        <Ban size={16} />
                      )}
                      {t(user.banned_at ? "Unban user" : "Ban user")}
                    </button>
                    <button
                      className="btn small danger"
                      disabled={busy}
                      onClick={() => {
                        setPurge(user);
                        setConfirmation("");
                      }}
                    >
                      <Trash2 size={16} />
                      {t("Purge user")}
                    </button>
                  </div>
                )}
                {!user.banned_at && (
                  <div className="admin-actions">
                    <button
                      className="btn small"
                      disabled={busy}
                      onClick={() => act(user, "recover")}
                    >
                      <Mail size={16} />
                      {t("Send recovery email")}
                    </button>
                  </div>
                )}
                {purge?.id === user.id && (
                  <form
                    className="admin-confirm"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void act(user, "purge");
                    }}
                  >
                    <p>
                      {t(
                        "Permanently delete this account, all its characters, and its owned campaigns? Other players keep their characters. This cannot be undone.",
                      )}
                    </p>
                    <label>
                      {t("Type {email} to confirm", { email: user.email })}
                      <input
                        type="email"
                        autoComplete="off"
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                        disabled={busy}
                        required
                      />
                    </label>
                    <div className="admin-actions">
                      <button
                        className="btn danger"
                        disabled={busy || confirmation !== user.email}
                      >
                        {t("Permanently purge")}
                      </button>
                      <button
                        className="btn"
                        type="button"
                        disabled={busy}
                        onClick={() => setPurge(null)}
                      >
                        {t("Cancel")}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            ))}
            {!users.length && <p>{t("No users found.")}</p>}
          </div>
        </>
      )}
    </section>
  );
}
