# Deckmaster Frontend

A TCG deck-builder SPA supporting **Pokémon** and **Naruto Mythos** (Digimon implemented, not yet exposed). Built with Vue 3, TypeScript, Vuetify 4, and Clerk for authentication.

## Tech stack

| Layer | Library |
|---|---|
| Framework | Vue 3 (`<script setup>`) |
| UI | Vuetify 4 + Material Design Icons |
| Auth | Clerk (`@clerk/vue`) |
| Routing | Vue Router 4 |
| Virtualisation | TanStack Virtual |
| Build | Vite 8, `vue-tsc` |

## Prerequisites

- Node 20+ (`.nvmrc` pins the exact version — run `nvm use`)
- A running backend (see `VITE_API_BASE_URL` below)

## Setup

```bash
npm install
```

Copy `.env` and fill in your values (the file is gitignored):

```bash
cp .env.example .env   # or create manually — see Environment below
```

## Environment variables

| Variable | Description |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (from the Clerk dashboard) |
| `VITE_API_BASE_URL` | Backend base URL, e.g. `http://localhost:8080/api` |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server at `http://127.0.0.1:5173` |
| `npm run stage` | Dev server in staging mode |
| `npm run build` | Type-check (`vue-tsc`) then production build → `dist/` |
| `npm run build:dev` | Type-check then development build |
| `npm run preview` | Preview the production build locally |

## Project structure

```
src/
├── components/          # Presentational components (NavBar, DeckPanel, …)
├── composables/
│   ├── tcg/             # Shared TCG layer
│   │   ├── adapters.ts          # BuilderAdapter/DecksAdapter interfaces + registries
│   │   ├── builderHandoff.ts    # Typed sessionStorage helpers (DecksView → BuilderView)
│   │   ├── createBuilderComposable.ts   # Generic builder factory
│   │   └── createDecksComposable.ts     # Generic decks factory
│   ├── pokemon/         # Pokémon-specific builder + decks composables
│   ├── naruto/          # Naruto-specific builder + decks composables
│   ├── digimon/         # Digimon-specific builder + decks composables (hidden in UI)
│   ├── useApi.ts        # Authenticated API wrapper (Clerk token injection)
│   ├── useCardEditor.ts # Admin card-editing composable
│   ├── useSnackbar.ts   # Global snackbar singleton
│   └── useTcgState.ts   # Active TCG selection (persisted to sessionStorage)
├── interfaces/
│   └── interfaces.ts    # Backend DTO types
├── router/              # Vue Router config + auth/admin guards
├── services/
│   └── api.ts           # Raw fetch wrapper with ApiError
└── views/               # Route-level page components
```

## Architecture notes

- All per-TCG `if/else` dispatch is centralised in `src/composables/tcg/adapters.ts` — views call `useTcgBuilder()` / `useTcgDecks()` and get a normalised adapter for whichever game is selected.
- Only the **active** game's decks are fetched on `DecksView` mount (not all three).
- Builder intermediate state (chosen cards, name, id, cover) is persisted to `sessionStorage` via the typed helpers in `builderHandoff.ts`.
- The global `<v-snackbar>` in `App.vue` is driven by the module-level singleton in `useSnackbar.ts`.

## Authentication & roles

Routes `/decks` and `/profile` require a signed-in user. `/upload` and `/cardeditor` additionally require `publicMetadata.role === "admin"` (enforced in the router guard and hidden in `NavBar`).
