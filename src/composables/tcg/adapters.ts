import { computed, watch, type Ref } from "vue";
import type {
  DigimonCard,
  DigimonDecks,
  NarutoCard,
  NarutoDecks,
  PokemonCard,
  PokemonDecks,
} from "@/interfaces/interfaces";
import { useDigimonBuilder } from "@/composables/digimon/useDigimonBuilder";
import { useDigimonDecks } from "@/composables/digimon/useDigimonDecks";
import { useNarutoBuilder } from "@/composables/naruto/useNarutoBuilder";
import { useNarutoDecks } from "@/composables/naruto/useNarutoDecks";
import { usePokemonBuilder } from "@/composables/pokemon/usePokemonBuilder";
import { usePokemonDecks } from "@/composables/pokemon/usePokemonDecks";
import { useTcgState, type TcgType } from "@/composables/useTcgState";

export type AnyCard = PokemonCard | NarutoCard | DigimonCard;
export type AnyDeck = PokemonDecks | NarutoDecks | DigimonDecks;

/**
 * Normalized, per-game view of the *Builder composables so callers can stay
 * TCG-agnostic. The per-game `as`-casts live here (once) instead of being
 * scattered across every view.
 */
export interface BuilderAdapter {
  allCards: Ref<AnyCard[]>;
  loading: Ref<boolean>;
  filters: string[];
  fetchCards: () => Promise<void>;
  getCardImage: (card: AnyCard) => string;
  imageKey: (card: AnyCard) => string;
  cardKey: (card: AnyCard) => string;
  filterCards: (
    cards: AnyCard[],
    searchQuery: string,
    activeFilter: string,
  ) => AnyCard[];
  /** Normalized to always be async and accept the current card pool. */
  parseDeckList: (text: string, pool: AnyCard[]) => Promise<AnyCard[]>;
  saveDeck: (
    userId: string,
    name: string,
    cards: AnyCard[],
    cover?: string,
  ) => Promise<void>;
  updateDeck: (
    deckId: number,
    name: string,
    cards: AnyCard[],
    cover?: string,
  ) => Promise<void>;
}

/** Normalized, per-game view of the *Decks composables. */
export interface DecksAdapter {
  decks: Ref<AnyDeck[]>;
  fetchDecks: (id: string) => Promise<void>;
  getPreviewImage: (deck: AnyDeck) => string;
  getCardImage: (card: AnyCard) => string;
  buildDeckText: (deck: AnyDeck) => string;
  deleteDeck: (id: number) => Promise<void>;
  updateCoverCard: (deckId: number, cardId: number) => Promise<void>;
}

/** Display name for a card regardless of TCG field-casing. */
export function cardName(card: AnyCard): string {
  if ("Name" in card) return (card as PokemonCard).Name ?? "";
  if ("name" in card) return (card as NarutoCard | DigimonCard).name ?? "";
  return "";
}

/** Naruto has landscape "mission" cards that are grouped separately. */
export function isMissionCard(card: AnyCard, tcg: TcgType): boolean {
  return (
    tcg === "naruto" &&
    (card as NarutoCard).group?.toLowerCase() === "mission"
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function makeBuilderAdapter(
  builder: any,
  parseDeckList: (text: string, pool: AnyCard[]) => Promise<AnyCard[]>,
): BuilderAdapter {
  return {
    allCards: builder.allCards,
    loading: builder.loading,
    filters: builder.filters,
    fetchCards: builder.fetchCards,
    getCardImage: builder.getCardImage,
    imageKey: builder.imageKey,
    cardKey: builder.cardKey,
    filterCards: builder.filterCards,
    parseDeckList,
    saveDeck: builder.saveDeck,
    updateDeck: builder.updateDeck,
  };
}

function makeDecksAdapter(decks: any): DecksAdapter {
  return {
    decks: decks.decks,
    fetchDecks: decks.fetchDecks,
    getPreviewImage: decks.getPreviewImage,
    getCardImage: decks.getCardImage,
    buildDeckText: decks.buildDeckText,
    deleteDeck: decks.deleteDeck,
    updateCoverCard: decks.updateCoverCard,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Instantiates all builder composables and exposes the one matching the
 * currently selected TCG as a normalized {@link BuilderAdapter}.
 */
export function useTcgBuilder() {
  const { selectedTcg } = useTcgState();
  const pokemon = usePokemonBuilder();
  const naruto = useNarutoBuilder();
  const digimon = useDigimonBuilder();

  const adapters: Record<TcgType, BuilderAdapter> = {
    pokemon: makeBuilderAdapter(pokemon, (text) => pokemon.parseDeckList(text)),
    naruto: makeBuilderAdapter(naruto, (text) => naruto.parseDeckList(text)),
    digimon: makeBuilderAdapter(digimon, async (text, pool) =>
      digimon.parseDeckList(text, pool as DigimonCard[]),
    ),
  };

  const builder = computed<BuilderAdapter>(() => adapters[selectedTcg.value]);
  return { selectedTcg, builder };
}

/**
 * Instantiates all decks composables and exposes the one matching the
 * currently selected TCG as a normalized {@link DecksAdapter}.
 */
export function useTcgDecks(userId: () => string | undefined) {
  const { selectedTcg } = useTcgState();
  const pokemon = usePokemonDecks(userId);
  const naruto = useNarutoDecks(userId);
  const digimon = useDigimonDecks(userId);

  const adapters: Record<TcgType, DecksAdapter> = {
    pokemon: makeDecksAdapter(pokemon),
    naruto: makeDecksAdapter(naruto),
    digimon: makeDecksAdapter(digimon),
  };

  const decks = computed<DecksAdapter>(() => adapters[selectedTcg.value]);

  // Fetch only the active game's decks. We watch both userId and selectedTcg
  // so switching games also triggers a fetch if decks haven't loaded yet.
  watch(
    [() => userId(), selectedTcg],
    ([id]) => {
      if (id) decks.value.fetchDecks(id);
    },
    { immediate: true },
  );

  return { selectedTcg, decks };
}
