/**
 * The team's "LineChart" in the style of the app: the load of each session, with the first and last value named.
 *
 * Agent props, as the SDK chart: `{ title, labels, datasets: [{ label, data }] }`.
 */
export function LoadChart(props: Record<string, unknown>) {
  const labels = Array.isArray(props['labels']) ? props['labels'].map(String) : [];
  const first = Array.isArray(props['datasets']) ? (props['datasets'][0] as { data?: unknown } | undefined) : undefined;
  const values = Array.isArray(first?.data) ? first.data.map(Number).filter((v) => Number.isFinite(v)) : [];
  if (values.length < 2) return null;
  const low = Math.min(...values);
  const span = Math.max(...values) - low || 1;
  const points = values.map((v, i) => [14 + (i * 252) / (values.length - 1), 92 - ((v - low) / span) * 70]);
  const path = points.map((p) => p.join(',')).join(' ');
  return (
    <div className="w">
      <div className="h h3" style={{ marginBottom: 2 }}>{typeof props['title'] === 'string' ? props['title'] : 'Your load'}</div>
      <p className="mu" style={{ margin: '0 0 8px' }}>{values[0]} kg to {values[values.length - 1]} kg</p>
      <svg viewBox="0 0 280 110" style={{ width: '100%', display: 'block' }} role="img" aria-label={`Load from ${values[0]} to ${values[values.length - 1]} kg`}>
        <polygon points={`14,104 ${path} 266,104`} fill="#7A5CFA" opacity="0.12" />
        <polyline points={path} stroke="#7A5CFA" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none" />
        {points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="4.500" fill="#7A5CFA" />)}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span className="mu" style={{ fontSize: 11.5 }}>{labels[0]}</span>
        <span className="mu" style={{ fontSize: 11.5 }}>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}
