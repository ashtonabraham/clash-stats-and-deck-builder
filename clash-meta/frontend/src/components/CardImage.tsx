import { useEffect } from "react";
import type { Card } from "../types";

const RARITY_COLORS: Record<string, string> = {
  common: "#4a9eff",
  rare: "#ff9800",
  epic: "#9c27b0",
};

// Inject the @keyframes for the champion shimmer once.
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes champion-shimmer {
      0% { filter: brightness(1) drop-shadow(0 0 2px #ffd700); }
      50% { filter: brightness(1.4) drop-shadow(0 0 6px #fff4a0); }
      100% { filter: brightness(1) drop-shadow(0 0 2px #ffd700); }
    }
    .champion-border {
      animation: champion-shimmer 2s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}

interface Props {
  card: Card;
  size?: number;
  onClick?: () => void;
}

export default function CardImage({ card, size = 64, onClick }: Props) {
  const rarity = card.rarity ?? "common";
  const isLegendary = rarity === "legendary";
  const isChampion = rarity === "champion";
  const borderWidth = 2;

  useEffect(injectStyles, []);

  // Gradient border cards (legendary = rainbow, champion = shiny gold)
  if (isLegendary || isChampion) {
    const gradient = isChampion
      ? "linear-gradient(135deg, #ffd700, #fff4a0, #ffd700, #b8860b, #ffd700)"
      : "conic-gradient(#ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff, #ff0088, #ff0000)";

    return (
      <div
        onClick={onClick}
        title={`${card.name} (${card.elixir ?? "?"} elixir)`}
        className={isChampion ? "champion-border" : undefined}
        style={{
          width: size,
          height: size,
          borderRadius: 8,
          background: gradient,
          padding: borderWidth,
          cursor: onClick ? "pointer" : "inherit",
          transition: "transform 0.15s",
        }}
        onMouseEnter={(e) => {
          if (onClick) (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 6,
            background: "#1a1a2e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <CardImg card={card} size={size} />
        </div>
      </div>
    );
  }

  // Solid border cards (common, rare, epic)
  const borderColor = RARITY_COLORS[rarity] ?? "#555";

  return (
    <div
      onClick={onClick}
      title={`${card.name} (${card.elixir ?? "?"} elixir)`}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        border: `${borderWidth}px solid ${borderColor}`,
        background: "#1a1a2e",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "inherit",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.15s",
      }}
      onMouseEnter={(e) => {
        if (onClick) (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
    >
      <CardImg card={card} size={size} />
    </div>
  );
}

function CardImg({ card, size }: { card: Card; size: number }) {
  return card.icon_url ? (
    <img
      src={card.icon_url}
      alt={card.name}
      style={{ width: size - 8, height: size - 8, objectFit: "contain" }}
    />
  ) : (
    <span style={{ fontSize: 10, textAlign: "center", padding: 4 }}>
      {card.name}
    </span>
  );
}
