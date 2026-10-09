export const factions = [
  { name: "Denizens", icon: "denizens" },
  { name: "Marquisate", icon: "marquisate" },
  { name: "Eyrie Dynasties", icon: "eyrie" },
  { name: "Woodland Alliance", icon: "alliance" },
  { name: "Grand Duchy", icon: "duchy" },
  { name: "Riverfolk Company", icon: "riverfolk" },
  { name: "Lizard Cult", icon: "lizard-cult" },
  { name: "Corvid Conspiracy", icon: "corvid" },
  { name: "Keepers in Iron", icon: "keepers" },
  { name: "The Hundreds", icon: "hundreds" },
] as const;

export function factionIcon(name: string) {
  const aliases: Record<string, string> = {
    "marquise de cat": "Marquisate",
    "underground duchy": "Grand Duchy",
    "lord of the hundreds": "The Hundreds",
  };
  const normalized = name.trim().toLowerCase();
  return factions.find(
    (f) =>
      f.name.toLowerCase() === normalized || f.name === aliases[normalized],
  )?.icon;
}
