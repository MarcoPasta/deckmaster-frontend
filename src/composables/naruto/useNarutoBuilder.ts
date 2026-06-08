import { ref } from "vue";
import type { NarutoCard } from "../../interfaces/interfaces";
import { useApi } from "../useApi";

export function useNarutoBuilder() {
  const { get, post, put } = useApi();

  const allCards = ref<NarutoCard[]>([]);
  const imageUrls = ref<Record<string, string>>({});
  const loading = ref(false);
  const filters = ["All", "Ninja", "Jutsu", "Mission"];

  async function fetchCards() {
    if (allCards.value.length > 0) return;
    loading.value = true;
    try {
      const [cardData, imageData] = await Promise.all([
        get<{ content: NarutoCard[] }>("/naruto/cards"),
        get<{ images: Record<string, string> }>("/naruto/cards/images"),
      ]);
      allCards.value = cardData.content;
      imageUrls.value = imageData.images;
    } catch (e) {
      console.error("Failed to fetch naruto cards:", e);
    } finally {
      loading.value = false;
    }
  }

  function getCardImage(card: NarutoCard): string {
    if (!card.card_number || !card.rarity) return "";
    const number =
      card.rarity === "MSS"
        ? card.card_number
        : card.card_number.padStart(3, "0");
    const key = `cards/naruto/${card.set}_${number}_${card.rarity}.webp`;
    return imageUrls.value[key] || "";
  }

  function cardKey(card: NarutoCard): string {
    return `${card.set}_${card.card_number}_${card.rarity}`;
  }

  function filterCards(
    cards: NarutoCard[],
    searchQuery: string,
    activeFilter: string,
  ): NarutoCard[] {
    return cards.filter((card) => {
      const matchesSearch = (card.name ?? "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (activeFilter.toLowerCase() === "mission") {
        const matchesFilter =
          activeFilter === "all" ||
          (card.group ?? "").toLowerCase().includes(activeFilter.toLowerCase());
        return matchesSearch && matchesFilter;
      } else {
        const matchesFilter =
          activeFilter === "all" ||
          (card.keyword ?? "")
            .toLowerCase()
            .includes("/ " + activeFilter.toLowerCase());
        return matchesSearch && matchesFilter;
      }
    });
  }

  function parseDeckList(text: string, cardPool: NarutoCard[]): NarutoCard[] {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const imported: NarutoCard[] = [];

    for (const line of lines) {
      // Skip section headers
      if (/^.+:\s*\d+$/i.test(line) && !line.match(/^\d/)) continue;

      // Parse lines like "4 Naruto Uzumaki 01 C"
      const match = line.match(
        /^(\d+)\s+(.+?)\s+(\d+|M\d+|Legendary)\s+(\w+)$/,
      );
      if (!match) continue;

      const count = parseInt(match[1], 10);
      const cardNumber = match[3];
      const rarity = match[4];

      const card = cardPool.find(
        (c) => c.card_number === cardNumber && c.rarity === rarity,
      );

      if (card) {
        for (let i = 0; i < count; i++) {
          imported.push(card);
        }
      }
    }

    return imported;
  }

  async function saveDeck(
    userId: string,
    name: string,
    cards: NarutoCard[],
  ): Promise<void> {
    await post("/auth/naruto/decks/create", {
      UserId: userId,
      Name: name,
      Entries: cards.map((card) => ({ cardId: card.ID })),
    });
  }

  async function updateDeck(
    deckId: number,
    name: string,
    cards: NarutoCard[],
  ): Promise<void> {
    console.log(cards.map((card) => ({ cardId: card.ID })));
    await put(`/auth/naruto/decks/${deckId}/update`, {
      DeckId: deckId,
      Name: name,
      Entries: cards.map((card) => ({ cardId: card.ID })),
    });
  }

  return {
    allCards,
    loading,
    fetchCards,
    filters,
    getCardImage,
    cardKey,
    filterCards,
    parseDeckList,
    saveDeck,
    updateDeck,
  };
}
