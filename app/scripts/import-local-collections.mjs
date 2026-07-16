import fs from "node:fs/promises";

const data = JSON.parse(await fs.readFile(new URL("../data/collections.json", import.meta.url), "utf8"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase settings are missing from .env.local");
const rows = Object.entries(data).flatMap(([trainer_id, items]) => items.map((item) => ({ trainer_id, card_id: item.card.id, card: item.card, quantity: item.quantity, added_at: item.addedAt })));
const response = await fetch(`${url}/rest/v1/card_collections?on_conflict=trainer_id,card_id`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(rows) });
if (!response.ok) throw new Error(`Import failed: ${response.status} ${await response.text()}`);
console.log(`Imported ${rows.length} unique cards into Supabase.`);
