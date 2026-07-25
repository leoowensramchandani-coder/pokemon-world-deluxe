import type { PokemonCard } from "@/lib/types";
import { addWishlistCard, getEditorEmail, getPublicWishlistForCollection, getWishlist, removeWishlistCard } from "@/lib/cloud";

export async function GET(request: Request) {
  const email = await getEditorEmail(request);
  const collectionId = new URL(request.url).searchParams.get("collectionId");
  if (collectionId) {
    const [cards, ownCards] = await Promise.all([getPublicWishlistForCollection(collectionId), email ? getWishlist(email) : Promise.resolve([])]);
    return Response.json({ cards, ownCardIds: ownCards.map((card) => card.id) });
  }
  if (!email) return Response.json({ cards: [], ownCardIds: [] });
  const cards = await getWishlist(email);
  return Response.json({ cards, ownCardIds: cards.map((card) => card.id) });
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
