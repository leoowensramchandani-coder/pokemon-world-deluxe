import type { Collections } from "@/lib/types";

export default function Achievements({ collections }: { collections: Collections }) {
  const all = Object.values(collections).flat();
  const total = all.reduce((sum, item) => sum + item.quantity, 0);
  const pikachu = all.some((item) => item.card.name.toLowerCase().includes("pikachu"));
  const achievements = [
    { icon: "🥚", name: "First Card", earned: total >= 1 },
    { icon: "⚡", name: "First Pikachu", earned: pikachu },
    { icon: "🤝", name: "Family Team", earned: Object.values(collections).every((items) => items.length > 0) },
    { icon: "🏅", name: "Ten Cards", earned: total >= 10 },
  ];
  return <section className="achievements"><div><p className="eyebrow">Badge Case</p><h2>Family Achievements</h2></div><div className="badge-grid">{achievements.map((item) => <div key={item.name} className={item.earned ? "badge earned" : "badge locked"}><span>{item.earned ? item.icon : "🔒"}</span><b>{item.name}</b><small>{item.earned ? "Unlocked!" : "Keep collecting"}</small></div>)}</div></section>;
}
