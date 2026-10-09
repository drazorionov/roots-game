import type { Hero, Sheet } from "./sheet";
import { ApiError } from "./client-api";

type Snapshot = {
  hero: Hero;
  pending: boolean;
  saving: boolean;
  saved: boolean;
  error: string;
  conflict: boolean;
};
type Save = (hero: Hero) => Promise<Hero>;

// One writer per character. Later clicks are merged on top of the acknowledged
// version, never sent concurrently or replaced by a stale poll/save response.
export class HeroSaveQueue {
  private base: Hero;
  private patch: Partial<Sheet> = {};
  private listeners = new Set<() => void>();
  private snapshot: Snapshot;

  constructor(
    hero: Hero,
    private save: Save,
    private onSaved: (hero: Hero) => void,
  ) {
    this.base = hero;
    this.snapshot = {
      hero,
      pending: false,
      saving: false,
      saved: false,
      error: "",
      conflict: false,
    };
  }

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(change: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...change };
    this.listeners.forEach((listener) => listener());
  }

  receive(hero: Hero) {
    if (
      hero.id !== this.base.id ||
      this.snapshot.pending ||
      hero.version <= this.base.version
    )
      return;
    this.base = hero;
    this.publish({ hero });
  }

  update(patch: Partial<Sheet>) {
    if (this.snapshot.conflict) return false;
    this.patch = { ...this.patch, ...patch };
    this.publish({
      hero: {
        ...this.snapshot.hero,
        sheet: { ...this.snapshot.hero.sheet, ...patch },
      },
      pending: true,
      saved: false,
    });
    if (!this.snapshot.error) void this.flush();
    return true;
  }

  retry = () => {
    if (this.snapshot.conflict || this.snapshot.saving) return;
    this.publish({ error: "" });
    void this.flush();
  };

  // Explicit recovery only: a poll must never discard unsaved edits.
  discard = () => this.discardAndReload(this.base);

  discardAndReload(hero: Hero) {
    if (this.snapshot.saving || hero.id !== this.base.id) return;
    this.base = hero;
    this.patch = {};
    this.onSaved(hero);
    this.publish({
      hero,
      pending: false,
      saved: false,
      error: "",
      conflict: false,
    });
  }

  private async flush() {
    if (this.snapshot.saving || !this.snapshot.pending || this.snapshot.error)
      return;
    const sent = this.patch;
    this.patch = {};
    const request = { ...this.base, sheet: { ...this.base.sheet, ...sent } };
    this.publish({ saving: true });
    try {
      const hero = await this.save(request);
      this.base = hero;
      this.onSaved(hero);
      const pending = Object.keys(this.patch).length > 0;
      this.publish({
        hero: { ...hero, sheet: { ...hero.sheet, ...this.patch } },
        pending,
        saving: false,
        saved: !pending,
      });
      if (pending) void this.flush();
    } catch (error) {
      this.patch = { ...sent, ...this.patch };
      this.publish({
        saving: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to connect. Please try again.",
        conflict:
          error instanceof ApiError && [401, 403, 409].includes(error.status),
      });
    }
  }
}
