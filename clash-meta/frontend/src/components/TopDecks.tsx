import { useEffect, useMemo, useState } from "react";
import { fetchTopDecks, fetchCards } from "../api";
import type { Card, Deck } from "../types";
import { getDeckName } from "../deckName";
import { getDeckCategory } from "../deckCategory";
import { CATEGORY_LABELS } from "../deckCategory";
import CardImage from "./CardImage";
import FilterBar, { DEFAULT_FILTERS, type Filters } from "./FilterBar";
import type { DeckCategory } from "../types";

type SortOption = "weighted" | "win_rate" | "games" | "elixir_low" | "elixir_high";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "weighted", label: "Best Overall" },
  { value: "win_rate", label: "Win Rate" },
  { value: "games", label: "Most Played" },
  { value: "elixir_low", label: "Elixir: Low" },
  { value: "elixir_high", label: "Elixir: High" },
];

const CATEGORIES: DeckCategory[] = [
  "all", "beatdown", "cycle", "bridge_spam", "bait", "control", "siege",
];

interface Props {
  onDeckClick: (deckKey: string) => void;
}

export default function TopDecks({ onDeckClick }: Props) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortOption>("weighted");

  useEffect(() => {
    Promise.all([fetchTopDecks(), fetchCards()])
      .then(([d, c]) => { setDecks(d); setAllCards(c); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const matched = decks.filter((deck) => {
      if (filters.category !== "all" && getDeckCategory(deck.cards) !== filters.category) return false;
      if (filters.hasChampion === true && !deck.has_champion) return false;
      if (filters.hasChampion === false && deck.has_champion) return false;
      if (filters.hasHero === true && !deck.has_hero) return false;
      if (filters.hasHero === false && deck.has_hero) return false;
      if (filters.minWinRate > 0 && deck.win_rate * 100 < filters.minWinRate) return false;
      if (filters.minElixir > 0 && deck.avg_elixir < filters.minElixir) return false;
      if (filters.maxElixir > 0 && deck.avg_elixir > filters.maxElixir) return false;
      if (filters.containsCard !== null && !deck.cards.some((c) => c.id === filters.containsCard)) return false;
      return true;
    });

    const sorted = [...matched].sort((a, b) => {
      switch (sortBy) {
        case "weighted":
          return (b.win_rate * Math.log(b.total + 1)) - (a.win_rate * Math.log(a.total + 1));
        case "win_rate":
          return b.win_rate - a.win_rate;
        case "games":
          return b.total - a.total;
        case "elixir_low":
          return a.avg_elixir - b.avg_elixir;
        case "elixir_high":
          return b.avg_elixir - a.avg_elixir;
      }
    });

    return sorted.slice(0, 10);
  }, [decks, filters, sortBy]);

  if (loading) return <p style={{ color: "#8888aa" }}>Loading top decks...</p>;
  if (decks.length === 0)
    return (
      <p style={{ color: "#8888aa" }}>
        No deck data yet. Click <b>Refresh Data</b> to fetch from the Clash Royale API.
      </p>
    );

  return (
    <div>
      <FilterBar filters={filters} onChange={setFilters} allCards={allCards} />
      <div style={styles.headingRow}>
        <h2 style={styles.heading}>Top {filtered.length} Decks</h2>
        <div style={styles.dropdownWrapper}>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value as DeckCategory })}
            style={styles.dropdown}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
          <span style={styles.dropdownArrow}>&#9660;</span>
        </div>
        <div style={styles.dropdownWrapper}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={styles.dropdown}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <span style={styles.dropdownArrow}>&#9660;</span>
        </div>
      </div>
      <div style={styles.grid}>
        {filtered.map((deck, i) => (
          <div
            key={deck.deck_key}
            style={styles.tile}
            onClick={() => onDeckClick(deck.deck_key)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "#1a6aff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "#2a2a4a";
            }}
          >
            <div style={styles.rank}>{i + 1}.</div>

            <div style={styles.middle}>
              <div style={styles.deckName}>{getDeckName(deck.cards)}</div>
              <div style={styles.cards}>
                {deck.cards.map((card) => (
                  <CardImage key={card.id} card={card} size={48} />
                ))}
              </div>
            </div>

            <div style={styles.stats}>
              <StatBadge label="Win Rate" value={`${(deck.win_rate * 100).toFixed(1)}%`} color="#4caf50" />
              <StatBadge label="Games" value={deck.total.toString()} color="#4a9eff" />
              <StatBadge label="Avg Elixir" value={deck.avg_elixir.toFixed(1)} color="#b48eff" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#8888aa", marginTop: 2 }}>{label}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  headingRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: 600,
    margin: 0,
    color: "#ffffff",
  },
  dropdownWrapper: {
    position: "relative" as const,
    display: "inline-flex",
    alignItems: "center",
  },
  dropdown: {
    background: "#1a1a3a",
    border: "1px solid #2a2a4a",
    borderRadius: 8,
    color: "#e8e8f0",
    padding: "6px 28px 6px 10px",
    fontSize: 13,
    cursor: "pointer",
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
  },
  dropdownArrow: {
    position: "absolute" as const,
    right: 8,
    fontSize: 10,
    color: "#8888aa",
    pointerEvents: "none" as const,
  },
  grid: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  tile: {
    background: "#12122a",
    border: "1px solid #2a2a4a",
    borderRadius: 12,
    padding: 16,
    cursor: "pointer",
    transition: "border-color 0.2s",
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap" as const,
  },
  rank: {
    fontSize: 20,
    fontWeight: 700,
    color: "#4a9eff",
    minWidth: 40,
  },
  middle: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  deckName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#ffffff",
  },
  cards: {
    display: "flex",
    gap: 5,
    flexWrap: "wrap" as const,
  },
  stats: {
    display: "flex",
    gap: 20,
    marginLeft: "auto",
  },
};
