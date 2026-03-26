import { useState } from "react";
import TopDecks from "./components/TopDecks";
import DeckDetail from "./components/DeckDetail";
import CardModal from "./components/CardModal";
import Header from "./components/Header";
import DeckBuilder from "./components/DeckBuilder";

type Tab = "meta" | "builder";

export default function App() {
  const [tab, setTab] = useState<Tab>("meta");
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>
      <Header />

      <div style={styles.tabRow}>
        <button
          onClick={() => { setTab("meta"); setSelectedDeck(null); }}
          style={{
            ...styles.tab,
            ...(tab === "meta" ? styles.tabActive : {}),
          }}
        >
          Top Decks
        </button>
        <button
          onClick={() => setTab("builder")}
          style={{
            ...styles.tab,
            ...(tab === "builder" ? styles.tabActive : {}),
          }}
        >
          Deck Builder
        </button>
      </div>

      {tab === "meta" && (
        selectedDeck ? (
          <DeckDetail
            deckKey={selectedDeck}
            onBack={() => setSelectedDeck(null)}
            onCardClick={(id) => setSelectedCardId(id)}
          />
        ) : (
          <TopDecks
            onDeckClick={(key) => setSelectedDeck(key)}
          />
        )
      )}

      {tab === "builder" && <DeckBuilder />}

      {selectedCardId !== null && (
        <CardModal
          cardId={selectedCardId}
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tabRow: {
    display: "flex",
    gap: 8,
    marginBottom: 20,
  },
  tab: {
    background: "#1a1a3a",
    color: "#8888aa",
    border: "1px solid #2a2a4a",
    borderRadius: 8,
    padding: "8px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  tabActive: {
    background: "#1a3a6a",
    color: "#4a9eff",
    borderColor: "#4a9eff",
  },
};
