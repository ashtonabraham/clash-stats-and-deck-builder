import type { Card, DeckCategory } from "./types";

// Classify a deck into a broad archetype category.
// Designed to be extended with more granular sub-categories later.
export function getDeckCategory(cards: Card[]): DeckCategory {
  const names = new Set(cards.map((c) => c.name));
  const has = (n: string) => names.has(n);
  const avgElixir =
    cards.reduce((sum, c) => sum + (c.elixir ?? 0), 0) / (cards.length || 1);

  const baitCards = [
    "Goblin Barrel", "Goblin Gang", "Princess", "Dart Goblin",
    "Skeleton Army", "Skeleton Barrel", "Rascals", "Guards",
  ];
  const baitCount = baitCards.filter((c) => has(c)).length;

  // Siege
  if (has("X-Bow") || has("Mortar")) return "siege";

  // Beatdown — heavy tank-based pushes
  const beatdownTanks = [
    "Golem", "Lava Hound", "Giant", "Electro Giant",
    "Elixir Golem", "Goblin Giant", "Giant Skeleton", "Royal Giant",
  ];
  if (beatdownTanks.some((c) => has(c)) && avgElixir >= 3.3) return "beatdown";

  // Bridge spam
  const bridgeSpamCards = ["Battle Ram", "Ram Rider", "Bandit"];
  const bridgeCount = bridgeSpamCards.filter((c) => has(c)).length;
  if (has("P.E.K.K.A") && bridgeCount >= 1) return "bridge_spam";
  if (bridgeCount >= 2) return "bridge_spam";

  // Bait / Log Bait
  if (has("Goblin Barrel") || baitCount >= 3) return "bait";

  // Cycle — low elixir, fast rotation
  if (avgElixir < 3.1) return "cycle";

  // Control — defensive, counterpush
  const controlCards = [
    "P.E.K.K.A", "Mega Knight", "Graveyard", "Miner",
    "Poison", "Rocket", "Tornado",
  ];
  const controlCount = controlCards.filter((c) => has(c)).length;
  if (controlCount >= 2) return "control";

  // Beatdown fallback for heavy decks
  if (avgElixir >= 3.8) return "beatdown";

  return "control";
}

export const CATEGORY_LABELS: Record<DeckCategory, string> = {
  all: "All",
  beatdown: "Beatdown",
  cycle: "Cycle",
  bridge_spam: "Bridge Spam",
  bait: "Bait",
  control: "Control",
  siege: "Siege",
};
