import { promises as fs } from "node:fs";
import path from "node:path";
import type { Collections, PokemonCard } from "@/lib/types";
import { trainers } from "@/lib/trainers";
import { addCloudCard, canEditCollection, cloudConfigured, createCloudCollection, getCloudCollections, getCollectionDefinitions, getEditableCollectionIds, getEditorEmail, removeCloudCard } from "@/lib/cloud";

const file = path.join(process.cwd(), "data", "collections.json");
const localEmpty = (): Collections => Object.fromEntries(trainers.map((item) => [item.id, []]));
async function readLocal(): Promise<Collections> { try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { const value = localEmpty(); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(value, null, 2)); return value; } }

export async function GET(request: Request) {
  const definitions = cloudConfigured ? await getCollectionDefinitions() : trainers;
  const collections = cloudConfigured ? await getCloudCollections(definitions) : await readLocal();
  const adminEmail = await getEditorEmail(request);
  const editableIds = adminEmail ? (cloudConfigured ? await getEditableCollectionIds(adminEmail) : definitions.map((item) => item.id)) : [];
  return Response.json({ collections, definitions, editableIds, adminEmail });
}

export async function POST(request: Request) {
  const email = await getEditorEmail(request);
  if (!email) return Response.json({ error: "Admin sign-in required." }, { status: 401 });
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData();
    const name = String(form.get("name") ?? ""); const partnerPokemon = String(form.get("partnerPokemon") ?? ""); const ability = String(form.get("ability") ?? ""); const photoValue = form.get("photo"); const photo = photoValue instanceof File && photoValue.size ? photoValue : undefined;
    if (!name.trim() || name.trim().length > 40) return Response.json({ error: "Choose a collection name." }, { status: 400 });
    if (!partnerPokemon || !ability) return Response.json({ error: "Choose a Partner and Power." }, { status: 400 });
    if (photo && (!photo.type.startsWith("image/") || photo.size > 5_000_000)) return Response.json({ error: "Choose a JPG or PNG photo smaller than 5 MB." }, { status: 400 });
    if (!cloudConfigured) return Response.json({ error: "New collections require cloud mode." }, { status: 503 });
    await createCloudCollection({ name, email, partnerPokemon, ability, photo });
    return GET(request);
  }
  const body = await request.json() as { trainer?: string; card?: PokemonCard };
  const { trainer, card } = body;
  if (!trainer || !card?.id || !card.images?.small) return Response.json({ error: "Invalid card" }, { status: 400 });
  if (!(await canEditCollection(request, trainer))) return Response.json({ error: "This admin cannot edit that collection." }, { status: 403 });
  if (cloudConfigured) await addCloudCard(trainer, card);
  else { const collections = await readLocal(); const items = (collections[trainer] ??= []); const found = items.find((item) => item.card.id === card.id); if (found) found.quantity += 1; else items.push({ card, quantity: 1, addedAt: new Date().toISOString() }); await fs.writeFile(file, JSON.stringify(collections, null, 2)); }
  return GET(request);
}

export async function DELETE(request: Request) {
  const { trainer, cardId } = await request.json() as { trainer: string; cardId: string };
  if (!trainer || !cardId) return Response.json({ error: "Invalid card" }, { status: 400 });
  if (!(await canEditCollection(request, trainer))) return Response.json({ error: "This admin cannot edit that collection." }, { status: 403 });
  if (cloudConfigured) await removeCloudCard(trainer, cardId);
  else { const collections = await readLocal(); const items = collections[trainer] ?? []; const found = items.find((item) => item.card.id === cardId); if (!found) return Response.json({ error: "Card not found" }, { status: 404 }); if (found.quantity > 1) found.quantity -= 1; else collections[trainer] = items.filter((item) => item.card.id !== cardId); await fs.writeFile(file, JSON.stringify(collections, null, 2)); }
  return GET(request);
}
