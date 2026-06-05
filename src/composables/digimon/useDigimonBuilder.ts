import { ref } from "vue";
import type { DigimonCard } from "../../interfaces/interfaces";
import { useApi } from "../useApi";

export function useDigimonBuilder() {
  const { get, post, put } = useApi();

  const allCards = ref<DigimonCard[]>([]);
  const imageUrls = ref<Record<string, string>>({});
  const loading = ref(false);
  const filters = ["All", "Digimon", "Tamer", "Option"];

  async function fetchCards() {
    if (allCards.value.length > 0) return;
    loading.value = true;
    try {
      const [cardData, imageData] = await Promise.all([
        get<{ content: DigimonCard[] }>("/digimon/cards"),
        get<{ images: Record<string, string> }>("/digimon/cards/images"),
      ]);
      allCards.value = cardData.content;
      imageUrls.value = imageData.images;
    } catch (e) {
      console.error("Failed to fetch digimon cards:", e);
    } finally {
      loading.value = false;
    }
  }

  function getCardImage(card: DigimonCard): string {
    if (!card.CardNumber) return "";
    const key = `cards/digimon/${card.CardNumber}.png`;
    return imageUrls.value[key] || "";
  }

  function cardKey(card: DigimonCard): string {
    return card.CardNumber;
  }

  function filterCards(
    cards: DigimonCard[],
    searchQuery: string,
    activeFilter: string,
  ): DigimonCard[] {
    return cards.filter((card) => {
      const matchesSearch = (card.name ?? "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesFilter =
        activeFilter === "all" ||
        (card.cardType ?? "").toLowerCase() === activeFilter.toLowerCase();
      return matchesSearch && matchesFilter;
    });
  }

  function parseDeckList(text: string, cardPool: DigimonCard[]): DigimonCard[] {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const imported: DigimonCard[] = [];

    for (const line of lines) {
      // Skip section headers
      if (/^.+:\s*\d+$/i.test(line) && !line.match(/^\d/)) continue;

      // Parse lines like "4 BT24-001"
      const match = line.match(/^(\d+)\s+(.+)$/);
      if (!match) continue;

      const count = parseInt(match[1], 10);
      const cardNumber = match[2].trim();

      const card = cardPool.find((c) => c.CardNumber === cardNumber);

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
    cards: DigimonCard[],
  ): Promise<void> {
    console.log("saving digimon deck with cards: ", cards);
    await post("/auth/digimon/decks/create", {
      UserId: userId,
      Name: name,
      Entries: cards.map((card) => ({ CardId: card.ID })),
    });
  }

  async function updateDeck(
    deckId: number,
    name: string,
    cards: DigimonCard[],
  ): Promise<void> {
    await put(`/auth/digimon/decks/${deckId}/update`, {
      DeckId: deckId,
      Name: name,
      Entries: cards.map((card) => ({ CardId: card.ID })),
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
