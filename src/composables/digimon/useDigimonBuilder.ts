import { createBuilderComposable } from "@/composables/tcg/createBuilderComposable";
import type { DigimonCard } from "@/interfaces/interfaces";

function digimonImageKey(card: DigimonCard): string {
  if (!card.CardNumber) return "";
  return `cards/digimon/${card.CardNumber}.png`;
}

const _useBase = createBuilderComposable<DigimonCard>({
  cardsPath: "/digimon/cards",
  imagesPath: "/digimon/cards/images",
  filters: ["All", "Digimon", "Tamer", "Option"],
  cardImageKey: digimonImageKey,
  cardKey: (card) => card.CardNumber,
  matchesFilter: (card, activeFilter) =>
    (card.cardType ?? "").toLowerCase() === activeFilter.toLowerCase(),
  buildSaveBody: (userId, name, cards, cover) => ({
    UserId: userId,
    Name: name,
    CoverCard: cover,
    Entries: cards.map((card) => ({ CardId: card.ID })),
  }),
  buildUpdateBody: (deckId, name, cards, cover) => ({
    DeckId: deckId,
    Name: name,
    Entries: cards.map((card) => ({ CardId: card.ID })),
    CoverCard: cover,
  }),
  createPath: "/auth/digimon/decks/create",
  updatePath: (id) => `/auth/digimon/decks/${id}/update`,
});

export function useDigimonBuilder() {
  const base = _useBase();

  /** Client-side parse — Digimon decklists are parsed locally from the card pool. */
  function parseDeckList(text: string, cardPool: DigimonCard[]): DigimonCard[] {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const imported: DigimonCard[] = [];

    for (const line of lines) {
      if (/^.+:\s*\d+$/i.test(line) && !line.match(/^\d/)) continue;
      const match = line.match(/^(\d+)\s+(.+)$/);
      if (!match) continue;
      const count = parseInt(match[1], 10);
      const cardNumber = match[2].trim();
      const card = cardPool.find((c) => c.CardNumber === cardNumber);
      if (card) {
        for (let i = 0; i < count; i++) imported.push(card);
      }
    }
    return imported;
  }

  return { ...base, parseDeckList };
}
