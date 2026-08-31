import { createRouter, createWebHistory } from "vue-router";
import { useClerk } from "@clerk/vue";
import BuilderView from "@/views/BuilderView.vue";
import CardEditorView from "@/views/CardEditorView.vue";
import DecksView from "@/views/DecksView.vue";
import HomeView from "@/views/HomeView.vue";
import ProfileView from "@/views/ProfileView.vue";
import UploadView from "@/views/UploadView.vue";

const routes = [
  { path: "/", name: "Home", component: HomeView },
  { path: "/builder/:deckId?", name: "Builder", component: BuilderView },
  {
    path: "/decks",
    name: "Decks",
    component: DecksView,
    meta: { requiresAuth: true },
  },
  {
    path: "/profile",
    name: "Profile",
    component: ProfileView,
    meta: { requiresAuth: true },
  },
  {
    path: "/upload",
    name: "Upload",
    component: UploadView,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: "/cardeditor",
    name: "Cardeditor",
    component: CardEditorView,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth || to.meta.requiresAdmin) {
    const clerk = useClerk();
    const user = clerk.value?.user;
    if (!user) {
      clerk.value?.openSignIn();
      return false;
    }
    if (to.meta.requiresAdmin) {
      const role = (user.publicMetadata as { role?: string })?.role;
      if (role !== "admin") {
        return { name: "Home" };
      }
    }
  }
});

export default router;
