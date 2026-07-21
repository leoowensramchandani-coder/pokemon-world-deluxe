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
      const numberMatches = collectorNumber ? cards.filter((card) => card.number?.replace(/^0+(?=\d)/, "") === collectorNumber) : [];
      let candidates = numberMatches.length ? numberMatches : cards;
      const setMatches = detected.setName ? candidates.filter((card) => card.set.name.toLowerCase().includes(detected.setName.toLowerCase())) : [];
      if (setMatches.length) candidates = setMatches;
      const attackMatches = wantedDamages.length
        ? candidates.filter((card) => {
            const cardDamages = (card.attacks ?? []).map((attack) => normalizeDamage(attack.damage ?? "")).filter(Boolean).sort();
            return cardDamages.length === wantedDamages.length && cardDamages.every((damage, index) => damage === wantedDamages[index]);
          })
        : [];
      if (attackMatches.length) return attackMatches[0];
      if (numberMatches.length || setMatches.length || candidates.length === 1) return candidates[0];
    }
  }
  return null;
}

export async function POST(request: Request) {
  if (!(await isEditor(request))) return Response.json({ error: "Family sign-in required." }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "Scanner setup needed", code: "MISSING_OPENAI_KEY" }, { status: 503 });
  const form = await request.formData();
  const files = form.getAll("images").filter((item): item is File => item instanceof File);
  if (files.length !== 1) return Response.json({ error: "Choose one binder picture." }, { status: 400 });
  const imageParts = await Promise.all(files.map(async (file) => ({ type: "input_image", image_url: `data:${file.type || "image/jpeg"};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`, detail: "high" })));
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      cards: {
        type: "array",
        maxItems: 18,
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
      model: "gpt-4.1",
      max_output_tokens: 5000,
      input: [{ role: "user", content: [{ type: "input_text", text: "Scan the entire binder picture, not only the clearest cards. First count every occupied card pocket row by row. Then return exactly one result for every visible English Pokémon trading card, up to 18 cards. Carefully zoom into each pocket and read the card name, printed collector number (for example 025/198 or 025), set name or symbol, and every printed attack damage score. Attack damage is the number at the right of an attack, including modifiers such as 30+, 20x, or 120-. Return attackDamages in top-to-bottom order and omit attacks with no printed damage. Preserve visual order: top-left to bottom-right. For a blurry card, provide the best supported reading and lower confidence instead of skipping the pocket. Never stop after the first row." }, ...imageParts] }],
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
