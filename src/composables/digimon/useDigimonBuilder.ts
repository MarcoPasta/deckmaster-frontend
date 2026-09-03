import { createBuilderComposable } from "@/composables/tcg/createBuilderComposable";
import type { DigimonCard } from "@/interfaces/interfaces";

/**
 * Derives the canonical object-storage key for a Digimon card image.
 *
 * Key format: `cards/digimon/{CardNumber}.png`
 *
 * Digimon card numbers are already unique globally (e.g. `"BT1-001"`), so no
 * set code prefix is needed.
 */
function digimonImageKey(card: DigimonCard): string {
  if (!card.CardNumber) return "";
  return `cards/digimon/${card.CardNumber}.png`;
}

/**
 * Pre-built base composable shared by all `useDigimonBuilder` calls.
 *
 * Note: Digimon entry bodies use PascalCase `CardId` (not `cardId` like
 * Pokémon/Naruto) to match the Digimon backend API contract.
 */
const _useBase = createBuilderComposable<DigimonCard>({
  cardsPath: "/digimon/cards",
  imagesPath: "/digimon/cards/images",
  filters: ["All", "Digimon", "Tamer", "Option"],
  cardImageKey: digimonImageKey,
  /** CardNumber is globally unique for Digimon, so it serves as the deck key. */
  cardKey: (card) => card.CardNumber,
  /** Digimon uses a straightforward `cardType` field for category matching. */
  matchesFilter: (card, activeFilter) =>
    (card.cardType ?? "").toLowerCase() === activeFilter.toLowerCase(),
  buildSaveBody: (userId, name, cards, cover) => ({
    UserId: userId,
    Name: name,
    CoverCard: cover,
    Entries: cards.map((card) => ({ CardId: card.ID })), // PascalCase per API
  }),
  buildUpdateBody: (deckId, name, cards, cover) => ({
    DeckId: deckId,
    Name: name,
    Entries: cards.map((card) => ({ CardId: card.ID })), // PascalCase per API
    CoverCard: cover,
  }),
  createPath: "/auth/digimon/decks/create",
  updatePath: (id) => `/auth/digimon/decks/${id}/update`,
});

/**
 * Builder composable for the Digimon TCG.
 *
 * Extends the generic base with a **client-side** `parseDeckList`.  Unlike
 * Pokémon and Naruto, Digimon decks are parsed locally by matching card
 * numbers against the already-loaded card pool — no extra backend call needed.
 *
 * Note: Digimon is implemented but not currently exposed in the UI
 * (see `useTcgState.ENABLED_TCGS`).
 */
export function useDigimonBuilder() {
  const base = _useBase();

  /**
   * Parse a Digimon decklist from the clipboard against the local card pool.
   *
   * Supports lines in the format `{count} {CardNumber}`, e.g. `"4 BT1-001"`.
   * Section headers matching the pattern `"SomeName: N"` are skipped.
   * Unrecognised card numbers are silently ignored.
   *
   * @param text     - Raw decklist text from the clipboard.
   * @param cardPool - Full card list to look up cards by number; typically
   *   `allCards.value` from the same composable.
   */
  function parseDeckList(text: string, cardPool: DigimonCard[]): DigimonCard[] {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const imported: DigimonCard[] = [];

    for (const line of lines) {
      // Skip section header lines such as "Digimon: 12" or "Option: 4".
      if (/^.+:\s*\d+$/i.test(line) && !line.match(/^\d/)) continue;

      // Match "4 BT1-001" → count=4, cardNumber="BT1-001".
      const match = line.match(/^(\d+)\s+(.+)$/);
      if (!match) continue;

      const count = parseInt(match[1], 10);
      const cardNumber = match[2].trim();
      const card = cardPool.find((c) => c.CardNumber === cardNumber);
      if (card) {
        // Push the same card reference `count` times so the deck list
        // contains one entry per physical copy, matching the server model.
        for (let i = 0; i < count; i++) imported.push(card);
      }
    }
    return imported;
  }

  return { ...base, parseDeckList };
}
