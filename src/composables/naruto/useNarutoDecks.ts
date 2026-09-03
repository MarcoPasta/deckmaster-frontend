import { ref, watch } from "vue";
import type { NarutoCard, NarutoDecks } from "../../interfaces/interfaces";
import { useApi } from "../useApi";

export function useNarutoDecks(userId: () => string | undefined) {
  const { get, del, patch } = useApi();
  const decks = ref<NarutoDecks[]>([]);
  const imageUrls = ref<Record<string, string>>({});

  async function fetchImages() {
    try {
      const data = await get<{ images: Record<string, string> }>(
        "/naruto/cards/images",
      );
      imageUrls.value = data.images;
    } catch (e) {
      console.error("Failed to fetch card images:", e);
    }
  }

  async function fetchDecks(id: string) {
    try {
      const [deckData] = await Promise.all([
        get<{ content: NarutoDecks[] }>("/auth/naruto/decks/user", { id }),
        fetchImages(),
      ]);
      decks.value = deckData.content;
    } catch (e) {
      console.error("Failed to fetch naruto decks:", e);
    }
  }

  watch(
    userId,
    (id) => {
      if (id) fetchDecks(id);
    },
    { immediate: true },
  );

  function getPreviewImage(deck: NarutoDecks): string {
    const coverEntry = deck.cover
      ? deck.entries?.find((e) => String(e.card.ID) === deck.cover)
      : undefined;
    const entry = coverEntry ?? deck.entries?.[0];
    if (!entry?.card?.card_number || !entry?.card?.rarity) return "";
    const key = `cards/naruto/${entry.card.set}_${entry.card.card_number}_${entry.card.rarity}.webp`;
    return imageUrls.value[key] || "";
  }

  function getCardImage(card: NarutoCard): string {
    if (!card.card_number || !card.rarity) return "";
    const key = `cards/naruto/${card.set}_${card.card_number}_${card.rarity}.webp`;
    return imageUrls.value[key] || "";
  }

  function buildDeckText(deck: NarutoDecks): string {
    const entries = deck.entries ?? [];

    const cardCounts = new Map<number, { card: NarutoCard; count: number }>();
    for (const entry of entries) {
      const existing = cardCounts.get(entry.card.ID);
      if (existing) {
        existing.count++;
      } else {
        cardCounts.set(entry.card.ID, { card: entry.card, count: 1 });
      }
    }

    let list: string = "";
    for (const { card, count } of cardCounts.values()) {
      // Derive export values locally; never mutate the reactive card entry,
      // which would corrupt the displayed data and later image lookups.
      const rarity = card.rarity.replace("MSS", "MMS");
      const cardNumber =
        rarity === "MMS"
          ? card.card_number.replace("M", "").padStart(3, "0")
          : card.card_number;
      list += `${card.set.toUpperCase()}-${cardNumber}-${rarity.toUpperCase()}--${count}|`;
    }
    list += deck.name;

    return list;
  }

  async function updateCoverCard(deckId: number, cardId: number) {
    try {
      await patch<void>(`/auth/naruto/decks/${deckId}/image/update/${cardId}`);
    } catch (e) {
      console.error("Failed to update naruto deck cover:", e);
    }
  }

  async function deleteDeck(deckId: number) {
    decks.value = decks.value.filter((d) => d.ID !== deckId);
    try {
      await del(`/auth/naruto/decks/${deckId}/delete`);
    } catch (e) {
      console.error("Failed to delete naruto deck:", e);
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
