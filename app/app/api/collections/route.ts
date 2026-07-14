import { promises as fs } from "node:fs";
import path from "node:path";
import type { Collections, PokemonCard, TrainerId } from "@/lib/types";

const file = path.join(process.cwd(), "data", "collections.json");
const empty: Collections = { papa: [], leo: [], remy: [] };
async function read(): Promise<Collections> { try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(empty, null, 2)); return structuredClone(empty); } }
export async function GET() { return Response.json(await read()); }
export async function POST(request: Request) {
  const { trainer, card } = await request.json() as { trainer: TrainerId; card: PokemonCard };
  if (!(["papa", "leo", "remy"] as string[]).includes(trainer) || !card?.id || !card.images?.small) return Response.json({ error: "Invalid card" }, { status: 400 });
  const collections = await read(); const found = collections[trainer].find((item) => item.card.id === card.id);
  if (found) found.quantity += 1; else collections[trainer].push({ card, quantity: 1, addedAt: new Date().toISOString() });
  await fs.writeFile(file, JSON.stringify(collections, null, 2)); return Response.json(collections);
}
