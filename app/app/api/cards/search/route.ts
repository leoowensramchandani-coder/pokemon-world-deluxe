import type { PokemonCard } from "@/lib/types";

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
      const response = await fetch(url, { headers, next: { revalidate: 3600 } });
      if (!response.ok) throw new Error("Card service unavailable");
      const body = await response.json() as { data: PokemonCard[]; totalCount?: number };
      data.push(...body.data);
      totalCount = body.totalCount ?? data.length;
      page += 1;
    } while (data.length < totalCount);
    return Response.json({ data });
  }
  catch { return Response.json({ error: "The Pokédex is resting. Please try again!", data: [] }, { status: 503 }); }
}
