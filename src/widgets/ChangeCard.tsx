import { useState } from 'react';

interface Row {
  from?: string;
  to?: string;
  why?: string;
}

/**
 * The counterpart of the "ChangeCard" custom widget of the Head Coach: what changed and why, to approve.
 *
 * Agent props: `{ title?, rows: [{ from, to, why }] }`. The reply is "Approved" or "Not this".
 */
export function ChangeCard(props: Record<string, unknown>) {
  const rows = Array.isArray(props['rows']) ? (props['rows'] as Row[]).filter(Boolean) : [];
  const onSubmit = typeof props['__onSubmit'] === 'function' ? (props['__onSubmit'] as (response: string) => void) : undefined;
  const [answer, setAnswer] = useState<string>();
  const reply = (text: string) => {
    setAnswer(text);
    onSubmit?.(text);
  };
  return (
    <div className="w">
      <div className="h h3" style={{ marginBottom: 8 }}>{typeof props['title'] === 'string' ? props['title'] : 'What changed and why'}</div>
      {rows.map((r, i) => (
        <div key={i} className="l" style={{ display: 'block' }}>
          {r.from && <s className="mu">{r.from}</s>}
          {r.from && r.to ? ' → ' : ''}
          <b>{r.to}</b>
          {r.why && <div className="mu" style={{ fontSize: 12 }}>{r.why}</div>}
        </div>
      ))}
      <div className="wb">
        <button type="button" disabled={answer !== undefined} onClick={() => reply('Approved')}>{answer === 'Approved' ? 'Approved' : 'Approve'}</button>
        {answer !== 'Approved' && <button type="button" className="g" disabled={answer !== undefined} onClick={() => reply('Not this')}>Not this</button>}
      </div>
    </div>
  );
}
