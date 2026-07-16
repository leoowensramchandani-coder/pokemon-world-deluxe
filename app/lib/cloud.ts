import type { Collections, PokemonCard, TrainerId } from "./types";

const empty = (): Collections => ({ papa: [], leo: [], remy: [] });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const cloudConfigured = Boolean(url && publicKey && serviceKey);

function headers(key = serviceKey!) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export async function getCloudCollections(): Promise<Collections> {
  const response = await fetch(`${url}/rest/v1/card_collections?select=trainer_id,card,quantity,added_at&order=added_at.asc`, { headers: headers(), cache: "no-store" });
  if (!response.ok) throw new Error(`Cloud collection read failed: ${response.status}`);
  const collections = empty();
  for (const row of await response.json() as Array<{ trainer_id: TrainerId; card: PokemonCard; quantity: number; added_at: string }>) {
    collections[row.trainer_id].push({ card: row.card, quantity: row.quantity, addedAt: row.added_at });
  }
  return collections;
}

export async function addCloudCard(trainer: TrainerId, card: PokemonCard) {
  const response = await fetch(`${url}/rest/v1/rpc/add_collection_card`, { method: "POST", headers: headers(), body: JSON.stringify({ p_trainer_id: trainer, p_card_id: card.id, p_card: card }) });
  if (!response.ok) throw new Error(`Cloud collection write failed: ${response.status}`);
}

export async function removeCloudCard(trainer: TrainerId, cardId: string) {
  const response = await fetch(`${url}/rest/v1/rpc/remove_collection_card`, { method: "POST", headers: headers(), body: JSON.stringify({ p_trainer_id: trainer, p_card_id: cardId }) });
  if (!response.ok) throw new Error(`Cloud collection removal failed: ${response.status}`);
}

export async function isEditor(request: Request) {
  if (!cloudConfigured) return true;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: publicKey!, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) return false;
  const user = await response.json() as { email?: string };
  const allowed = (process.env.FAMILY_EDITOR_EMAILS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return Boolean(user.email && (!allowed.length || allowed.includes(user.email.toLowerCase())));
}

export async function signIn(email: string, password: string) {
  if (!cloudConfigured) return null;
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: publicKey!, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }), cache: "no-store" });
  if (!response.ok) return null;
  return response.json() as Promise<{ access_token: string; user: { email?: string } }>;
}
