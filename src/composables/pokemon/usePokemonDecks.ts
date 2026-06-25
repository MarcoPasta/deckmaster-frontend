import { ref, watch } from "vue";
import type { PokemonCard, PokemonDecks } from "../../interfaces/interfaces";
import { useApi } from "../useApi";

export function usePokemonDecks(userId: () => string | undefined) {
  const { get, del, patch } = useApi();
  const decks = ref<PokemonDecks[]>([]);
  const imageUrls = ref<Record<string, string>>({});

  async function fetchImages() {
    try {
      const data = await get<{ images: Record<string, string> }>(
        "/pokemon/cards/images",
      );
      imageUrls.value = data.images;
    } catch (e) {
      console.error("Failed to fetch card images:", e);
    }
  }

  async function fetchDecks(id: string) {
    try {
      const [deckData] = await Promise.all([
        get<{ content: PokemonDecks[] }>("/auth/pokemon/decks/user", { id }),
        fetchImages(),
      ]);
      decks.value = deckData.content;
    } catch (e) {
      console.error("Failed to fetch decks:", e);
    }
  }

  watch(
    userId,
    (id) => {
      if (id) fetchDecks(id);
    },
    { immediate: true },
  );

  function getPreviewImage(deck: PokemonDecks): string {
    const coverEntry = deck.cover
      ? deck.entries?.find((e) => String(e.card.ID) === deck.cover)
      : undefined;
    const entry = coverEntry ?? deck.entries?.[0];
    if (!entry?.card?.CardNumber || !entry?.card?.Code) return "";
    const number = entry.card.CardNumber.split("/")[0];
    const key = `cards/pokemon/${entry.card.Code}_${number}.png`;
    return imageUrls.value[key] || "";
  }

  function getCardImage(card: PokemonCard): string {
    if (!card.CardNumber || !card.Code) return "";
    const number = card.CardNumber.split("/")[0];
    const key = `cards/pokemon/${card.Code}_${number}.png`;
    return imageUrls.value[key] || "";
  }

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
      if (existing) {
        existing.count++;
      } else {
        cardCounts.set(entry.card.ID, { card: entry.card, count: 1 });
      }
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
      if (type === "pokemon" || type === "pokémon") {
        groups["Pokémon"].push({ card, count });
      } else if (isEnergy) {
        groups["Energy"].push({ card, count });
      } else {
        groups["Trainer"].push({ card, count });
      }
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

  async function updateCoverCard(deckId: number, cardId: number) {
    try {
      await patch<void>(`/auth/pokemon/decks/${deckId}/image/update/${cardId}`);
    } catch (e) {
      console.error("Failed to update pokemon deck cover:", e);
    }
  }

  async function deleteDeck(deckId: number) {
    decks.value = decks.value.filter((d) => d.ID !== deckId);
    try {
      await del(`/auth/pokemon/decks/${deckId}/delete`);
    } catch (e) {
      console.error("Failed to delete deck:", e);
    }
  }

  return {
    decks,
    fetchDecks,
    getPreviewImage,
    getCardImage,
    buildDeckText,
    deleteDeck,
    updateCoverCard,
  };
}
