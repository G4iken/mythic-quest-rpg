interface BarProps {
  label: string;
  value: number;
  max: number;
  tone?: 'hp' | 'mana' | 'xp' | 'enemy';
}

export function StatBar({ label, value, max, tone = 'hp' }: BarProps) {
  const percent = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="statbar">
      <div className="bar-label"><span>{label}</span><span>{Math.floor(value)} / {Math.floor(max)}</span></div>
      <div className={`bar-track ${tone}`}><span style={{ width: `${percent}%` }} /></div>
    </div>
  );
}
