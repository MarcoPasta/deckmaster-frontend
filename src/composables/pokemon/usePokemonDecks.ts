import type { PokemonCard, PokemonDecks } from "@/interfaces/interfaces";
import { createDecksComposable } from "@/composables/tcg/createDecksComposable";

function pokemonImageKey(card: PokemonCard): string {
  if (!card.CardNumber || !card.Code) return "";
  const number = card.CardNumber.split("/")[0];
  return `cards/pokemon/${card.Code}_${number}.png`;
}

function pokemonPreviewKey(deck: PokemonDecks): string {
  const coverEntry = deck.cover
    ? deck.entries?.find((e) => String(e.card.ID) === deck.cover)
    : undefined;
  const entry = coverEntry ?? deck.entries?.[0];
  return entry ? pokemonImageKey(entry.card) : "";
}

const _useBase = createDecksComposable<PokemonCard, PokemonDecks["entries"][number], PokemonDecks>({
  imagesPath: "/pokemon/cards/images",
  decksPath: "/auth/pokemon/decks/user",
  coverPath: (deckId, cardId) => `/auth/pokemon/decks/${deckId}/image/update/${cardId}`,
  deletePath: (deckId) => `/auth/pokemon/decks/${deckId}/delete`,
  cardImageKey: pokemonImageKey,
  previewImageKey: pokemonPreviewKey,
});

export function usePokemonDecks(userId: () => string | undefined) {
  const base = _useBase(userId);

  function buildDeckText(deck: PokemonDecks): string {
    const entries = deck.entries ?? [];
    const groups: Record<string, { card: PokemonCard; count: number }[]> = {
      Pokémon: [],
      Trainer: [],
      Energy: [],
    };

    const cardCounts = new Map<number, { card: PokemonCard; count: number }>();
    for (const entry of entries) {
      const existing = cardCounts.get(entry.card.ID);
      if (existing) existing.count++;
      else cardCounts.set(entry.card.ID, { card: entry.card, count: 1 });
    }

    for (const { card, count } of cardCounts.values()) {
      const type = card.CardType?.toLowerCase();
      const name = card.Name ?? "";
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
      lines.push("");
    }

    return lines.join("\n").trim();
  }

  return { ...base, buildDeckText };
}
