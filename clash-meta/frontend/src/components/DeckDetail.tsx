import { useEffect, useState } from "react";
import { fetchDeckDetail } from "../api";
import type { Deck } from "../types";
import CardImage from "./CardImage";

interface Props {
  deckKey: string;
  onBack: () => void;
  onCardClick: (cardId: number) => void;
}

export default function DeckDetail({ deckKey, onBack, onCardClick }: Props) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeckDetail(deckKey)
      .then(setDeck)
      .finally(() => setLoading(false));
  }, [deckKey]);

  if (loading) return <p style={{ color: "#8888aa" }}>Loading deck...</p>;
  if (!deck) return <p style={{ color: "#ff5555" }}>Deck not found.</p>;

  const winPct = (deck.win_rate * 100).toFixed(1);
  const losePct = ((1 - deck.win_rate) * 100).toFixed(1);

  return (
    <div>
      <button onClick={onBack} style={styles.back}>
        &larr; Back to Top Decks
      </button>

      <div style={styles.container}>
        <h2 style={styles.heading}>Deck Detail</h2>

        <div style={styles.cardGrid}>
          {deck.cards.map((card) => (
            <div key={card.id} style={styles.cardItem}>
              <CardImage card={card} size={80} onClick={() => onCardClick(card.id)} />
              <div style={styles.cardName}>{card.name}</div>
              <div style={styles.cardElixir}>
                {card.elixir != null ? `${card.elixir} elixir` : ""}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.statsGrid}>
          <StatBlock label="Win Rate" value={`${winPct}%`} color="#4caf50" />
          <StatBlock label="Loss Rate" value={`${losePct}%`} color="#f44336" />
          <StatBlock label="Total Games" value={deck.total.toString()} color="#4a9eff" />
          <StatBlock label="Wins" value={deck.wins.toString()} color="#4caf50" />
          <StatBlock label="Losses" value={deck.losses.toString()} color="#f44336" />
          <StatBlock label="Avg Elixir" value={deck.avg_elixir.toFixed(1)} color="#b48eff" />
        </div>

        {/* Win rate bar */}
        <div style={styles.barContainer}>
          <div style={{ ...styles.barWin, width: `${winPct}%` }} />
          <div style={{ ...styles.barLoss, width: `${losePct}%` }} />
        </div>
        <div style={styles.barLabels}>
          <span style={{ color: "#4caf50" }}>{deck.wins}W</span>
          <span style={{ color: "#f44336" }}>{deck.losses}L</span>
        </div>
      </div>
    </div>
  );
}

function StatBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={styles.statBlock}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#8888aa" }}>{label}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  back: {
    background: "none",
    border: "1px solid #3a3a5e",
    color: "#4a9eff",
    padding: "8px 16px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    marginBottom: 16,
  },
  container: {
    background: "#12122a",
    border: "1px solid #2a2a4a",
    borderRadius: 12,
    padding: 24,
  },
  heading: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 20,
    color: "#ffffff",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 24,
  },
  cardItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
  },
  cardName: {
    fontSize: 13,
    fontWeight: 600,
    textAlign: "center" as const,
  },
  cardElixir: {
    fontSize: 11,
    color: "#b48eff",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    marginBottom: 24,
  },
  statBlock: {
    background: "#1a1a3a",
    borderRadius: 8,
    padding: 16,
    textAlign: "center" as const,
  },
  barContainer: {
    display: "flex",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 6,
  },
  barWin: {
    background: "#4caf50",
    height: "100%",
  },
  barLoss: {
    background: "#f44336",
    height: "100%",
  },
  barLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
  },
};
