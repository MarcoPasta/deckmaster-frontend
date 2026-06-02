<script setup lang="ts">
import { useVirtualizer } from "@tanstack/vue-virtual";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useNarutoBuilder } from "../composables/naruto/useNarutoBuilder";
import { usePokemonBuilder } from "../composables/pokemon/usePokemonBuilder";
import { useApi } from "../composables/useApi";
import { useTcgState } from "../composables/useTcgState";
import type { NarutoCard, PokemonCard } from "../interfaces/interfaces";

type AnyCard = PokemonCard | NarutoCard;

const { selectedTcg } = useTcgState();
const { get, patch, del } = useApi();
const pokemon = usePokemonBuilder();
const naruto = useNarutoBuilder();

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

function getCardImage(card: AnyCard): string {
  if (selectedTcg.value === "naruto")
    return naruto.getCardImage(card as NarutoCard);
  return pokemon.getCardImage(card as PokemonCard);
}

// --- Field definitions ---

const pokemonScalarFields = [
  { key: "Name", label: "Name", type: "text" },
  { key: "CardType", label: "Card Type", type: "text" },
  { key: "Phase", label: "Phase", type: "text" },
  { key: "Kp", label: "HP", type: "number" },
  { key: "EnergyType", label: "Energy Type", type: "text" },
  { key: "Ability", label: "Ability", type: "text" },
  { key: "Weakness", label: "Weakness", type: "text" },
  { key: "Resistance", label: "Resistance", type: "text" },
  { key: "RetreatCost", label: "Retreat Cost", type: "number" },
  { key: "CardNumber", label: "Card Number", type: "text" },
  { key: "Code", label: "Code", type: "text" },
  { key: "Set", label: "Set", type: "text" },
  { key: "Tags", label: "Tags", type: "text" },
];

const narutoScalarFields = [
  { key: "name", label: "Name", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "cost", label: "Cost", type: "number" },
  { key: "power", label: "Power", type: "number" },
  { key: "keyword", label: "Keyword", type: "text" },
  { key: "group", label: "Group", type: "text" },
  { key: "effect", label: "Effect", type: "text" },
  { key: "rarity", label: "Rarity", type: "text" },
  { key: "card_number", label: "Card Number", type: "text" },
  { key: "set", label: "Set", type: "text" },
];

const scalarFields = computed(() =>
  selectedTcg.value === "naruto" ? narutoScalarFields : pokemonScalarFields,
);

// --- Dialog state ---

const dialogOpen = ref(false);
const selectedCard = ref<AnyCard | null>(null);
const editForm = ref<Record<string, unknown>>({});
const attacksJson = ref("[]");
const chips = ref<string[]>([]);
const effectTypesJson = ref("[]");
const imageFile = ref<File | null>(null);
const imagePreview = ref("");
const imageInputRef = ref<HTMLInputElement | null>(null);
const saving = ref(false);
const deleting = ref(false);
const tagItems = [
  "item lock",
  "retreat lock",
  "stun", // z.b. crustle, cornerstone
  "handcontrol",
  "spread",
  "healing",
  "beatsticks", // viel schaden ohne effekt
  "draw",
  "search",
  "setup",
  "acceleration",
  "special condition",
];

function openCard(card: AnyCard) {
  selectedCard.value = card;
  const fields =
    selectedTcg.value === "naruto" ? narutoScalarFields : pokemonScalarFields;
  const copy: Record<string, unknown> = {};
  for (const field of fields) {
    copy[field.key] = (card as unknown as Record<string, unknown>)[field.key];
  }
  if (selectedTcg.value === "pokemon") {
    const c = card as PokemonCard;
    attacksJson.value = JSON.stringify(c.Attacks ?? [], null, 2);
    chips.value = c.Tags?.map((t) => JSON.parse(t)) ?? [];
  } else {
    const c = card as NarutoCard;
    effectTypesJson.value = JSON.stringify(c.effect_types ?? [], null, 2);
  }
  editForm.value = copy;
  imageFile.value = null;
  imagePreview.value = getCardImage(card);
  dialogOpen.value = true;
}

function onImageChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  imageFile.value = file;
  imagePreview.value = URL.createObjectURL(file);
}

function formatRequestBody(
  data: Record<string, unknown>,
): PokemonCard | NarutoCard | undefined {
  const body = { ...data };
  let pCard: PokemonCard = {} as PokemonCard;
  let nCard: NarutoCard = {} as NarutoCard;
  if (selectedTcg.value === "pokemon") {
    pCard.Name = String(body.Name ?? "");
    pCard.CardType = String(body.CardType ?? "");
    pCard.Phase = String(body.Phase ?? "");
    pCard.Kp = Number(body.Kp ?? 0);
    pCard.EnergyType = String(body.EnergyType ?? "");
    pCard.Ability = String(body.Ability ?? "");
    pCard.Weakness = String(body.Weakness ?? "");
    pCard.Resistance = String(body.Resistance ?? "");
    pCard.RetreatCost = Number(body.RetreatCost ?? 0);
    pCard.CardNumber = String(body.CardNumber ?? "");
    pCard.Code = String(body.Code ?? "");
    pCard.Set = String(body.Set ?? "");
    pCard.Tags = chips.value.map((c) => JSON.stringify(c));
    try {
      pCard.Attacks = JSON.parse(attacksJson.value);
    } catch (e) {
      console.error("Invalid JSON for Attacks:", e);
    }
    // try {
    //   for (const chip of chips.value) {
    //     if (!chip.trim()) continue;
    //     pCard.Tags.concat(JSON.stringify(chip));
    //   }
    // } catch (e) {
    //   console.error("Invalid JSON for Tags:", e);
    // }
    return pCard;
  }
  if (selectedTcg.value === "naruto") {
    nCard.name = String(body.name ?? "");
    nCard.description = String(body.description ?? "");
    nCard.cost = Number(body.cost ?? 0);
    nCard.power = Number(body.power ?? 0);
    nCard.keyword = String(body.keyword ?? "");
    nCard.group = String(body.group ?? "");
    nCard.effect = String(body.effect ?? "");
    nCard.rarity = String(body.rarity ?? "");
    nCard.card_number = String(body.card_number ?? "");
    nCard.set = String(body.set ?? "");
    try {
      nCard.effect_types = JSON.parse(effectTypesJson.value);
    } catch (e) {
      console.error("Invalid JSON for Effect Types:", e);
    }
    return nCard;
  }
}

async function saveCard() {
  if (!selectedCard.value) return;
  saving.value = true;
  try {
    const body = formatRequestBody(editForm.value);
    if (selectedTcg.value === "pokemon") {
      const id = (selectedCard.value as PokemonCard).ID;
      await patch(`/admin/pokemon/card/${id}`, body);
      if (imageFile.value) {
        const card = selectedCard.value as PokemonCard;
        const objectKey = `cards/pokemon/${card.Code}_${card.CardNumber}.png`;
        const { url } = await get<{ url: string }>(
          "/admin/bucket/presign-put",
          { key: objectKey },
        );
        await fetch(url, {
          method: "PATCH",
          body: imageFile.value,
          headers: { "Content-Type": imageFile.value.type },
        });
      }
      const idx = pokemon.allCards.value.findIndex((c) => c.ID === id);
      if (idx !== -1) Object.assign(pokemon.allCards.value[idx], body);
    } else {
      const id = (selectedCard.value as NarutoCard).ID;
      await patch(`/admin/naruto/cards/${id}`, body);
      if (imageFile.value) {
        const card = selectedCard.value as NarutoCard;
        const paddedNumber = card.card_number.padStart(3, "0");
        const objectKey = `cards/naruto/ks_${paddedNumber}_${card.rarity}.webp`;
        const { url } = await get<{ url: string }>(
          "/admin/bucket/presign-put",
          { key: objectKey },
        );
        await fetch(url, {
          method: "PATCH",
          body: imageFile.value,
          headers: { "Content-Type": imageFile.value.type },
        });
      }
      const idx = naruto.allCards.value.findIndex((c) => c.ID === id);
      if (idx !== -1) Object.assign(naruto.allCards.value[idx], body);
    }
    dialogOpen.value = false;
  } catch (e) {
    console.error("Failed to save card:", e);
  } finally {
    saving.value = false;
  }
}

async function deleteCard() {
  if (!selectedCard.value) return;
  deleting.value = true;
  try {
    if (selectedTcg.value === "pokemon") {
      const id = (selectedCard.value as PokemonCard).ID;
      await del(`/admin/pokemon/card/${id}`);
      pokemon.allCards.value = pokemon.allCards.value.filter(
        (c) => c.ID !== id,
      );
    } else {
      const id = (selectedCard.value as NarutoCard).ID;
      await del(`/admin/naruto/cards/${id}`);
      naruto.allCards.value = naruto.allCards.value.filter((c) => c.ID !== id);
    }
    dialogOpen.value = false;
  } catch (e) {
    console.error("Failed to delete card:", e);
  } finally {
    deleting.value = false;
  }
}

// --- Search ---

const searchQuery = ref("");

function cardName(card: AnyCard): string {
  return (card as PokemonCard).Name ?? (card as NarutoCard).name ?? "";
}

const filteredCards = computed<AnyCard[]>(() => {
  const q = searchQuery.value !== null ? searchQuery.value.toLowerCase() : "";
  if (!q) return allCards.value;
  return allCards.value.filter((c) => cardName(c).toLowerCase().includes(q));
});

// --- Virtual scroll (dynamic measurement) ---

const cardGridEl = ref<HTMLElement | null>(null);
const isNarrow = ref(window.innerWidth < 1280);
const isMobile = ref(window.innerWidth <= 480);

const columnCount = computed(() => {
  if (isMobile.value) return 4;
  if (isNarrow.value) return 7;
  return 9;
});

function onResize() {
  isNarrow.value = window.innerWidth < 1280;
  isMobile.value = window.innerWidth <= 480;
}

onMounted(() => window.addEventListener("resize", onResize));
onUnmounted(() => window.removeEventListener("resize", onResize));

const rowCount = computed(() =>
  Math.ceil(filteredCards.value.length / columnCount.value),
);

const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: rowCount.value,
    getScrollElement: () => cardGridEl.value,
    estimateSize: () => 200,
    overscan: 3,
  })),
);

// Re-measure all rows when container width changes (card heights change with 1fr columns)
watch(cardGridEl, (el, _prev, cleanup) => {
  const observer = new ResizeObserver(() => rowVirtualizer.value.measure());
  if (el) observer.observe(el);
  cleanup(() => observer.disconnect());
});

function getCardAtPosition(
  rowIndex: number,
  colIndex: number,
): AnyCard | undefined {
  return filteredCards.value[rowIndex * columnCount.value + colIndex];
}

watch([searchQuery, selectedTcg], () => {
  if (cardGridEl.value) cardGridEl.value.scrollTop = 0;
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

      <div v-else ref="cardGridEl" class="card-grid">
        <div
          :style="{
            height: rowVirtualizer.getTotalSize() + 'px',
            position: 'relative',
          }"
        >
          <div
            v-for="virtualRow in rowVirtualizer.getVirtualItems()"
            :key="virtualRow.index"
            :ref="(el: any) => el && rowVirtualizer.measureElement(el)"
            :data-index="virtualRow.index"
            class="virtual-row"
            :style="{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${virtualRow.start}px)`,
            }"
          >
            <template v-for="col in columnCount" :key="col">
              <div
                v-if="getCardAtPosition(virtualRow.index, col - 1)"
                class="card-slot"
                @click="openCard(getCardAtPosition(virtualRow.index, col - 1)!)"
              >
                <img
                  :src="
                    getCardImage(getCardAtPosition(virtualRow.index, col - 1)!)
                  "
                  :alt="
                    (getCardAtPosition(virtualRow.index, col - 1) as any)
                      .Name ??
                    (getCardAtPosition(virtualRow.index, col - 1) as any)
                      .name ??
                    ''
                  "
                  loading="lazy"
                  class="card-image"
                />
              </div>
              <div v-else class="card-slot" />
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit dialog -->
    <v-dialog v-model="dialogOpen" max-width="680" scrollable>
      <v-card rounded="xl">
        <v-card-title class="dialog-title">Edit Card</v-card-title>
        <v-divider />
        <v-card-text class="dialog-body">
          <!-- Image section -->
          <div class="image-section">
            <img
              v-if="imagePreview"
              :src="imagePreview"
              class="card-preview"
              alt="Card preview"
            />
            <v-btn
              variant="outlined"
              size="small"
              @click="imageInputRef?.click()"
            >
              <v-icon start>mdi-image-plus</v-icon>
              Replace Image
            </v-btn>
            <input
              ref="imageInputRef"
              type="file"
              accept="image/*"
              class="hidden-input"
              @change="onImageChange"
            />
          </div>

          <!-- Scalar text fields -->
          <div class="fields-grid">
            <v-text-field
              v-for="field in scalarFields"
              :key="field.key"
              v-model="(editForm as any)[field.key]"
              :label="field.label"
              :type="field.type"
              variant="outlined"
              density="compact"
              hide-details
            />
          </div>

          <!-- JSON array fields -->
          <template v-if="selectedTcg === 'pokemon'">
            <v-textarea
              v-model="attacksJson"
              label="Attacks (JSON)"
              variant="outlined"
              density="compact"
              rows="4"
              hide-details
              class="json-field"
              font-family="mono"
            />

            <!-- tag field -->
            <v-combobox
              v-model="chips"
              :items="tagItems"
              label="Tags"
              variant="outlined"
              chips
              clearable
              closable-chips
              multiple
            >
              <template v-slot:chip="{ props, item }">
                <v-chip v-bind="props">{{ item }}</v-chip>
              </template>
            </v-combobox>
          </template>
          <template v-else-if="selectedTcg === 'naruto'">
            <v-textarea
              v-model="effectTypesJson"
              label="Effect Types (JSON)"
              variant="outlined"
              density="compact"
              rows="3"
              hide-details
              class="json-field"
            />
          </template>
        </v-card-text>

        <v-divider />
        <v-card-actions class="dialog-actions">
          <v-btn
            icon
            variant="tonal"
            color="red"
            :loading="deleting"
            @click="deleteCard"
          >
            <v-icon icon="mdi-delete-outline" />
            <v-tooltip activator="parent" location="bottom">
              Delete Card
            </v-tooltip>
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="dialogOpen = false">Cancel</v-btn>
          <v-btn
            color="deep-purple-accent-2"
            :loading="saving"
            @click="saveCard"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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

.card-grid {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

.virtual-row {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 8px;
  padding-bottom: 12px;
  box-sizing: border-box;
}

@media (max-width: 1279px) {
  .virtual-row {
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    padding-bottom: 8px;
  }
}

@media (max-width: 480px) {
  .virtual-row {
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    padding-bottom: 4px;
  }
}

.card-slot {
  aspect-ratio: 5 / 7;
  cursor: pointer;
  min-width: 0;
  overflow: hidden;
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

/* Dialog */
.dialog-title {
  font-family: var(--sans);
  font-size: 18px;
  font-weight: 600;
  padding: 16px 20px 12px;
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px !important;
}

.image-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.card-preview {
  width: 80px;
  aspect-ratio: 5 / 7;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.hidden-input {
  display: none;
}

.fields-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.json-field {
  font-family: var(--mono, monospace);
}

.dialog-actions {
  padding: 12px 16px;
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

  .fields-grid {
    grid-template-columns: 1fr;
  }
}
</style>
