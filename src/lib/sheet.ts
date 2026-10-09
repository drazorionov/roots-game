import { z } from "zod";

export const stats = ["Charm", "Cunning", "Finesse", "Luck", "Might"] as const;
export const playbooks = [
  "Adventurer",
  "Arbiter",
  "Harrier",
  "Ranger",
  "Ronin",
  "Scoundrel",
  "Thief",
  "Tinker",
  "Vagrant",
];
export const species = [
  "Fox",
  "Rabbit",
  "Mouse",
  "Raccoon",
  "Cat",
  "Owl",
  "Otter",
  "Badger",
  "Squirrel",
  "Wolf",
];
const note = z.string().max(6000);
const selections = z.array(z.string().max(100)).max(30).default([]);
export const harmTracks = ["injury", "exhaustion", "depletion"] as const;
export function harmCapacity(
  sheet: {
    harmSlots: { injury: number; exhaustion: number; depletion: number };
    moveIds: string[];
  },
  track: (typeof harmTracks)[number],
) {
  const extras =
    track === "injury" && sheet.moveIds.includes("Hardy")
      ? 1
      : track === "exhaustion" && sheet.moveIds.includes("Cross Country")
        ? 1
        : track === "depletion" && sheet.moveIds.includes("Big Pockets")
          ? 2
          : 0;
  return sheet.harmSlots[track] + extras;
}
export const equipmentSchema = z
  .object({
    name: z.string().max(100),
    // Legacy categories remain readable; the editor offers Weapon and Item.
    kind: z.enum(["item", "weapon", "gear", "armor"]).default("gear"),
    visualId: z.string().max(80).default(""),
    range: z.string().max(80).default(""),
    harm: z.number().int().min(0).max(4).default(1),
    harmType: z
      .enum([
        "injury",
        "exhaustion",
        "wear",
        "morale",
        "depletion",
        "special",
        "none",
      ])
      .default("injury"),
    harmDetails: z.string().max(500).default(""),
    skillTags: selections,
    specialTags: selections,
    tagSettings: z.string().max(500).default(""),
    details: z.string().max(500),
    wear: z.number().int().min(0).max(8),
    maxWear: z.number().int().min(0).max(8).default(4),
    secondaryWear: z.number().int().min(0).max(8).default(0),
    secondaryMaxWear: z.number().int().min(0).max(8).default(0),
    value: z.number().int().min(0).max(100).default(0),
    load: z.number().int().min(0).max(10),
  })
  .superRefine((item, ctx) => {
    if (item.wear > item.maxWear || item.secondaryWear > item.secondaryMaxWear)
      ctx.addIssue({
        code: "custom",
        path: ["wear"],
        message: "Wear exceeds available boxes",
      });
  });
export type Equipment = z.infer<typeof equipmentSchema>;
const addedReputationFactions = [
  { name: "Grand Duchy", aliases: ["underground duchy"] },
  { name: "Riverfolk Company", aliases: [] },
  { name: "Lizard Cult", aliases: [] },
  { name: "Corvid Conspiracy", aliases: [] },
];
const reputationLimit = 12 + addedReputationFactions.length;
const reputationEntrySchema = z.object({
  faction: z.string().max(80),
  standing: z.number().int().min(-3).max(3),
  prestige: z.number().int().min(0).max(15),
  notoriety: z.number().int().min(0).max(15),
});
export function withReputationFactions(
  reputation: z.infer<typeof reputationEntrySchema>[],
) {
  const missing = addedReputationFactions.filter(
    ({ name, aliases }) =>
      !reputation.some(({ faction }) => {
        const normalized = faction.trim().toLowerCase();
        return normalized === name.toLowerCase() || aliases.includes(normalized);
      }),
  );
  return missing.length
    ? [
        ...reputation,
        ...missing.map(({ name }) => ({
          faction: name,
          standing: 0,
          prestige: 0,
          notoriety: 0,
        })),
      ]
    : reputation;
}
export const sheetSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    species: z.string().min(1).max(50),
    playbook: z.string().min(1).max(50),
    pronouns: z.string().max(40),
    description: z.string().max(240),
    stats: z.object({
      Charm: z.number().int().min(-3).max(3),
      Cunning: z.number().int().min(-3).max(3),
      Finesse: z.number().int().min(-3).max(3),
      Luck: z.number().int().min(-3).max(3),
      Might: z.number().int().min(-3).max(3),
    }),
    injury: z.number().int().min(0).max(8),
    exhaustion: z.number().int().min(0).max(8),
    depletion: z.number().int().min(0).max(8),
    nature: note,
    drives: note,
    bonds: note,
    biography: note,
    moves: note,
    feats: note,
    weaponSkills: note,
    equipment: z.array(equipmentSchema).max(30),
    reputation: z
      .array(reputationEntrySchema)
      .max(reputationLimit)
      .transform(withReputationFactions)
      // Leave room for all twelve legacy entries plus the added factions.
      .pipe(z.array(reputationEntrySchema).max(reputationLimit)),
    advancement: z.number().int().min(0).max(100),
    moveIds: selections,
    driveIds: selections,
    featIds: selections,
    weaponSkillIds: selections,
    driveMarks: selections,
    startingBonus: z.enum(["", ...stats]).default(""),
    presetApplied: z.boolean().default(false),
    hold: z.number().int().min(0).max(99).default(0),
    forward: z.number().int().min(-3).max(3).default(0),
    ongoing: z.number().int().min(-3).max(3).default(0),
    coin: z.number().int().min(0).max(9999).default(0),
    harmSlots: z
      .object({
        injury: z.number().int().min(4).max(6),
        exhaustion: z.number().int().min(4).max(6),
        depletion: z.number().int().min(4).max(6),
      })
      .default({ injury: 4, exhaustion: 4, depletion: 4 }),
    background: z
      .object({ home: note, motivation: note, leftBehind: note })
      .default({ home: "", motivation: "", leftBehind: "" }),
  })
  .superRefine((s, ctx) => {
    for (const track of harmTracks)
      if (s[track] > harmCapacity(s, track))
        ctx.addIssue({
          code: "custom",
          path: [track],
          message: "Harm exceeds available boxes",
        });
    s.equipment.forEach((item, i) => {
      if (item.wear > item.maxWear)
        ctx.addIssue({
          code: "custom",
          path: ["equipment", i, "wear"],
          message: "Wear exceeds available boxes",
        });
    });
  });
export type Sheet = z.infer<typeof sheetSchema>;
export type Hero = {
  source_hero_id?: string | null;
  id: string;
  campaign_id: string | null;
  owner_id: string;
  player: string;
  sheet: Sheet;
  version: number;
};
export type Campaign = {
  started_at?: string | null;
  master_name?: string;
  id: string;
  name: string;
  description: string;
  clearing: string;
  invite_code: string;
  owner_id: string;
  members: number;
  member_list?: { id: string; name: string }[] | null;
};
export type User = { id: string; name: string; email: string; isAdmin?: boolean };
export function blankSheet(): Sheet {
  return {
    moveIds: [],
    driveIds: [],
    featIds: [],
    weaponSkillIds: [],
    driveMarks: [],
    startingBonus: "",
    presetApplied: false,
    hold: 0,
    forward: 0,
    ongoing: 0,
    coin: 0,
    harmSlots: { injury: 4, exhaustion: 4, depletion: 4 },
    background: { home: "", motivation: "", leftBehind: "" },
    name: "",
    species: "Fox",
    playbook: "Ranger",
    pronouns: "",
    description: "",
    stats: { Charm: 0, Cunning: 0, Finesse: 0, Luck: 0, Might: 0 },
    injury: 0,
    exhaustion: 0,
    depletion: 0,
    nature: "",
    drives: "",
    bonds: "",
    biography: "",
    moves: "",
    feats: "",
    weaponSkills: "",
    equipment: [],
    reputation: [
      "Denizens",
      "Marquisate",
      "Eyrie Dynasties",
      "Woodland Alliance",
      ...addedReputationFactions.map(({ name }) => name),
    ].map((faction) => ({ faction, standing: 0, prestige: 0, notoriety: 0 })),
    advancement: 0,
  };
}

// Campaign assignment freezes the build, while tabletop bookkeeping stays live.
export const playTrackingFields = [
  "injury",
  "exhaustion",
  "depletion",
  "hold",
  "forward",
  "ongoing",
  "coin",
  "equipment",
  "reputation",
  "advancement",
  "driveMarks",
] as const satisfies readonly (keyof Sheet)[];
export function sameCharacterSetup(previous: Sheet, next: Sheet): boolean {
  const tracking = new Set<string>(playTrackingFields);
  return (Object.keys(previous) as (keyof Sheet)[]).every(
    (key) =>
      tracking.has(key) ||
      JSON.stringify(previous[key]) === JSON.stringify(next[key]),
  );
}
