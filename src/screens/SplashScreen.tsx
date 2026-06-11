export function SplashScreen({ onStart }: { onStart: () => void }) {
  return (
    <section className="splash safe-top safe-bottom">
      <div className="logo-mark">✦</div>
      <p className="eyebrow">Cloud Save • Offline Mode • Turn-Based RPG</p>
      <h1>Mythic Quest</h1>
      <h2>Adventure RPG</h2>
      <p className="splash-copy">Protect Green Village, unlock dangerous regions, defeat bosses, collect loot, and save your progress per account.</p>
      <button className="primary big" onClick={onStart}>Start Adventure</button>
    </section>
  );
}
