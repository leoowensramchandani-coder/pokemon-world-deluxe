import Image from "next/image";
import type { CollectionDefinition, CollectionItem, TrainerId } from "@/lib/types";

export default function TrainerCard({ trainer, items, onOpen, editable }: { trainer: CollectionDefinition; items: CollectionItem[]; onOpen: (id: TrainerId) => void; editable: boolean }) {
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const level = Math.floor(count / 5) + 1;
  return (
    <article className={`trainer-card binder-cover bg-gradient-to-br ${trainer.theme ?? "from-blue-950 via-indigo-800 to-blue-700 border-sky-300 text-white"}`}>
      <div className="trainer-photo">
        {trainer.photo ? <Image src={trainer.photo} alt={`${trainer.name}'s Trainer portrait`} fill priority sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" /> : <div className="binder-cover-mark">{trainer.badge}</div>}
        <div className="trainer-name"><div><small>{trainer.title}</small><h3>{trainer.name}</h3></div><span>{trainer.badge}</span></div>
      </div>
      <div className="trainer-body">
        <div className="level-row"><b>Trainer Level {level}</b><b className={trainer.accent ?? ""}>{count * 20} XP</b></div>
        <div className="trainer-stats"><div><small>Partner</small><b>{trainer.partnerPokemon ?? "Choose one"}</b></div><div><small>Power</small><b>{trainer.ability ?? "Card Collector"}</b></div><div><small>Cards</small><strong>{count}</strong></div><div><small>Access</small><strong>{editable ? "Admin" : "View"}</strong></div></div>
        <button className={`binder-button ${trainer.button ?? "bg-sky-300 text-slate-950"}`} onClick={() => onOpen(trainer.id)}>Open {trainer.name}&apos;s Binder</button>
      </div>
    </article>
  );
}
