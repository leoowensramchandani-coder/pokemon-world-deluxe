import Image from "next/image";
import type { CollectionItem, TrainerId } from "@/lib/types";
import { trainers } from "@/lib/trainers";

export default function TrainerCard({ trainer, items, onOpen }: { trainer: (typeof trainers)[number]; items: CollectionItem[]; onOpen: (id: TrainerId) => void }) {
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const level = Math.floor(count / 5) + 1;
  return (
    <article className={`trainer-card bg-gradient-to-br ${trainer.theme}`}>
      <div className="trainer-photo">
        <Image src={trainer.photo} alt={`${trainer.name}'s Trainer portrait`} fill priority sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
        <div className="trainer-name"><div><small>{trainer.title}</small><h3>{trainer.name}</h3></div><span>{trainer.badge}</span></div>
      </div>
      <div className="trainer-body">
        <div className="level-row"><b>Trainer Level {level}</b><b className={trainer.accent}>{count * 20} XP</b></div>
        <div className="trainer-stats"><div><small>Partner</small><b>{trainer.partnerPokemon}</b></div><div><small>Ability</small><b>{trainer.ability}</b></div><div><small>Cards</small><strong>{count}</strong></div><div><small>Unique</small><strong>{items.length}</strong></div></div>
        <button className={`binder-button ${trainer.button}`} onClick={() => onOpen(trainer.id)}>Open {trainer.name}&apos;s Binder</button>
      </div>
    </article>
  );
}
