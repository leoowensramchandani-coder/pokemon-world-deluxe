"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { trainers } from "@/lib/trainers";
import type { PokemonCard, TrainerId } from "@/lib/types";

type Match = { detected: { name: string; number: string; setName: string; confidence: number }; card: PokemonCard | null; selected?: boolean; quantity?: number };

function groupMatches(matches: Match[]): Match[] {
  const grouped = new Map<string, Match>();
  for (const match of matches) {
    const key = match.card?.id ?? `unknown-${match.detected.name}-${match.detected.number}`;
    const existing = grouped.get(key);
    if (existing) existing.quantity = (existing.quantity ?? 1) + 1;
    else grouped.set(key, { ...match, selected: Boolean(match.card), quantity: 1 });
  }
  return Array.from(grouped.values());
}

async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file); const max = 2000; const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!), "image/jpeg", .84));
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
}

export default function CardScanner({ onAdd, onClose, accessToken }: { onAdd: (card: PokemonCard, trainer: TrainerId) => Promise<void>; onClose: () => void; accessToken?: string }) {
  const [files, setFiles] = useState<File[]>([]); const [matches, setMatches] = useState<Match[]>([]); const [trainer, setTrainer] = useState<TrainerId>("leo"); const [loading, setLoading] = useState(false); const [message, setMessage] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false); const videoRef = useRef<HTMLVideoElement>(null); const streamRef = useRef<MediaStream | null>(null);
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);
  async function choose(list: FileList | null) { if (!list) return; setMessage(""); setMatches([]); setFiles(await Promise.all(Array.from(list).slice(0, 12).map(shrink))); }
  async function startCamera() { setMessage(""); try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }); streamRef.current = stream; setCameraOpen(true); requestAnimationFrame(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); } }); } catch { setMessage("Camera access was blocked. Allow camera access in your browser, then try again."); } }
  async function takePhoto() { const video = videoRef.current; if (!video?.videoWidth) return; const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight; canvas.getContext("2d")?.drawImage(video, 0, 0); const blob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!), "image/jpeg", .9)); const photo = await shrink(new File([blob], `binder-${Date.now()}.jpg`, { type: "image/jpeg" })); setFiles((current) => [...current, photo].slice(0, 12)); setMatches([]); setMessage("Picture captured! Take another page or scan the pictures now."); }
  function stopCamera() { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setCameraOpen(false); }
  async function scan() { if (!files.length) return; setLoading(true); setMessage("Professor Oak is examining every card…"); const form = new FormData(); files.forEach((file) => form.append("images", file)); try { const response = await fetch("/api/cards/scan", { method: "POST", headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}, body: form }); const body = await response.json(); if (body.code === "MISSING_OPENAI_KEY") setMessage("Scanner setup needed: add your private OpenAI API key to .env.local, then restart the website."); else if (!response.ok) setMessage(body.error ?? "Could not scan those pictures."); else { const grouped = groupMatches(body.matches); setMatches(grouped); const total = grouped.reduce((sum, item) => sum + (item.card ? item.quantity ?? 1 : 0), 0); setMessage(`Found ${total} matching cards. Check them before adding.`); } } catch { setMessage("The scanner lost connection. Please try again."); } finally { setLoading(false); } }
  async function addSelected() { const chosen = matches.filter((match) => match.selected && match.card); const total = chosen.reduce((sum, match) => sum + (match.quantity ?? 1), 0); for (const match of chosen) for (let copy = 0; copy < (match.quantity ?? 1); copy++) await onAdd(match.card!, trainer); setMessage(`Added ${total} cards to ${trainers.find((item) => item.id === trainer)?.name}'s binder! 🎉`); setMatches(matches.map((match) => ({ ...match, selected: false }))); }
  function close() { stopCamera(); onClose(); }
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Scan Pokémon cards"><div className="scanner-modal"><button className="close-button" onClick={close}>×</button><p className="eyebrow">📷 Binder Scanner</p><h2>Scan up to 18 cards at once</h2><p className="scanner-tip">Lay the open binder flat in bright, even light. Keep every card fully visible and avoid glare.</p>{cameraOpen ? <div className="camera-stage"><video ref={videoRef} playsInline muted aria-label="Live camera preview"/><div className="camera-controls"><button className="secondary-button" onClick={stopCamera}>Close Camera</button><button className="shutter-button" onClick={takePhoto} aria-label="Take picture">📸</button></div></div> : <div className="capture-grid"><button className="capture-choice camera-choice" onClick={startCamera}><span>📸</span><b>Open Device Camera</b><small>Works with Mac, phone, or tablet cameras</small></button><label className="capture-choice"><span>🖼️</span><b>Upload pictures</b><small>Choose several binder pages together</small><input type="file" accept="image/*" multiple onChange={(event) => choose(event.target.files)}/></label></div>}{files.length > 0 && <div className="scan-ready"><b>{files.length} picture{files.length === 1 ? "" : "s"} ready</b><button className="primary-button" onClick={scan} disabled={loading}>{loading ? "Scanning…" : "Find My Cards"}</button></div>}{message && <p className="search-message">{message}</p>}{matches.length > 0 && <><div className="scan-actions"><label>Add selected cards to <select value={trainer} onChange={(event) => setTrainer(event.target.value as TrainerId)}>{trainers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="primary-button" onClick={addSelected}>Add Selected</button></div><div className="scan-results">{matches.map((match, index) => <label key={`${match.detected.name}-${index}`} className={`scan-match ${match.card ? "" : "no-match"}`}><input type="checkbox" checked={Boolean(match.selected)} disabled={!match.card} onChange={() => setMatches(matches.map((item, i) => i === index ? { ...item, selected: !item.selected } : item))}/>{(match.quantity ?? 1) > 1 && <span className="copy-count">×{match.quantity}</span>}{match.card ? <Image src={match.card.images.small} alt={match.card.name} width={180} height={252}/> : <div className="unknown-card">?</div>}<b>{match.card?.name ?? match.detected.name}</b><small>{match.card ? `${match.card.set.name} · #${match.card.number}` : "Match not found"}</small></label>)}</div></>}</div></div>;
}
