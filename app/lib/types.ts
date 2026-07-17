export type TrainerId = "papa" | "leo" | "remy";

export type PokemonCard = {
  id: string;
  name: string;
  hp?: string;
  types?: string[];
  rarity?: string;
  artist?: string;
  number?: string;
  attacks?: Array<{ name?: string; damage?: string }>;
  set: { id: string; name: string };
  images: { small: string; large: string };
};

export type CollectionItem = {
  card: PokemonCard;
  quantity: number;
  addedAt: string;
};

export type Collections = Record<TrainerId, CollectionItem[]>;
