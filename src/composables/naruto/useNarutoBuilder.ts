import { useApi } from "@/composables/useApi";
import { createBuilderComposable } from "@/composables/tcg/createBuilderComposable";
import type { NarutoCard } from "@/interfaces/interfaces";

function narutoImageKey(card: NarutoCard): string {
  if (!card.card_number || !card.rarity) return "";
  const number =
    card.rarity === "MSS"
      ? card.card_number
      : card.card_number.padStart(3, "0");
  return `cards/naruto/${card.set}_${number}_${card.rarity}.webp`;
}

const _useBase = createBuilderComposable<NarutoCard>({
  cardsPath: "/naruto/cards",
  imagesPath: "/naruto/cards/images",
  filters: ["All", "Ninja", "Jutsu", "Mission"],
  cardImageKey: narutoImageKey,
  cardKey: (card) => `${card.set}_${card.card_number}_${card.rarity}`,
  matchesFilter: (card, activeFilter) => {
    if (activeFilter.toLowerCase() === "mission") {
      return (card.group ?? "").toLowerCase().includes(activeFilter.toLowerCase());
    }
    return (card.keyword ?? "")
      .toLowerCase()
      .includes("/ " + activeFilter.toLowerCase());
  },
  buildSaveBody: (userId, name, cards, cover) => ({
    UserId: userId,
    Name: name,
    CoverCard: cover,
    Entries: cards.map((card) => ({ cardId: card.ID })),
  }),
  buildUpdateBody: (deckId, name, cards, cover) => ({
    DeckId: deckId,
    Name: name,
    CoverCard: cover,
    Entries: cards.map((card) => ({ cardId: card.ID })),
  }),
  createPath: "/auth/naruto/decks/create",
  updatePath: (id) => `/auth/naruto/decks/${id}/update`,
});

export function useNarutoBuilder() {
  const base = _useBase();
  const { get } = useApi();

  async function parseDeckList(text: string): Promise<NarutoCard[]> {
    try {
      const data = await get<{ content: NarutoCard[] }>(
        "/naruto/cards/names",
        { decklist: text },
      );
      return data.content;
    } catch (e) {
      console.error("Failed to parse Naruto decklist:", e);
      return [];
    }
  }

  return { ...base, parseDeckList };
}
