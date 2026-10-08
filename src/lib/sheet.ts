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
export const sheetSchema = z.object({
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
  injury: z.number().int().min(0).max(4),
  exhaustion: z.number().int().min(0).max(4),
  depletion: z.number().int().min(0).max(4),
  nature: note,
  drives: note,
  bonds: note,
  biography: note,
  moves: note,
  feats: note,
  weaponSkills: note,
  equipment: z
    .array(
      z.object({
        name: z.string().max(100),
        details: z.string().max(500),
        wear: z.number().int().min(0).max(4),
        load: z.number().int().min(0).max(10),
      }),
    )
    .max(30),
  reputation: z
    .array(
      z.object({
        faction: z.string().max(80),
        standing: z.number().int().min(-3).max(3),
        prestige: z.number().int().min(0).max(15),
        notoriety: z.number().int().min(0).max(15),
      }),
    )
    .max(12),
  advancement: z.number().int().min(0).max(20),
});
export type Sheet = z.infer<typeof sheetSchema>;
export type Hero = {
  id: string;
  campaign_id: string;
  owner_id: string;
  player: string;
  sheet: Sheet;
  version: number;
};
export type Campaign = {
  id: string;
  name: string;
  description: string;
  clearing: string;
  invite_code: string;
  owner_id: string;
  members: number;
};
export type User = { id: string; name: string; email: string };
export function blankSheet(): Sheet {
  return {
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
    ].map((faction) => ({ faction, standing: 0, prestige: 0, notoriety: 0 })),
    advancement: 0,
  };
}
export const demoCampaign: Campaign = {
  id: "demo",
  name: "Whispers of the Woodland",
  description: "Old paths. Unlikely friends. A woodland on the edge of change.",
  clearing: "Pellenicky Glade",
  invite_code: "",
  owner_id: "demo",
  members: 3,
};
export const demoHeroes: Hero[] = [
  {
    name: "Rowan",
    species: "Fox",
    playbook: "Ranger",
    pronouns: "she / her",
    description: "A quiet pathfinder with a debt to the forest.",
    stats: { Charm: 0, Cunning: 1, Finesse: 2, Luck: 0, Might: -1 },
    player: "Ellie",
    nature: "Protector — no friend gets left behind.",
    drives: "Discover what lies beyond the old woodland road.",
    injury: 1,
    exhaustion: 2,
  },
  {
    name: "Bramble",
    species: "Rabbit",
    playbook: "Tinker",
    pronouns: "he / him",
    description: "A pocket full of possibilities. And loose screws.",
    stats: { Charm: -1, Cunning: 2, Finesse: 1, Luck: 0, Might: 0 },
    player: "Sam",
    nature: "Curious — every broken thing has a story.",
    drives: "Build something that makes the woodland a better place.",
    injury: 0,
    exhaustion: 1,
  },
  {
    name: "Moss",
    species: "Raccoon",
    playbook: "Vagrant",
    pronouns: "they / them",
    description: "Silver tongue. Sticky fingers. Heart of gold.",
    stats: { Charm: 2, Cunning: 1, Finesse: -1, Luck: 1, Might: 0 },
    player: "Alex",
    nature: "Sociable — a stranger is just a friend you haven’t met.",
    drives: "Find a place to finally call home.",
    injury: 0,
    exhaustion: 0,
  },
].map((h, i) => ({
  id: `demo-${i}`,
  campaign_id: "demo",
  owner_id: "demo",
  player: h.player,
  version: 1,
  sheet: {
    ...blankSheet(),
    ...h,
    biography:
      "The woodland is full of stories. This one is still being written.",
    bonds: "I trust my companions to watch my back on the road.",
    equipment: [
      {
        name: i === 1 ? "Well-loved toolkit" : "Travel-worn bow",
        details: "A trusted companion on the woodland paths.",
        wear: 1,
        load: 1,
      },
      {
        name: "Traveler’s pack",
        details: "The small comforts of a life on the road.",
        wear: 0,
        load: 1,
      },
    ],
  },
}));
