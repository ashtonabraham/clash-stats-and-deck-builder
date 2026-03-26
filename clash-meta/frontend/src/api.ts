import type { Deck, Card, CardStats } from "./types";

const BASE = "/api";

export async function fetchTopDecks(): Promise<Deck[]> {
  const res = await fetch(`${BASE}/top-decks`);
  const data = await res.json();
  return data.decks;
}

export async function fetchDeckDetail(deckKey: string): Promise<Deck> {
  const res = await fetch(`${BASE}/decks/${encodeURIComponent(deckKey)}`);
  if (!res.ok) throw new Error("Deck not found");
  return res.json();
}

export async function fetchCards(): Promise<Card[]> {
  const res = await fetch(`${BASE}/cards`);
  const data = await res.json();
  return data.cards;
}

export async function fetchCardStats(cardId: number): Promise<CardStats> {
  const res = await fetch(`${BASE}/cards/${cardId}`);
  if (!res.ok) throw new Error("Card not found");
  return res.json();
}

export async function buildDeck(lockedCards: number[]): Promise<Deck> {
  const res = await fetch(`${BASE}/build-deck`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locked_cards: lockedCards }),
  });
  if (!res.ok) throw new Error("Build failed");
  return res.json();
}

export async function triggerRefresh(force = false): Promise<string> {
  const res = await fetch(`${BASE}/refresh?force=${force}`, { method: "POST" });
  const data = await res.json();
  return data.message || data.error;
}
