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
  const names = all.map((item) => item.card.name.toLowerCase());
  const types = new Set(all.flatMap((item) => item.card.types ?? []));
  return [
    { icon: "🥚", name: "First Card", earned: total >= 1, hint: "Add the first card" },
    { icon: "⚡", name: "Pikachu Pal", earned: names.some((name) => name.includes("pikachu")), hint: "Catch a Pikachu" },
    { icon: "🔥", name: "Fire Finder", earned: types.has("Fire"), hint: "Find a Fire Pokémon" },
    { icon: "💧", name: "Water Watcher", earned: types.has("Water"), hint: "Find a Water Pokémon" },
    { icon: "🌿", name: "Grass Guardian", earned: types.has("Grass"), hint: "Find a Grass Pokémon" },
    { icon: "🏅", name: "Ten Cards", earned: total >= 10, hint: "Collect 10 cards" },
    { icon: "💯", name: "Century Club", earned: total >= 100, hint: "Collect 100 cards" },
    { icon: "🌠", name: "Dream Catcher", earned: admin.wishlistCount >= 1, hint: "Wish for a card" },
  ];
}

export default function Achievements({ collections, admins }: { collections: Collections; admins: AdminBadgeProfile[] }) {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const cases = useMemo(() => admins.map((admin) => { const badges = badgesFor(admin, collections); return { admin, badges, count: badges.filter((badge) => badge.earned).length }; }), [admins, collections]);
  const selected = cases.find(({ admin }) => admin.email === selectedEmail);
  return <section className="achievements public-badge-case"><div className="badge-case-heading"><p className="eyebrow">Public Badge Case</p><h2>Trainer Achievements</h2><p>Choose an admin to see every badge they have unlocked.</p></div><div className="admin-badge-list">{cases.map(({ admin, count }) => <button key={admin.email} className={selectedEmail === admin.email ? "admin-badge-summary selected" : "admin-badge-summary"} onClick={() => setSelectedEmail(selectedEmail === admin.email ? null : admin.email)} aria-expanded={selectedEmail === admin.email}><span className="admin-medal">🏆</span><span><b>{friendlyName(admin.email)}</b><small>{count} of 8 badges</small></span><strong>{count}</strong></button>)}</div>{selected && <div className="badge-details"><div className="badge-details-title"><h3>{friendlyName(selected.admin.email)}&apos;s Badges</h3><button onClick={() => setSelectedEmail(null)}>Close ×</button></div><div className="badge-grid">{selected.badges.map((badge) => <div key={badge.name} className={badge.earned ? "badge earned" : "badge locked"}><span className="badge-picture" aria-hidden="true">{badge.earned ? badge.icon : "🔒"}</span><b>{badge.name}</b><small>{badge.earned ? "Unlocked!" : badge.hint}</small></div>)}</div></div>}</section>;
}
