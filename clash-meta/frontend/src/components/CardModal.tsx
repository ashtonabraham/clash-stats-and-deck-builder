import { useEffect, useState } from "react";
import { fetchCardStats } from "../api";
import type { CardStats } from "../types";
import { getDeckName } from "../deckName";
import CardImage from "./CardImage";

interface Props {
  cardId: number;
  onClose: () => void;
}

export default function CardModal({ cardId, onClose }: Props) {
  const [stats, setStats] = useState<CardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCardStats(cardId)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [cardId]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.close}>
          &times;
        </button>

        {loading ? (
          <p style={{ color: "#8888aa" }}>Loading...</p>
        ) : !stats ? (
          <p style={{ color: "#ff5555" }}>Card not found.</p>
        ) : (
          <>
            <div style={styles.header}>
              <CardImage card={stats.card} size={80} />
              <div>
                <h2 style={styles.name}>{stats.card.name}</h2>
                <p style={styles.rarity}>
                  {stats.card.rarity} &middot;{" "}
                  {stats.card.elixir != null ? `${stats.card.elixir} elixir` : ""}
                </p>
              </div>
            </div>

            <div style={styles.statsRow}>
              <Stat label="Win Rate" value={`${(stats.win_rate * 100).toFixed(1)}%`} color="#4caf50" />
              <Stat label="Battles" value={stats.total_battles.toString()} color="#4a9eff" />
              <Stat label="In Decks" value={stats.deck_count.toString()} color="#ffffff" />
            </div>

            {stats.top_decks.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 style={styles.subheading}>Top Decks Using This Card</h3>
                {stats.top_decks.map((d, i) => (
                  <div key={d.deck_key} style={styles.deckRow}>
                    <span style={{ color: "#4a9eff", minWidth: 28 }}>{i + 1}.</span>
                    <span style={{ flex: 1, fontWeight: 600 }}>
                      {getDeckName(d.cards)}
                    </span>
                    <span style={{ color: "#8888aa", marginLeft: 8 }}>{d.total}g</span>
                    <span style={{ color: "#4caf50", marginLeft: 8, minWidth: 60, textAlign: "right" }}>
                      {(d.win_rate * 100).toFixed(1)}% WR
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#8888aa", marginTop: 2 }}>{label}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#12122a",
    border: "1px solid #2a2a4a",
    borderRadius: 16,
    padding: 28,
    maxWidth: 480,
    width: "90%",
    position: "relative",
  },
  close: {
    position: "absolute",
    top: 12,
    right: 16,
    background: "none",
    border: "none",
    color: "#8888aa",
    fontSize: 24,
    cursor: "pointer",
  },
  header: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: 700,
    color: "#ffffff",
  },
  rarity: {
    fontSize: 14,
    color: "#8888aa",
    marginTop: 4,
    textTransform: "capitalize" as const,
  },
  statsRow: {
    display: "flex",
    justifyContent: "space-around",
    background: "#1a1a3a",
    borderRadius: 8,
    padding: 16,
  },
  subheading: {
    fontSize: 14,
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: 8,
  },
  deckRow: {
    display: "flex",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #1a1a3a",
    fontSize: 13,
  },
};
