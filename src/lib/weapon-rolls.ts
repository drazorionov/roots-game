import type { stats } from "./sheet";

type Stat = (typeof stats)[number];
type WeaponRoll =
  { kind: "attribute"; stat: Stat } | { kind: "paired" } | { kind: "modifier" };

// Attributes follow the weapon-move summaries in rules.ts (pp. 116–119).
export const weaponRolls: Record<string, WeaponRoll> = {
  "Battle Fury": { kind: "attribute", stat: "Luck" },
  Charge: { kind: "attribute", stat: "Might" },
  Cleave: { kind: "attribute", stat: "Might" },
  "Confuse Senses": { kind: "attribute", stat: "Finesse" },
  Disarm: { kind: "attribute", stat: "Finesse" },
  Hammerpaws: { kind: "attribute", stat: "Finesse" },
  "Harry a Group": { kind: "attribute", stat: "Cunning" },
  Hurl: { kind: "attribute", stat: "Might" },
  "Improvise Weapon": { kind: "attribute", stat: "Cunning" },
  "Frightful Flourish": { kind: "attribute", stat: "Charm" },
  "Long-Shot": { kind: "modifier" },
  Lunge: { kind: "attribute", stat: "Finesse" },
  "Paired Fighting": { kind: "paired" },
  Parry: { kind: "attribute", stat: "Finesse" },
  "Pinpoint Shot": { kind: "attribute", stat: "Cunning" },
  "Point-Blank Shot": { kind: "attribute", stat: "Luck" },
  "Pommel Strike": { kind: "attribute", stat: "Luck" },
  "Quick Shot": { kind: "attribute", stat: "Luck" },
  "Storm a Group": { kind: "attribute", stat: "Might" },
  "Surprise Jab": { kind: "attribute", stat: "Finesse" },
  Sweep: { kind: "attribute", stat: "Finesse" },
  "Switch Hands": { kind: "attribute", stat: "Finesse" },
  "Trick Shot": { kind: "attribute", stat: "Finesse" },
  "Vicious Strike": { kind: "attribute", stat: "Might" },
};

export type RollWeaponSkill = (
  stat: Stat | null,
  action: string,
  bonus?: number,
) => void;
