"use client";

export default function ProfessorOak({ totalCards, begun, onBegin }: { totalCards: number; begun: boolean; onBegin: () => void }) {
  if (begun) return null;
  return (
    <section className="oak-panel" aria-label="Professor Oak welcome">
      <div className="oak-avatar" aria-hidden="true">🌳</div>
      <div>
        <p className="eyebrow">A message from Professor Oak</p>
        <h2>Welcome back, Trainers!</h2>
        <p>Your family has collected <strong>{totalCards} card{totalCards === 1 ? "" : "s"}</strong>. Let&apos;s discover something amazing today!</p>
      </div>
      <button className="primary-button" onClick={onBegin}>Begin Adventure →</button>
    </section>
  );
}
