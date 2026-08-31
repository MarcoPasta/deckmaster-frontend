<script setup lang="ts">
import { computed, ref, watch } from "vue";
import CardEditDialog from "../components/CardEditDialog.vue";
import VirtualCardGrid from "../components/VirtualCardGrid.vue";
import { cardName, type AnyCard as AnyAdapterCard } from "../composables/tcg/adapters";
import {
  narutoTagItems,
  pokemonTagItems,
  useCardEditor,
} from "../composables/useCardEditor";
import type { NarutoCard, PokemonCard } from "../interfaces/interfaces";

// CardEditor only supports pokemon and naruto (admin feature).
type AnyCard = PokemonCard | NarutoCard;

const {
  selectedTcg,
  pokemon,
  naruto,
  scalarFields,
  dialogOpen,
  editForm,
  attacksJson,
  chips,
  effectJson,
  imagePreview,
  saving,
  deleting,
  getCardImage,
  openCard,
  onImageChange,
  saveCard,
  deleteCard,
} = useCardEditor();

watch(
  selectedTcg,
  (tcg) => {
    if (tcg === "naruto") naruto.fetchCards();
    else pokemon.fetchCards();
  },
  { immediate: true },
);

const allCards = computed<AnyCard[]>(() => {
  if (selectedTcg.value === "naruto") return naruto.allCards.value;
  return pokemon.allCards.value;
});

const isLoading = computed(() =>
  selectedTcg.value === "naruto" ? naruto.loading.value : pokemon.loading.value,
);

const searchQuery = ref("");

const filteredCards = computed<AnyCard[]>(() => {
  const q = searchQuery.value?.toLowerCase() ?? "";
  if (!q) return allCards.value;
  return allCards.value.filter((c) => {
    const name = (c as PokemonCard).Name ?? (c as NarutoCard).name ?? "";
    return name.toLowerCase().includes(q);
  });
});

const gridRef = ref<InstanceType<typeof VirtualCardGrid> | null>(null);

watch([searchQuery, selectedTcg], () => {
  gridRef.value?.scrollToTop();
});

watch(selectedTcg, () => {
  searchQuery.value = "";
});
</script>

<template>
  <div class="editor-page">
    <div class="editor-panel">
      <div class="toolbar">
        <v-text-field
          v-model="searchQuery"
          variant="outlined"
          density="compact"
          placeholder="Search cards..."
          prepend-inner-icon="mdi-magnify"
          hide-details
          clearable
          class="search-input"
        />
      </div>

      <div v-if="isLoading" class="loading-state">
        <v-progress-circular indeterminate color="deep-purple-accent-2" />
      </div>

      <VirtualCardGrid
        v-else
        ref="gridRef"
        :cards="filteredCards"
        @card-click="(card) => openCard(card as AnyCard)"
      >
        <template #card="{ card }">
          <img
            :src="getCardImage(card as AnyCard)"
            :alt="cardName(card as AnyAdapterCard)"
            loading="lazy"
            class="card-image"
          />
        </template>
      </VirtualCardGrid>
    </div>

    <CardEditDialog
      v-model="dialogOpen"
      :image-preview="imagePreview"
      :scalar-fields="scalarFields"
      :edit-form="editForm"
      :attacks-json="attacksJson"
      :chips="chips"
      :effect-json="effectJson"
      :saving="saving"
      :deleting="deleting"
      :tag-items="selectedTcg === 'naruto' ? narutoTagItems : pokemonTagItems"
      :tcg="selectedTcg"
      @update:attacks-json="attacksJson = $event"
      @update:chips="chips = $event"
      @update:effect-json="effectJson = $event"
      @save="saveCard"
      @delete="deleteCard"
      @image-change="onImageChange"
    />
  </div>
</template>

<style scoped>
.editor-page {
  display: flex;
  justify-content: center;
  padding: 12px 16px;
  height: calc(100vh - 64px);
  box-sizing: border-box;
}

.editor-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 1400px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 14px 12px;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.toolbar {
  max-width: 280px;
  flex-shrink: 0;
}

.search-input {
  font-family: var(--sans);
}

.loading-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
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

@media (max-width: 480px) {
  .editor-page {
    padding: 8px;
    height: calc(100vh - 76px);
  }

  .editor-panel {
    padding: 8px;
    border-radius: 12px;
  }

  .toolbar {
    max-width: 100%;
  }
}
</style>
