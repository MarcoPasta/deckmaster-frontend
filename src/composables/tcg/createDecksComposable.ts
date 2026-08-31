import { ref } from "vue";
import { useApi } from "@/composables/useApi";

/**
 * Static, game-specific configuration supplied to `createDecksComposable`.
 *
 * Every property that differs between Pokémon, Naruto and Digimon lives here.
 *
 * @template TCard - The concrete card type for this game (e.g. `PokemonCard`).
 * @template TDeck - The concrete deck type for this game (e.g. `PokemonDecks`).
 */
export interface DecksConfig<TCard, TDeck> {
  /** GET endpoint that returns `{ images: Record<string,string> }` — presigned URLs keyed
   *  by object-storage path, e.g. `"/pokemon/cards/images"`. */
  imagesPath: string;
  /** GET endpoint that returns `{ content: TDeck[] }` for a given user,
   *  e.g. `"/auth/pokemon/decks/user"`. */
  decksPath: string;
  /** Returns the PATCH endpoint for updating a deck's cover card. */
  coverPath: (deckId: number, cardId: number) => string;
  /** Returns the DELETE endpoint for removing a deck. */
  deletePath: (deckId: number) => string;
  /**
   * Derives the object-storage key for a card's image.
   * Must be identical to the key used in the corresponding builder composable
   * so that deck card thumbnails and builder card thumbnails always match.
   */
  cardImageKey: (card: TCard) => string;
  /**
   * Derives the object-storage key for the deck's preview thumbnail.
   * Typically uses the `cover` card ID if set, or falls back to the first
   * entry in the deck.
   */
  previewImageKey: (deck: TDeck) => string;
}

/**
 * Generic decks composable factory.
 *
 * Accepts a `DecksConfig<TCard, TDeck>` and returns a `useDecks(userId)`
 * composable function.  The shared logic that used to be copy-pasted into
 * each per-game composable now lives here:
 * - Fetching the user's deck list and image URL map in parallel.
 * - Looking up presigned image URLs for cards and deck thumbnails.
 * - Optimistic delete (local state updated immediately, server DELETE follows).
 * - Patching the deck's cover card.
 *
 * **Fetch trigger**: `fetchDecks` is NOT called automatically from inside
 * this factory.  `useTcgDecks` in `adapters.ts` owns the watcher that calls
 * it, so only the active game's decks are fetched on mount (not all three).
 *
 * Per-game composables call this factory and extend the result with any
 * extras that aren't shared (e.g. `buildDeckText` and Digimon's `updateDeck`).
 *
 * @example
 * const _useBase = createDecksComposable<PokemonCard, …, PokemonDecks>({ … });
 * export function usePokemonDecks(userId: () => string | undefined) {
 *   const base = _useBase(userId);
 *   return { ...base, buildDeckText };
 * }
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
  /**
   * @param userId - Getter that returns the Clerk user ID, or `undefined` when
   *   not signed in.  Passed as a getter so downstream watchers can react when
   *   the user signs in after the component mounts.
   */
  return function useDecks(userId: () => string | undefined) {
    const { get, del, patch } = useApi();

    /** Reactive list of the user's saved decks for this game.
     *  Populated by `fetchDecks` and updated optimistically by `deleteDeck`. */
    const decks = ref<TDeck[]>([]);

    /**
     * Map from object-storage key → presigned URL for each card image.
     * Fetched in parallel with the deck list so thumbnails are ready as soon
     * as the deck list renders.
     */
    const imageUrls = ref<Record<string, string>>({});

    /**
     * Fetches the image URL map from the backend and populates `imageUrls`.
     * Called internally as part of `fetchDecks`; never called on its own.
     */
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

    /**
     * Loads the user's decks and the image URL map in parallel.
     * Called by `useTcgDecks` in `adapters.ts` whenever the active user ID or
     * the selected TCG changes — NOT called automatically inside this factory.
     *
     * @param id - The Clerk user ID to fetch decks for.
     */
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

    /**
     * Returns the presigned image URL for a deck's preview thumbnail.
     * Returns `""` when no key can be derived (e.g. empty deck).
     */
    function getPreviewImage(deck: TDeck): string {
      const key = config.previewImageKey(deck);
      return key ? imageUrls.value[key] || "" : "";
    }

    /**
     * Returns the presigned image URL for a specific card.
     * Returns `""` when the card has no image key or the key is not yet in
     * the `imageUrls` map.
     */
    function getCardImage(card: TCard): string {
      const key = config.cardImageKey(card);
      return key ? imageUrls.value[key] || "" : "";
    }

    /**
     * PATCH the deck's cover card on the backend.
     * The cover card ID is stored as a string in `deck.cover` and is used by
     * `getPreviewImage` to find the preferred thumbnail.
     */
    async function updateCoverCard(deckId: number, cardId: number) {
      try {
        await patch<void>(config.coverPath(deckId, cardId));
      } catch (e) {
        console.error("Failed to update deck cover:", e);
      }
    }

    /**
     * Delete a deck.
     *
     * Uses an **optimistic update**: the deck is removed from the local
     * `decks` list immediately so the UI responds without waiting for the
     * server round-trip.  The server DELETE follows asynchronously.
     */
    async function deleteDeck(deckId: number) {
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
