import type { PokemonCard, PokemonDecks } from "@/interfaces/interfaces";
import { createDecksComposable } from "@/composables/tcg/createDecksComposable";

/**
 * Derives the canonical object-storage key for a Pokémon card image.
 * Strips the set-total suffix from `CardNumber` (e.g. `"025/198"` → `"025"`).
 */
function pokemonImageKey(card: PokemonCard): string {
  if (!card.CardNumber || !card.Code) return "";
  const number = card.CardNumber.split("/")[0];
  return `cards/pokemon/${card.Code}_${number}.png`;
}

/**
 * Derives the object-storage key for the deck's preview thumbnail.
 *
 * Prefers the card whose ID matches `deck.cover` (user-selected cover).
 * Falls back to the first entry in the deck when no cover is set.
 */
function pokemonPreviewKey(deck: PokemonDecks): string {
  const coverEntry = deck.cover
    ? deck.entries?.find((e) => String(e.card.ID) === deck.cover)
    : undefined;
  const entry = coverEntry ?? deck.entries?.[0];
  return entry ? pokemonImageKey(entry.card) : "";
}

/** Pre-built base composable shared by all `usePokemonDecks` calls. */
const _useBase = createDecksComposable<PokemonCard, PokemonDecks["entries"][number], PokemonDecks>({
  imagesPath: "/pokemon/cards/images",
  decksPath: "/auth/pokemon/decks/user",
  coverPath: (deckId, cardId) => `/auth/pokemon/decks/${deckId}/image/update/${cardId}`,
  deletePath: (deckId) => `/auth/pokemon/decks/${deckId}/delete`,
  cardImageKey: pokemonImageKey,
  previewImageKey: pokemonPreviewKey,
});

/**
 * Decks composable for the Pokémon TCG.
 *
 * Extends the generic base with `buildDeckText`, which serialises a deck into
 * the PTCGO/PTCGL export format grouped by category (Pokémon / Trainer /
 * Energy).
 */
export function usePokemonDecks(userId: () => string | undefined) {
  const base = _useBase(userId);

  /**
   * Serialise a Pokémon deck into PTCGO/PTCGL clipboard format.
   *
   * Output groups:
   * - `Pokémon: N` — all Pokémon cards
   * - `Trainer: N` — all trainer cards
   * - `Energy: N`  — all energy cards (including special energies identified
   *   by name heuristic because the database mixes DE/EN card names)
   *
   * Each line within a group follows the format:
   * `{count} {Name} {CODE} {number}`
   * e.g. `"4 Pikachu V PGO 006"`
   */
  function buildDeckText(deck: PokemonDecks): string {
    const entries = deck.entries ?? [];

    // Group buckets — order matters for the output.
    const groups: Record<string, { card: PokemonCard; count: number }[]> = {
      Pokémon: [],
      Trainer: [],
      Energy: [],
    };

    // Count duplicate cards by ID first, then classify by type.
    const cardCounts = new Map<number, { card: PokemonCard; count: number }>();
    for (const entry of entries) {
      const existing = cardCounts.get(entry.card.ID);
      if (existing) existing.count++;
      else cardCounts.set(entry.card.ID, { card: entry.card, count: 1 });
    }

    for (const { card, count } of cardCounts.values()) {
      const type = card.CardType?.toLowerCase();
      const name = card.Name ?? "";
      // Energy heuristic: covers explicit type="energy"/"energie", special
      // phase cards, and German/English energy name patterns.
      const isEnergy =
        !type ||
        type === "energy" ||
        type === "energie" ||
        card.Phase?.toLowerCase() === "special" ||
        name.includes("-Energie") ||
        name.toLowerCase().includes("energy");

      if (type === "pokemon" || type === "pokémon") groups["Pokémon"].push({ card, count });
      else if (isEnergy) groups["Energy"].push({ card, count });
      else groups["Trainer"].push({ card, count });
    }

    const lines: string[] = [];
    for (const [label, cards] of Object.entries(groups)) {
      if (cards.length === 0) continue;
      lines.push(`${label}: ${cards.length}`);
      for (const { card, count } of cards) {
        const number = card.CardNumber?.split("/")[0] ?? "";
        const code = (card.Code ?? "").toUpperCase();
        lines.push(`${count} ${card.Name} ${code} ${number}`);
      }
      lines.push(""); // blank line between groups
    }

    return lines.join("\n").trim();
  }

  return { ...base, buildDeckText };
}
