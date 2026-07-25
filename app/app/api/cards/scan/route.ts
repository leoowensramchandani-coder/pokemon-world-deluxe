import type { PokemonCard } from "@/lib/types";
import { isEditor } from "@/lib/cloud";

type DetectedCard = { name: string; hp: string; number: string; setName: string; attackNames: string[]; attackDamages: string[]; confidence: number };

function outputText(body: { output?: Array<{ content?: Array<{ text?: string }> }> }) {
  return body.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("") ?? "";
}

async function findCard(detected: DetectedCard): Promise<PokemonCard | null> {
  const safeName = detected.name.replace(/["\\]/g, "");
  const collectorNumber = detected.number.split("/")[0].replace(/^0+(?=\d)/, "");
  const url = new URL("https://api.pokemontcg.io/v2/cards");
  url.searchParams.set("q", `name:\"${safeName}\"`); url.searchParams.set("pageSize", "100");
  let cards: PokemonCard[] = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, { headers: process.env.POKEMON_TCG_API_KEY ? { "X-Api-Key": process.env.POKEMON_TCG_API_KEY } : {}, cache: "no-store" });
    if (response.ok) { cards = (await response.json()).data as PokemonCard[]; break; }
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  if (!cards.length) return null;
  const normalizeDamage = (damage: string) => damage.toLowerCase().replace(/\s+/g, "").replace(/×/g, "x");
  const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const wantedDamages = detected.attackDamages.map(normalizeDamage).filter(Boolean);
  const wantedAttackNames = detected.attackNames.map(normalizeName).filter(Boolean);
  const wantedHp = detected.hp.replace(/\D/g, "");
  const overlap = (wanted: string[], actual: string[]) => wanted.length ? wanted.filter((value) => actual.includes(value)).length / wanted.length : 0;
  const ranked = cards.map((card) => {
    const numberMatch = Boolean(collectorNumber && card.number?.replace(/^0+(?=\d)/, "") === collectorNumber);
    const hpMatch = Boolean(wantedHp && card.hp?.replace(/\D/g, "") === wantedHp);
    const damageScore = overlap(wantedDamages, (card.attacks ?? []).map((attack) => normalizeDamage(attack.damage ?? "")).filter(Boolean));
    const attackNameScore = overlap(wantedAttackNames, (card.attacks ?? []).map((attack) => normalizeName(attack.name ?? "")).filter(Boolean));
    const setMatch = Boolean(detected.setName && card.set.name.toLowerCase().includes(detected.setName.toLowerCase()));
    const score = (numberMatch ? 80 : collectorNumber ? -20 : 0) + (hpMatch ? 35 : wantedHp ? -10 : 0) + damageScore * 35 + attackNameScore * 30 + (setMatch ? 20 : 0);
    return { card, score };
  }).sort((a, b) => b.score - a.score);
  return ranked[0]?.score >= 25 || cards.length === 1 ? ranked[0].card : null;
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
            name: { type: "string" }, hp: { type: "string" }, number: { type: "string" },
            setName: { type: "string" }, attackNames: { type: "array", items: { type: "string" } }, attackDamages: { type: "array", items: { type: "string" } }, confidence: { type: "number" },
          },
          required: ["name", "hp", "number", "setName", "attackNames", "attackDamages", "confidence"],
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
      input: [{ role: "user", content: [{ type: "input_text", text: "Scan the entire binder picture, not only the clearest cards. First count every occupied card pocket row by row. Then return exactly one result for every visible English Pokémon trading card, up to 18 cards. Carefully zoom into each pocket and read the card name, printed HP number, printed collector number (for example 025/198 or 025), set name or symbol, every attack name, and every printed attack damage score. Put only the numeric HP value in hp. Return attackNames and attackDamages in top-to-bottom order. Attack damage is the number at the right of an attack, including modifiers such as 30+, 20x, or 120-; omit damage only when none is printed. Preserve visual order: top-left to bottom-right. For a blurry card, provide the best supported reading and lower confidence instead of skipping the pocket. Never stop after the first row. Exact HP, attack names, and attack damage are important because cards with the same Pokémon name can be different printings." }, ...imageParts] }],
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
  const matched = [] as Array<{ detected: DetectedCard; card: PokemonCard | null }>;
  for (const item of detected) { matched.push({ detected: item, card: await findCard(item) }); await new Promise((resolve) => setTimeout(resolve, 120)); }
  return Response.json({ matches: matched });
}
