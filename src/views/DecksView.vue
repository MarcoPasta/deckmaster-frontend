<script setup lang="ts">
import { useUser } from "@clerk/vue";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useDigimonDecks } from "../composables/digimon/useDigimonDecks";
import { useNarutoDecks } from "../composables/naruto/useNarutoDecks";
import { usePokemonDecks } from "../composables/pokemon/usePokemonDecks";
import { useApi } from "../composables/useApi";
import { useTcgState } from "../composables/useTcgState";
import type {
  DigimonCard,
  DigimonDecks,
  NarutoCard,
  NarutoDecks,
  PokemonCard,
  PokemonDecks,
} from "../interfaces/interfaces";

type AnyDeck = PokemonDecks | NarutoDecks | DigimonDecks;
type AnyCard = PokemonCard | NarutoCard | DigimonCard;

const router = useRouter();
const { user } = useUser();
const { selectedTcg } = useTcgState();
const { getBlob, post } = useApi();

const pokemonDecks = usePokemonDecks(() => user.value?.id);
const narutoDecks = useNarutoDecks(() => user.value?.id);
const digimonDecks = useDigimonDecks(() => user.value?.id);

const decks = computed<AnyDeck[]>(() => {
  if (selectedTcg.value === "naruto") return narutoDecks.decks.value;
  if (selectedTcg.value === "digimon") return digimonDecks.decks.value;
  return pokemonDecks.decks.value;
});

function getPreviewImage(deck: AnyDeck): string {
  if (selectedTcg.value === "naruto")
    return narutoDecks.getPreviewImage(deck as NarutoDecks);
  if (selectedTcg.value === "digimon")
    return digimonDecks.getPreviewImage(deck as DigimonDecks);
  return pokemonDecks.getPreviewImage(deck as PokemonDecks);
}

function getCardImage(card: AnyCard): string {
  if (selectedTcg.value === "naruto")
    return narutoDecks.getCardImage(card as NarutoCard);
  if (selectedTcg.value === "digimon")
    return digimonDecks.getCardImage(card as DigimonCard);
  return pokemonDecks.getCardImage(card as PokemonCard);
}

function buildDeckText(deck: AnyDeck): string {
  if (selectedTcg.value === "naruto")
    return narutoDecks.buildDeckText(deck as NarutoDecks);
  if (selectedTcg.value === "digimon")
    return digimonDecks.buildDeckText(deck as DigimonDecks);
  return pokemonDecks.buildDeckText(deck as PokemonDecks);
}

async function deleteDeckLocal(id: number) {
  if (selectedTcg.value === "naruto") return narutoDecks.deleteDeck(id);
  if (selectedTcg.value === "digimon") return digimonDecks.deleteDeck(id);
  return pokemonDecks.deleteDeck(id);
}

async function updateCoverCardLocal(deckId: number, cardId: number) {
  if (selectedTcg.value === "naruto")
    return narutoDecks.updateCoverCard(deckId, cardId);
  if (selectedTcg.value === "digimon")
    return digimonDecks.updateCoverCard(deckId, cardId);
  return pokemonDecks.updateCoverCard(deckId, cardId);
}

function deckCardCount(deck: AnyDeck): number {
  if (selectedTcg.value !== "naruto") return deck.entries?.length ?? 0;
  return (deck.entries ?? []).filter(
    (e) => (e.card as NarutoCard).group?.toLowerCase() !== "mission",
  ).length;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const dialogOpen = ref(false);
const selectedDeck = ref<AnyDeck | null>(null);
const choosingCover = ref(false);

const isMobile = ref(window.innerWidth <= 480);
function onResize() { isMobile.value = window.innerWidth <= 480; }
onMounted(() => window.addEventListener("resize", onResize));
onUnmounted(() => window.removeEventListener("resize", onResize));

function isNarutoMission(card: AnyCard): boolean {
  return (
    selectedTcg.value === "naruto" &&
    (card as NarutoCard).group?.toLowerCase() === "mission"
  );
}

const groupedEntries = computed(() => {
  if (!selectedDeck.value?.entries) return [];
  const map = new Map<number, { card: AnyCard; count: number }>();
  for (const entry of selectedDeck.value.entries) {
    if (isNarutoMission(entry.card)) continue;
    const id = entry.card.ID;
    if (map.has(id)) {
      map.get(id)!.count++;
    } else {
      map.set(id, { card: entry.card, count: 1 });
    }
  }
  const typeOrder = (card: AnyCard): number => {
    const t = ((card as any).CardType ?? "").toLowerCase();
    if (t === "pokemon" || t === "pokémon") return 0;
    if (t === "trainer") return 1;
    if (t === "energy" || t === "energie") return 2;
    return 3;
  };
  return Array.from(map.values()).sort(
    (a, b) => typeOrder(a.card) - typeOrder(b.card),
  );
});

const groupedMissionEntries = computed(() => {
  if (!selectedDeck.value?.entries) return [];
  const map = new Map<number, { card: AnyCard; count: number }>();
  for (const entry of selectedDeck.value.entries) {
    if (!isNarutoMission(entry.card)) continue;
    const id = entry.card.ID;
    if (map.has(id)) {
      map.get(id)!.count++;
    } else {
      map.set(id, { card: entry.card, count: 1 });
    }
  }
  return Array.from(map.values());
});

function openDeck(deck: AnyDeck) {
  selectedDeck.value = deck;
  choosingCover.value = false;
  dialogOpen.value = true;
}

function selectCoverCard(card: AnyCard) {
  if (!selectedDeck.value || !choosingCover.value) return;
  const deck = selectedDeck.value;
  deck.cover = String(card.ID);
  choosingCover.value = false;
  updateCoverCardLocal(deck.ID, card.ID);
}

function editDeck() {
  if (!selectedDeck.value) return;
  sessionStorage.setItem(
    "builder-deck",
    JSON.stringify(selectedDeck.value.entries.map((e) => e.card)),
  );
  sessionStorage.setItem("builder-deck-name", selectedDeck.value.name);
  sessionStorage.setItem("builder-deck-id", String(selectedDeck.value.ID));
  sessionStorage.setItem("builder-deck-cover", selectedDeck.value.cover ?? "");
  dialogOpen.value = false;
  router.push({ name: "Builder", params: { deckId: selectedDeck.value.ID } });
}

const shareMenuOpen = ref(false);

async function copyAsText() {
  if (!selectedDeck.value) return;
  const text = buildDeckText(selectedDeck.value);
  await navigator.clipboard.writeText(text);
  shareMenuOpen.value = false;
}

const cardmarketOpen = ref(false);
const cardmarketText = ref("");

async function copyForCardmarket() {
  if (!selectedDeck.value) return;
  const cards = selectedDeck.value.entries.map((e) => {
    const c = e.card as PokemonCard;
    return { id: c.ID, code: c.Code, card_number: c.CardNumber };
  });
  const response = await post<{ cards: string }>(
    "/auth/pokemon/decks/cardmarket",
    { cards },
  );
  cardmarketText.value = response?.cards ?? "";
  shareMenuOpen.value = false;
  cardmarketOpen.value = true;
}

async function copyCardmarketToClipboard() {
  await navigator.clipboard.writeText(cardmarketText.value);
}

async function copyAsImage() {
  if (!selectedDeck.value) return;

  const tcg = selectedTcg.value;
  const newTab = window.open("", "_blank");

  const blob = await getBlob(
    `/auth/${tcg}/decks/${selectedDeck.value.ID}/image`,
  );

  if (newTab) {
    const url = URL.createObjectURL(blob);
    newTab.location.href = url;
  }
  shareMenuOpen.value = false;
}

const testhandOpen = ref(false);
const testhandCards = ref<AnyCard[]>([]);
const testhandKeepingCards = ref<AnyCard[]>([]);

function drawTesthand() {
  if (!selectedDeck.value?.entries.length) return;
  const arr = selectedDeck.value.entries.map((e) => e.card);
  // Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (selectedTcg.value === "pokemon") {
    testhandCards.value = arr.slice(-7);
    testhandKeepingCards.value = [];
  } else if (selectedTcg.value === "naruto") {
    const nonMission = arr.filter(
      (card) => (card as NarutoCard).group?.toLowerCase() !== "mission",
    );
    testhandCards.value = nonMission.slice(-7, -2);
    testhandKeepingCards.value = nonMission.slice(-2);
  } else {
    testhandCards.value = arr.slice(-5);
    testhandKeepingCards.value = [];
  }
  testhandOpen.value = true;
}

function deleteDeck() {
  if (!selectedDeck.value) return;
  deleteDeckLocal(selectedDeck.value.ID);
  dialogOpen.value = false;
}
</script>

<template>
  <div class="decks-page">
    <h2 class="page-title">Your Decks</h2>

    <div class="deck-grid">
      <div
        v-for="deck in decks"
        :key="deck.ID"
        class="deck-card"
        @click="openDeck(deck)"
      >
        <div class="deck-thumbnail">
          <img
            v-if="getPreviewImage(deck)"
            :src="getPreviewImage(deck)"
            :alt="deck.name"
            class="deck-preview-img"
          />
        </div>
        <div class="deck-info">
          <span class="deck-name">{{ deck.name }}</span>
          <span class="deck-meta">
            {{ deckCardCount(deck) }} cards ·
            {{ formatDate(deck.CreatedAt) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Deck actions dialog -->
    <v-dialog v-model="dialogOpen" max-width="720">
      <v-card rounded="xl">
        <v-card-title class="dialog-title">
          {{ selectedDeck?.name }}
        </v-card-title>
        <v-card-text class="dialog-meta">
          {{ selectedDeck ? deckCardCount(selectedDeck) : 0 }} cards · Created
          {{ selectedDeck ? formatDate(selectedDeck.CreatedAt) : "" }}
        </v-card-text>
        <div v-if="choosingCover" class="cover-hint">
          Click a card to set it as the deck cover
        </div>
        <template v-if="groupedMissionEntries.length > 0">
          <div class="mission-section-label">Missions</div>
          <div
            :class="[
              'dialog-mission-grid',
              { 'choosing-cover': choosingCover },
            ]"
          >
            <div
              v-for="group in groupedMissionEntries"
              :key="group.card.ID"
              class="dialog-mission-slot"
              @click="selectCoverCard(group.card)"
            >
              <img
                v-if="getCardImage(group.card)"
                :src="getCardImage(group.card)"
                :alt="
                  (group.card as any).Name ?? (group.card as any).name ?? ''
                "
                :class="[
                  'dialog-mission-img',
                  { 'cover-candidate': choosingCover },
                ]"
              />
              <span v-if="group.count > 1" class="dialog-card-count">
                {{ group.count }}
              </span>
            </div>
          </div>
        </template>
        <div :class="['dialog-card-grid', { 'choosing-cover': choosingCover }]">
          <div
            v-for="group in groupedEntries"
            :key="group.card.ID"
            class="dialog-card-slot"
            @click="selectCoverCard(group.card)"
          >
            <img
              v-if="getCardImage(group.card)"
              :src="getCardImage(group.card)"
              :alt="(group.card as any).Name ?? (group.card as any).name ?? ''"
              :class="['dialog-card-img', { 'cover-candidate': choosingCover }]"
            />
            <span v-if="group.count > 1" class="dialog-card-count">
              {{ group.count }}
            </span>
          </div>
        </div>
        <v-divider />
        <div class="dialog-actions">
          <v-btn icon variant="tonal" @click="editDeck">
            <v-icon icon="mdi-pencil" />
            <v-tooltip activator="parent" location="bottom">Edit</v-tooltip>
          </v-btn>
          <v-btn
            icon
            :variant="choosingCover ? 'flat' : 'tonal'"
            :color="choosingCover ? 'primary' : undefined"
            @click="choosingCover = !choosingCover"
          >
            <v-icon>mdi-image-edit</v-icon>
            <v-tooltip activator="parent" location="bottom"
              >Choose Cover Card</v-tooltip
            >
          </v-btn>
          <v-menu v-model="shareMenuOpen" location="bottom">
            <template #activator="{ props }">
              <v-btn icon variant="tonal" v-bind="props">
                <v-icon>mdi-share-variant</v-icon>
                <v-tooltip activator="parent" location="bottom"
                  >Share</v-tooltip
                >
              </v-btn>
            </template>
            <v-card min-width="200" rounded="lg">
              <v-list density="compact">
                <v-list-item
                  prepend-icon="mdi-clipboard-text"
                  @click="copyAsText"
                >
                  <v-list-item-title>Copy to Clipboard</v-list-item-title>
                </v-list-item>
                <v-list-item prepend-icon="mdi-image" @click="copyAsImage">
                  <v-list-item-title>Copy as Image</v-list-item-title>
                </v-list-item>
                <v-list-item
                  v-if="selectedTcg === 'pokemon'"
                  prepend-icon="mdi-cart"
                  @click="copyForCardmarket"
                >
                  <v-list-item-title>Cardmarket</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card>
          </v-menu>
          <v-btn icon variant="tonal" @click="drawTesthand">
            <v-icon>mdi-cards-playing</v-icon>
            <v-tooltip activator="parent" location="bottom">Testhand</v-tooltip>
          </v-btn>
          <v-btn icon variant="tonal" color="error" @click="deleteDeck">
            <v-icon>mdi-delete</v-icon>
            <v-tooltip activator="parent" location="bottom">Delete</v-tooltip>
          </v-btn>
        </div>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogOpen = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Testhand dialog -->
    <v-dialog
      v-model="testhandOpen"
      max-width="70vw"
      :width="$vuetify.display.smAndDown ? '95vw' : undefined"
    >
      <v-card rounded="xl">
        <v-card-title class="dialog-title">Testhand</v-card-title>
        <v-card-text class="dialog-meta">
          {{ testhandCards.length }} random cards from your deck
        </v-card-text>
        <div
          class="testhand-grid"
          :style="{
            ...(!isMobile
              ? { gridTemplateColumns: `repeat(${testhandCards.length}, 1fr)` }
              : { display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }),
          }"
        >
          <div
            v-for="(card, i) in testhandCards"
            :key="i"
            class="dialog-card-slot"
          >
            <img
              v-if="getCardImage(card)"
              :src="getCardImage(card)"
              :alt="(card as any).Name ?? (card as any).name ?? ''"
              class="dialog-card-img"
            />
          </div>
        </div>
        <template v-if="testhandKeepingCards.length">
          <div class="testhand-section-label">When keeping</div>
          <div
            class="testhand-grid testhand-keeping"
            :style="{ display: 'flex', justifyContent: 'center' }"
          >
            <div
              v-for="(card, i) in testhandKeepingCards"
              :key="i"
              class="dialog-card-slot"
              :style="!isMobile ? { flex: `0 0 calc((100% - ${(testhandCards.length - 1) * 12}px) / ${testhandCards.length})` } : undefined"
            >
              <img
                v-if="getCardImage(card)"
                :src="getCardImage(card)"
                :alt="(card as any).Name ?? (card as any).name ?? ''"
                class="dialog-card-img"
              />
            </div>
          </div>
        </template>
        <v-divider />
        <v-card-actions>
          <v-btn
            variant="tonal"
            prepend-icon="mdi-refresh"
            @click="drawTesthand"
            >Redraw</v-btn
          >
          <v-spacer />
          <v-btn variant="text" @click="testhandOpen = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Cardmarket dialog -->
    <v-dialog v-model="cardmarketOpen" max-width="520">
      <v-card rounded="xl">
        <v-card-title class="dialog-title">Cardmarket Decklist</v-card-title>
        <v-card-text>
          <v-textarea
            :model-value="cardmarketText"
            readonly
            rows="12"
            variant="outlined"
            hide-details
            class="cardmarket-textarea"
          />
        </v-card-text>
        <v-card-actions>
          <v-btn
            variant="tonal"
            prepend-icon="mdi-clipboard"
            @click="copyCardmarketToClipboard"
          >
            Copy to Clipboard
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="cardmarketOpen = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.decks-page {
  padding: 16px 24px;
}

.page-title {
  font-size: 22px;
  margin: 0 0 16px;
}

.deck-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.deck-card {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition:
    border-color 0.2s,
    transform 0.15s;
}

.deck-card:hover {
  border-color: var(--accent-border);
  transform: translateY(-2px);
}

.deck-thumbnail {
  width: 100%;
  aspect-ratio: 16 / 10;
  background: var(--accent-bg);
  border-bottom: 1px solid var(--border);
  overflow: hidden;
}

.deck-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 15%;
}

.deck-info {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.deck-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-h);
}

.deck-meta {
  font-size: 12px;
  color: var(--text);
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  padding-bottom: 0;
}

.dialog-meta {
  font-size: 13px;
  padding-top: 4px;
}

.dialog-thumbnail {
  width: calc(100% - 32px);
  aspect-ratio: 16 / 10;
  background: var(--accent-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  margin: 12px 16px;
  overflow: hidden;
}

.dialog-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 20%;
}

.dialog-card-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  margin: 8px 16px;
  max-height: 400px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.dialog-card-grid .dialog-card-slot {
  flex: 0 0 calc((100% - 40px) / 6);
}

.dialog-card-slot {
  position: relative;
  aspect-ratio: 5 / 7;
}

.dialog-card-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

.dialog-card-count {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: #7c4dff;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.dialog-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  justify-content: center;
}

.cover-hint {
  text-align: center;
  font-size: 13px;
  color: var(--text);
  padding: 6px 16px 0;
  opacity: 0.8;
}

.dialog-card-grid.choosing-cover {
  cursor: pointer;
}

.dialog-card-img.cover-candidate {
  transition:
    transform 0.15s,
    box-shadow 0.15s,
    outline 0.1s;
}

.dialog-card-img.cover-candidate:hover {
  transform: scale(1.08);
  box-shadow:
    0 0 0 3px #7c4dff,
    0 4px 12px rgba(0, 0, 0, 0.5);
  outline: none;
  z-index: 1;
  position: relative;
}

.testhand-grid {
  display: grid;
  gap: 12px;
  padding: 16px 20px;
  margin: 8px 20px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: 12px;
}

@media (max-width: 480px) {
  .testhand-grid {
    gap: 5px;
    padding: 8px;
    margin: 4px 8px;
  }

  .testhand-grid .dialog-card-slot {
    flex: 0 0 calc((100% - 10px) / 3);
  }

  .dialog-card-grid .dialog-card-slot {
    flex: 0 0 calc((100% - 16px) / 3);
  }

  .dialog-mission-grid .dialog-mission-slot {
    flex: 0 0 calc((100% - 8px) / 2);
  }

}

.testhand-keeping {
  display: flex;
  justify-content: center;
  border-color: rgba(124, 77, 255, 0.5);
  background: rgba(124, 77, 255, 0.08);
}

.testhand-section-label {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7c4dff;
  margin: 4px 16px 0;
  padding: 6px 0 2px;
  border-top: 1px solid rgba(124, 77, 255, 0.3);
}

.mission-section-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text, #aaa);
  opacity: 0.7;
  margin: 4px 16px 0;
  padding: 6px 0 4px;
  border-top: 1px solid var(--border, rgba(255, 255, 255, 0.1));
}

.dialog-mission-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px 12px;
  margin: 0 16px 8px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.dialog-mission-grid .dialog-mission-slot {
  flex: 0 0 calc((100% - 16px) / 3);
}

.dialog-mission-grid.choosing-cover {
  cursor: pointer;
}

.dialog-mission-slot {
  position: relative;
  aspect-ratio: 7 / 5;
}

.dialog-mission-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 6px;
}

.dialog-mission-img.cover-candidate {
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}

.dialog-mission-img.cover-candidate:hover {
  transform: scale(1.08);
  box-shadow:
    0 0 0 3px #7c4dff,
    0 4px 12px rgba(0, 0, 0, 0.5);
}
</style>
