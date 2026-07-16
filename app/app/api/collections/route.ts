import { promises as fs } from "node:fs";
import path from "node:path";
import type { Collections, PokemonCard, TrainerId } from "@/lib/types";
import { addCloudCard, cloudConfigured, getCloudCollections, isEditor, removeCloudCard } from "@/lib/cloud";

const file = path.join(process.cwd(), "data", "collections.json");
const empty: Collections = { papa: [], leo: [], remy: [] };
async function readLocal(): Promise<Collections> { try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(empty, null, 2)); return structuredClone(empty); } }
async function read() { return cloudConfigured ? getCloudCollections() : readLocal(); }

export async function GET() { return Response.json(await read()); }
export async function POST(request: Request) {
  if (!(await isEditor(request))) return Response.json({ error: "Family sign-in required." }, { status: 401 });
  const { trainer, card } = await request.json() as { trainer: TrainerId; card: PokemonCard };
  if (!("papa leo remy".split(" ")).includes(trainer) || !card?.id || !card.images?.small) return Response.json({ error: "Invalid card" }, { status: 400 });
  if (cloudConfigured) await addCloudCard(trainer, card);
  else { const collections = await readLocal(); const found = collections[trainer].find((item) => item.card.id === card.id); if (found) found.quantity += 1; else collections[trainer].push({ card, quantity: 1, addedAt: new Date().toISOString() }); await fs.writeFile(file, JSON.stringify(collections, null, 2)); }
  return Response.json(await read());
}
export async function DELETE(request: Request) {
  if (!(await isEditor(request))) return Response.json({ error: "Family sign-in required." }, { status: 401 });
  const { trainer, cardId } = await request.json() as { trainer: TrainerId; cardId: string };
  if (!("papa leo remy".split(" ")).includes(trainer) || !cardId) return Response.json({ error: "Invalid card" }, { status: 400 });
  if (cloudConfigured) await removeCloudCard(trainer, cardId);
  else { const collections = await readLocal(); const found = collections[trainer].find((item) => item.card.id === cardId); if (!found) return Response.json({ error: "Card not found" }, { status: 404 }); if (found.quantity > 1) found.quantity -= 1; else collections[trainer] = collections[trainer].filter((item) => item.card.id !== cardId); await fs.writeFile(file, JSON.stringify(collections, null, 2)); }
  return Response.json(await read());
}
