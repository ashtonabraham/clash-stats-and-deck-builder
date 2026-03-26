export interface Card {
  id: number;
  name: string;
  elixir: number | null;
  rarity: string | null;
  icon_url: string | null;
  hero_icon_url: string | null;
}

export interface Deck {
  deck_key: string;
  cards: Card[];
  wins: number;
  losses: number;
  total: number;
  win_rate: number;
  avg_elixir: number;
  has_champion: boolean;
  has_hero: boolean;
}

export type DeckCategory =
  | "all"
  | "beatdown"
  | "cycle"
  | "bridge_spam"
  | "bait"
  | "control"
  | "siege";

export interface CardStats {
  card: Card;
  deck_count: number;
  total_wins: number;
  total_losses: number;
  total_battles: number;
  win_rate: number;
  top_decks: { deck_key: string; total: number; win_rate: number; cards: Card[] }[];
}
