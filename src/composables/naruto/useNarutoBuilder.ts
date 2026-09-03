import { useApi } from "@/composables/useApi";
import { createBuilderComposable } from "@/composables/tcg/createBuilderComposable";
import type { NarutoCard } from "@/interfaces/interfaces";

/**
 * Derives the canonical object-storage key for a Naruto Mythos card image.
 *
 * Key format: `cards/naruto/{set}_{number}_{rarity}.webp`
 *
 * MSS (Mosaic/Special) cards keep their raw `card_number` without padding.
 * All other rarities left-pad `card_number` to 3 digits (e.g. `"5"` → `"005"`).
 */
function narutoImageKey(card: NarutoCard): string {
  if (!card.card_number || !card.rarity) return "";
  const number =
    card.rarity === "MSS"
      ? card.card_number            // special cards are stored without padding
      : card.card_number.padStart(3, "0");
  return `cards/naruto/${card.set}_${number}_${card.rarity}.webp`;
}

/**
 * Pre-built base composable shared by all `useNarutoBuilder` calls.
 */
const _useBase = createBuilderComposable<NarutoCard>({
  cardsPath: "/naruto/cards",
  imagesPath: "/naruto/cards/images",
  filters: ["All", "Ninja", "Jutsu", "Mission"],
  cardImageKey: narutoImageKey,
  /** Composite of set + card number + rarity — unique across all printings. */
  cardKey: (card) => `${card.set}_${card.card_number}_${card.rarity}`,
  matchesFilter: (card, activeFilter) => {
    if (activeFilter.toLowerCase() === "mission") {
      // Mission cards are identified by `group` field, not `keyword`.
      return (card.group ?? "").toLowerCase().includes(activeFilter.toLowerCase());
    }
    // Ninja / Jutsu categories are encoded in the `keyword` field as a
    // slash-separated list, e.g. "Chunin / Ninja / …".
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

/**
 * Builder composable for the Naruto Mythos TCG.
 *
 * Extends the generic base with a server-side `parseDeckList` that sends the
 * raw decklist text to the backend, which resolves card identifiers and
 * returns the matching card objects.
 */
export function useNarutoBuilder() {
  const base = _useBase();
  const { get } = useApi();

  /**
   * Parse a Naruto decklist by sending it to the backend.
   * Returns `[]` on error.
   *
   * @param text - Raw decklist string from the clipboard.
   */
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
