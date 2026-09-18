export function Sparkline({ values, className = "" }: { values: number[]; className?: string }) {
  const max = Math.max(1, ...values);
  const w = 88;
  const h = 28;
  const points = values
    .map((value, i) => {
      const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * w;
      const y = h - (value / max) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`h-7 w-22 overflow-visible ${className}`} aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" points={points} />
    </svg>
  );
}
