<script setup lang="ts">
import { useUser } from "@clerk/vue";

const { user } = useUser();

const features = [
  {
    img: "/home-images/1.png",
    title: "Deck Builder",
    description: "Browse all cards and click to add them to your deck. Filter and search to find exactly what you need.",
  },
  {
    img: "/home-images/2.png",
    title: "Your Decks",
    description: "All your saved decks in one place, with cover card previews and creation dates.",
  },
  {
    img: "/home-images/3.png",
    title: "Deck Overview",
    description: "Click any deck to see a full card-by-card breakdown with all details.",
  },
  {
    img: "/home-images/4.png",
    title: "Testhand",
    description: "Draw a random starting hand using the Fisher-Yates shuffle to test your deck's consistency.",
  },
  {
    img: "/home-images/5.png",
    title: "Share Options",
    description: "Share your deck as plain text, a visual image, or a Cardmarket wants list — all from one menu.",
  },
  {
    img: "/home-images/6.png",
    title: "Deck Image",
    description: "Generate a visual overview of your full deck, ready to share anywhere.",
  },
  {
    img: "/home-images/7.png",
    title: "Cardmarket List",
    description: "Export your deck as a formatted list ready to paste into Cardmarket. Basic energy cards are excluded — it's assumed you already own those.",
  },
  {
    img: "/home-images/8.png",
    title: "Paste into Cardmarket",
    description: "Copy the list and paste it directly into Cardmarket's wants list field.",
  },
  {
    img: "/home-images/9.png",
    title: "Wants List Ready",
    description: "Your wants list is populated instantly — ready to find and order every card you need.",
  },
];
</script>

<template>
  <div class="home">
    <div class="hero">
      <h1 class="hero-title">
        Welcome to Deckmaster Open Beta<template v-if="user?.username">, {{ user.username }}</template>!
      </h1>
      <p class="hero-sub">
        Build, manage and share your TCG decks — all in one place.
      </p>
    </div>

    <div class="features-header">
      <h2 class="features-title">What can you do?</h2>
    </div>

    <div class="features">
      <div
        v-for="(feature, i) in features"
        :key="i"
        class="feature-card"
      >
        <div class="feature-img-wrap">
          <img :src="feature.img" :alt="feature.title" class="feature-img" />
        </div>
        <div class="feature-body">
          <span class="feature-number">{{ String(i + 1).padStart(2, '0') }}</span>
          <h3 class="feature-name">{{ feature.title }}</h3>
          <p class="feature-desc">{{ feature.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  padding: 40px 32px 64px;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.hero {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 36px 40px;
  box-shadow: var(--shadow);
}

.hero-title {
  font-family: var(--heading);
  font-size: 28px;
  font-weight: 700;
  color: var(--text-h);
  margin: 0 0 10px;
}

.hero-sub {
  font-size: 15px;
  color: var(--text);
  margin: 0;
  line-height: 1.6;
}

.features-header {
  border-bottom: 1px solid var(--border);
  padding-bottom: 12px;
}

.features-title {
  font-family: var(--heading);
  font-size: 18px;
  font-weight: 600;
  color: var(--text-h);
  margin: 0;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.feature-card {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s, transform 0.15s;
}

.feature-card:hover {
  border-color: var(--accent-border);
  transform: translateY(-2px);
}

.feature-img-wrap {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--accent-bg);
  border-bottom: 1px solid var(--border);
}

.feature-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top left;
}

.feature-body {
  padding: 16px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.feature-number {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--accent, #7c4dff);
  opacity: 0.8;
}

.feature-name {
  font-family: var(--heading);
  font-size: 15px;
  font-weight: 600;
  color: var(--text-h);
  margin: 0;
}

.feature-desc {
  font-size: 13px;
  color: var(--text);
  margin: 0;
  line-height: 1.6;
  opacity: 0.85;
}

@media (max-width: 600px) {
  .home {
    padding: 20px 12px 48px;
  }

  .hero {
    padding: 24px 20px;
  }

  .hero-title {
    font-size: 22px;
  }
}
</style>
