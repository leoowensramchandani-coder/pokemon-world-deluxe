import type { PokemonCard } from "@/lib/types";
import { isEditor } from "@/lib/cloud";

type DetectedCard = { name: string; number: string; setName: string; attackDamages: string[]; confidence: number };

function outputText(body: { output?: Array<{ content?: Array<{ text?: string }> }> }) {
  return body.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("") ?? "";
}

async function findCard(detected: DetectedCard): Promise<PokemonCard | null> {
  const safeName = detected.name.replace(/["\\]/g, "");
  const collectorNumber = detected.number.split("/")[0].replace(/^0+(?=\d)/, "");
  const queries = collectorNumber
    ? [`name:\"${safeName}\" number:${collectorNumber}`, `name:\"${safeName}\"`]
    : [`name:\"${safeName}\"`];
  for (const query of queries) {
    const url = new URL("https://api.pokemontcg.io/v2/cards");
    url.searchParams.set("q", query); url.searchParams.set("pageSize", "100");
    const response = await fetch(url, { headers: process.env.POKEMON_TCG_API_KEY ? { "X-Api-Key": process.env.POKEMON_TCG_API_KEY } : {} });
    if (!response.ok) continue;
    const cards = (await response.json()).data as PokemonCard[];
    if (cards?.length) {
      const normalizeDamage = (damage: string) => damage.toLowerCase().replace(/\s+/g, "").replace(/×/g, "x");
      const wantedDamages = detected.attackDamages.map(normalizeDamage).filter(Boolean).sort();
      const attackMatches = wantedDamages.length
        ? cards.filter((card) => {
            const cardDamages = (card.attacks ?? []).map((attack) => normalizeDamage(attack.damage ?? "")).filter(Boolean).sort();
            return cardDamages.length === wantedDamages.length && cardDamages.every((damage, index) => damage === wantedDamages[index]);
          })
        : cards;
      if (!attackMatches.length) continue;
      const exactNumber = attackMatches.find((card) => collectorNumber && card.number?.replace(/^0+(?=\d)/, "") === collectorNumber);
      if (exactNumber) return exactNumber;
      const setMatch = attackMatches.find((card) => detected.setName && card.set.name.toLowerCase().includes(detected.setName.toLowerCase()));
      return setMatch ?? attackMatches[0];
    }
  }
  return null;
}

export async function POST(request: Request) {
  if (!(await isEditor(request))) return Response.json({ error: "Family sign-in required." }, { status: 401 });
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
            setName: { type: "string" }, attackDamages: { type: "array", items: { type: "string" } }, confidence: { type: "number" },
          },
          required: ["name", "number", "setName", "attackDamages", "confidence"],
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
      input: [{ role: "user", content: [{ type: "input_text", text: "Identify every English Pokémon trading card visible in these photos. A binder page may contain up to 18 cards. Read the Pokémon/card name, printed collector number (for example 025/198 or 025), set name or symbol, and every printed attack damage score when visible. Attack damage is the number printed at the right of an attack, including modifiers such as 30+, 20x, or 120-. Return attackDamages in top-to-bottom order and omit attacks with no printed damage. Keep cards in visual order, left-to-right and top-to-bottom. Do not invent unreadable text; lower confidence when uncertain." }, ...imageParts] }],
      text: { format: { type: "json_schema", name: "binder_cards", strict: true, schema } },
    }),
  });
  if (!aiResponse.ok) {
    const detail = await aiResponse.text();
    console.error("Scanner API error", aiResponse.status, detail);
    let code = "OPENAI_ERROR";
    try { code = JSON.parse(detail)?.error?.code ?? code; } catch {}
    if (aiResponse.status === 429 && code === "insufficient_quota") {
      return Response.json({ error: "Scanner credits are empty. A grown-up needs to add OpenAI API credits, then try again.", code: "OPENAI_QUOTA" }, { status: 503 });
    }
    return Response.json({ error: "The scanner could not read those pictures. Please try again.", code }, { status: 502 });
  }
  const detected = JSON.parse(outputText(await aiResponse.json()) || "{\"cards\":[]}").cards as DetectedCard[];
  const matched = await Promise.all(detected.map(async (item) => ({ detected: item, card: await findCard(item) })));
  return Response.json({ matches: matched });
}
