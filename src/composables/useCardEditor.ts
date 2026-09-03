import { computed, ref } from "vue";
import type { NarutoCard, PokemonCard } from "@/interfaces/interfaces";
import { useNarutoBuilder } from "@/composables/naruto/useNarutoBuilder";
import { usePokemonBuilder } from "@/composables/pokemon/usePokemonBuilder";
import { useApi } from "@/composables/useApi";
import { useTcgState } from "@/composables/useTcgState";

/**
 * Admin card editor supports only Pokémon and Naruto — not Digimon.
 * CardEditorView is gated behind `role === "admin"`.
 */
type AnyCard = PokemonCard | NarutoCard;

/**
 * Editable scalar fields for Pokémon cards, rendered as individual text/number
 * inputs in the `CardEditDialog`.  Each entry maps a JSON key on `PokemonCard`
 * to a human-readable label and the HTML input type.
 */
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

/**
 * Editable scalar fields for Naruto cards.
 * Naruto uses camelCase field names unlike Pokémon's PascalCase.
 */
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

/**
 * Preset tag labels for the Pokémon card tag combobox.
 * Tags are community-curated strategy classifications (e.g. "draw", "search").
 */
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

/**
 * Preset tag labels for the Naruto card tag combobox.
 */
export const narutoTagItems = ["scouter"];

/**
 * Admin composable that drives the card editing dialog in `CardEditorView`.
 *
 * Responsibilities:
 * - Loading the card grid (delegates to the active game's builder composable).
 * - Opening a card in the edit dialog and populating all form fields.
 * - Saving card changes via `PATCH /admin/{tcg}/card/{id}`.
 * - Uploading a replacement card image via a presigned S3 PUT URL.
 * - Deleting a card via `DELETE /admin/{tcg}/card/{id}`.
 * - Keeping the in-memory card list (`allCards`) in sync after save/delete
 *   so the grid updates without a full refetch.
 */
export function useCardEditor() {
  const { selectedTcg } = useTcgState();
  const { get, patch, del } = useApi();

  // Both builder composables are instantiated regardless of the active TCG
  // so their `allCards` refs are already populated when the user switches game.
  const pokemon = usePokemonBuilder();
  const naruto = useNarutoBuilder();

  /**
   * The list of form field descriptors shown in the edit dialog.
   * Switches between the Pokémon and Naruto field sets based on `selectedTcg`.
   */
  const scalarFields = computed(() =>
    selectedTcg.value === "naruto" ? narutoScalarFields : pokemonScalarFields,
  );

  // ── Dialog state ──────────────────────────────────────────────────────────

  /** Controls visibility of the `CardEditDialog`. */
  const dialogOpen = ref(false);

  /** The card currently open for editing, or `null` when the dialog is closed. */
  const selectedCard = ref<AnyCard | null>(null);

  /**
   * Flat key→value map of the editable scalar fields for the open card.
   * Bound bidirectionally to the form inputs inside `CardEditDialog`.
   */
  const editForm = ref<Record<string, unknown>>({});

  /**
   * JSON string representation of the Pokémon `Attacks` array.
   * Edited in a raw textarea so admins can modify attack data directly.
   */
  const attacksJson = ref("[]");

  /**
   * Selected tag chips for the currently open card.
   * Each item is a JSON-stringified tag value (matching the backend storage
   * format) so that `JSON.parse(chip)` returns the original value.
   */
  const chips = ref<string[]>([]);

  /**
   * JSON string representation of the Naruto `effect` array.
   * Edited in a raw textarea.
   */
  const effectJson = ref("[]");

  /** The new image `File` selected by the admin, or `null` if unchanged. */
  const imageFile = ref<File | null>(null);

  /**
   * URL displayed in the image preview inside the dialog.
   * Starts as the existing card image URL; replaced with an object URL when
   * the admin selects a new file.
   */
  const imagePreview = ref("");

  /** True while the PATCH + optional image upload request is in flight. */
  const saving = ref(false);

  /** True while the DELETE request is in flight. */
  const deleting = ref(false);

  // ── Helper functions ──────────────────────────────────────────────────────

  /**
   * Returns the presigned display URL for a card's current image.
   * Delegates to the active game's builder composable.
   */
  function getCardImage(card: AnyCard): string {
    if (selectedTcg.value === "naruto")
      return naruto.getCardImage(card as NarutoCard);
    return pokemon.getCardImage(card as PokemonCard);
  }

  /**
   * Open a card in the edit dialog.
   *
   * - Copies the card's current field values into `editForm` (keyed by the
   *   scalar field definitions so only editable fields are included).
   * - Populates `attacksJson` / `effectJson` and `chips` from the card's
   *   complex fields.
   * - Sets `imagePreview` to the card's current image.
   */
  function openCard(card: AnyCard) {
    selectedCard.value = card;
    const fields =
      selectedTcg.value === "naruto" ? narutoScalarFields : pokemonScalarFields;

    // Build a shallow copy of just the editable scalar fields.
    const copy: Record<string, unknown> = {};
    for (const field of fields) {
      copy[field.key] = (card as unknown as Record<string, unknown>)[field.key];
    }

    if (selectedTcg.value === "pokemon") {
      const c = card as PokemonCard;
      attacksJson.value = JSON.stringify(c.Attacks ?? [], null, 2);
      // Tags are stored as JSON strings; parse them back for display as chips.
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

  /**
   * Handle a file selection from the hidden `<input type="file">`.
   * Updates `imageFile` and shows a local object URL preview immediately.
   */
  function onImageChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    imageFile.value = file;
    imagePreview.value = URL.createObjectURL(file);
  }

  /**
   * Builds the strongly-typed PATCH request body from the current `editForm`
   * state, re-applying correct types (strings coerced to numbers where needed)
   * and serialising `chips` / `attacksJson` / `effectJson`.
   *
   * Returns `undefined` if the active TCG is not supported by the editor.
   */
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
      // Re-stringify tags so the backend receives `string[]` of JSON values.
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

  /**
   * Save the edited card.
   *
   * Steps:
   * 1. Build the typed PATCH body from `editForm` + chips + JSON fields.
   * 2. PATCH the card via the admin endpoint.
   * 3. If a new image was selected:
   *    a. Obtain a presigned S3 PUT URL from the backend.
   *    b. Upload the image file directly to S3 via the presigned URL.
   * 4. Apply the changes in-memory to `allCards` so the grid is updated
   *    immediately without a full refetch.
   */
  async function saveCard() {
    if (!selectedCard.value) return;
    saving.value = true;
    try {
      const body = formatRequestBody(editForm.value);
      if (selectedTcg.value === "pokemon") {
        const id = (selectedCard.value as PokemonCard).ID;
        await patch(`/admin/pokemon/card/${id}`, body);

        if (imageFile.value) {
          // Use the canonical image key so uploads always land at the same
          // path that getCardImage reads from.
          const card = selectedCard.value as PokemonCard;
          const objectKey = pokemon.imageKey(card);
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

        // Reflect the update in the builder's allCards without a refetch.
        const idx = pokemon.allCards.value.findIndex((c) => c.ID === id);
        if (idx !== -1) Object.assign(pokemon.allCards.value[idx], body);
      } else {
        const id = (selectedCard.value as NarutoCard).ID;
        await patch(`/admin/naruto/card/${id}`, body);

        if (imageFile.value) {
          const card = selectedCard.value as NarutoCard;
          const objectKey = naruto.imageKey(card);
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

  /**
   * Delete the currently open card.
   *
   * 1. Calls the admin DELETE endpoint.
   * 2. Removes the card from the builder's in-memory `allCards` list so the
   *    grid updates immediately.
   */
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
    /** Raw Pokémon builder composable; exposed so CardEditorView can access `allCards`. */
    pokemon,
    /** Raw Naruto builder composable; exposed so CardEditorView can access `allCards`. */
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
