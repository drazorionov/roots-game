import catalogue from "./equipment-catalogue.json";
import tags from "./equipment-tags.json";
import { weaponSkills } from "./playbooks";
import { rules } from "./rules";
import type { Equipment } from "./sheet";

export const equipmentCatalogue = catalogue;
export const specialTags = tags;
export const ranges = ["Intimate", "Close", "Far"] as const;
export const harmTypes = [
  "injury",
  "exhaustion",
  "wear",
  "morale",
  "depletion",
  "special",
  "none",
] as const;
export const harmLabels: Record<(typeof harmTypes)[number], string> = {
  injury: "injury",
  exhaustion: "exhaustion",
  wear: "Wear",
  morale: "Morale",
  depletion: "depletion",
  special: "Special",
  none: "None",
};
export function equipmentVisual(id: string) {
  return equipmentCatalogue.find((entry) => entry.id === id);
}
export function newEquipment(id?: string): Equipment {
  const preset = equipmentCatalogue.find((entry) => entry.id === id);
  return {
    name: preset?.name ?? "",
    kind: (preset?.kind as Equipment["kind"]) ?? "item",
    visualId: preset?.id ?? "",
    range: preset?.range ?? "",
    harm: preset?.harm ?? 0,
    harmType: (preset?.harmType as Equipment["harmType"]) ?? "none",
    harmDetails: "",
    skillTags: [...(preset?.skillTags ?? [])],
    specialTags: [...(preset?.specialTags ?? [])],
    tagSettings: "",
    details: "",
    wear: 0,
    maxWear: preset?.id === "daggers" ? 2 : (preset?.maxWear ?? 4),
    secondaryWear: 0,
    secondaryMaxWear: preset?.id === "daggers" ? 2 : 0,
    value: preset?.value ?? 0,
    load: 1,
  };
}
export function splitRanges(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
export function toggleRange(value: string, range: string) {
  const current = splitRanges(value);
  return (
    current.some((r) => r.toLowerCase() === range.toLowerCase())
      ? current.filter((r) => r.toLowerCase() !== range.toLowerCase())
      : [...current, range]
  ).join(", ");
}
const deckSkills: Record<string, number> = {
  Cleave: 71,
  Disarm: 73,
  Parry: 75,
  "Vicious Strike": 77,
  "Confuse Senses": 79,
  "Improvise Weapon": 81,
  "Storm a Group": 83,
  "Harry a Group": 85,
  "Quick Shot": 87,
  "Trick Shot": 89,
};
export const weaponSkillCatalogue = weaponSkills.map((name) => ({
  name,
  description: rules[name].summary,
  page: rules[name].page,
  deckPage: deckSkills[name],
}));
