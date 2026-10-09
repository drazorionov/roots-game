import { z } from "zod";
import type { Sheet } from "./sheet";

export const activityRollSchema = z.object({
  label: z.string().min(1).max(100),
  source: z.string().max(100).optional(),
  dice: z.tuple([
    z.number().int().min(1).max(6),
    z.number().int().min(1).max(6),
  ]),
  modifier: z.number().int().min(-20).max(20),
});
export type ActivityRoll = z.infer<typeof activityRollSchema>;
export type SheetChange = { field: string; before: unknown; after: unknown };
export type GameActivity = {
  id: string;
  sequence?: string;
  player: string;
  character: string;
  created_at: string;
  kind: "change" | "roll";
  changes?: SheetChange[];
  roll?: ActivityRoll;
};
type Translate = (
  message: string,
  values?: Record<string, string | number>,
) => string;

export function sheetChanges(before: Sheet, after: Sheet): SheetChange[] {
  return (Object.keys(after) as (keyof Sheet)[])
    .filter(
      (field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]),
    )
    .map((field) => ({ field, before: before[field], after: after[field] }));
}

const labels: Record<string, string> = {
  hold: "Hold",
  forward: "Forward",
  ongoing: "Ongoing",
  coin: "Coin",
  advancement: "Advancement",
  equipment: "Equipment",
  reputation: "Reputation",
  driveMarks: "Fulfilled drives",
  name: "Name",
  species: "Species",
  playbook: "Playbook",
  pronouns: "Pronouns",
  description: "Description",
  stats: "Attributes",
  nature: "Nature",
  drives: "Drives",
  bonds: "Bonds",
  biography: "Biography",
  moves: "Moves",
  feats: "Feats",
  weaponSkills: "Weapon skills",
  moveIds: "Moves",
  driveIds: "Drives",
  featIds: "Feats",
  weaponSkillIds: "Weapon skills",
  startingBonus: "Starting bonus",
  harmSlots: "Harm",
  background: "Background",
  presetApplied: "Character setup",
};

export function describeChanges(
  changes: SheetChange[],
  t: Translate,
): string[] {
  return changes.flatMap(({ field, before, after }) => {
    const label = t(labels[field] ?? field);
    if (typeof before === "number" && typeof after === "number")
      return [`${label}: ${before} → ${after}`];
    if (
      field === "equipment" &&
      Array.isArray(before) &&
      Array.isArray(after)
    ) {
      const lines: string[] = [];
      const remaining = [...before] as Sheet["equipment"];
      for (const item of after as Sheet["equipment"]) {
        const index = remaining.findIndex((old) => old.name === item.name);
        if (index < 0) lines.push(t("Added {item}", { item: item.name }));
        else {
          const [old] = remaining.splice(index, 1);
          if (
            old.wear !== item.wear ||
            old.secondaryWear !== item.secondaryWear
          )
            lines.push(
              `${item.name} · ${t("Wear")}: ${old.wear} → ${item.wear}${old.secondaryWear !== item.secondaryWear ? ` / ${old.secondaryWear} → ${item.secondaryWear}` : ""}`,
            );
          else if (JSON.stringify(old) !== JSON.stringify(item))
            lines.push(t("Updated {item}", { item: item.name }));
        }
      }
      for (const item of remaining)
        lines.push(t("Removed {item}", { item: item.name }));
      return lines.length ? lines : [t("Updated {item}", { item: label })];
    }
    if (
      field === "reputation" &&
      Array.isArray(before) &&
      Array.isArray(after)
    ) {
      const lines: string[] = [];
      for (const faction of after as Sheet["reputation"]) {
        const old = (before as Sheet["reputation"]).find(
          (entry) => entry.faction === faction.faction,
        );
        if (!old) lines.push(t("Added {item}", { item: t(faction.faction) }));
        else
          for (const [key, name] of [
            ["standing", "Standing"],
            ["prestige", "Prestige"],
            ["notoriety", "Notoriety"],
          ] as const)
            if (old[key] !== faction[key])
              lines.push(
                `${t(faction.faction)} · ${t(name)}: ${old[key]} → ${faction[key]}`,
              );
      }
      for (const old of before as Sheet["reputation"])
        if (
          !(after as Sheet["reputation"]).some(
            (entry) => entry.faction === old.faction,
          )
        )
          lines.push(t("Removed {item}", { item: t(old.faction) }));
      return lines;
    }
    if (
      Array.isArray(before) &&
      Array.isArray(after) &&
      [...before, ...after].every((value) => typeof value === "string")
    ) {
      const added = after
        .filter((value) => !before.includes(value))
        .map((value) => `+${t(value)}`);
      const removed = before
        .filter((value) => !after.includes(value))
        .map((value) => `−${t(value)}`);
      return [`${label}: ${[...added, ...removed].join(", ") || t("Updated")}`];
    }
    return [t("Updated {item}", { item: label })];
  });
}

export function describeRoll(roll: ActivityRoll, t: Translate) {
  const total = roll.dice[0] + roll.dice[1] + roll.modifier;
  const outcome = t(
    total >= 10
      ? "10+: strong hit"
      : total >= 7
        ? "7–9: mixed hit"
        : "6−: miss",
  );
  return `${roll.source ? `${roll.source} · ` : ""}${t(roll.label)} · ${roll.dice.join(" + ")} ${roll.modifier < 0 ? "−" : "+"} ${Math.abs(roll.modifier)} = ${total} · ${outcome}`;
}
