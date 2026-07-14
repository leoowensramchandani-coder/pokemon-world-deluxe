import type { PokemonCard } from "@/lib/types";

type DetectedCard = { name: string; number: string; setName: string; confidence: number };

function outputText(body: { output?: Array<{ content?: Array<{ text?: string }> }> }) {
  return body.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("") ?? "";
}

async function findCard(detected: DetectedCard): Promise<PokemonCard | null> {
  const safeName = detected.name.replace(/["\\]/g, "");
  const queries = detected.number
    ? [`name:\"${safeName}\" number:${detected.number}`, `name:\"${safeName}\"`]
    : [`name:\"${safeName}\"`];
  for (const query of queries) {
    const url = new URL("https://api.pokemontcg.io/v2/cards");
    url.searchParams.set("q", query); url.searchParams.set("pageSize", "10");
    const response = await fetch(url, { headers: process.env.POKEMON_TCG_API_KEY ? { "X-Api-Key": process.env.POKEMON_TCG_API_KEY } : {} });
    if (!response.ok) continue;
    const cards = (await response.json()).data as PokemonCard[];
    if (cards?.length) {
      const setMatch = cards.find((card) => detected.setName && card.set.name.toLowerCase().includes(detected.setName.toLowerCase()));
      return setMatch ?? cards[0];
    }
  }
  return null;
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "Scanner setup needed", code: "MISSING_OPENAI_KEY" }, { status: 503 });
  const form = await request.formData();
  const files = form.getAll("images").filter((item): item is File => item instanceof File);
  if (!files.length || files.length > 12) return Response.json({ error: "Choose between 1 and 12 pictures." }, { status: 400 });
  const imageParts = await Promise.all(files.map(async (file) => ({ type: "input_image", image_url: `data:${file.type || "image/jpeg"};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`, detail: "high" })));
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      cards: {
        type: "array",
        maxItems: 216,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" }, number: { type: "string" },
            setName: { type: "string" }, confidence: { type: "number" },
          },
          required: ["name", "number", "setName", "confidence"],
        },
      },
    },
    required: ["cards"],
  };
  const aiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: [{ role: "user", content: [{ type: "input_text", text: "Identify every English Pokémon trading card visible in these photos. A binder page may contain up to 18 cards. Read the Pokémon/card name, printed collector number (for example 025/198 or 025), and set name or symbol when visible. Keep cards in visual order, left-to-right and top-to-bottom. Do not invent unreadable cards; lower confidence when uncertain." }, ...imageParts] }],
      text: { format: { type: "json_schema", name: "binder_cards", strict: true, schema } },
    }),
  });
  if (!aiResponse.ok) { const detail = await aiResponse.text(); console.error("Scanner API error", aiResponse.status, detail); return Response.json({ error: "The scanner could not read those pictures. Please try again." }, { status: 502 }); }
  const detected = JSON.parse(outputText(await aiResponse.json()) || "{\"cards\":[]}").cards as DetectedCard[];
  const matched = await Promise.all(detected.map(async (item) => ({ detected: item, card: await findCard(item) })));
  return Response.json({ matches: matched });
}
