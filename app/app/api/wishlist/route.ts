import type { PokemonCard } from "@/lib/types";
import { addWishlistCard, getEditorEmail, getWishlist, removeWishlistCard } from "@/lib/cloud";

export async function GET(request: Request) {
  const email = await getEditorEmail(request);
  if (!email) return Response.json({ cards: [] });
  return Response.json({ cards: await getWishlist(email) });
}
export async function POST(request: Request) {
  const email = await getEditorEmail(request);
  if (!email) return Response.json({ error: "Admin sign-in required." }, { status: 401 });
  const { card } = await request.json() as { card: PokemonCard };
  if (!card?.id) return Response.json({ error: "Invalid card" }, { status: 400 });
  await addWishlistCard(email, card);
  return Response.json({ cards: await getWishlist(email) });
}
export async function DELETE(request: Request) {
  const email = await getEditorEmail(request);
  if (!email) return Response.json({ error: "Admin sign-in required." }, { status: 401 });
  const { cardId } = await request.json() as { cardId: string };
  await removeWishlistCard(email, cardId);
  return Response.json({ cards: await getWishlist(email) });
}
