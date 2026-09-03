import { useApi } from "@/composables/useApi";
import { createBuilderComposable } from "@/composables/tcg/createBuilderComposable";
import type { PokemonCard } from "@/interfaces/interfaces";

/**
 * Derives the canonical object-storage key for a Pokémon card's image.
 *
 * Key format: `cards/pokemon/{Code}_{number}.png`
 *
 * `CardNumber` can contain a set-total suffix (e.g. `"025/198"`); we only
 * want the card number before the slash.  `Code` is the set abbreviation
 * used as a directory prefix (e.g. `"swsh12"`).
 */
function pokemonImageKey(card: PokemonCard): string {
  if (!card.CardNumber || !card.Code) return "";
  const number = card.CardNumber.split("/")[0];
  return `cards/pokemon/${card.Code}_${number}.png`;
}

/**
 * Pre-built base composable shared by all `usePokemonBuilder` calls.
 * Instantiated once at module level so the factory overhead runs once, not
 * on every component setup.
 */
const _useBase = createBuilderComposable<PokemonCard>({
  cardsPath: "/pokemon/cards",
  imagesPath: "/pokemon/cards/images",
  filters: ["All", "Pokemon", "Trainer", "Energy"],
  cardImageKey: pokemonImageKey,
  /** Composite key of set code + card number — unique across all sets. */
  cardKey: (card) => `${card.Code}_${card.CardNumber}`,
  matchesFilter: (card, activeFilter) => {
    const type = (card.CardType ?? "").toLowerCase();
    // The backend stores energy type as both "energy" (EN) and "energie" (DE).
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

/**
 * Builder composable for the Pokémon TCG.
 *
 * Extends the generic base from `createBuilderComposable` with a
 * Pokémon-specific `parseDeckList` implementation that sends the raw
 * decklist text to the backend for parsing (the server handles all the
 * PTCGO/PTCGL format quirks and returns the matching card objects).
 */
export function usePokemonBuilder() {
  const base = _useBase();
  const { get } = useApi();

  /**
   * Parse a Pokémon PTCGO/PTCGL decklist by sending it to the backend.
   *
   * The server looks up cards by name and set code and returns an ordered
   * list that mirrors the original decklist structure.  Returns `[]` on error
   * so the caller can show a "no cards found" message.
   *
   * @param text - Raw decklist text from the clipboard.
   */
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
