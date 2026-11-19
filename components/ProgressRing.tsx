export default function ProgressRing({
  value,
  total,
  size = 46,
  stroke = 3.5,
  label,
}: {
  value: number;
  total: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const done = value >= total && total > 0;

  return (
    <span
      className="ring"
      style={{ width: size, height: size, display: "inline-block" }}
      role="img"
      aria-label={label ?? `${value} of ${total} questions revised`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={done ? "var(--accent)" : "color-mix(in srgb, var(--accent) 78%, var(--line))"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 320ms ease" }}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          style={{
            fontFamily: "var(--sans)",
            fontSize: size * 0.26,
            fontWeight: 600,
            fill: done ? "var(--accent-ink)" : "var(--ink-2)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </text>
      </svg>
    </span>
  );
}
