export type TrainerId = string;

export type CollectionDefinition = {
  id: string;
  name: string;
  title: string;
  badge: string;
  photo?: string;
  theme?: string;
  button?: string;
  accent?: string;
  partnerPokemon?: string;
  ability?: string;
};

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

export type CollectionState = {
  collections: Collections;
  definitions: CollectionDefinition[];
  editableIds: string[];
  adminEmail?: string;
  badgeAdmins?: AdminBadgeProfile[];
};

export type AdminBadgeProfile = {
  email: string;
  collectionIds: string[];
  wishlistCount: number;
};
