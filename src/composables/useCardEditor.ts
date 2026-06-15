import { computed, ref } from "vue";
import type { NarutoCard, PokemonCard } from "../interfaces/interfaces";
import { useNarutoBuilder } from "./naruto/useNarutoBuilder";
import { usePokemonBuilder } from "./pokemon/usePokemonBuilder";
import { useApi } from "./useApi";
import { useTcgState } from "./useTcgState";

type AnyCard = PokemonCard | NarutoCard;

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
  { key: "tags", label: "Tags", type: "text" },
];

export const pokemonTagItems = [
  "item lock",
  "retreat lock",
  "stun",
  "handcontrol",
  "spread",
  "healing",
  "beatsticks",
  "draw",
  "search",
  "setup",
  "acceleration",
  "special condition",
];

export const narutoTagItems = ["scouter"];

export function useCardEditor() {
  const { selectedTcg } = useTcgState();
  const { get, patch, del } = useApi();
  const pokemon = usePokemonBuilder();
  const naruto = useNarutoBuilder();

  const scalarFields = computed(() =>
    selectedTcg.value === "naruto" ? narutoScalarFields : pokemonScalarFields,
  );

  const dialogOpen = ref(false);
  const selectedCard = ref<AnyCard | null>(null);
  const editForm = ref<Record<string, unknown>>({});
  const attacksJson = ref("[]");
  const chips = ref<string[]>([]);
  const effectJson = ref("[]");
  const imageFile = ref<File | null>(null);
  const imagePreview = ref("");
  const saving = ref(false);
  const deleting = ref(false);

  function getCardImage(card: AnyCard): string {
    if (selectedTcg.value === "naruto")
      return naruto.getCardImage(card as NarutoCard);
    return pokemon.getCardImage(card as PokemonCard);
  }

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
      effectJson.value = JSON.stringify(c.effect ?? [], null, 2);
      chips.value = c.tags?.map((t) => JSON.parse(t)) ?? [];
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
    if (selectedTcg.value === "pokemon") {
      const pCard = {} as PokemonCard;
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
      return pCard;
    }
    if (selectedTcg.value === "naruto") {
      const nCard = {} as NarutoCard;
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
      nCard.tags = chips.value.map((c) => JSON.stringify(c));
      try {
        nCard.effect = JSON.parse(effectJson.value);
      } catch (e) {
        console.error("Invalid JSON for Effect:", e);
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
        await patch(`/admin/naruto/card/${id}`, body);
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
        await del(`/admin/naruto/card/${id}`);
        naruto.allCards.value = naruto.allCards.value.filter(
          (c) => c.ID !== id,
        );
      }
      dialogOpen.value = false;
    } catch (e) {
      console.error("Failed to delete card:", e);
    } finally {
      deleting.value = false;
    }
  }

  return {
    selectedTcg,
    pokemon,
    naruto,
    scalarFields,
    dialogOpen,
    selectedCard,
    editForm,
    attacksJson,
    chips,
    effectJson,
    imageFile,
    imagePreview,
    saving,
    deleting,
    getCardImage,
    openCard,
    onImageChange,
    saveCard,
    deleteCard,
  };
}
