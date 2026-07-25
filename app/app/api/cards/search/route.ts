import type { PokemonCard } from "@/lib/types";

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchPage(url: URL, headers: HeadersInit) {
  let lastError = new Error("Card service unavailable");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers, next: { revalidate: 3600 } });
      if (response.ok) return await response.json() as { data: PokemonCard[]; totalCount?: number };
      lastError = new Error(`Card service unavailable: ${response.status}`);
    } catch (error) { lastError = error instanceof Error ? error : lastError; }
    await wait(300 * (attempt + 1));
  }
  throw lastError;
}

async function fallbackSearch(query: string): Promise<PokemonCard[]> {
  const url = new URL("https://api.tcgdex.net/v2/en/cards");
  url.searchParams.set("name", query);
  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error("Backup card service unavailable");
  const cards = await response.json() as Array<{ id: string; localId?: string; name: string; image?: string }>;
  const wanted = query.toLowerCase();
  return cards.filter((card) => card.image && card.name.toLowerCase().includes(wanted)).map((card) => ({
    id: `tcgdex-${card.id}`,
    name: card.name,
    number: card.localId,
    set: { id: card.id.split("-")[0], name: "Pokémon TCG" },
    images: { small: `${card.image}/low.webp`, large: `${card.image}/high.webp` },
  }));
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) return Response.json({ data: [] });
  const safe = query.replace(/["\\]/g, "");
  const headers: HeadersInit = {}; if (process.env.POKEMON_TCG_API_KEY) headers["X-Api-Key"] = process.env.POKEMON_TCG_API_KEY;
  try {
    const data: PokemonCard[] = [];
    let page = 1;
    let totalCount = 0;
    do {
      const url = new URL("https://api.pokemontcg.io/v2/cards");
      url.searchParams.set("q", `name:*${safe}*`);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", "250");
      url.searchParams.set("orderBy", "name");
      const body = await fetchPage(url, headers);
      data.push(...body.data);
      totalCount = body.totalCount ?? data.length;
      page += 1;
    } while (data.length < totalCount);
    return Response.json({ data });
  }
  catch {
    try { return Response.json({ data: await fallbackSearch(safe), backup: true }); }
    catch { return Response.json({ error: "The Pokédex could not connect. Please try again in a moment.", data: [] }, { status: 503 }); }
  }
}
