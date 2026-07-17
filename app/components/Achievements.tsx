import type { Collections, PokemonCard } from "@/lib/types";

export default function Achievements({ collections, adminEmail, wishlist }: { collections: Collections; adminEmail?: string; wishlist: PokemonCard[] }) {
  const all = Object.values(collections).flat();
  const total = all.reduce((sum, item) => sum + item.quantity, 0);
  const names = all.map((item) => item.card.name.toLowerCase());
  const types = new Set(all.flatMap((item) => item.card.types ?? []));
  const achievements = [
    { icon: "🥚", name: "First Card", earned: total >= 1 },
    { icon: "⚡", name: "Pikachu Pal", earned: names.some((name) => name.includes("pikachu")) },
    { icon: "🔥", name: "Fire Finder", earned: types.has("Fire") },
    { icon: "💧", name: "Water Watcher", earned: types.has("Water") },
    { icon: "🌿", name: "Grass Guardian", earned: types.has("Grass") },
    { icon: "🏅", name: "Ten Cards", earned: total >= 10 },
    { icon: "💯", name: "Century Club", earned: total >= 100 },
    { icon: "⭐", name: "Dream Catcher", earned: wishlist.length >= 1 },
  ];
  return <section className="achievements"><div><p className="eyebrow">Admin Badge Case</p><h2>{adminEmail ? `${adminEmail.split("@")[0]}'s Badges` : "Collector Badges"}</h2></div><div className="badge-grid">{achievements.map((item) => <div key={item.name} className={item.earned ? "badge earned" : "badge locked"}><span>{item.earned ? item.icon : "🔒"}</span><b>{item.name}</b><small>{item.earned ? "Unlocked!" : "Keep collecting"}</small></div>)}</div></section>;
}
