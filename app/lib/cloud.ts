import type { AdminBadgeProfile, CollectionDefinition, Collections, PokemonCard } from "./types";
import { trainers } from "./trainers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const knownAdminEmails = ["rahilramchandani@gmail.com", "leoramchandani@gmail.com", "its.sidd@gmail.com", "miransh16@gmail.com"];

export const cloudConfigured = Boolean(url && publicKey && serviceKey);

function headers(key = serviceKey!) { return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }; }
function empty(definitions: CollectionDefinition[]): Collections { return Object.fromEntries(definitions.map((item) => [item.id, []])); }
async function rest(path: string, init?: RequestInit) {
  const response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers(), ...(init?.headers ?? {}) }, cache: "no-store" });
  if (!response.ok) throw new Error(`Cloud request failed: ${response.status} ${await response.text()}`);
  return response;
}

export async function getCollectionDefinitions(): Promise<CollectionDefinition[]> {
  if (!cloudConfigured) return trainers;
  const response = await rest("collection_definitions?select=*&order=created_at.asc");
  const rows = await response.json() as Array<{ id: string; name: string; title: string; badge: string; photo?: string; theme?: string; button?: string; accent?: string; partner_pokemon?: string; ability?: string }>;
  return rows.map((row) => ({ ...row, partnerPokemon: row.partner_pokemon, ability: row.ability }));
}

export async function getCloudCollections(definitions?: CollectionDefinition[]): Promise<Collections> {
  definitions ??= await getCollectionDefinitions();
  const response = await rest("card_collections?select=trainer_id,card,quantity,added_at&order=added_at.asc");
  const collections = empty(definitions);
  for (const row of await response.json() as Array<{ trainer_id: string; card: PokemonCard; quantity: number; added_at: string }>) {
    (collections[row.trainer_id] ??= []).push({ card: row.card, quantity: row.quantity, addedAt: row.added_at });
  }
  return collections;
}

export async function getEditorEmail(request: Request) {
  if (!cloudConfigured) return "local-admin";
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: publicKey!, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) return null;
  const user = await response.json() as { email?: string };
  const email = user.email?.toLowerCase();
  return email ?? null;
}

export async function getEditableCollectionIds(email: string | null) {
  if (!email) return [];
  if (!cloudConfigured) return trainers.map((item) => item.id);
  const response = await rest(`admin_collections?admin_email=eq.${encodeURIComponent(email)}&select=collection_id`);
  return (await response.json() as Array<{ collection_id: string }>).map((row) => row.collection_id);
}

export async function getPublicBadgeAdmins(): Promise<AdminBadgeProfile[]> {
  if (!cloudConfigured) return [{ email: "Family Admin", collectionIds: trainers.map((item) => item.id), wishlistCount: 0 }];
  const [mappingsResponse, wishlistResponse] = await Promise.all([
    rest("admin_collections?select=admin_email,collection_id"),
    rest("admin_wishlist?select=admin_email"),
  ]);
  const mappings = await mappingsResponse.json() as Array<{ admin_email: string; collection_id: string }>;
  const wishes = await wishlistResponse.json() as Array<{ admin_email: string }>;
  const emails = Array.from(new Set([...knownAdminEmails, ...mappings.map((item) => item.admin_email)]));
  return emails.map((email) => ({
    email,
    collectionIds: mappings.filter((item) => item.admin_email === email).map((item) => item.collection_id),
    wishlistCount: wishes.filter((item) => item.admin_email === email).length,
  }));
}

export async function canEditCollection(request: Request, collectionId: string) {
  const email = await getEditorEmail(request);
  if (!email) return false;
  return (await getEditableCollectionIds(email)).includes(collectionId);
}

export async function isEditor(request: Request) { return Boolean(await getEditorEmail(request)); }

export async function addCloudCard(collectionId: string, card: PokemonCard) {
  await rest("rpc/add_collection_card", { method: "POST", body: JSON.stringify({ p_trainer_id: collectionId, p_card_id: card.id, p_card: card }) });
}
export async function removeCloudCard(collectionId: string, cardId: string) {
  await rest("rpc/remove_collection_card", { method: "POST", body: JSON.stringify({ p_trainer_id: collectionId, p_card_id: cardId }) });
}

async function uploadTrainerPhoto(collectionId: string, photo?: File) {
  if (!photo?.size) return undefined;
  const extension = photo.type === "image/png" ? "png" : "jpg";
  const objectName = `${collectionId}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
  const upload = await fetch(`${url}/storage/v1/object/trainer-photos/${objectName}`, { method: "POST", headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}`, "Content-Type": photo.type || "image/jpeg", "x-upsert": "false" }, body: Buffer.from(await photo.arrayBuffer()) });
  if (!upload.ok) throw new Error(`Photo upload failed: ${upload.status}`);
  return `${url}/storage/v1/object/public/trainer-photos/${objectName}`;
}

export async function createCloudCollection({ name, email, partnerPokemon, ability, photo }: { name: string; email: string; partnerPokemon: string; ability: string; photo?: File }) {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "binder";
  const id = `${base}-${crypto.randomUUID().slice(0, 6)}`;
  const photoUrl = await uploadTrainerPhoto(id, photo);
  const definition = { id, name: name.trim(), title: "Pokémon Collector", badge: "📘", photo: photoUrl, theme: "from-blue-950 via-indigo-800 to-blue-700 border-sky-300 text-white", button: "bg-sky-300 text-slate-950", accent: "text-sky-200", partner_pokemon: partnerPokemon, ability };
  await rest("collection_definitions", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(definition) });
  await rest("admin_collections", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ admin_email: email, collection_id: id }) });
  return definition;
}

export async function updateCloudCollection(collectionId: string, partnerPokemon: string, ability: string, photo?: File) {
  const photoUrl = await uploadTrainerPhoto(collectionId, photo);
  const changes: Record<string, string> = { partner_pokemon: partnerPokemon, ability };
  if (photoUrl) changes.photo = photoUrl;
  await rest(`collection_definitions?id=eq.${encodeURIComponent(collectionId)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(changes) });
}

export async function getWishlist(email: string) {
  if (!cloudConfigured) return [] as PokemonCard[];
  const response = await rest(`admin_wishlist?admin_email=eq.${encodeURIComponent(email)}&select=card&order=added_at.desc`);
  return (await response.json() as Array<{ card: PokemonCard }>).map((row) => row.card);
}
export async function addWishlistCard(email: string, card: PokemonCard) {
  await rest("admin_wishlist?on_conflict=admin_email,card_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ admin_email: email, card_id: card.id, card }) });
}
export async function removeWishlistCard(email: string, cardId: string) {
  await rest(`admin_wishlist?admin_email=eq.${encodeURIComponent(email)}&card_id=eq.${encodeURIComponent(cardId)}`, { method: "DELETE" });
}

export async function signIn(email: string, password: string) {
  if (!cloudConfigured) return null;
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: publicKey!, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }), cache: "no-store" });
  if (!response.ok) return null;
  return response.json() as Promise<{ access_token: string; refresh_token: string; user: { email?: string } }>;
}
