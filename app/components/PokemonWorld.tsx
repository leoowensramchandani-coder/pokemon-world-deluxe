"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { trainers } from "@/lib/trainers";
import type { Collections, PokemonCard, TrainerId } from "@/lib/types";
import TrainerCard from "./TrainerCard";
import ProfessorOak from "./ProfessorOak";
import CardSearch from "./CardSearch";
import CardScanner from "./CardScanner";
import Achievements from "./Achievements";

const empty: Collections = { papa: [], leo: [], remy: [] };
export default function PokemonWorld() {
  const [collections, setCollections] = useState<Collections>(empty);
  const [searchOpen, setSearchOpen] = useState(false); const [scannerOpen, setScannerOpen] = useState(false);
  const [activeBinder, setActiveBinder] = useState<TrainerId | null>(null); const [begun, setBegun] = useState(false);
  async function load() { const response = await fetch("/api/collections", { cache: "no-store" }); if (response.ok) setCollections(await response.json()); }
  useEffect(() => { fetch("/api/collections", { cache: "no-store" }).then((response) => response.json()).then(setCollections); }, []);
  const total = useMemo(() => Object.values(collections).flat().reduce((sum, item) => sum + item.quantity, 0), [collections]);
  async function addCard(card: PokemonCard, trainer: TrainerId) { await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trainer, card }) }); await load(); }
  async function removeCard(cardId: string, trainer: TrainerId) { await fetch("/api/collections", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trainer, cardId }) }); await load(); }
  const currentTrainer = trainers.find((item) => item.id === activeBinder);
  return <main className="site-shell"><div className="ambient ambient-one"/><div className="ambient ambient-two"/><div className="page-wrap"><header className="hero"><div><span className="hero-pill">⚡ Family Trainer HQ</span><h1>Pokémon World Deluxe</h1><p>Open the family binder, discover real cards, and collect together.</p></div><div className="hero-stats"><div><strong>{total}</strong><span>Family Cards</span></div><div><strong>3</strong><span>Collections</span></div></div></header><ProfessorOak totalCards={total} begun={begun} onBegin={() => { setBegun(true); setSearchOpen(true); }}/><section className="collection-section"><div className="section-heading"><div><p className="eyebrow">Choose your Trainer</p><h2>Family Collections</h2></div><div className="header-actions"><button className="secondary-button" onClick={() => setScannerOpen(true)}>📷 Scan Binder</button><button className="primary-button" onClick={() => setSearchOpen(true)}>🔎 Search Cards</button></div></div><div className="trainer-grid">{trainers.map((trainer) => <TrainerCard key={trainer.id} trainer={trainer} items={collections[trainer.id]} onOpen={setActiveBinder}/>)}</div></section><Achievements collections={collections}/><section className="toolbox"><div><p className="eyebrow">Next Mission</p><h2>Fill a binder page!</h2><p>Photograph up to 18 cards, check the matches, and add them together.</p></div><button className="primary-button" onClick={() => setScannerOpen(true)}>Open Scanner →</button></section><footer>Built together by the Pokémon World Deluxe family.</footer></div>{searchOpen && <CardSearch onAdd={addCard} onClose={() => setSearchOpen(false)}/>} {scannerOpen && <CardScanner onAdd={addCard} onClose={() => setScannerOpen(false)}/>} {activeBinder && currentTrainer && <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="binder-modal"><button className="close-button" onClick={() => setActiveBinder(null)}>×</button><p className="eyebrow">{currentTrainer.badge} {currentTrainer.title}</p><h2>{currentTrainer.name}&apos;s Binder</h2>{collections[activeBinder].length === 0 ? <div className="empty-binder"><span>📖</span><h3>This binder is ready!</h3><p>Search or scan to make the first catch.</p><button className="primary-button" onClick={() => { setActiveBinder(null); setScannerOpen(true); }}>Scan Cards</button></div> : <div className="binder-grid">{collections[activeBinder].map((item) => <div key={item.card.id}><Image src={item.card.images.small} alt={item.card.name} width={245} height={342}/><b>{item.card.name}</b><small>Quantity: {item.quantity}</small><button className="remove-button" onClick={() => removeCard(item.card.id, activeBinder)}>− Remove one</button></div>)}</div>}</div></div>}</main>;
}
