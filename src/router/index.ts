import { createRouter, createWebHistory } from "vue-router";
import { useClerk } from "@clerk/vue";
import BuilderView from "@/views/BuilderView.vue";
import CardEditorView from "@/views/CardEditorView.vue";
import DecksView from "@/views/DecksView.vue";
import HomeView from "@/views/HomeView.vue";
import ProfileView from "@/views/ProfileView.vue";
import UploadView from "@/views/UploadView.vue";

/**
 * Route definitions.
 *
 * `meta.requiresAuth`  — redirect unauthenticated users to the Clerk sign-in modal.
 * `meta.requiresAdmin` — additionally check `user.publicMetadata.role === "admin"`;
 *                        non-admins are sent back to Home.  Always paired with
 *                        `requiresAuth` so the auth check always runs first.
 */
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

/**
 * Global navigation guard.
 *
 * Runs before every route transition and enforces the two levels of access
 * control defined in route `meta`:
 *
 * 1. **requiresAuth** — If there is no active Clerk user, open the Clerk
 *    sign-in modal and cancel the navigation (`return false`).
 * 2. **requiresAdmin** — If the user's `publicMetadata.role` is not `"admin"`,
 *    redirect to Home instead of the requested route.
 *
 * Note: `useClerk()` is called inside the guard (not at module level) so it
 * always reads the current reactive Clerk instance at navigation time.
 */
router.beforeEach(async (to) => {
  if (to.meta.requiresAuth || to.meta.requiresAdmin) {
    const clerk = useClerk();
    const user = clerk.value?.user;

    // Not signed in — open the Clerk modal and abort navigation.
    if (!user) {
      clerk.value?.openSignIn();
      return false;
    }

    // Signed in but not an admin — send them back to Home.
    if (to.meta.requiresAdmin) {
      const role = (user.publicMetadata as { role?: string })?.role;
      if (role !== "admin") {
        return { name: "Home" };
      }
    }
  }
});

export default router;
