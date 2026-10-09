// Concise base-rule reminders from the supplied Root Player Handouts Complete,
// a fan compilation. Page numbers refer to that document; mastery is not assumed.
export const rules: Record<string, { summary: string; page: number }> = {
  Charm: {
    summary:
      "Charm is your social presence. Use it to persuade NPCs or figure someone out. Roll 2d6 + Charm when the move is triggered.",
    page: 114,
  },
  Cunning: {
    summary:
      "Cunning is your wit and awareness. Use it to trick NPCs or read a tense situation. Roll 2d6 + Cunning when the move is triggered.",
    page: 114,
  },
  Finesse: {
    summary:
      "Finesse is your precision and agility. Use it for trained roguish feats and targeting a vulnerable foe at far range. Roll 2d6 + Finesse when the move is triggered.",
    page: 114,
  },
  Luck: {
    summary:
      "Luck is what you rely on when you trust fate, including roguish feats you have not learned. On a hit you get through, at a cost set by the GM; on 10+ you also gain a fleeting opportunity.",
    page: 114,
  },
  Might: {
    summary:
      "Might is your strength and force. Use it to wreck something, engage in melee, or grapple an enemy. Roll 2d6 + Might when the move is triggered.",
    page: 116,
  },
  injury: {
    summary:
      "Injury tracks wounds. Clear it through medical care or extended bed rest. A full track leaves you at death’s door; taking more injury than you can mark kills you. A fellow vagabond can tend wounds and mark depletion to clear 1 injury.",
    page: 148,
  },
  exhaustion: {
    summary:
      "Exhaustion tracks fatigue and effort. Clear it by fulfilling your nature or resting: a safe camp clears 1, a night in a proper bed clears 2. A full track leaves you worn out; marking beyond it makes you collapse, helpless, as the GM describes.",
    page: 148,
  },
  depletion: {
    summary:
      "Depletion tracks spent everyday supplies and money. Refill it with payment, scavenging, or foraging. A small payment or a few hours foraging clears 1. With a full track your pockets are empty and you cannot mark more depletion.",
    page: 148,
  },
  Wear: {
    summary:
      "Wear tracks damage to an item. A full track means damaged but still repairable; any additional wear destroys it beyond repair. A vagabond can spend a few hours and mark depletion to clear 1 wear. Serious repairs need an expert.",
    page: 148,
  },
  "Roguish feats": {
    summary:
      "For a feat you know, state your goal and roll +Finesse. A hit achieves it; on 7–9, mark exhaustion or the GM brings one listed risk to bear. For a feat you do not know, trust fate instead.",
    page: 114,
  },
  Acrobatics: {
    summary:
      "Climb, vault, and jump. Risks: break something, detection, plunge into danger.",
    page: 115,
  },
  Blindside: {
    summary:
      "Strike an unsuspecting target. Risks: unwanted attention, leave evidence, plunge into danger.",
    page: 115,
  },
  Counterfeit: {
    summary:
      "Copy or forge something. Risks: leave evidence, take too long, weak result.",
    page: 115,
  },
  "Cover Up": {
    summary:
      "Remove evidence or conceal what happened. Risks: detection, expend resources, take too long.",
    page: 115,
  },
  "Disable Device": {
    summary:
      "Disarm traps or stop mechanisms. Risks: break something, unwanted attention, expend resources.",
    page: 115,
  },
  Hide: {
    summary:
      "Disappear from view or remain hidden. Risks: expend resources, leave evidence, take too long.",
    page: 115,
  },
  Mastermind: {
    summary:
      "Direct NPCs and roguish operations. Risks: unwanted attention, plunge into danger, take too long.",
    page: 115,
  },
  "Pick Lock": {
    summary:
      "Open a locked door or container. Risks: break something, detection, plunge into danger.",
    page: 115,
  },
  "Pick Pocket": {
    summary:
      "Steal discreetly from a pocket. Risks: leave evidence, take too long, weak result.",
    page: 115,
  },
  "Set Trap": {
    summary:
      "Prepare an ambush or simple trap. Risks: detection, expend resources, leave evidence.",
    page: 115,
  },
  "Sleight of Hand": {
    summary:
      "Palm, switch, or discreetly discard objects. Risks: unwanted attention, leave evidence, weak result.",
    page: 115,
  },
  Sneak: {
    summary:
      "Enter or leave unseen. Risks: break something, unwanted attention, plunge into danger.",
    page: 115,
  },
  Tracking: {
    summary:
      "Follow tracks, clues, or a quarry. Risks: detection, plunge into danger, take too long.",
    page: 115,
  },
  "Use Device": {
    summary:
      "Operate machinery, artifacts, or attempt vehicle stunts. Risks: break something, plunge into danger, weak result.",
    page: 115,
  },
  "Weapon skills": {
    summary:
      "Special weapon moves normally require both the learned skill and a weapon with its matching tag and range. Follow each move’s exceptions. All vagabonds can engage, grapple, or target with a suitable weapon; unarmed harm defaults to 1 exhaustion, armed harm to 1 injury.",
    page: 116,
  },
  "Battle Fury": {
    summary:
      "At intimate range, mark weapon wear and roll +Luck. On a hit fill your exhaustion track, inflicting 2 injury per newly marked box. On 7–9 the target also deals its harm. Close-range weapons can also use this move.",
    page: 116,
  },
  Charge: {
    summary:
      "Charge a foe at far range: mark exhaustion and roll +Might. On a hit they mark 2 exhaustion or are driven where you choose, to a range you choose. On 10+ also inflict morale harm.",
    page: 116,
  },
  Cleave: {
    summary:
      "Against armored foes at close range, mark exhaustion and roll +Might. A hit inflicts 3 wear. On 7–9 mark weapon wear or end up in a bad position.",
    page: 116,
  },
  "Confuse Senses": {
    summary:
      "Throw suitable material at close or intimate range and roll +Finesse. A hit confuses their senses and creates an opening: on 10+ they need time to recover; on 7–9 the opening lasts only moments.",
    page: 116,
  },
  Disarm: {
    summary:
      "Strike a foe’s weapon at close range and roll +Finesse. On a hit they mark 2 exhaustion or lose their weapon out of reach. On 10+ avoiding disarm costs 3 exhaustion instead.",
    page: 117,
  },
  Hammerpaws: {
    summary:
      "Unarmed against an armed foe at close or intimate range, roll +Finesse. A hit also exposes you to their harm. Choose 2 on 7–9 or 3 on 10+: inflict 2 exhaustion, shift range, suffer 1 less harm, inflict equipment wear, or take an object unless they mark exhaustion.",
    page: 117,
  },
  "Harry a Group": {
    summary:
      "Harass a group at far range: mark wear and roll +Cunning. Choose 1 on 7–9, both on 10+: inflict 2 morale harm; pin or block the group.",
    page: 117,
  },
  Hurl: {
    summary:
      "Throw a weapon or dangerous object at far range: mark exhaustion, roll +Might. A hit marks weapon wear and deals 1 injury + 1 exhaustion. Choose 1 on 7–9, 2 on 10+: extra wear for +1 injury; object rebounds within reach; target falls down.",
    page: 117,
  },
  "Improvise Weapon": {
    summary:
      "Make a weapon from nearby materials and roll +Cunning. On a hit the GM assigns a range and at least one beneficial tag. On 7–9 it also has a weakness tag.",
    page: 117,
  },
  "Frightful Flourish": {
    summary:
      "Flourish your weapon when engaging a new enemy and roll +Charm. A hit inflicts 2 morale harm and makes you mark exhaustion; on 10+ you do not mark exhaustion. No special weapon tag is required.",
    page: 117,
  },
  "Long-Shot": {
    summary:
      "With a suitably tagged far-range bow, mark wear and exhaustion to extend beyond far range. Use Might instead of the normal stat for a far-range weapon move and pay that move’s costs too.",
    page: 117,
  },
  Lunge: {
    summary:
      "Lunge at close range: choose 1–3 injury and roll +Finesse. A hit inflicts that injury ignoring armor. Surviving or nearby foes can exploit your opening to deal the same injury back; on 7–9 they may deal 1 more.",
    page: 117,
  },
  "Paired Fighting": {
    summary:
      "Both fighters need the skill and tagged weapons; each marks exhaustion. Roll up to +3: +1 for a connection, +1 if outnumbered, +1 per 2 extra exhaustion shared. A hit deals 1 injury to each foe (3 to a group); each fighter suffers 1 injury. Choose 1 on 7–9, 2 on 10+: each suffer 1 less; +2 injury to one target; 2 morale harm; open a route.",
    page: 117,
  },
  Parry: {
    summary:
      "Parry at close range: mark exhaustion and roll +Finesse. A hit occupies the foe. Choose 1 on 7–9, all 3 on 10+: inflict morale or exhaustion (GM chooses); disarm within reach; suffer no harm.",
    page: 118,
  },
  "Pinpoint Shot": {
    summary:
      "Aim carefully at far range and roll +Cunning. Hit a weak point: 3 injury ignoring armor, 2 equipment wear, or a precise environmental strike. On 7–9 first mark exhaustion to scramble to a better vantage.",
    page: 118,
  },
  "Point-Blank Shot": {
    summary:
      "At intimate range mark up to 2 wear and up to 2 exhaustion, then roll +Luck. A hit deals injury equal to the total marked. On 10+ you may also retreat to close range before retaliation. An intimate range tag is not needed.",
    page: 118,
  },
  "Pommel Strike": {
    summary:
      "Strike with the pommel at intimate range and roll +Luck. A hit deals 2 exhaustion. On 10+ the foe chooses: you gain position, they suffer 1 morale harm, or their next blow deals 1 less harm.",
    page: 118,
  },
  "Quick Shot": {
    summary:
      "Snap a shot at close range and roll +Luck. A hit inflicts injury. Choose 1 on 7–9, 2 on 10+: do not mark wear; do not mark exhaustion; reposition (and optionally change range); hold the target in place.",
    page: 118,
  },
  "Storm a Group": {
    summary:
      "Attack a group in melee: mark exhaustion, roll +Might, and trade harm on a hit. Choose 1 on 7–9, 2 on 10+: deal 2 morale; deal 2 exhaustion; suffer 1 less harm; mark another exhaustion to make them harm themselves.",
    page: 118,
  },
  "Surprise Jab": {
    summary:
      "Strike with a hidden weapon at intimate range: mark exhaustion and roll +Finesse. Choose 1 on 7–9, 3 on 10+: +1 harm (repeatable); foe marks 2 exhaustion or drops what they hold; seize something vulnerable. Hide the weapon again before reusing this move.",
    page: 118,
  },
  Sweep: {
    summary:
      "Sweep your bow at foes at close range: mark exhaustion and roll +Finesse. On 7–9 they fall back one range; on 10+ also choose: gain time as they stumble, inflict 1 injury, or inflict 1 morale harm.",
    page: 118,
  },
  "Switch Hands": {
    summary:
      "Change your dominant hand during an extended fight and roll +Finesse. Choose 1 on 7–9, 2 on 10+: clear 2 exhaustion; inflict morale harm; mark exhaustion to exploit an opening and deal 2 injury.",
    page: 119,
  },
  "Trick Shot": {
    summary:
      "Exploit the environment with a shot: mark wear and roll +Finesse. Choose 2 on 7–9, 3 on 10+: hit any target in range, even hidden; hit a second target; cut, break, or topple something; distract a foe and create an opening.",
    page: 119,
  },
  "Vicious Strike": {
    summary:
      "Strike a weak point at close or intimate range: mark exhaustion and roll +Might. A hit deals +1 harm and cannot be blocked by armor wear. On 7–9 the foe also strikes you; on 10+ you get away with it.",
    page: 119,
  },
  Coin: {
    summary:
      "Coin records spare money in Value, not individual coins. Unspent starting equipment value is kept as coin. One Value can buy a day’s food or a night at an inn. Mark depletion for ordinary pocket supplies; track valuable equipment separately.",
    page: 131,
  },
  Load: {
    summary:
      "Load measures how much equipment weighs you down. Most substantial items take 1 Load; small items may take 0, and bulky tags add more. This sheet totals the Load entered for each item.",
    page: 131,
  },
  Value: {
    summary:
      "Equipment Value is wear boxes + extra ranges + weapon move tags + beneficial tags − flaw tags. A weapon includes one range for free. The GM decides which tags fit the item.",
    page: 131,
  },
  Range: {
    summary:
      "Range tells you where a weapon is effective: intimate, close, or far. Use the range required by the move, unless that move explicitly allows an exception.",
    page: 131,
  },
  Nature: {
    summary:
      "Your nature expresses your inner self. Fulfill its condition to clear exhaustion. Read the selected nature’s reminder for its specific trigger.",
    page: 149,
  },
  Drives: {
    summary:
      "Drives are your goals and desires. Each drive can grant one advancement per session when its condition is fulfilled.",
    page: 149,
  },
  Connections: {
    summary:
      "Connections describe bonds between vagabonds. After introductions, choose another vagabond for each connection and discuss that shared history together.",
    page: 149,
  },
  Hold: {
    summary:
      "Hold is a resource granted by a move. Spend it only on that move’s listed options; its text determines when unused hold expires.",
    page: 114,
  },
  Forward: {
    summary:
      "Forward modifies the next applicable roll. This sheet adds it to the next attribute roll and then clears it; apply any restrictions from the move that granted it.",
    page: 114,
  },
  Ongoing: {
    summary:
      "Ongoing modifies applicable rolls while its granting effect lasts. Clear or adjust it when that effect ends; this sheet keeps it until you change it.",
    page: 114,
  },
  Prestige: {
    summary:
      "Prestige records deeds that improve a faction’s opinion of you. Mark it when the fiction or a move grants it; it helps raise your Reputation. Starting characters mark 2 with the faction they served most.",
    page: 123,
  },
  Notoriety: {
    summary:
      "Notoriety records deeds that worsen a faction’s opinion of you and push Reputation down. Starting characters mark 1 with the faction they made an enemy of. Resolve changes in standing with the table.",
    page: 123,
  },
  "Weapon harm": {
    summary:
      "Weapons normally inflict 1 injury; unarmed attacks normally inflict 1 exhaustion. Moves and tags can change the amount or type of harm. Apply armor and the move’s consequences at the table.",
    page: 116,
  },
  Advancements: {
    summary:
      "Fulfilling a drive earns an advancement, at most once per drive per session. Record the advancement here and apply your chosen improvement with your table. Starting a new session clears drive marks, not earned advancements.",
    page: 149,
  },
};

Object.assign(rules, {
  Playbook: {
    summary:
      "Your playbook describes your kind of vagabond and provides starting attributes, moves, natures, drives, feats, and weapon skills.",
    page: 149,
  },
  Species: {
    summary:
      "Your species describes what kind of animal you are and how other denizens may see you. It does not automatically change attributes or grant optional species moves on this sheet.",
    page: 149,
  },
  Attributes: {
    summary:
      "Attributes describe your strengths and weaknesses. Add +1 to one starting attribute, without exceeding +2 during creation. Move bonuses are applied separately.",
    page: 149,
  },
  "Playbook moves": {
    summary:
      "Playbook moves are your special abilities. Read the trigger, cost, and result before using one. Most playbooks begin with three moves, including any required moves.",
    page: 149,
  },
  "Details & tags": {
    summary:
      "Tags describe an item’s special properties, benefits, and flaws. Weapon move tags identify supported skills; record their effects here and apply them when the relevant move triggers.",
    page: 131,
  },
});
rules["Wear boxes"] = rules.Wear;
rules["Starting reputation"] = {
  page: 149,
  summary:
    "For a new character: mark 2 prestige with the faction you served most, and 1 notoriety with your enemy.",
};
