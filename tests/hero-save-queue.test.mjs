import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { rules } from "./load-typescript.mjs";
const require = createRequire(import.meta.url);
const { HeroSaveQueue } = require("../src/lib/hero-save-queue.ts");
const { ApiError } = require("../src/lib/client-api.ts");
const hero = () => ({
  id: "hero",
  owner_id: "owner",
  campaign_id: "game",
  version: 1,
  sheet: { ...rules.newCharacterSheet(), hold: 0, forward: 1 },
});
const tick = () => new Promise((resolve) => setImmediate(resolve));
function fixture() {
  const requests = [],
    saved = [];
  const queue = new HeroSaveQueue(
    hero(),
    (next) =>
      new Promise((resolve, reject) =>
        requests.push({ next, resolve, reject }),
      ),
    (next) => saved.push(next),
  );
  const finish = async (index) => {
    const { next, resolve } = requests[index];
    resolve({ ...next, version: next.version + 1 });
    await tick();
  };
  return { queue, requests, saved, finish };
}

test("rapid clicks are visible immediately and coalesce behind one ordered request", async () => {
  const { queue, requests, finish } = fixture();
  for (let i = 0; i < 5; i++)
    queue.update({ hold: queue.getSnapshot().hero.sheet.hold + 1 });
  queue.update({ injury: 2, forward: 0 });
  assert.equal(queue.getSnapshot().hero.sheet.hold, 5);
  assert.equal(requests.length, 1);
  queue.receive({ ...hero(), sheet: { ...hero().sheet, hold: 0 } });
  assert.equal(queue.getSnapshot().hero.sheet.hold, 5);
  await finish(0);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].next.version, 2);
  assert.equal(requests[1].next.sheet.hold, 5);
  assert.equal(requests[1].next.sheet.forward, 0);
  assert.equal(queue.getSnapshot().hero.sheet.hold, 5);
  await finish(1);
  assert.equal(queue.getSnapshot().pending, false);
  assert.equal(queue.getSnapshot().hero.version, 3);
  queue.receive(hero());
  assert.equal(queue.getSnapshot().hero.version, 3);
});

test("failed saves retain later edits and retry without duplicating increments", async () => {
  const { queue, requests, finish } = fixture();
  queue.update({ hold: 1 });
  queue.update({ hold: 2, injury: 1 });
  requests[0].reject(new Error("Offline"));
  await tick();
  queue.update({ hold: 3 });
  assert.equal(requests.length, 1, "paused until explicit retry");
  assert.equal(queue.getSnapshot().hero.sheet.hold, 3);
  assert.equal(queue.getSnapshot().pending, true);
  queue.retry();
  queue.retry();
  assert.equal(requests.length, 2);
  assert.equal(requests[1].next.sheet.hold, 3);
  assert.equal(requests[1].next.sheet.injury, 1);
  assert.equal(requests[1].next.version, 1);
  await finish(1);
  assert.equal(queue.getSnapshot().pending, false);
});

test("version conflict preserves the draft and requires explicit recovery", async () => {
  const { queue, requests } = fixture();
  queue.update({ hold: 1 });
  requests[0].reject(new ApiError("Changed elsewhere", 409));
  await tick();
  const latest = {
    ...hero(),
    version: 2,
    sheet: { ...hero().sheet, injury: 3 },
  };
  queue.receive(latest);
  queue.retry();
  assert.equal(queue.update({ hold: 2 }), false);
  assert.equal(requests.length, 1);
  assert.equal(queue.getSnapshot().hero.sheet.hold, 1);
  queue.discardAndReload(latest);
  assert.equal(queue.getSnapshot().hero.sheet.injury, 3);
  assert.equal(queue.getSnapshot().pending, false);
  assert.equal(queue.getSnapshot().conflict, false);
  queue.update({ hold: 1 });
  assert.equal(requests[1].next.version, 2);
});

test("save continues with no mounted subscriber and survives returning to the game", async () => {
  const { queue, requests, finish } = fixture();
  let changes = 0;
  const unsubscribe = queue.subscribe(() => changes++);
  queue.update({ hold: 1 });
  queue.update({ hold: 2 });
  unsubscribe();
  const before = changes;
  await finish(0);
  await finish(1);
  assert.equal(changes, before);
  assert.equal(requests.length, 2);
  assert.equal(queue.getSnapshot().hero.sheet.hold, 2);
  assert.equal(queue.getSnapshot().pending, false);
});
