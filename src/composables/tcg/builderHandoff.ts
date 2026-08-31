/**
 * Typed helpers for the builder-deck* sessionStorage keys that are shared
 * between DecksView (writes) and BuilderView (reads/clears).
 *
 * Centralising the key strings here prevents silent desync when one side
 * changes its key literal but not the other.
 */

export const BUILDER_STORAGE = {
  DECK: "builder-deck",
  NAME: "builder-deck-name",
  ID: "builder-deck-id",
  COVER: "builder-deck-cover",
} as const;

export interface BuilderHandoff {
  cards: unknown[];
  name: string;
  deckId: string;
  cover: string;
}

/** Write a deck into sessionStorage for the Builder to pick up. */
export function writeBuilderHandoff(data: BuilderHandoff): void {
  sessionStorage.setItem(BUILDER_STORAGE.DECK, JSON.stringify(data.cards));
  sessionStorage.setItem(BUILDER_STORAGE.NAME, data.name);
  sessionStorage.setItem(BUILDER_STORAGE.ID, data.deckId);
  sessionStorage.setItem(BUILDER_STORAGE.COVER, data.cover);
}

/** Read whatever the Builder currently has in sessionStorage. */
export function readBuilderHandoff(): BuilderHandoff {
  return {
    cards: JSON.parse(sessionStorage.getItem(BUILDER_STORAGE.DECK) || "[]"),
    name: sessionStorage.getItem(BUILDER_STORAGE.NAME) || "",
    deckId: sessionStorage.getItem(BUILDER_STORAGE.ID) || "",
    cover: sessionStorage.getItem(BUILDER_STORAGE.COVER) || "",
  };
}

/** Clear all builder handoff keys from sessionStorage. */
export function clearBuilderHandoff(): void {
  Object.values(BUILDER_STORAGE).forEach((key) =>
    sessionStorage.removeItem(key),
  );
}
