import type { Card } from "./types";

// Classify a deck into a proper Clash Royale archetype name using community
// naming conventions (RoyaleAPI, deckshop, r/ClashRoyale style).
export function getDeckName(cards: Card[]): string {
  const names = new Set(cards.map((c) => c.name));
  const has = (n: string) => names.has(n);
  const avgElixir =
    cards.reduce((sum, c) => sum + (c.elixir ?? 0), 0) / (cards.length || 1);

  const baitCards = [
    "Goblin Barrel", "Goblin Gang", "Princess", "Dart Goblin",
    "Skeleton Army", "Skeleton Barrel", "Rascals", "Guards",
  ];
  const baitCount = baitCards.filter((c) => has(c)).length;

  // --- LavaLoon / Lava Hound ---
  if (has("Lava Hound") && has("Balloon") && has("Clone")) return "LavaLoon Clone";
  if (has("Lava Hound") && has("Balloon")) return "LavaLoon";
  if (has("Lava Hound") && has("Skeleton Dragons")) return "Lava Hound Drag";
  if (has("Lava Hound") && has("Miner")) return "Lava Miner";
  if (has("Lava Hound")) return "Lava Hound";

  // --- Golem ---
  if (has("Golem") && has("Night Witch") && has("Clone")) return "Golem Clone";
  if (has("Golem") && has("Night Witch")) return "Golem Night Witch";
  if (has("Golem") && has("Lightning")) return "Golem Lightning";
  if (has("Golem") && has("Tornado")) return "Golem Tornado";
  if (has("Golem")) return "Golem Beatdown";

  // --- Elixir Golem ---
  if (has("Elixir Golem") && has("Battle Healer")) return "Elixir Golem Healer";
  if (has("Elixir Golem")) return "Elixir Golem";

  // --- Giant ---
  if (has("Giant") && has("Prince") && has("Dark Prince")) return "Giant Double Prince";
  if (has("Giant") && has("Graveyard")) return "Giant Graveyard";
  if (has("Giant") && has("Sparky")) return "Giant Sparky";
  if (has("Giant") && has("Witch")) return "Giant Witch";
  if (has("Giant") && has("Miner")) return "Giant Miner";
  if (has("Giant") && has("Three Musketeers")) return "Giant 3M";
  if (has("Giant")) return "Giant Beatdown";

  // --- Goblin Giant ---
  if (has("Goblin Giant") && has("Sparky")) return "Goblin Giant Sparky";
  if (has("Goblin Giant")) return "Goblin Giant";

  // --- Giant Skeleton ---
  if (has("Giant Skeleton") && has("Clone")) return "Giant Skeleton Clone";
  if (has("Giant Skeleton") && has("Witch")) return "Giant Skeleton Witch";
  if (has("Giant Skeleton")) return "Giant Skeleton";

  // --- E-Giant ---
  if (has("Electro Giant") && has("Tornado")) return "E-Giant Tornado";
  if (has("Electro Giant") && has("Lightning")) return "E-Giant Lightning";
  if (has("Electro Giant")) return "E-Giant";

  // --- PEKKA / Bridge Spam ---
  if (has("P.E.K.K.A") && has("Battle Ram") && has("Bandit")) return "PEKKA Bridge Spam";
  if (has("P.E.K.K.A") && has("Ram Rider")) return "PEKKA Ram Rider";
  if (has("P.E.K.K.A") && has("Battle Ram")) return "PEKKA Bridge Spam";
  if (has("P.E.K.K.A") && has("Hog Rider")) return "PEKKA Hog";
  if (has("P.E.K.K.A") && has("Graveyard")) return "PEKKA Graveyard";
  if (has("P.E.K.K.A")) return "PEKKA Control";

  if (has("Ram Rider") && has("Bandit")) return "Bridge Spam";
  if (has("Battle Ram") && has("Bandit")) return "Bridge Spam";
  if (has("Battle Ram") && has("Dark Prince") && has("Royal Ghost")) return "Dark Prince Bridge Spam";
  if (has("Battle Ram") && has("Dark Prince")) return "Dark Prince Ram";

  // --- Log Bait / Spell Bait ---
  // Community calls almost all Goblin Barrel decks "Log Bait"
  if (has("Goblin Barrel") && has("Princess") && has("Rocket") && has("Inferno Tower"))
    return "Classic Log Bait";
  if (has("Goblin Barrel") && has("Princess") && has("Rocket"))
    return "Log Bait";
  if (has("Goblin Barrel") && has("Princess"))
    return "Log Bait";
  if (has("Goblin Barrel") && has("Dart Goblin"))
    return "Log Bait";
  if (has("Goblin Barrel") && has("Wall Breakers"))
    return "Log Bait Wall Breakers";
  if (has("Goblin Barrel") && has("Rocket"))
    return "Rocket Log Bait";
  if (has("Goblin Barrel"))
    return "Log Bait";

  // --- Royal Giant ---
  if (has("Royal Giant") && has("Fisherman") && has("Hunter")) return "RG Fisherman";
  if (has("Royal Giant") && has("Fisherman")) return "RG Fisherman";
  if (has("Royal Giant") && has("Lightning")) return "RG Lightning";
  if (has("Royal Giant") && has("Furnace")) return "RG Furnace";
  if (has("Royal Giant") && avgElixir < 3.3) return "RG Cycle";
  if (has("Royal Giant") && has("Mother Witch")) return "RG Mother Witch";
  if (has("Royal Giant")) return "Royal Giant";

  // --- Hog Rider ---
  if (has("Hog Rider") && has("Musketeer") && has("Ice Golem") && has("Ice Spirit")
    && has("Skeletons") && has("Cannon") && has("Fireball") && has("The Log"))
    return "2.6 Hog Cycle";
  if (has("Hog Rider") && has("Musketeer") && has("Ice Golem") && avgElixir <= 2.8)
    return "2.6 Hog Cycle";
  if (has("Hog Rider") && has("Earthquake") && has("Firecracker")) return "Hog EQ";
  if (has("Hog Rider") && has("Earthquake")) return "Hog EQ";
  if (has("Hog Rider") && has("Firecracker")) return "Hog Firecracker";
  if (has("Hog Rider") && has("Freeze")) return "Hog Freeze";
  if (has("Hog Rider") && has("Tornado")) return "Hog Tornado";
  if (has("Hog Rider") && has("Executioner")) return "Hog Exenado";
  if (has("Hog Rider") && avgElixir < 3.1) return "Hog Cycle";
  if (has("Hog Rider")) return "Hog Rider";

  // --- Royal Hogs ---
  if (has("Royal Hogs") && has("Firecracker") && has("Mother Witch")) return "Royal Hogs Mother Witch";
  if (has("Royal Hogs") && has("Firecracker")) return "Royal Hogs Firecracker";
  if (has("Royal Hogs") && has("Flying Machine")) return "Royal Hogs Flying Machine";
  if (has("Royal Hogs") && has("Earthquake")) return "Royal Hogs EQ";
  if (has("Royal Hogs") && has("Three Musketeers")) return "3M Royal Hogs";
  if (has("Royal Hogs")) return "Royal Hogs";

  // --- Graveyard ---
  if (has("Graveyard") && has("Freeze")) return "Graveyard Freeze";
  if (has("Graveyard") && has("Poison") && (has("Baby Dragon") || has("Tornado") || has("Bowler")))
    return "Splashyard";
  if (has("Graveyard") && has("Poison")) return "Graveyard Poison";
  if (has("Graveyard") && has("Giant")) return "Giant Graveyard";
  if (has("Graveyard")) return "Graveyard";

  // --- Siege ---
  if (has("X-Bow") && has("Tesla") && avgElixir < 3.2) return "2.9 X-Bow";
  if (has("X-Bow") && has("Tesla")) return "X-Bow";
  if (has("X-Bow") && has("Rocket")) return "X-Bow Rocket";
  if (has("X-Bow")) return "X-Bow";

  if (has("Mortar") && has("Miner")) return "Mortar Miner";
  if (has("Mortar") && has("Rocket")) return "Mortar Rocket";
  if (has("Mortar") && has("Hog Rider")) return "Mortar Hog";
  if (has("Mortar") && avgElixir < 3.2) return "Mortar Cycle";
  if (has("Mortar") && baitCount >= 2) return "Mortar Bait";
  if (has("Mortar")) return "Mortar";

  // --- Three Musketeers ---
  if (has("Three Musketeers") && has("Royal Hogs")) return "3M Royal Hogs";
  if (has("Three Musketeers") && has("Battle Ram")) return "3M Ram";
  if (has("Three Musketeers")) return "3M Pump";

  // --- Balloon ---
  if (has("Balloon") && has("Freeze") && has("Lumberjack")) return "LumberLoon Freeze";
  if (has("Balloon") && has("Freeze")) return "Balloon Freeze";
  if (has("Balloon") && has("Lumberjack")) return "LumberLoon";
  if (has("Balloon") && has("Miner")) return "Miner Balloon";
  if (has("Balloon") && avgElixir < 3.2) return "Balloon Cycle";
  if (has("Balloon")) return "Balloon";

  // --- Miner ---
  if (has("Miner") && has("Wall Breakers")) return "Miner Wall Breakers";
  if (has("Miner") && has("Poison") && has("Electro Wizard")) return "Miner Poison";
  if (has("Miner") && has("Poison")) return "Miner Poison";
  if (has("Miner") && has("Rocket")) return "Miner Rocket";
  if (has("Miner") && avgElixir < 3.0) return "Miner Cycle";
  if (has("Miner")) return "Miner Control";

  // --- Wall Breakers ---
  if (has("Wall Breakers") && avgElixir < 3.0) return "Wall Breakers Cycle";
  if (has("Wall Breakers")) return "Wall Breakers";

  // --- Mega Knight ---
  if (has("Mega Knight") && has("Ram Rider")) return "Mega Knight Ram Rider";
  if (has("Mega Knight") && has("Skeleton Barrel") && baitCount >= 2) return "Mega Knight Bait";
  if (has("Mega Knight") && has("Inferno Dragon")) return "Mega Knight Inferno Dragon";
  if (has("Mega Knight") && has("Wall Breakers")) return "Mega Knight Wall Breakers";
  if (has("Mega Knight")) return "Mega Knight";

  // --- Sparky ---
  if (has("Sparky") && has("Rage")) return "Sparky Rage";
  if (has("Sparky")) return "Sparky";

  // --- Champions ---
  if (has("Skeleton King") && has("Graveyard")) return "Skeleton King Graveyard";
  if (has("Skeleton King") && baitCount >= 2) return "Skeleton King Bait";
  if (has("Skeleton King")) return "Skeleton King";

  if (has("Monk") && has("Hog Rider")) return "Monk Hog";
  if (has("Monk")) return "Monk";

  if (has("Archer Queen") && avgElixir < 3.2) return "AQ Cycle";
  if (has("Archer Queen")) return "Archer Queen";

  if (has("Golden Knight") && avgElixir < 3.0) return "GK Cycle";
  if (has("Golden Knight") && has("Battle Ram")) return "GK Bridge Spam";
  if (has("Golden Knight")) return "Golden Knight";

  if (has("Mighty Miner") && has("Mortar")) return "Mighty Miner Mortar";
  if (has("Mighty Miner")) return "Mighty Miner";

  if (has("Little Prince")) return "Little Prince";

  // --- Misc win conditions ---
  if (has("Phoenix")) return "Phoenix";
  if (has("Cannon Cart") && has("Goblin Hut")) return "Hut Spam";
  if (has("Goblin Hut") && has("Furnace")) return "Hut Spam";
  if (has("Prince") && has("Dark Prince")) return "Double Prince";

  // --- Generic fallback by playstyle ---
  if (avgElixir >= 4.0) return "Heavy Beatdown";
  if (avgElixir < 2.9) return "Cycle";
  if (baitCount >= 2) return "Spell Bait";
  if (avgElixir >= 3.5) return "Beatdown";
  if (avgElixir <= 3.2) return "Control";

  // Last resort: two most expensive cards
  const sorted = [...cards].sort((a, b) => (b.elixir ?? 0) - (a.elixir ?? 0));
  return sorted.slice(0, 2).map((c) => c.name).join(" ");
}
