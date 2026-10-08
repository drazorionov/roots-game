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
  campaign_id: string | null;
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
