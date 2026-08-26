export interface DigimonCard {
  ID: number;
  CreatedAt: Date;
  UpdatedAt: Date;
  DeletedAt: Date | null;
  CardNumber: string;
  name: string;
  cardType: string;
  color: string[];
  cost: number;
  dp: number;
  dvCost: string;
  form: string;
  attribute: string;
  species: string[];
  text: string[];
  set: string;
}

export interface DigimonDeckEntry {
  ID: number;
  CreatedAt: Date;
  UpdatedAt: Date;
  DeletedAt: Date | null;
  deckId: number;
  cardId: number;
  card: DigimonCard;
}

export interface DigimonDecks {
  ID: number;
  CreatedAt: Date;
  UpdatedAt: Date;
  DeletedAt: Date | null;
  userId: string;
  name: string;
  cover?: string | null;
  entries: DigimonDeckEntry[];
}

export interface PokemonCard {
  ID: number;
  CreatedAt: Date;
  UpdatedAt: Date;
  DeletedAt: Date | null;
  CardType: string;
  Phase: string;
  Name: string;
  Kp: number;
  EnergyType: string;
  Ability: string;
  Attacks: Attack[];
  AttacksEN: Attack[] | null;
  Weakness: string;
  Resistance: string;
  RetreatCost: number;
  CardNumber: string;
  Code: string;
  Set: string;
  Tags: string[];
}

export interface Attack {
  cost: string[];
  name: string;
  effect: string;
  damage: string;
}

export interface PokemonDeckEntry {
  ID: number;
  CreatedAt: Date;
  UpdatedAt: Date;
  DeletedAt: Date | null;
  deckId: number;
  cardId: number;
  card: PokemonCard;
}

export interface PokemonDecks {
  ID: number;
  CreatedAt: Date;
  UpdatedAt: Date;
  DeletedAt: Date | null;
  userId: string;
  name: string;
  cover?: string | null;
  entries: PokemonDeckEntry[];
}

export interface NarutoCard {
  ID: number;
  CreatedAt: Date;
  UpdatedAt: Date;
  DeletedAt: Date | null;
  name: string;
  description: string;
  cost: number;
  power: number;
  keyword: string;
  group: string;
  effect: string;
  effect_types: string[];
  rarity: string;
  card_number: string;
  set: string;
  tags: string[];
}

export interface NarutoDeckEntry {
  ID: number;
  CreatedAt: Date;
  UpdatedAt: Date;
  DeletedAt: Date | null;
  deckId: number;
  cardId: number;
  card: NarutoCard;
}

export interface NarutoDecks {
  ID: number;
  CreatedAt: Date;
  UpdatedAt: Date;
  DeletedAt: Date | null;
  userId: string;
  name: string;
  cover?: string | null;
  entries: NarutoDeckEntry[];
}

export interface SocialLink {
  platform: "twitter" | "discord" | "youtube" | "custom";
  url: string;
  label?: string; // only for "custom"
}

export interface UserProfile {
  clerk_id: string;
  social_links: SocialLink[];
  created_at: string;
  updated_at: string;
}
