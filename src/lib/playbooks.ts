import { blankSheet, type Sheet, stats } from "./sheet";
export type Move = {
  name: string;
  summary: string;
  stat?: (typeof stats)[number];
};
export type Playbook = {
  summary: string;
  stats: Sheet["stats"];
  natures: string[];
  drives: string[];
  feats: string[];
  chooseFeats: number;
  weapons: string[];
  value: number;
  page: number;
  requiredMoves: string[];
  moves: Move[];
};
const values = (a: number, b: number, c: number, d: number, e: number) => ({
  Charm: a,
  Cunning: b,
  Finesse: c,
  Luck: d,
  Might: e,
});
export const feats = [
  "Acrobatics",
  "Blindside",
  "Counterfeit",
  "Cover Up",
  "Disable Device",
  "Hide",
  "Mastermind",
  "Pick Lock",
  "Pick Pocket",
  "Set Trap",
  "Sleight of Hand",
  "Sneak",
  "Tracking",
  "Use Device",
];
export const weaponSkills = [
  "Battle Fury",
  "Charge",
  "Cleave",
  "Confuse Senses",
  "Disarm",
  "Hammerpaws",
  "Harry a Group",
  "Hurl",
  "Improvise Weapon",
  "Frightful Flourish",
  "Long-Shot",
  "Lunge",
  "Paired Fighting",
  "Parry",
  "Pinpoint Shot",
  "Point-Blank Shot",
  "Pommel Strike",
  "Quick Shot",
  "Storm a Group",
  "Surprise Jab",
  "Sweep",
  "Switch Hands",
  "Trick Shot",
  "Vicious Strike",
];
export const playbookData: Record<string, Playbook> = {
  Adventurer: {
    summary:
      "A diplomat who builds friendships and brings the Woodland together.",
    stats: values(2, 1, 0, 0, -1),
    natures: ["Extrovert", "Peacemaker"],
    drives: ["Ambition", "Traveler", "Antimilitarist", "Folklorist"],
    feats: ["Counterfeit", "Sleight of Hand"],
    chooseFeats: 0,
    weapons: ["Disarm", "Harry a Group", "Improvise Weapon", "Parry"],
    value: 9,
    page: 3,
    requiredMoves: [],
    moves: [
      {
        name: "Sterling Reputation",
        summary:
          "Mark one extra prestige when gaining prestige. You may clear prestige instead of marking the same amount of notoriety.",
      },
      {
        name: "Subduing Strikes",
        summary:
          "Use Cunning for nonlethal melee; you cannot choose to inflict serious harm.",
        stat: "Cunning",
      },
      {
        name: "Talon on the Pulse",
        summary:
          "Gather clearing news with Cunning. Ask 3 questions on 10+, or 2 on 7–9, about power, dissent, fears, hopes, or opportunities. A miss alerts someone dangerous.",
        stat: "Cunning",
      },
      {
        name: "Orator",
        summary:
          "Address interested denizens with Charm. On a hit they act; choose 2 safeguards on 10+, or 1 on 7–9: restraint, resolve, or no demand that you lead. A miss twists your message.",
        stat: "Charm",
      },
      {
        name: "Well-Read",
        summary:
          "Gain +1 Cunning, to a maximum of +3. Included in the displayed attribute.",
      },
      {
        name: "Fast Friends",
        summary:
          "Mark exhaustion and use Cunning to befriend a new NPC. A hit earns an honest answer or simple favor; 10+ earns a valuable secret or serious favor. A miss offends them.",
        stat: "Cunning",
      },
    ],
  },
  Arbiter: {
    summary: "A formidable protector balancing justice, loyalty, and force.",
    stats: values(1, 0, 0, -1, 2),
    natures: ["Defender", "Punisher"],
    drives: ["Loyalty", "Protection", "Principles", "Justice"],
    feats: [],
    chooseFeats: 1,
    weapons: ["Cleave", "Disarm", "Parry", "Storm a Group"],
    value: 10,
    page: 7,
    requiredMoves: [],
    moves: [
      {
        name: "Carry a Big Stick",
        summary:
          "Interrupt a conflict with Charm. On a hit, each side stops or marks 2-exhaustion. On 10+, take +1 ongoing to peaceful dealings. A miss turns their anger toward you.",
        stat: "Charm",
      },
      {
        name: "Hardy",
        summary:
          "Gain one extra injury box. When time passes or you reach another clearing, you may clear 2-injury.",
      },
      {
        name: "Crash and Smash",
        summary:
          "Smash through obstacles with Might. On a hit you arrive: choose 1 cost on 10+, or 2 on 7–9—injury, damaged surroundings, or lost/damaged gear. A miss leaves you exposed.",
        stat: "Might",
      },
      {
        name: "Strong Draw",
        summary:
          "Mark bow wear to target with Might. On a hit, mark exhaustion for +1 injury; mark another exhaustion to ignore armor.",
        stat: "Might",
      },
      {
        name: "Brute",
        summary:
          "Gain +1 Might, to a maximum of +3. Included in the displayed attribute.",
      },
      {
        name: "Guardian",
        summary:
          "Defend against an immediate threat with Might. On a hit, draw its attention, gain +1 forward to counterattack, or push it back. On 7–9 expose yourself or escalate. A miss takes the full blow.",
        stat: "Might",
      },
    ],
  },
  Harrier: {
    summary:
      "A swift courier who finds routes through danger and hidden places.",
    stats: values(0, -1, 2, 1, 0),
    natures: ["Dutiful", "Competitive"],
    drives: ["Crime", "Discovery", "Infamy", "Wanderlust"],
    feats: ["Acrobatics", "Sneak"],
    chooseFeats: 0,
    weapons: ["Disarm", "Harry a Group", "Quick Shot", "Trick Shot"],
    value: 9,
    page: 37,
    requiredMoves: [],
    moves: [
      {
        name: "Parkour",
        summary:
          "Dash through chaos with Finesse. Hold 3 on 10+, or 2 on 7–9. Spend hold to reach something in sight or escape nearby danger. A miss traps you.",
        stat: "Finesse",
      },
      {
        name: "Traveler Extraordinaire",
        summary:
          "On paths, add +1 to travel or clear 2-exhaustion; in forests, add +1 or clear 2-depletion. Ask two questions about the destination before arrival.",
      },
      {
        name: "Cross Country",
        summary:
          "Gain one extra exhaustion box. If you must mark exhaustion beyond a full track, you may mark that much injury instead.",
      },
      {
        name: "Fleet of Foot and Hand",
        summary:
          "Gain +1 Finesse, to a maximum of +3. Included in the displayed attribute.",
      },
      {
        name: "Don’t Shoot the Messenger",
        summary:
          "Gain Counterfeit. When impersonating an innocent courier to trick someone, use Luck instead of Cunning.",
        stat: "Luck",
      },
      {
        name: "Fancy Paper",
        summary:
          "Seek a plausible secret route: mark exhaustion and use Luck. A hit reveals a path; 10+ adds something valuable. On a miss someone else is using it now.",
        stat: "Luck",
      },
    ],
  },
  Ranger: {
    summary:
      "A wilderness survivor, skilled in stealth, foraging, and dangerous paths.",
    stats: values(-1, 1, 1, 0, 1),
    natures: ["Loner", "Cynic"],
    drives: ["Discovery", "Freedom", "Revenge", "Protection"],
    feats: ["Sneak", "Hide"],
    chooseFeats: 0,
    weapons: ["Cleave", "Disarm", "Harry a Group", "Vicious Strike"],
    value: 9,
    page: 73,
    requiredMoves: [],
    moves: [
      {
        name: "Silent Paws",
        summary:
          "When sneaking or hiding with a roguish feat, mark 2-exhaustion to turn a miss into a 7–9.",
      },
      {
        name: "Slip Away",
        summary:
          "Escape through an opening with Finesse. Choose 1 cost on 10+, or 2 on 7–9: harm, new danger, or leaving something behind. A miss costs harm and leaves a trail.",
        stat: "Finesse",
      },
      {
        name: "Poisons and Antidotes",
        summary:
          "Mark depletion to brew an ingested or injected poison causing sleep, weakness, intoxication, or death. An antidote needs the GM’s special ingredient and 1-depletion.",
      },
      {
        name: "Forager",
        summary:
          "Before a forest travel move, clear up to 3-depletion, 2-exhaustion, or 2-injury.",
      },
      {
        name: "Threatening Visage",
        summary:
          "Use Might instead of Charm when persuading an NPC with credible open threats.",
        stat: "Might",
      },
      {
        name: "Dirty Fighter",
        summary:
          "Choose two additional weapon skills: Trick Shot, Confuse Senses, Improvise Weapon, Disarm, or Vicious Strike. Record them among your skills.",
      },
    ],
  },
  Ronin: {
    summary: "A masterless warrior choosing whose cause deserves an oath.",
    stats: values(0, 1, 0, -1, 2),
    natures: ["Survivor", "Pilgrim"],
    drives: ["Principles", "Loyalty", "Revenge", "Partisan"],
    feats: ["Blindside"],
    chooseFeats: 0,
    weapons: ["Cleave", "Harry a Group", "Storm a Group", "Vicious Strike"],
    value: 11,
    page: 77,
    requiredMoves: [],
    moves: [
      {
        name: "Always Armed",
        summary:
          "Gain Improvise Weapon. Inflict +1 harm when using an improvised weapon.",
      },
      {
        name: "Knowing a Lord’s Will",
        summary:
          "Use Might to figure out powerful denizens, or to trick them while playing a subordinate.",
        stat: "Might",
      },
      {
        name: "Well-Mannered",
        summary:
          "Enter formal society with Cunning: hold 3 on 10+, or 2 on 7–9. Spend hold to cover a faux pas, shame someone, charm them, or demonstrate value. Leaving or broken etiquette ends the hold.",
        stat: "Cunning",
      },
      {
        name: "Fealty",
        summary:
          "Swear one task to a worthy patron. Mark exhaustion to reroll in its pursuit. Fulfillment earns 4-prestige; breaking the oath fills exhaustion and marks 4-notoriety.",
      },
      {
        name: "The Rules of War",
        summary:
          "Use Might to demand a reasonable foe follow a rule of war. On 7–9 they demand one in return; breaking it ends the obligation. A miss invites brutality.",
        stat: "Might",
      },
      {
        name: "Always Watching",
        summary:
          "Gain +1 Cunning, to a maximum of +3. Included in the displayed attribute.",
      },
    ],
  },
  Scoundrel: {
    summary: "A daring troublemaker who turns luck and chaos into opportunity.",
    stats: values(1, -1, 0, 2, 0),
    natures: ["Arsonist", "Combative"],
    drives: ["Chaos", "Infamy", "Crime", "Thrills"],
    feats: ["Acrobatics", "Sneak", "Hide"],
    chooseFeats: 0,
    weapons: ["Confuse Senses", "Improvise Weapon", "Vicious Strike"],
    value: 8,
    page: 81,
    requiredMoves: [],
    moves: [
      {
        name: "Explosive Personality",
        summary:
          "Use Luck instead of Might to wreck something with flagrantly dangerous methods.",
        stat: "Luck",
      },
      {
        name: "Create to Destroy",
        summary:
          "Build a dangerous device with Finesse. It works once on a hit; choose 1 flaw on 10+, or 2 on 7–9: danger, bulk, or fragility. A miss needs another component.",
        stat: "Finesse",
      },
      {
        name: "It’s a Distraction!",
        summary:
          "Gain Blindside. Use Luck when blindsiding someone distracted by environmental danger.",
        stat: "Luck",
      },
      {
        name: "Daredevil",
        summary:
          "Dive into danger without planning to gain temporary Luck Armor with one wear box. It vanishes after the danger ends.",
      },
      {
        name: "Danger Mask",
        summary:
          "Your calling-card outfit has two wear boxes. Wearing it doubles notoriety, halves prestige, and gives +1 to trust fate and Scoundrel moves. Losing it costs exhaustion; destruction costs 4.",
      },
      {
        name: "Better Lucky than Good",
        summary:
          "Mark exhaustion to use Luck for a basic or skilled weapon move instead of its usual attribute.",
        stat: "Luck",
      },
    ],
  },
  Thief: {
    summary:
      "A stealthy treasure-seeker with nimble paws and a talent for escape.",
    stats: values(0, 0, 2, 1, -1),
    natures: ["Kleptomaniac", "Rebellious"],
    drives: ["Freedom", "Crime", "Greed", "Thrills"],
    feats: [],
    chooseFeats: 4,
    weapons: ["Confuse Senses", "Improvise Weapon", "Parry", "Trick Shot"],
    value: 6,
    page: 93,
    requiredMoves: [],
    moves: [
      {
        name: "Breaking and Entering",
        summary:
          "Entering or leaving a place you know with a roguish feat: mark exhaustion to take a 10+ instead of rolling.",
      },
      {
        name: "Disappear Into the Dark",
        summary:
          "Slip into shadows unnoticed: mark exhaustion and hold 1. Stay hidden while quiet and slow. Spend hold to emerge suddenly; an immediate attack gains +3. Accidental exposure loses the hold.",
      },
      {
        name: "Rope-a-Dope",
        summary:
          "Evade and tire a foe with Finesse. On a hit, mark exhaustion to inflict 2-exhaustion, or 3 on 10+. A miss leaves you at their mercy.",
        stat: "Finesse",
      },
      {
        name: "Small Hands",
        summary:
          "Use Finesse instead of Might to grapple someone larger. A miss leaves you overpowered.",
        stat: "Finesse",
      },
      {
        name: "Master Thief",
        summary:
          "Gain +1 Finesse, to a maximum of +3. Included in the displayed attribute.",
      },
      {
        name: "Nose for Gold",
        summary:
          "When figuring someone out or reading a tense situation, you may also ask what the most valuable carried or nearby thing is—even on a miss.",
      },
    ],
  },
  Tinker: {
    summary:
      "An inventive craftsperson who repairs equipment and builds solutions.",
    stats: values(-1, 2, 1, 0, 0),
    natures: ["Perfectionist", "Radical"],
    drives: ["Clean Paws", "Ambition", "Discord", "Development"],
    feats: ["Pick Lock", "Counterfeit", "Disable Device"],
    chooseFeats: 0,
    weapons: ["Cleave", "Harry a Group", "Improvise Weapon", "Trick Shot"],
    value: 8,
    page: 97,
    requiredMoves: ["Toolbox", "Repair"],
    moves: [
      {
        name: "Toolbox",
        summary:
          "Choose two toolbox features and one drawback in your notes. For a long project, the GM sets 1–4 conditions: time, materials, help, facilities, or limits. Meet them to finish.",
      },
      {
        name: "Repair",
        summary:
          "With your toolbox, spend depletion or value to clear damaged equipment’s wear one-for-one. Restoring destroyed equipment also requires a GM-set condition.",
      },
      {
        name: "Big Pockets",
        summary:
          "Gain two extra depletion boxes. Included in the displayed harm track.",
      },
      {
        name: "Jury Rig",
        summary:
          "Build a quick device with Cunning. A hit works once; on 10+ it works exceptionally well or gets another use. A miss works with a hidden side effect.",
        stat: "Cunning",
      },
      {
        name: "Nimble Mind",
        summary:
          "For a marked roguish feat involving locks or mechanisms, mark depletion to use Cunning instead of Finesse.",
        stat: "Cunning",
      },
      {
        name: "Dismantle",
        summary:
          "Dismantle a broken or disabled device or piece of machinery to clear 2-depletion.",
      },
    ],
  },
  Vagrant: {
    summary:
      "A charming survivor who talks through danger and turns foes against each other.",
    stats: values(2, 1, -1, 0, 0),
    natures: ["Glutton", "Hustler"],
    drives: ["Chaos", "Thrills", "Clean Paws", "Wanderlust"],
    feats: ["Pick Lock", "Sleight of Hand"],
    chooseFeats: 0,
    weapons: [
      "Harry a Group",
      "Improvise Weapon",
      "Quick Shot",
      "Vicious Strike",
    ],
    value: 9,
    page: 101,
    requiredMoves: [],
    moves: [
      {
        name: "Instigator",
        summary:
          "When tricking one NPC into fighting another, remove one option from their 7–9 alternatives.",
      },
      {
        name: "Pleasant Facade",
        summary:
          "Flatter an unsuspecting NPC with Charm: hold 3 on 10+, or 2 on 7–9. Spend hold to deflect their suspicion or aggression. A miss makes them watch you.",
        stat: "Charm",
      },
      {
        name: "Desperate Smile",
        summary:
          "When trusting fate through begging or pleading, use Charm instead of Luck.",
        stat: "Charm",
      },
      {
        name: "Charm Offensive",
        summary:
          "Distract an enemy with words using Cunning. A hit gives a weapon move at +1 or a quick injury. On 7–9 they stop listening; a miss provokes an attack.",
        stat: "Cunning",
      },
      {
        name: "Let’s Play",
        summary:
          "Use Charm to loosen tongues through a game. A hit reveals information; 7–9 costs 1-depletion. A miss lets you leave at 1-depletion or pay 3 to make them talk.",
        stat: "Charm",
      },
      {
        name: "Pocket Sand",
        summary:
          "Gain Confuse Senses. Use Cunning when throwing something to confuse a nearby opponent’s senses.",
        stat: "Cunning",
      },
    ],
  },
};
export const natureHints: Record<string, string> = {
  Extrovert: "Clear exhaustion after a moment of genuine warmth or friendship.",
  Peacemaker:
    "Clear exhaustion after resolving a dangerous conflict without violence.",
  Defender:
    "Clear exhaustion after risking yourself to protect someone from injustice or danger.",
  Punisher:
    "Clear exhaustion after promising punishment to a dangerous villain’s face.",
  Dutiful:
    "Clear exhaustion after accepting a difficult or dangerous task for another.",
  Competitive: "Clear exhaustion after taking needless risks to show off.",
  Loner: "Clear exhaustion after entering danger without help or backup.",
  Cynic:
    "Clear exhaustion after openly challenging an accepted truth with dangerous questions.",
  Survivor:
    "Clear exhaustion after trying to flee or covering allies’ escape from overwhelming danger.",
  Pilgrim: "Clear exhaustion after finding an expert in a skill you lack.",
  Arsonist:
    "Clear exhaustion after solving a problem with needless destruction.",
  Combative:
    "Clear exhaustion after trying to start a fight against overwhelming odds.",
  Kleptomaniac:
    "Clear exhaustion after attempting a selfish theft of something valuable.",
  Rebellious:
    "Clear exhaustion after seriously defying, insulting, or angering authority.",
  Perfectionist:
    "Clear exhaustion after replacing another’s tool or resource with something exceptional.",
  Radical:
    "Clear exhaustion after voicing dangerous ideas to the wrong audience.",
  Glutton:
    "Clear exhaustion after overindulging in food, drink, gambling, or other vices.",
  Hustler: "Clear exhaustion after trying to con a powerful or dangerous mark.",
};
export const driveHints: Record<string, string> = {
  Ambition: "Increase your reputation with a faction.",
  Traveler:
    "Replace a meaningful item with one representing the local culture.",
  Antimilitarist: "Sabotage a non-denizen faction’s army or capacity for war.",
  Folklorist: "Prove or disprove a local legend.",
  Loyalty: "Obey your named patron at great personal cost.",
  Protection:
    "Keep your named ward safe through danger or the passage of time.",
  Principles: "Uphold your morals at great cost to yourself or allies.",
  Justice: "Win justice for someone wronged by the powerful.",
  Crime: "Pull off an impressive illegal caper or illicit prize.",
  Discovery: "Encounter a new wonder or ruin in the forest.",
  Infamy: "Decrease your reputation with a faction.",
  Wanderlust: "Complete a journey to a clearing.",
  Freedom: "Free a group of denizens from oppression.",
  Revenge: "Seriously harm your named foe or their interests.",
  Partisan:
    "Complete a mission from an important member of your named faction.",
  Chaos: "Topple a tyrant or oppressive order.",
  Thrills: "Escape certain death or imprisonment.",
  Greed: "Secure a substantial payday or treasure.",
  "Clean Paws": "Achieve a criminal goal while plausibly appearing innocent.",
  Discord: "Create or worsen a serious conflict between factions.",
  Development: "Contribute to a lasting improvement of an entire clearing.",
};
export const allMoves = Object.values(playbookData).flatMap((p) => p.moves);
export function effectiveStats(sheet: Sheet) {
  const result = { ...sheet.stats };
  const bonuses: Record<string, (typeof stats)[number]> = {
    "Well-Read": "Cunning",
    Brute: "Might",
    "Fleet of Foot and Hand": "Finesse",
    "Always Watching": "Cunning",
    "Master Thief": "Finesse",
  };
  for (const name of new Set(sheet.moveIds))
    if (bonuses[name])
      result[bonuses[name]] = Math.min(3, result[bonuses[name]] + 1);
  return result;
}
export function effectiveFeats(sheet: Sheet) {
  return [
    ...new Set([
      ...sheet.featIds,
      ...(sheet.moveIds.includes("Don’t Shoot the Messenger")
        ? ["Counterfeit"]
        : []),
      ...(sheet.moveIds.includes("It’s a Distraction!") ? ["Blindside"] : []),
    ]),
  ];
}
export function effectiveWeapons(sheet: Sheet) {
  return [
    ...new Set([
      ...sheet.weaponSkillIds,
      ...(sheet.moveIds.includes("Always Armed") ? ["Improvise Weapon"] : []),
      ...(sheet.moveIds.includes("Pocket Sand") ? ["Confuse Senses"] : []),
    ]),
  ];
}
export function applyPlaybook(sheet: Sheet, name: string): Sheet {
  const book = playbookData[name];
  return {
    ...sheet,
    playbook: name,
    stats: { ...book.stats },
    presetApplied: true,
    startingBonus: "",
    nature: "",
    driveIds: [],
    driveMarks: [],
    moveIds: [...book.requiredMoves],
    featIds: [...book.feats],
    weaponSkillIds: [],
  };
}
export function newCharacterSheet() {
  return { ...applyPlaybook(blankSheet(), "Ranger"), coin: 9 };
}
export function setupRemaining(sheet: Sheet) {
  const book = playbookData[sheet.playbook];
  if (!book || !sheet.presetApplied) return [];
  return [
    !sheet.startingBonus && "Choose your +1 attribute",
    !sheet.nature && "Choose a nature",
    sheet.driveIds.length < 2 && "Choose two drives",
    sheet.moveIds.length < 3 && "Choose three moves",
    sheet.featIds.length < book.feats.length + book.chooseFeats &&
      "Choose your roguish feats",
    sheet.moveIds.includes("Dirty Fighter")
      ? (sheet.weaponSkillIds.length < 3 ||
          !sheet.weaponSkillIds.some((skill) => book.weapons.includes(skill)) ||
          sheet.weaponSkillIds.filter((skill) =>
            [
              "Trick Shot",
              "Confuse Senses",
              "Improvise Weapon",
              "Disarm",
              "Vicious Strike",
            ].includes(skill),
          ).length < 2) &&
        "Choose a starting weapon skill and two Dirty Fighter skills"
      : sheet.weaponSkillIds.length < 1 && "Choose a weapon skill",
  ].filter(Boolean) as string[];
}
