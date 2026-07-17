import type { CollectionDefinition } from "./types";

export const trainers: CollectionDefinition[] = [
  { id: "papa", name: "Papa", title: "Master Collector", partnerPokemon: "Charizard", ability: "Legendary Finds", badge: "🏆", photo: "/trainers/papa.jpg", theme: "from-slate-950 via-blue-950 to-slate-900 border-amber-300 text-white", button: "bg-amber-300 text-slate-950", accent: "text-amber-300" },
  { id: "leo", name: "Leo", title: "Adventure Trainer", partnerPokemon: "Pikachu", ability: "Card Hunter", badge: "⚡", photo: "/trainers/leo.jpg", theme: "from-yellow-300 via-amber-200 to-blue-500 border-blue-700 text-slate-950", button: "bg-blue-700 text-white", accent: "text-blue-800" },
  { id: "remy", name: "Remy", title: "Lucky Trainer", partnerPokemon: "Bulbasaur", ability: "Lucky Pulls", badge: "🌱", photo: "/trainers/remy.jpg", theme: "from-emerald-400 via-lime-200 to-red-400 border-emerald-800 text-slate-950", button: "bg-emerald-800 text-white", accent: "text-emerald-900" },
];
