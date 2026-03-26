import { useRef, useState } from "react";
import type { Card, DeckCategory } from "../types";

export interface Filters {
  category: DeckCategory;
  hasChampion: boolean | null; // null = don't care
  hasHero: boolean | null;
  minWinRate: number; // 0-100
  maxElixir: number; // 0 = no limit
  minElixir: number; // 0 = no limit
  containsCard: number | null; // card ID or null
}

export const DEFAULT_FILTERS: Filters = {
  category: "all",
  hasChampion: null,
  hasHero: null,
  minWinRate: 0,
  maxElixir: 0,
  minElixir: 0,
  containsCard: null,
};

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  allCards: Card[];
}

export default function FilterBar({ filters, onChange, allCards }: Props) {
  const set = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    onChange({ ...filters, [key]: val });

  return (
    <div style={styles.container}>
      {/* Toggle filters */}
      <div style={styles.row}>
        <span style={styles.label}>Includes</span>
        <div style={styles.pills}>
          <ToggleButton
            label="Champion"
            value={filters.hasChampion}
            onChange={(v) => set("hasChampion", v)}
          />
          <ToggleButton
            label="Hero"
            value={filters.hasHero}
            onChange={(v) => set("hasHero", v)}
          />
        </div>
      </div>

      {/* Sliders / selects row */}
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Min Win Rate</label>
          <div style={styles.sliderRow}>
            <input
              type="range"
              min={0}
              max={100}
              value={filters.minWinRate}
              onChange={(e) => set("minWinRate", Number(e.target.value))}
              style={styles.slider}
            />
            <span style={styles.sliderValue}>{filters.minWinRate}%</span>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Elixir Range</label>
          <div style={styles.elixirRow}>
            <input
              type="number"
              min={0}
              max={9}
              step={0.1}
              placeholder="Min"
              value={filters.minElixir || ""}
              onChange={(e) => set("minElixir", Number(e.target.value))}
              style={styles.numberInput}
            />
            <span style={{ color: "#555" }}>–</span>
            <input
              type="number"
              min={0}
              max={9}
              step={0.1}
              placeholder="Max"
              value={filters.maxElixir || ""}
              onChange={(e) => set("maxElixir", Number(e.target.value))}
              style={styles.numberInput}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Contains Card</label>
          <CardSearch
            cards={allCards}
            selectedId={filters.containsCard}
            onSelect={(id) => set("containsCard", id)}
          />
        </div>
      </div>

      {/* Reset */}
      {JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS) && (
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          style={styles.reset}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}

function CardSearch({
  cards,
  selectedId,
  onSelect,
}: {
  cards: Card[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedName = selectedId
    ? cards.find((c) => c.id === selectedId)?.name ?? "Any"
    : "Any";

  const filtered = query
    ? cards.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : cards;

  const handleBlur = (e: React.FocusEvent) => {
    if (!wrapperRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }} onBlur={handleBlur}>
      {open ? (
        <input
          type="text"
          autoFocus
          placeholder="Search cards..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            ...styles.select,
            width: "100%",
            boxSizing: "border-box" as const,
          }}
        />
      ) : (
        <button
          onClick={() => setOpen(true)}
          style={{
            ...styles.select,
            width: "100%",
            boxSizing: "border-box" as const,
            cursor: "pointer",
            textAlign: "left" as const,
            display: "flex",
            alignItems: "center",
          }}
        >
          <span>{selectedName}</span>
          <span style={{ marginLeft: "auto", fontSize: 10, color: "#8888aa" }}>&#9660;</span>
        </button>
      )}
      {open && (
        <div style={styles.dropdownList}>
          <div
            style={{
              ...styles.dropdownItem,
              ...(!selectedId ? { background: "#1a3a6a", color: "#4a9eff" } : {}),
            }}
            onMouseDown={() => { onSelect(null); setQuery(""); setOpen(false); }}
          >
            Any
          </div>
          {filtered.map((c) => (
            <div
              key={c.id}
              style={{
                ...styles.dropdownItem,
                ...(c.id === selectedId ? { background: "#1a3a6a", color: "#4a9eff" } : {}),
              }}
              onMouseDown={() => { onSelect(c.id); setQuery(""); setOpen(false); }}
            >
              {c.name}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ ...styles.dropdownItem, color: "#555" }}>No matches</div>
          )}
        </div>
      )}
    </div>
  );
}

function ToggleButton({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  // Cycles: null (any) → true (yes) → false (no) → null
  const next = () => {
    if (value === null) onChange(true);
    else if (value === true) onChange(false);
    else onChange(null);
  };

  const text =
    value === null ? label : value ? `${label}: Yes` : `${label}: No`;
  const isActive = value !== null;

  return (
    <button
      onClick={next}
      style={{
        ...styles.pill,
        ...(isActive ? styles.pillActive : {}),
      }}
    >
      {text}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "#12122a",
    border: "1px solid #2a2a4a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#8888aa",
    minWidth: 55,
  },
  pills: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  pill: {
    background: "#1a1a3a",
    color: "#8888aa",
    border: "1px solid #2a2a4a",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  pillActive: {
    background: "#1a3a6a",
    color: "#4a9eff",
    borderColor: "#4a9eff",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: 1,
    minWidth: 140,
  },
  sliderRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  slider: {
    flex: 1,
    accentColor: "#4a9eff",
  },
  sliderValue: {
    fontSize: 12,
    color: "#4a9eff",
    fontWeight: 700,
    minWidth: 36,
  },
  elixirRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  numberInput: {
    width: 60,
    background: "#1a1a3a",
    border: "1px solid #2a2a4a",
    borderRadius: 6,
    color: "#e8e8f0",
    padding: "5px 8px",
    fontSize: 12,
  },
  select: {
    background: "#1a1a3a",
    border: "1px solid #2a2a4a",
    borderRadius: 6,
    color: "#e8e8f0",
    padding: "5px 8px",
    fontSize: 12,
    maxWidth: 180,
  },
  dropdownList: {
    position: "absolute" as const,
    top: "100%",
    left: 0,
    right: 0,
    maxHeight: 200,
    overflowY: "auto" as const,
    background: "#1a1a3a",
    border: "1px solid #2a2a4a",
    borderRadius: 6,
    marginTop: 2,
    zIndex: 10,
  },
  dropdownItem: {
    padding: "6px 10px",
    fontSize: 12,
    color: "#e8e8f0",
    cursor: "pointer",
  },
  reset: {
    alignSelf: "flex-start",
    background: "none",
    border: "1px solid #3a3a5e",
    color: "#8888aa",
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: 12,
    cursor: "pointer",
  },
};
