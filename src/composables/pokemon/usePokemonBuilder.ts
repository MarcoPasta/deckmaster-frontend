import { useApi } from "@/composables/useApi";
import { createBuilderComposable } from "@/composables/tcg/createBuilderComposable";
import type { PokemonCard } from "@/interfaces/interfaces";

function pokemonImageKey(card: PokemonCard): string {
  if (!card.CardNumber || !card.Code) return "";
  const number = card.CardNumber.split("/")[0];
  return `cards/pokemon/${card.Code}_${number}.png`;
}

const _useBase = createBuilderComposable<PokemonCard>({
  cardsPath: "/pokemon/cards",
  imagesPath: "/pokemon/cards/images",
  filters: ["All", "Pokemon", "Trainer", "Energy"],
  cardImageKey: pokemonImageKey,
  cardKey: (card) => `${card.Code}_${card.CardNumber}`,
  matchesFilter: (card, activeFilter) => {
    const type = (card.CardType ?? "").toLowerCase();
    if (activeFilter === "energy") return type === "energie" || type === "energy";
    return type === activeFilter.toLowerCase();
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
    Entries: cards.map((card) => ({ cardId: card.ID })),
    CoverCard: cover,
  }),
  createPath: "/auth/pokemon/decks/create",
  updatePath: (id) => `/auth/pokemon/decks/${id}/update`,
});

export function usePokemonBuilder() {
  const base = _useBase();
  const { get } = useApi();

  async function parseDeckList(text: string): Promise<PokemonCard[]> {
    try {
      const data = await get<{ content: PokemonCard[] }>(
        "/pokemon/cards/names",
        { decklist: text },
      );
      return data.content;
    } catch (e) {
      console.error("Failed to parse Pokémon decklist:", e);
      return [];
    }
  }

  return { ...base, parseDeckList };
}
