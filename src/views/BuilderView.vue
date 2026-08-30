<script setup lang="ts">
import { useUser } from "@clerk/vue";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import CardTooltip from "../components/CardTooltip.vue";
import DeckPanel from "../components/DeckPanel.vue";
import VirtualCardGrid from "../components/VirtualCardGrid.vue";
import { useDigimonBuilder } from "../composables/digimon/useDigimonBuilder";
import { useDragDivider } from "../composables/useDragDivider";
import { useMobileInteractions } from "../composables/useMobileInteractions";
import { useNarutoBuilder } from "../composables/naruto/useNarutoBuilder";
import { usePokemonBuilder } from "../composables/pokemon/usePokemonBuilder";
import { useSnackbar } from "../composables/useSnackbar";
import { useTcgState } from "../composables/useTcgState";
import type {
  DigimonCard,
  NarutoCard,
  PokemonCard,
} from "../interfaces/interfaces";

type AnyCard = PokemonCard | NarutoCard | DigimonCard;

const STORAGE_KEY = "builder-deck";
const STORAGE_NAME_KEY = "builder-deck-name";
const STORAGE_ID_KEY = "builder-deck-id";
const STORAGE_COVER_KEY = "builder-deck-cover";

const { user } = useUser();
const { show: showSnackbar } = useSnackbar();
const { selectedTcg } = useTcgState();
const pokemon = usePokemonBuilder();
const naruto = useNarutoBuilder();
const digimon = useDigimonBuilder();

const builderEl = ref<HTMLElement | null>(null);
const { splitPercent, dragging, startDrag } = useDragDivider(builderEl);

const filters = computed(() => {
  if (selectedTcg.value === "naruto") return naruto.filters;
  if (selectedTcg.value === "digimon") return digimon.filters;
  return pokemon.filters;
});

function getCardImage(card: AnyCard): string {
  if (selectedTcg.value === "naruto") return naruto.getCardImage(card as NarutoCard);
  if (selectedTcg.value === "digimon") return digimon.getCardImage(card as DigimonCard);
  return pokemon.getCardImage(card as PokemonCard);
}

function cardKey(card: AnyCard): string {
  if (selectedTcg.value === "naruto") return naruto.cardKey(card as NarutoCard);
  if (selectedTcg.value === "digimon") return digimon.cardKey(card as DigimonCard);
  return pokemon.cardKey(card as PokemonCard);
}

function cardName(card: AnyCard): string {
  if ("Name" in card) return card.Name ?? "";
  if ("name" in card) return card.name ?? "";
  return "";
}

const searchQuery = ref("");
const activeFilter = ref("all");
const deckName = ref(sessionStorage.getItem(STORAGE_NAME_KEY) || "");
const saving = ref(false);
const chosenCards = ref<AnyCard[]>(JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]"));

watch(selectedTcg, () => { chosenCards.value = []; activeFilter.value = "all"; searchQuery.value = ""; });
watch(selectedTcg, (tcg) => {
  if (tcg === "naruto") naruto.fetchCards();
  else if (tcg === "digimon") digimon.fetchCards();
  else pokemon.fetchCards();
}, { immediate: true });

const isLoading = computed(() => {
  if (selectedTcg.value === "naruto") return naruto.loading.value;
  if (selectedTcg.value === "digimon") return digimon.loading.value;
  return pokemon.loading.value;
});

watch(chosenCards, (val) => sessionStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true });
watch(deckName, (val) => sessionStorage.setItem(STORAGE_NAME_KEY, val));

const allFilteredCards = computed(() => {
  if (selectedTcg.value === "naruto") return naruto.filterCards(naruto.allCards.value, searchQuery.value, activeFilter.value);
  if (selectedTcg.value === "digimon") return digimon.filterCards(digimon.allCards.value, searchQuery.value, activeFilter.value);
  return pokemon.filterCards(pokemon.allCards.value, searchQuery.value, activeFilter.value);
});

const filteredMissionCards = computed(() =>
  selectedTcg.value === "naruto"
    ? (allFilteredCards.value as NarutoCard[]).filter(c => c.group?.toLowerCase() === "mission")
    : []
);

const filteredCards = computed(() =>
  selectedTcg.value === "naruto"
    ? (allFilteredCards.value as NarutoCard[]).filter(c => c.group?.toLowerCase() !== "mission")
    : allFilteredCards.value
);

interface CardGroup { card: AnyCard; key: string; count: number; }

function isMissionCard(card: AnyCard): boolean {
  return selectedTcg.value === "naruto" && (card as NarutoCard).group?.toLowerCase() === "mission";
}

const groupedChosenCards = computed<CardGroup[]>(() => {
  const map = new Map<string, CardGroup>();
  for (const card of chosenCards.value) {
    if (isMissionCard(card)) continue;
    const k = cardKey(card);
    const existing = map.get(k);
    if (existing) existing.count++;
    else map.set(k, { card, key: k, count: 1 });
  }
  return [...map.values()];
});

const groupedMissionCards = computed<CardGroup[]>(() => {
  const map = new Map<string, CardGroup>();
  for (const card of chosenCards.value) {
    if (!isMissionCard(card)) continue;
    const k = cardKey(card);
    const existing = map.get(k);
    if (existing) existing.count++;
    else map.set(k, { card, key: k, count: 1 });
  }
  return [...map.values()];
});

const bouncingCard = ref<string | null>(null);

function addCard(card: AnyCard) {
  chosenCards.value.push(card);
  const key = cardKey(card);
  bouncingCard.value = key;
  setTimeout(() => { if (bouncingCard.value === key) bouncingCard.value = null; }, 350);
}

function removeCard(card: AnyCard) {
  const key = cardKey(card);
  const idx = chosenCards.value.findIndex((c) => cardKey(c) === key);
  if (idx !== -1) chosenCards.value.splice(idx, 1);
  hideTooltip();
}

function clearDeck() {
  chosenCards.value = [];
  deckName.value = "";
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_ID_KEY);
  sessionStorage.removeItem(STORAGE_NAME_KEY);
  sessionStorage.removeItem(STORAGE_COVER_KEY);
}

async function saveDeck() {
  if (!deckName.value.trim() || chosenCards.value.length === 0) return;
  saving.value = true;
  try {
    const id = sessionStorage.getItem(STORAGE_ID_KEY);
    const cover = sessionStorage.getItem(STORAGE_COVER_KEY)
      || String(chosenCards.value[0]?.ID);
    if (selectedTcg.value === "naruto") {
      if (id !== null) await naruto.updateDeck(Number(id), deckName.value.trim(), chosenCards.value as NarutoCard[], cover);
      else await naruto.saveDeck(user.value!.id, deckName.value.trim(), chosenCards.value as NarutoCard[], cover);
    } else if (selectedTcg.value === "digimon") {
      if (id !== null) await digimon.updateDeck(Number(id), deckName.value.trim(), chosenCards.value as DigimonCard[], cover);
      else await digimon.saveDeck(user.value!.id, deckName.value.trim(), chosenCards.value as DigimonCard[], cover);
    } else {
      if (id !== null) await pokemon.updateDeck(Number(id), deckName.value.trim(), chosenCards.value as PokemonCard[], cover);
      else await pokemon.saveDeck(user.value!.id, deckName.value.trim(), chosenCards.value as PokemonCard[], cover);
    }
    chosenCards.value = [];
    deckName.value = "";
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_NAME_KEY);
    sessionStorage.removeItem(STORAGE_ID_KEY);
    sessionStorage.removeItem(STORAGE_COVER_KEY);
    showSnackbar("Deck saved", "success");
  } catch (e) {
    console.error("Failed to save deck:", e);
    showSnackbar("Failed to save deck", "error");
  } finally {
    saving.value = false;
  }
}

async function importDeck() {
  try {
    const text = await navigator.clipboard.readText();
    let imported: AnyCard[];
    if (selectedTcg.value === "naruto") imported = await naruto.parseDeckList(text);
    else if (selectedTcg.value === "digimon") imported = digimon.parseDeckList(text, digimon.allCards.value);
    else imported = await pokemon.parseDeckList(text);
    if (imported.length > 0) {
      chosenCards.value = imported;
      showSnackbar(`Imported ${imported.length} cards`, "success");
    } else {
      showSnackbar("No cards found in clipboard", "warning");
    }
  } catch (e) {
    console.error("Failed to import deck:", e);
    showSnackbar("Failed to import deck", "error");
  }
}

// Tooltip
const tooltipImage = ref("");
const tooltipPos = ref({ x: 0, y: 0 });
const tooltipVisible = ref(false);

function showTooltip(card: AnyCard, event: MouseEvent) {
  tooltipImage.value = getCardImage(card);
  tooltipPos.value = { x: event.clientX + 16, y: event.clientY + 16 };
  tooltipVisible.value = true;
}
function moveTooltip(event: MouseEvent) { tooltipPos.value = { x: event.clientX + 16, y: event.clientY + 16 }; }
function hideTooltip() { tooltipVisible.value = false; }

// Responsive
const isNarrow = ref(window.innerWidth < 1366);
const isMobile = ref(window.innerWidth <= 480);

function onResize() { isNarrow.value = window.innerWidth < 1366; isMobile.value = window.innerWidth <= 480; }
onMounted(() => window.addEventListener("resize", onResize));
onUnmounted(() => window.removeEventListener("resize", onResize));

// Mobile interactions
const { mobileThumbnail, onTouchStart, onTouchMove, onMobileTap, onMobileOverlayTap } =
  useMobileInteractions(isMobile, cardKey as (c: unknown) => string, getCardImage as (c: unknown) => string, addCard as (c: unknown) => void);

// Mobile drawer
const DRAWER_HANDLE_HEIGHT = 44;
const drawerOffset = ref(DRAWER_HANDLE_HEIGHT);
const isDrawerOpen = computed(() => drawerOffset.value > DRAWER_HANDLE_HEIGHT + 20);
let drawerTouchStartY = 0;
let drawerStartOffset = 0;
function getMaxDrawerOffset() {
  if (!builderEl.value) return DRAWER_HANDLE_HEIGHT;
  return builderEl.value.clientHeight * 0.7;
}
function toggleDrawer() {
  drawerOffset.value = drawerOffset.value > DRAWER_HANDLE_HEIGHT + 20 ? DRAWER_HANDLE_HEIGHT : getMaxDrawerOffset();
}
function onDrawerTouchStart(e: TouchEvent) { drawerTouchStartY = e.touches[0].clientY; drawerStartOffset = drawerOffset.value; }
function onDrawerTouchMove(e: TouchEvent) {
  const dy = drawerTouchStartY - e.touches[0].clientY;
  drawerOffset.value = Math.max(DRAWER_HANDLE_HEIGHT, Math.min(getMaxDrawerOffset(), drawerStartOffset + dy));
}
function onDrawerTouchEnd() {
  drawerOffset.value = drawerOffset.value > (getMaxDrawerOffset() + DRAWER_HANDLE_HEIGHT) / 2 ? getMaxDrawerOffset() : DRAWER_HANDLE_HEIGHT;
}

// Grid ref
const gridRef = ref<InstanceType<typeof VirtualCardGrid> | null>(null);
watch([searchQuery, activeFilter, selectedTcg], () => { gridRef.value?.scrollToTop(); });
</script>

<template>
  <div ref="builderEl" class="builder" :class="{ dragging }" :style="{ '--split': splitPercent + '%' }">
    <div v-if="!isMobile || isDrawerOpen" class="deck-wrapper">
    <DeckPanel
      :chosen-cards="chosenCards"
      :grouped-chosen-cards="groupedChosenCards"
      :grouped-mission-cards="groupedMissionCards"
      :deck-name="deckName"
      :saving="saving"
      :is-mobile="isMobile"
      :is-narrow="isNarrow"
      :drawer-offset="drawerOffset"
      :hide-drawer-handle="isMobile && isDrawerOpen"
      :get-card-image="getCardImage"
      :card-name="cardName"
      @update:deck-name="deckName = $event"
      @save="saveDeck"
      @import="importDeck"
      @clear="clearDeck"
      @remove-card="removeCard"
      @card-hover="showTooltip"
      @card-move="moveTooltip"
      @card-leave="hideTooltip"
      @drawer-toggle="toggleDrawer"
      @drawer-touch-start="onDrawerTouchStart"
      @drawer-touch-move="onDrawerTouchMove"
      @drawer-touch-end="onDrawerTouchEnd"
    />
    </div>

    <div v-if="isMobile" class="mobile-drawer-trigger" :class="{ 'is-open': isDrawerOpen }" @click="toggleDrawer">
      <v-icon v-if="isDrawerOpen" icon="mdi-chevron-down" />
      <template v-else>
        <v-icon icon="mdi-cards" />
        <span class="mobile-drawer-count">{{ chosenCards.length }} cards</span>
      </template>
    </div>

    <div v-if="!isMobile" class="divider" @mousedown="startDrag">
      <div class="divider-handle" />
    </div>

    <div class="builder-panel pool-panel">
      <div class="toolbar">
        <div class="search-wrapper">
          <v-text-field
            v-model="searchQuery"
            variant="outlined"
            density="compact"
            placeholder="Search cards..."
            prepend-inner-icon="mdi-magnify"
            hide-details
            class="search-input"
          />
        </div>
        <div class="filters">
          <v-chip
            v-for="filter in filters"
            :key="filter"
            :variant="activeFilter === filter.toLowerCase() ? 'elevated' : 'outlined'"
            :color="activeFilter === filter.toLowerCase() ? 'deep-purple-accent-2' : undefined"
            size="small"
            @click.passive="activeFilter = filter.toLowerCase()"
          >
            {{ filter }}
          </v-chip>
        </div>
      </div>

      <div v-if="isLoading" class="pool-loading">
        <v-progress-circular indeterminate color="deep-purple-accent-2" />
      </div>

      <VirtualCardGrid v-else
          ref="gridRef"
          :cards="filteredCards"
          :target-card-width="130"
          :col-gap="8"
          :row-gap="10"
          @card-click="(card) => !isMobile && addCard(card as AnyCard)"
        >
          <template #card="{ card }">
            <div
              :class="['pool-card-slot', bouncingCard === cardKey(card as AnyCard) && 'card-bounce-active']"
              @mouseenter="showTooltip(card as AnyCard, $event)"
              @mousemove="moveTooltip($event)"
              @mouseleave="hideTooltip"
              @touchstart="onTouchStart"
              @touchmove.passive="onTouchMove"
              @touchend.prevent="onMobileTap(card as AnyCard)"
            >
              <img
                :src="getCardImage(card as AnyCard)"
                :alt="cardName(card as AnyCard)"
                loading="lazy"
                class="card-image"
              />
            </div>
          </template>
          <template #footer>
            <template v-if="filteredMissionCards.length > 0">
              <div class="pool-mission-divider" />
              <div class="pool-mission-label">Missions</div>
              <div class="pool-mission-row">
                <div
                  v-for="card in filteredMissionCards"
                  :key="cardKey(card as AnyCard)"
                  :class="['pool-mission-slot', bouncingCard === cardKey(card as AnyCard) && 'card-bounce-active']"
                  @click="!isMobile && addCard(card as AnyCard)"
                  @mouseenter="showTooltip(card as AnyCard, $event)"
                  @mousemove="moveTooltip($event)"
                  @mouseleave="hideTooltip"
                  @touchstart="onTouchStart"
                  @touchmove.passive="onTouchMove"
                  @touchend.prevent="onMobileTap(card as AnyCard)"
                >
                  <img
                    :src="getCardImage(card as AnyCard)"
                    :alt="cardName(card as AnyCard)"
                    loading="lazy"
                    class="card-image"
                  />
                </div>
              </div>
            </template>
          </template>
        </VirtualCardGrid>
    </div>

    <CardTooltip :visible="tooltipVisible" :image="tooltipImage" :position="tooltipPos" />

    <div v-if="mobileThumbnail" class="mobile-thumbnail-overlay" @click="onMobileOverlayTap">
      <img :src="mobileThumbnail" class="mobile-thumbnail-img" />
    </div>
  </div>
</template>

<style scoped>
.builder {
  display: flex;
  gap: 0;
  padding: 12px 16px;
  height: calc(100vh - 64px);
  box-sizing: border-box;
}
.builder.dragging { user-select: none; cursor: col-resize; }
.pool-panel { flex: none; width: var(--split); order: 1; }
.deck-wrapper { flex: 1; min-width: 0; order: 3; display: flex; }
.divider { order: 2; width: 12px; display: flex; align-items: center; justify-content: center; cursor: col-resize; flex-shrink: 0; }
.divider-handle { width: 4px; height: 48px; background: var(--border); border-radius: 2px; transition: background 0.2s; }
.divider:hover .divider-handle { background: var(--accent); }
.builder-panel { display: flex; flex-direction: column; gap: 12px; background: var(--code-bg); border: 1px solid var(--border); border-radius: 16px; padding: 14px 12px; box-shadow: var(--shadow); overflow: hidden; }
.toolbar { display: flex; flex-direction: column; gap: 12px; }
.search-wrapper { max-width: 320px; }
.search-input { font-family: var(--sans); }
.filters { display: flex; gap: 6px; flex-wrap: wrap; }
.pool-loading { flex: 1; display: flex; align-items: center; justify-content: center; }
.pool-card-slot { width: 100%; height: 100%; }
@keyframes bounce-in { 0% { transform: scale(1, 1); } 40% { transform: scale(0.88, 0.92); } 70% { transform: scale(1.08, 1.02); } 100% { transform: scale(1, 1); } }
.card-bounce-active { animation: bounce-in 0.35s ease-out; z-index: 10; }
.card-image { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; transition: box-shadow 0.2s; }
.card-image:hover { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); }

.pool-mission-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text);
  opacity: 0.6;
  padding: 2px 0 4px;
}

.pool-mission-divider {
  border-top: 1px solid var(--border);
  margin: 8px 0;
}

.pool-mission-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}

.pool-mission-slot {
  height: 90px;
  aspect-ratio: 7 / 5;
  cursor: pointer;
  flex-shrink: 0;
}

@media (max-width: 1365px) {
  .builder { flex-direction: column; }
  .builder.dragging { cursor: row-resize; }
  .deck-wrapper { order: 1; flex: none; height: var(--split); }
  .divider { order: 2; width: 100%; height: 12px; cursor: row-resize; }
  .divider-handle { width: 48px; height: 4px; }
  .pool-panel { order: 3; flex: 1; width: auto; min-height: 0; }
}

@media (max-width: 480px) {
  .builder { flex-direction: column; padding: 8px; padding-bottom: 0; height: calc(100vh - 76px); position: relative; overflow: hidden; }
  .divider { display: none; }
  .deck-wrapper { position: absolute; bottom: 0; left: 0; right: 0; height: 70%; max-height: 70%; z-index: 100; order: unset; flex: unset; }
  .pool-panel { order: 1; flex: 1; min-height: 0; border-radius: 12px; padding: 8px 4px; margin-bottom: 48px; overflow: hidden; }
  .search-wrapper { max-width: 100%; }
  .mobile-thumbnail-overlay { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.6); }
  .mobile-thumbnail-img { width: 70%; max-width: 280px; border-radius: 10px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); }

  .mobile-drawer-trigger {
    position: fixed;
    bottom: max(16px, env(safe-area-inset-bottom, 0));
    left: 50%;
    transform: translateX(-50%);
    z-index: 110;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 22px;
    background: #7c4dff;
    color: #fff;
    border-radius: 24px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: opacity 0.2s;
  }

  .mobile-drawer-trigger.is-open {
    opacity: 0;
    pointer-events: none;
  }

  .pool-mission-row {
    gap: 8px;
  }

  .pool-mission-slot {
    flex: 0 0 calc((100% - 16px) / 3);
    height: auto;
  }
}
</style>
