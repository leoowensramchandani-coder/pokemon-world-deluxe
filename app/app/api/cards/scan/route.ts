import type { PokemonCard } from "@/lib/types";
import { isEditor } from "@/lib/cloud";

type DetectedCard = { name: string; hp: string; number: string; setName: string; attackNames: string[]; attackDamages: string[]; confidence: number };

function outputText(body: { output?: Array<{ content?: Array<{ text?: string }> }> }) {
  return body.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("") ?? "";
}

async function findCard(detected: DetectedCard): Promise<PokemonCard | null> {
  const safeName = detected.name.replace(/["\\]/g, "");
  const numberParts = detected.number.match(/0*(\d+)\s*(?:\/\s*0*(\d+))?/);
  const collectorNumber = numberParts?.[1] ?? "";
  const printedTotal = numberParts?.[2] ?? "";
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
  const normalizeSet = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const wantedDamages = detected.attackDamages.map(normalizeDamage).filter(Boolean);
  const wantedAttackNames = detected.attackNames.map(normalizeName).filter(Boolean);
  const wantedHp = detected.hp.replace(/\D/g, "");
  const wantedSet = normalizeSet(detected.setName);
  const overlap = (wanted: string[], actual: string[]) => wanted.length ? wanted.filter((value) => actual.includes(value)).length / wanted.length : 0;
  const ranked = cards.map((card) => {
    const numberMatch = Boolean(collectorNumber && card.number?.replace(/^0+(?=\d)/, "") === collectorNumber);
    const totalMatch = Boolean(printedTotal && String(card.set.printedTotal ?? "") === printedTotal);
    const hpMatch = Boolean(wantedHp && card.hp?.replace(/\D/g, "") === wantedHp);
    const actualDamages = (card.attacks ?? []).map((attack) => normalizeDamage(attack.damage ?? "")).filter(Boolean);
    const actualAttackNames = (card.attacks ?? []).map((attack) => normalizeName(attack.name ?? "")).filter(Boolean);
    const damageScore = overlap(wantedDamages, actualDamages);
    const attackNameScore = overlap(wantedAttackNames, actualAttackNames);
    const orderedAttackScore = wantedAttackNames.length ? wantedAttackNames.filter((name, index) => name === actualAttackNames[index] && (!wantedDamages[index] || wantedDamages[index] === actualDamages[index])).length / wantedAttackNames.length : 0;
    const actualSet = normalizeSet(card.set.name);
    const setMatch = Boolean(wantedSet && (actualSet === wantedSet || actualSet.includes(wantedSet) || wantedSet.includes(actualSet)));
    const score = (numberMatch ? 85 : collectorNumber ? -45 : 0) + (totalMatch ? 65 : printedTotal ? -50 : 0) + (hpMatch ? 45 : wantedHp ? -25 : 0) + damageScore * 35 + attackNameScore * 40 + orderedAttackScore * 55 + (setMatch ? 45 : wantedSet ? -15 : 0);
    const evidence = [numberMatch, totalMatch, hpMatch, setMatch, attackNameScore === 1 && wantedAttackNames.length > 0, damageScore === 1 && wantedDamages.length > 0].filter(Boolean).length;
    return { card, score, evidence, numberMatch, totalMatch, setMatch, orderedAttackScore };
  }).sort((a, b) => b.score - a.score);
  const best = ranked[0]; const second = ranked[1];
  if (!best || detected.confidence < .3 || best.score < 65 || best.evidence < 2) return null;
  const identityMatch = (best.numberMatch && best.totalMatch) || (best.numberMatch && best.setMatch) || best.orderedAttackScore === 1;
  if (second && best.score - second.score < 20 && !identityMatch) return null;
  return best.card;
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
      input: [{ role: "user", content: [{ type: "input_text", text: "Inspect the entire image as a grid of separate cards. First count every occupied card or binder pocket row by row, including all rows, then inspect each card independently from top-left to bottom-right. Return exactly one result for every visible English Pokémon trading card, up to 18 cards. For each card, zoom in and transcribe only what is visibly printed: exact card name including suffixes such as ex, V, VMAX, or GX; numeric HP; the complete collector number including the denominator (for example 025/198); set name when readable; and every attack name paired in the same top-to-bottom order with its printed damage. Attack damage includes modifiers such as 30+, 20x, or 120-. Double-check that HP, collector number, attack names, and damages all came from the same pocket before moving to the next card. Do not identify a card from artwork or Pokémon name alone and do not copy details between similar cards. If identifying text is blurry, give the best literal reading with low confidence rather than inventing familiar values. Never stop after the first row." }, ...imageParts] }],
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
