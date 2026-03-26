import { useEffect, useState } from "react";
import { fetchCards, buildDeck } from "../api";
import type { Card, Deck } from "../types";
import CardImage from "./CardImage";
import { getDeckName } from "../deckName";

const FAVORITES_KEY = "clash-meta-favorites";

function loadFavorites(): Set<number> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites(favs: Set<number>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs]));
}

export default function DeckBuilder() {
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [slots, setSlots] = useState<(Card | null)[]>(Array(8).fill(null));
  const [lockedSlots, setLockedSlots] = useState<boolean[]>(Array(8).fill(false));
  const [search, setSearch] = useState("");
  const [building, setBuilding] = useState(false);
  const [result, setResult] = useState<Deck | null>(null);
  const [resultType, setResultType] = useState<"meta" | "synergy" | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(loadFavorites);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    fetchCards().then(setAllCards);
  }, []);

  const selectedIds = new Set(slots.filter(Boolean).map((c) => c!.id));

  const filteredCards = allCards
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aFav = favorites.has(a.id) ? 0 : 1;
      const bFav = favorites.has(b.id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.name.localeCompare(b.name);
    });

  function addCard(card: Card, targetSlot?: number) {
    if (selectedIds.has(card.id)) return;
    setSlots((prev) => {
      const next = [...prev];
      if (targetSlot !== undefined && next[targetSlot] === null) {
        next[targetSlot] = card;
      } else {
        const empty = next.findIndex((s) => s === null);
        if (empty === -1) return prev;
        next[empty] = card;
      }
      return next;
    });
    setLockedSlots((prev) => {
      const next = [...prev];
      if (targetSlot !== undefined && slots[targetSlot] === null) {
        next[targetSlot] = true;
      } else {
        const empty = slots.findIndex((s) => s === null);
        if (empty !== -1) next[empty] = true;
      }
      return next;
    });
    // Clear result when deck changes
    setResult(null);
    setResultType(null);
  }

  function removeCard(index: number) {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setLockedSlots((prev) => {
      const next = [...prev];
      next[index] = false;
      return next;
    });
    setResult(null);
    setResultType(null);
  }

  function clearAll() {
    setSlots(Array(8).fill(null));
    setLockedSlots(Array(8).fill(false));
    setResult(null);
    setResultType(null);
  }

  function toggleFavorite(id: number) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavorites(next);
      return next;
    });
  }

  async function handleBuild() {
    setBuilding(true);
    try {
      const lockedIds = slots
        .filter((c, i) => c !== null && lockedSlots[i])
        .map((c) => c!.id);
      const deck = await buildDeck(lockedIds);

      // Fill slots with the result
      const newSlots: (Card | null)[] = [...deck.cards];
      const newLocked = newSlots.map((card, i) => {
        // A slot is locked if the user placed it there
        return card !== null && lockedIds.includes(card.id);
      });

      setSlots(newSlots);
      setLockedSlots(newLocked);
      setResult(deck);
      setResultType(deck.total > 0 ? "meta" : "synergy");
    } catch {
      // Could show an error, but keep it simple
    } finally {
      setBuilding(false);
    }
  }

  // Drag handlers
  function onDragStart(e: React.DragEvent, cardId: number) {
    e.dataTransfer.setData("text/plain", cardId.toString());
    e.dataTransfer.effectAllowed = "copy";
  }

  function onSlotDragOver(e: React.DragEvent, index: number) {
    if (slots[index] !== null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(index);
  }

  function onSlotDragLeave() {
    setDragOver(null);
  }

  function onSlotDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOver(null);
    const cardId = parseInt(e.dataTransfer.getData("text/plain"));
    const card = allCards.find((c) => c.id === cardId);
    if (card) addCard(card, index);
  }

  return (
    <div>
      {/* Card Slots */}
      <h2 style={styles.heading}>Your Deck</h2>
      <div style={styles.slotsGrid}>
        {slots.map((card, i) => (
          <div
            key={i}
            style={{
              ...styles.slot,
              ...(dragOver === i ? styles.slotDragOver : {}),
              ...(card && !lockedSlots[i] && result ? styles.slotRecommended : {}),
              ...(card && lockedSlots[i] ? styles.slotLocked : {}),
            }}
            onClick={() => card && removeCard(i)}
            onDragOver={(e) => onSlotDragOver(e, i)}
            onDragLeave={onSlotDragLeave}
            onDrop={(e) => onSlotDrop(e, i)}
          >
            {card ? (
              <div style={{ position: "relative" }}>
                <CardImage card={card} size={64} />
                {lockedSlots[i] && (
                  <div style={styles.lockBadge}>🔒</div>
                )}
                <div style={styles.slotCardName}>{card.name}</div>
              </div>
            ) : (
              <div style={styles.emptySlot}>+</div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button
          onClick={handleBuild}
          disabled={building}
          style={{
            ...styles.buildBtn,
            ...(building ? { opacity: 0.6, cursor: "not-allowed" } : {}),
          }}
        >
          {building ? "Building..." : "Build My Deck"}
        </button>
        {slots.some(Boolean) && (
          <button onClick={clearAll} style={styles.clearBtn}>
            Clear All
          </button>
        )}
      </div>

      {/* Result */}
      {result && (
        <div style={styles.resultBox}>
          {resultType === "meta" ? (
            <>
              <div style={styles.resultTitle}>Meta Deck Match!</div>
              <div style={styles.resultName}>{getDeckName(result.cards)}</div>
              <div style={styles.resultStats}>
                <span style={{ color: "#4caf50" }}>
                  {(result.win_rate * 100).toFixed(1)}% Win Rate
                </span>
                <span style={{ color: "#4a9eff" }}>{result.total} Games</span>
                <span style={{ color: "#b48eff" }}>
                  {result.avg_elixir.toFixed(1)} Avg Elixir
                </span>
              </div>
            </>
          ) : (
            <>
              <div style={styles.resultTitle}>Custom Build</div>
              <div style={{ color: "#8888aa", fontSize: 13 }}>
                Based on card synergy data
              </div>
              <div style={styles.resultStats}>
                <span style={{ color: "#b48eff" }}>
                  {result.avg_elixir.toFixed(1)} Avg Elixir
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Card Catalog */}
      <h2 style={{ ...styles.heading, marginTop: 24 }}>Card Catalog</h2>
      <input
        type="text"
        placeholder="Search cards..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.searchInput}
      />
      <div style={styles.catalogGrid}>
        {filteredCards.map((card) => {
          const selected = selectedIds.has(card.id);
          const isFav = favorites.has(card.id);
          return (
            <div
              key={card.id}
              draggable={!selected}
              onDragStart={(e) => onDragStart(e, card.id)}
              onClick={() => !selected && addCard(card)}
              style={{
                ...styles.catalogCard,
                ...(selected ? styles.catalogCardSelected : {}),
              }}
            >
              <div style={{ position: "relative" }}>
                <CardImage card={card} size={56} />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(card.id);
                  }}
                  style={{
                    ...styles.favBtn,
                    color: isFav ? "#ffd700" : "#3a3a5e",
                  }}
                >
                  ★
                </button>
              </div>
              <div style={styles.catalogCardName}>{card.name}</div>
              {card.elixir !== null && (
                <div style={styles.catalogCardElixir}>{card.elixir}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: {
    fontSize: 20,
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: 12,
  },
  slotsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
    maxWidth: 380,
    marginBottom: 16,
  },
  slot: {
    background: "#12122a",
    border: "2px dashed #2a2a4a",
    borderRadius: 10,
    minHeight: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    position: "relative" as const,
  },
  slotDragOver: {
    borderColor: "#4a9eff",
    background: "#1a2a4a",
  },
  slotLocked: {
    border: "2px solid #4a9eff",
  },
  slotRecommended: {
    border: "2px solid #4caf50",
  },
  lockBadge: {
    position: "absolute" as const,
    top: -6,
    right: -6,
    fontSize: 12,
  },
  slotCardName: {
    fontSize: 10,
    color: "#8888aa",
    textAlign: "center" as const,
    marginTop: 2,
    maxWidth: 64,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  emptySlot: {
    fontSize: 28,
    color: "#3a3a5e",
    fontWeight: 300,
  },
  actions: {
    display: "flex",
    gap: 10,
    marginBottom: 16,
  },
  buildBtn: {
    background: "#4a9eff",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    padding: "10px 24px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  clearBtn: {
    background: "none",
    border: "1px solid #3a3a5e",
    color: "#8888aa",
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 13,
    cursor: "pointer",
  },
  resultBox: {
    background: "#12122a",
    border: "1px solid #2a2a4a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#4caf50",
    marginBottom: 4,
  },
  resultName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: 8,
  },
  resultStats: {
    display: "flex",
    gap: 20,
    fontSize: 14,
    fontWeight: 600,
  },
  searchInput: {
    width: "100%",
    boxSizing: "border-box" as const,
    background: "#1a1a3a",
    border: "1px solid #2a2a4a",
    borderRadius: 8,
    color: "#e8e8f0",
    padding: "8px 12px",
    fontSize: 14,
    marginBottom: 12,
  },
  catalogGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
    gap: 8,
  },
  catalogCard: {
    background: "#12122a",
    border: "1px solid #2a2a4a",
    borderRadius: 8,
    padding: 6,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    cursor: "grab",
    transition: "all 0.15s",
    position: "relative" as const,
  },
  catalogCardSelected: {
    opacity: 0.3,
    cursor: "default",
  },
  catalogCardName: {
    fontSize: 10,
    color: "#8888aa",
    textAlign: "center" as const,
    marginTop: 3,
    maxWidth: 70,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  catalogCardElixir: {
    fontSize: 10,
    color: "#b48eff",
    fontWeight: 700,
  },
  favBtn: {
    position: "absolute" as const,
    top: -4,
    left: -4,
    background: "none",
    border: "none",
    fontSize: 14,
    cursor: "pointer",
    padding: 0,
  },
};
