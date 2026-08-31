import { ref } from "vue";
import { useApi } from "../useApi";

/**
 * Static configuration that differs per TCG game.
 * All path/image-key logic lives here so the generic core is game-agnostic.
 */
export interface DecksConfig<TCard, TDeck> {
  /** GET endpoint for the image URL map, e.g. "/pokemon/cards/images" */
  imagesPath: string;
  /** GET endpoint for a user's decks, e.g. "/auth/pokemon/decks/user" */
  decksPath: string;
  /** PATCH endpoint template, e.g. (id, cardId) => `/auth/pokemon/decks/${id}/image/update/${cardId}` */
  coverPath: (deckId: number, cardId: number) => string;
  /** DELETE endpoint template, e.g. (id) => `/auth/pokemon/decks/${id}/delete` */
  deletePath: (deckId: number) => string;
  /** Build the object-storage key for a card image. */
  cardImageKey: (card: TCard) => string;
  /** Determine which card to use for the deck preview thumbnail. */
  previewImageKey: (deck: TDeck) => string;
}

/**
 * Creates a Decks composable for a specific TCG.
 *
 * Returns everything the *Decks views need: reactive decks, image helpers,
 * fetchDecks, deleteDeck and updateCoverCard — with all TCG-specific logic
 * supplied via config instead of being copy-pasted.
 */
export function createDecksComposable<
  TCard extends { ID: number },
  TDeckEntry extends { card: TCard },
  TDeck extends {
    ID: number;
    cover?: string | null;
    entries: TDeckEntry[];
  },
>(config: DecksConfig<TCard, TDeck>) {
  return function useDecks(userId: () => string | undefined) {
    const { get, del, patch } = useApi();
    const decks = ref<TDeck[]>([]);
    const imageUrls = ref<Record<string, string>>({});

    async function fetchImages() {
      try {
        const data = await get<{ images: Record<string, string> }>(
          config.imagesPath,
        );
        imageUrls.value = data.images;
      } catch (e) {
        console.error(`Failed to fetch card images (${config.imagesPath}):`, e);
      }
    }

    async function fetchDecks(id: string) {
      try {
        const [deckData] = await Promise.all([
          get<{ content: TDeck[] }>(config.decksPath, { id }),
          fetchImages(),
        ]);
        decks.value = deckData.content;
      } catch (e) {
        console.error(`Failed to fetch decks (${config.decksPath}):`, e);
      }
    }

    watch(
      userId,
      (id) => {
        if (id) fetchDecks(id);
      },
      { immediate: true },
    );

    // Note: fetchDecks is not auto-triggered here. The caller (useTcgDecks in
    // adapters.ts) is responsible for watching userId and selectedTcg so that
    // only the active game's decks are fetched, not all three on mount.

    function getPreviewImage(deck: TDeck): string {
      const key = config.previewImageKey(deck);
      return key ? imageUrls.value[key] || "" : "";
    }

    function getCardImage(card: TCard): string {
      const key = config.cardImageKey(card);
      return key ? imageUrls.value[key] || "" : "";
    }

    async function updateCoverCard(deckId: number, cardId: number) {
      try {
        await patch<void>(config.coverPath(deckId, cardId));
      } catch (e) {
        console.error("Failed to update deck cover:", e);
      }
    }

    async function deleteDeck(deckId: number) {
      // Optimistic update — remove locally before awaiting server.
      decks.value = (decks.value as TDeck[]).filter((d) => d.ID !== deckId);
      try {
        await del(config.deletePath(deckId));
      } catch (e) {
        console.error("Failed to delete deck:", e);
      }
    }

    return {
      decks,
      fetchDecks,
      getPreviewImage,
      getCardImage,
      deleteDeck,
      updateCoverCard,
    };
  };
}
