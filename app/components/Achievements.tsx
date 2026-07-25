"use client";
import { useMemo, useState } from "react";
import type { AdminBadgeProfile, Collections } from "@/lib/types";

const friendlyName = (email: string) => {
  const known: Record<string, string> = { "rahilramchandani@gmail.com": "Rahil", "leoramchandani@gmail.com": "Leo's Grown-Up", "its.sidd@gmail.com": "Sidd" };
  return known[email] ?? email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};

function badgesFor(admin: AdminBadgeProfile, collections: Collections) {
  const all = admin.collectionIds.flatMap((id) => collections[id] ?? []);
  const total = all.reduce((sum, item) => sum + item.quantity, 0);
  const unique = new Set(all.map((item) => item.card.id)).size;
  const names = all.map((item) => item.card.name.toLowerCase());
  const types = new Set(all.flatMap((item) => item.card.types ?? []));
  const rarities = all.map((item) => item.card.rarity?.toLowerCase() ?? "");
  const hasDuplicate = all.some((item) => item.quantity >= 2);
  const elementalTypes = ["Fire", "Water", "Grass", "Lightning", "Psychic", "Fighting", "Darkness", "Metal"];
  return [
    { icon: "🥚", name: "First Card", earned: total >= 1, hint: "Add the first card" },
    { icon: "⚡", name: "Pikachu Pal", earned: names.some((name) => name.includes("pikachu")), hint: "Catch a Pikachu" },
    { icon: "🔥", name: "Charizard Chaser", earned: names.some((name) => name.includes("charizard")), hint: "Catch a Charizard" },
    { icon: "🦊", name: "Eevee Explorer", earned: names.some((name) => name.includes("eevee")), hint: "Catch an Eevee" },
    { icon: "🔥", name: "Fire Finder", earned: types.has("Fire"), hint: "Find a Fire Pokémon" },
    { icon: "💧", name: "Water Watcher", earned: types.has("Water"), hint: "Find a Water Pokémon" },
    { icon: "🌿", name: "Grass Guardian", earned: types.has("Grass"), hint: "Find a Grass Pokémon" },
    { icon: "⚡", name: "Electric Expert", earned: types.has("Lightning"), hint: "Find a Lightning Pokémon" },
    { icon: "🔮", name: "Psychic Star", earned: types.has("Psychic"), hint: "Find a Psychic Pokémon" },
    { icon: "🥊", name: "Fighting Force", earned: types.has("Fighting"), hint: "Find a Fighting Pokémon" },
    { icon: "🌙", name: "Darkness Detective", earned: types.has("Darkness"), hint: "Find a Darkness Pokémon" },
    { icon: "⚙️", name: "Metal Master", earned: types.has("Metal"), hint: "Find a Metal Pokémon" },
    { icon: "🌈", name: "Type Champion", earned: elementalTypes.every((type) => types.has(type)), hint: "Collect all 8 main types" },
    { icon: "👯", name: "Double Trouble", earned: hasDuplicate, hint: "Collect two copies of one card" },
    { icon: "📖", name: "Binder Page", earned: total >= 9, hint: "Fill a 9-card binder page" },
    { icon: "🏅", name: "Ten Cards", earned: total >= 10, hint: "Collect 10 cards" },
    { icon: "⭐", name: "Unique Twenty-Five", earned: unique >= 25, hint: "Collect 25 different cards" },
    { icon: "🏆", name: "Fifty Cards", earned: total >= 50, hint: "Collect 50 cards" },
    { icon: "💯", name: "Century Club", earned: total >= 100, hint: "Collect 100 cards" },
    { icon: "👑", name: "Binder Legend", earned: total >= 250, hint: "Collect 250 cards" },
    { icon: "✨", name: "Rare Discovery", earned: rarities.some((rarity) => rarity.includes("rare") || rarity.includes("illustration")), hint: "Find a rare card" },
    { icon: "🌟", name: "Ultra Rare Hero", earned: rarities.some((rarity) => rarity.includes("ultra") || rarity.includes("secret") || rarity.includes("hyper")), hint: "Find an Ultra, Secret, or Hyper Rare" },
    { icon: "🌠", name: "Dream Catcher", earned: admin.wishlistCount >= 1, hint: "Wish for a card" },
    { icon: "☁️", name: "Big Dreamer", earned: admin.wishlistCount >= 10, hint: "Wish for 10 cards" },
  ];
}

export default function Achievements({ collections, admins }: { collections: Collections; admins: AdminBadgeProfile[] }) {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const cases = useMemo(() => admins.map((admin) => { const badges = badgesFor(admin, collections); return { admin, badges, count: badges.filter((badge) => badge.earned).length }; }), [admins, collections]);
  const selected = cases.find(({ admin }) => admin.email === selectedEmail);
  return <section className="achievements public-badge-case"><div className="badge-case-heading"><p className="eyebrow">Public Badge Case</p><h2>Trainer Achievements</h2><p>Choose an admin to see every badge they have unlocked.</p></div><div className="admin-badge-list">{cases.map(({ admin, badges, count }) => <button key={admin.email} className={selectedEmail === admin.email ? "admin-badge-summary selected" : "admin-badge-summary"} onClick={() => setSelectedEmail(selectedEmail === admin.email ? null : admin.email)} aria-expanded={selectedEmail === admin.email}><span className="admin-medal">🏆</span><span><b>{friendlyName(admin.email)}</b><small>{count} of {badges.length} badges</small></span><strong>{count}</strong></button>)}</div>{selected && <div className="badge-details"><div className="badge-details-title"><h3>{friendlyName(selected.admin.email)}&apos;s Badges</h3><button onClick={() => setSelectedEmail(null)}>Close ×</button></div><div className="badge-grid">{selected.badges.map((badge) => <div key={badge.name} className={badge.earned ? "badge earned" : "badge locked"}><span className="badge-picture" aria-hidden="true">{badge.earned ? badge.icon : "🔒"}</span><b>{badge.name}</b><small>{badge.earned ? "Unlocked!" : badge.hint}</small></div>)}</div></div>}</section>;
}
