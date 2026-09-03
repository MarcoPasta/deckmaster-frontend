<script setup lang="ts">
import { useUser } from "@clerk/vue";
import { computed, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import CardTooltip from "@/components/CardTooltip.vue";
import DeckPanel from "@/components/DeckPanel.vue";
import VirtualCardGrid from "@/components/VirtualCardGrid.vue";
import {
  cardName,
  isMissionCard as isMissionCardFor,
  useTcgBuilder,
  type AnyCard,
} from "@/composables/tcg/adapters";
import {
  BUILDER_STORAGE,
  clearBuilderHandoff,
  readBuilderHandoff,
} from "@/composables/tcg/builderHandoff";
import { useDragDivider } from "@/composables/useDragDivider";
import { useMobileInteractions } from "@/composables/useMobileInteractions";
import { useSnackbar } from "@/composables/useSnackbar";
import type { NarutoCard } from "@/interfaces/interfaces";

const { user } = useUser();
const { show: showSnackbar } = useSnackbar();

/**
 * Registry adapter for the currently active TCG.
 * `builder` is a computed ref that switches between Pokémon, Naruto and
 * Digimon adapters automatically whenever `selectedTcg` changes — views
 * never reference a specific game composable directly.
 */
const { selectedTcg, builder } = useTcgBuilder();

/** Template ref for the outer `.builder` container, used by `useDragDivider`. */
const builderEl = ref<HTMLElement | null>(null);
/** Percentage split between the deck panel and the card pool; draggable. */
const { splitPercent, dragging, startDrag } = useDragDivider(builderEl);

/** Filter chip labels for the active game (e.g. ["All", "Pokemon", …]). */
const filters = computed(() => builder.value.filters);

function getCardImage(card: AnyCard): string {
  return builder.value.getCardImage(card);
}

function cardKey(card: AnyCard): string {
  return builder.value.cardKey(card);
}

// ── Deck state ────────────────────────────────────────────────────────────
// Populated from sessionStorage when the user arrives from DecksView (edit
// flow).  Both refs are also persisted back to sessionStorage on every change
// so a page refresh doesn't lose the work in progress.
const { cards: _initCards, name: _initName } = readBuilderHandoff();
/** Free-text search for the card pool search bar. */
const searchQuery = ref("");
/** The currently active filter chip value (lowercased), e.g. `"all"`, `"pokemon"`. */
const activeFilter = ref("all");
/** Name the user has typed for the deck being built. */
const deckName = ref(_initName);
/** True while a save/update deck request is in flight. */
const saving = ref(false);
/** The cards the user has added to the current deck (one entry per physical copy). */
const chosenCards = ref<AnyCard[]>(_initCards as AnyCard[]);

// Reset the deck and filters when the user switches to a different TCG.
watch(selectedTcg, () => { chosenCards.value = []; activeFilter.value = "all"; searchQuery.value = ""; });
// Fetch the active game's card catalogue when the TCG changes (immediate so
// cards are loaded on first render too).
watch(selectedTcg, () => { builder.value.fetchCards(); }, { immediate: true });

/** True while the initial card catalogue fetch is running. */
const isLoading = computed(() => builder.value.loading.value);

// Persist deck state to sessionStorage so it survives navigation / refresh.
watch(chosenCards, (val) => sessionStorage.setItem(BUILDER_STORAGE.DECK, JSON.stringify(val)), { deep: true });
watch(deckName, (val) => sessionStorage.setItem(BUILDER_STORAGE.NAME, val));

/**
 * All cards matching the current search + filter, split into two lists:
 * - `filteredCards`        — regular cards (main grid).
 * - `filteredMissionCards` — Naruto landscape mission cards (separate footer row).
 */
const allFilteredCards = computed(() =>
  builder.value.filterCards(builder.value.allCards.value, searchQuery.value, activeFilter.value),
);

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

/** A card + its deduplicated count, used to render stacked card visuals. */
interface CardGroup { card: AnyCard; key: string; count: number; }

function isMissionCard(card: AnyCard): boolean {
  return isMissionCardFor(card, selectedTcg.value);
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

/**
 * Key of the card currently animating a "bounce-in" after being added.
 * Cleared automatically after 350 ms so only the most recent addition plays
 * the animation (prevents stacking multiple bounces simultaneously).
 */
const bouncingCard = ref<string | null>(null);

/** Add one copy of `card` to the deck and play the bounce animation. */
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
  clearBuilderHandoff();
}

async function saveDeck() {
  if (!deckName.value.trim() || chosenCards.value.length === 0) return;
  saving.value = true;
  try {
    const id = sessionStorage.getItem(BUILDER_STORAGE.ID);
    const cover = sessionStorage.getItem(BUILDER_STORAGE.COVER)
      || String(chosenCards.value[0]?.ID);
    const name = deckName.value.trim();
    if (id !== null) await builder.value.updateDeck(Number(id), name, chosenCards.value, cover);
    else await builder.value.saveDeck(user.value!.id, name, chosenCards.value, cover);
    chosenCards.value = [];
    deckName.value = "";
    clearBuilderHandoff();
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
    const imported = await builder.value.parseDeckList(text, builder.value.allCards.value);
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

// ── Tooltip (desktop card preview) ───────────────────────────────────────
/** Image URL shown in the floating card tooltip. */
const tooltipImage = ref("");
/** Pixel position of the tooltip, offset 16 px from the cursor. */
const tooltipPos = ref({ x: 0, y: 0 });
/** Whether the tooltip is currently visible. */
const tooltipVisible = ref(false);

function showTooltip(card: AnyCard, event: MouseEvent) {
  tooltipImage.value = getCardImage(card);
  tooltipPos.value = { x: event.clientX + 16, y: event.clientY + 16 };
  tooltipVisible.value = true;
}
function moveTooltip(event: MouseEvent) { tooltipPos.value = { x: event.clientX + 16, y: event.clientY + 16 }; }
function hideTooltip() { tooltipVisible.value = false; }

// Responsive – use Vuetify's reactive display so no manual resize listeners needed.
// smAndDown  = ≤960px (Vuetify md breakpoint), xs = ≤600px (mobile).
const { smAndDown, xs } = useDisplay();
const isNarrow = smAndDown;   // deck panel switches to compact grid
const isMobile = xs;          // full mobile drawer experience (≤480px)

// Mobile interactions
const { mobileThumbnail, onTouchStart, onTouchMove, onMobileTap, onMobileOverlayTap } =
  useMobileInteractions(isMobile, cardKey as (c: unknown) => string, getCardImage as (c: unknown) => string, addCard as (c: unknown) => void);

// ── Mobile drawer (deck panel slides up from the bottom) ─────────────────
/** Height of the collapsed drawer handle bar in pixels. */
const DRAWER_HANDLE_HEIGHT = 44;
/**
 * How many pixels the drawer panel is translated up from the bottom edge.
 * `DRAWER_HANDLE_HEIGHT` = fully collapsed (only the handle is visible).
 * `getMaxDrawerOffset()` = fully open (70 % of the container height).
 */
const drawerOffset = ref(DRAWER_HANDLE_HEIGHT);
/** True when the drawer is open enough to show its content (> handle + 20 px). */
const isDrawerOpen = computed(() => drawerOffset.value > DRAWER_HANDLE_HEIGHT + 20);
/** Y-coordinate of the touchstart event, used to calculate drag distance. */
let drawerTouchStartY = 0;
/** `drawerOffset` value at the start of a drag, used as the drag base. */
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
