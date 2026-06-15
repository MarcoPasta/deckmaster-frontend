<script setup lang="ts">
import type { DigimonCard, NarutoCard, PokemonCard } from "../interfaces/interfaces";

type AnyCard = PokemonCard | NarutoCard | DigimonCard;

interface CardGroup {
  card: AnyCard;
  key: string;
  count: number;
}

defineProps<{
  chosenCards: AnyCard[];
  groupedChosenCards: CardGroup[];
  deckName: string;
  saving: boolean;
  isMobile: boolean;
  isNarrow: boolean;
  drawerOffset: number;
  getCardImage: (card: AnyCard) => string;
  cardName: (card: AnyCard) => string;
}>();

const emit = defineEmits<{
  "update:deckName": [value: string];
  save: [];
  import: [];
  clear: [];
  "remove-card": [card: AnyCard];
  "card-hover": [card: AnyCard, event: MouseEvent];
  "card-move": [event: MouseEvent];
  "card-leave": [];
  "drawer-toggle": [];
  "drawer-touch-start": [event: TouchEvent];
  "drawer-touch-move": [event: TouchEvent];
  "drawer-touch-end": [];
}>();
</script>

<template>
  <div
    class="builder-panel deck-panel"
    :style="
      isMobile
        ? { transform: `translateY(calc(100% - ${drawerOffset}px))` }
        : undefined
    "
  >
    <div
      v-if="isMobile"
      class="drawer-handle"
      @touchstart="emit('drawer-touch-start', $event)"
      @touchmove="emit('drawer-touch-move', $event)"
      @touchend="emit('drawer-touch-end')"
      @click="emit('drawer-toggle')"
    >
      <div class="drawer-handle-bar" />
    </div>

    <div class="panel-header" @click="isMobile && emit('drawer-toggle')">
      <span class="panel-title">Deck ({{ chosenCards.length }})</span>
    </div>

    <div class="deck-actions">
      <v-text-field
        :model-value="deckName"
        variant="outlined"
        density="compact"
        placeholder="Deck name..."
        hide-details
        class="deck-name-input"
        @update:model-value="emit('update:deckName', $event as string)"
      />
      <v-btn
        color="deep-purple-accent-2"
        :disabled="!deckName.trim() || chosenCards.length === 0 || saving"
        :loading="saving"
        @click="emit('save')"
      >
        Save Deck
      </v-btn>
      <v-btn
        variant="outlined"
        color="deep-purple-accent-2"
        @click="emit('import')"
      >
        <v-icon start>mdi-import</v-icon>
        Import
      </v-btn>
      <v-btn
        variant="outlined"
        color="red"
        :disabled="chosenCards.length === 0"
        @click="emit('clear')"
      >
        <v-icon start>mdi-delete-sweep</v-icon>
        Clear
      </v-btn>
    </div>

    <div class="deck-grid">
      <div
        v-for="group in groupedChosenCards"
        :key="group.key"
        class="card-stack"
        @click="emit('remove-card', group.card)"
        @mouseenter="emit('card-hover', group.card, $event)"
        @mousemove="emit('card-move', $event)"
        @mouseleave="emit('card-leave')"
      >
        <template v-if="isNarrow">
          <img
            :src="getCardImage(group.card)"
            :alt="cardName(group.card)"
            loading="lazy"
            class="card-image card-chosen"
          />
        </template>
        <template v-else>
          <img
            v-for="n in group.count"
            :key="n"
            :src="getCardImage(group.card)"
            :alt="cardName(group.card)"
            loading="lazy"
            class="card-image card-chosen"
            :style="{
              position: 'absolute',
              bottom: `${(n - 1) * 0}px`,
              left: `${(n - 1) * 3}px`,
              zIndex: n,
            }"
          />
        </template>
        <span v-if="group.count > 1" class="card-count">{{
          group.count
        }}</span>
      </div>
    </div>

    <div v-if="chosenCards.length === 0" class="empty-state">
      Click cards to add them to your deck
    </div>
  </div>
</template>

<style scoped>
.builder-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 14px 12px;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.deck-panel {
  flex: 1;
  min-width: 0;
}

.panel-header {
  display: flex;
  align-items: center;
}

.panel-title {
  font-family: var(--heading);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-h);
}

.deck-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.deck-name-input {
  max-width: 240px;
  font-family: var(--sans);
}

.deck-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  grid-auto-rows: min-content;
  gap: 12px 16px;
  overflow-y: auto;
  padding-right: 12px;
  padding-bottom: 20px;
}

.card-stack {
  position: relative;
  aspect-ratio: 5 / 7;
  min-height: 0;
  cursor: pointer;
}

.card-stack:has(.card-image:hover) {
  z-index: 10;
}

.card-stack .card-image {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: top left;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
  transition: box-shadow 0.2s;
}

.card-image:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.card-count {
  position: absolute;
  bottom: 15%;
  right: 10%;
  background: #7c4dff;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  min-width: 22px;
  height: 22px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 0 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--text);
  opacity: 0.6;
}

@media (max-width: 1365px) {
  .deck-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    grid-auto-rows: min-content;
    overflow-y: auto;
  }

  .card-stack {
    aspect-ratio: 5 / 7;
  }

  .card-stack .card-image {
    position: relative;
    object-fit: cover;
    object-position: center;
  }
}

@media (max-width: 480px) {
  .deck-panel {
    height: 100%;
    border-radius: 16px 16px 0 0;
    padding: 10px 8px;
    transition: transform 0.2s ease;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  }

  .deck-grid {
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
    gap: 6px 6px;
    padding-right: 4px;
  }

  .deck-actions {
    flex-wrap: wrap;
    gap: 8px;
  }

  .deck-name-input {
    max-width: 100%;
    flex: 1 1 100%;
  }

  .drawer-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px 0 4px;
    cursor: pointer;
  }

  .drawer-handle-bar {
    width: 36px;
    height: 4px;
    background: var(--border);
    border-radius: 2px;
  }
}
</style>
