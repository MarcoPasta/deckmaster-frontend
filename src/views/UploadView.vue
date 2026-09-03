<script setup lang="ts">
import { ref } from "vue";
import { useApi } from "@/composables/useApi";

const { postForm, loading } = useApi();

interface UploadBox {
  label: string;
  route: string;
  files: File[];
  isDragging: boolean;
  result: { success: boolean; message: string } | null;
  fileInput: HTMLInputElement | null;
}

const boxes = ref<UploadBox[]>([
  {
    label: "Pokémon",
    route: "/admin/pokemon/sets",
    files: [],
    isDragging: false,
    result: null,
    fileInput: null,
  },
  {
    label: "Naruto",
    route: "/admin/naruto/sets",
    files: [],
    isDragging: false,
    result: null,
    fileInput: null,
  },
  {
    label: "Digimon",
    route: "/admin/digimon/sets",
    files: [],
    isDragging: false,
    result: null,
    fileInput: null,
  },
]);

function onDrop(box: UploadBox, e: DragEvent) {
  box.isDragging = false;
  const dropped = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
    f.name.endsWith(".json"),
  );
  addFiles(box, dropped);
}

function onFileChange(box: UploadBox, e: Event) {
  const input = e.target as HTMLInputElement;
  addFiles(box, Array.from(input.files ?? []));
  input.value = "";
}

function addFiles(box: UploadBox, incoming: File[]) {
  const existing = new Set(box.files.map((f) => f.name));
  box.files.push(...incoming.filter((f) => !existing.has(f.name)));
}

function removeFile(box: UploadBox, index: number) {
  box.files.splice(index, 1);
}

async function upload(box: UploadBox) {
  if (!box.files.length) return;
  box.result = null;
  const form = new FormData();
  for (const file of box.files) {
    form.append("files", file);
  }
  try {
    await postForm(box.route, form);
    box.result = {
      success: true,
      message: `Uploaded ${box.files.length} file(s) successfully.`,
    };
    box.files = [];
  } catch {
    box.result = {
      success: false,
      message: "Upload failed. Please try again.",
    };
  }
}
</script>

<template>
  <div class="upload-page">
    <div v-for="(box, idx) in boxes" :key="idx" class="upload-card">
      <h2 class="upload-title">{{ box.label }}</h2>

      <div
        class="drop-zone"
        :class="{ 'drop-zone--active': box.isDragging }"
        @dragover.prevent="box.isDragging = true"
        @dragleave.prevent="box.isDragging = false"
        @drop.prevent="onDrop(box, $event)"
        @click="box.fileInput?.click()"
      >
        <v-icon icon="mdi-file-upload-outline" class="drop-icon" />
        <p class="drop-label">Drop JSON files here or click to browse</p>
        <p class="drop-sub">Only <code>.json</code> files are accepted</p>
        <input
          :ref="
            (el) => {
              box.fileInput = el as HTMLInputElement;
            }
          "
          type="file"
          accept=".json"
          multiple
          class="hidden-input"
          @change="onFileChange(box, $event)"
        />
      </div>

      <ul v-if="box.files.length" class="file-list">
        <li v-for="(file, i) in box.files" :key="file.name" class="file-item">
          <v-icon icon="mdi-file-code-outline" class="file-icon" />
          <span class="file-name">{{ file.name }}</span>
          <button class="file-remove" @click="removeFile(box, i)">
            <v-icon icon="mdi-close" />
          </button>
        </li>
      </ul>

      <div
        v-if="box.result"
        class="result-banner"
        :class="box.result.success ? 'result-banner--ok' : 'result-banner--err'"
      >
        {{ box.result.message }}
      </div>

      <button
        class="upload-btn"
        :disabled="!box.files.length || loading"
        @click="upload(box)"
      >
        <v-icon v-if="loading" icon="mdi-loading" class="spin" />
        <v-icon v-else icon="mdi-upload" />
        {{ loading ? "Uploading…" : "Upload" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.upload-page {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  padding: 48px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 1024px) {
  .upload-page {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 600px) {
  .upload-page {
    grid-template-columns: 1fr;
    padding: 24px 12px;
  }
}

.upload-card {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow);
  padding: 24px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-title {
  font-family: var(--sans);
  font-size: 20px;
  font-weight: 600;
  color: var(--text-h);
  margin: 0;
}

.drop-zone {
  border: 2px dashed var(--border);
  border-radius: 10px;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
  position: relative;
}

.drop-zone:hover,
.drop-zone--active {
  border-color: var(--accent);
  background: var(--accent-bg);
}

.drop-icon {
  font-size: 40px;
  color: var(--accent);
  opacity: 0.8;
}

.drop-label {
  font-family: var(--sans);
  font-size: 15px;
  font-weight: 500;
  color: var(--text-h);
  margin: 0;
}

.drop-sub {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text);
  margin: 0;
  opacity: 0.7;
}

.drop-sub code {
  font-family: var(--mono, monospace);
}

.hidden-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}

.file-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
}

.file-icon {
  color: var(--accent);
  font-size: 18px;
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  font-family: var(--mono, monospace);
  font-size: 13px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text);
  opacity: 0.5;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.file-remove:hover {
  opacity: 1;
}

.result-banner {
  border-radius: 8px;
  padding: 10px 14px;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 500;
}

.result-banner--ok {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: #22c55e;
}

.result-banner--err {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #ef4444;
}

.upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 24px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-family: var(--sans);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  align-self: flex-end;
}

.upload-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.upload-btn:not(:disabled):hover {
  opacity: 0.85;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spin {
  animation: spin 0.8s linear infinite;
}
</style>
