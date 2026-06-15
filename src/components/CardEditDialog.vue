<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  modelValue: boolean;
  imagePreview: string;
  scalarFields: { key: string; label: string; type: string }[];
  editForm: Record<string, unknown>;
  attacksJson: string;
  chips: string[];
  effectJson: string;
  saving: boolean;
  deleting: boolean;
  tagItems: string[];
  tcg: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "update:attacksJson": [value: string];
  "update:chips": [value: string[]];
  "update:effectJson": [value: string];
  save: [];
  delete: [];
  "image-change": [event: Event];
}>();

const imageInputRef = ref<HTMLInputElement | null>(null);
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="680"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card rounded="xl">
      <v-card-title class="dialog-title">Edit Card</v-card-title>
      <v-divider />
      <v-card-text class="dialog-body">
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
            @change="emit('image-change', $event)"
          />
        </div>

        <div class="fields-grid">
          <v-text-field
            v-for="field in scalarFields"
            :key="field.key"
            :model-value="(editForm as any)[field.key]"
            :label="field.label"
            :type="field.type"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="(editForm as any)[field.key] = $event"
          />
        </div>

        <template v-if="tcg === 'pokemon'">
          <v-textarea
            :model-value="attacksJson"
            label="Attacks (JSON)"
            variant="outlined"
            density="compact"
            rows="4"
            hide-details
            class="json-field"
            @update:model-value="emit('update:attacksJson', $event as string)"
          />
          <v-combobox
            :model-value="chips"
            :items="tagItems"
            label="Tags"
            variant="outlined"
            chips
            clearable
            closable-chips
            multiple
            @update:model-value="emit('update:chips', $event as string[])"
          >
            <template v-slot:chip="{ props, item }">
              <v-chip v-bind="props">{{ item }}</v-chip>
            </template>
          </v-combobox>
        </template>
        <template v-else-if="tcg === 'naruto'">
          <v-textarea
            :model-value="effectJson"
            label="Effect (JSON)"
            variant="outlined"
            density="compact"
            rows="3"
            hide-details
            class="json-field"
            @update:model-value="emit('update:effectJson', $event as string)"
          />
          <v-combobox
            :model-value="chips"
            :items="tagItems"
            label="Tags"
            variant="outlined"
            chips
            clearable
            closable-chips
            multiple
            @update:model-value="emit('update:chips', $event as string[])"
          >
            <template v-slot:chip="{ props, item }">
              <v-chip v-bind="props">{{ item }}</v-chip>
            </template>
          </v-combobox>
        </template>
      </v-card-text>

      <v-divider />
      <v-card-actions class="dialog-actions">
        <v-btn
          icon
          variant="tonal"
          color="red"
          :loading="deleting"
          @click="emit('delete')"
        >
          <v-icon icon="mdi-delete-outline" />
          <v-tooltip activator="parent" location="bottom">
            Delete Card
          </v-tooltip>
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">
          Cancel
        </v-btn>
        <v-btn
          color="deep-purple-accent-2"
          :loading="saving"
          @click="emit('save')"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
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
  .fields-grid {
    grid-template-columns: 1fr;
  }
}
</style>
