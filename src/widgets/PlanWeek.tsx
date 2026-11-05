import { useEffect, useMemo, useState } from 'react';
import { ExerciseFigure, tintOf } from '../figure/ExerciseFigure';
import { Carousel } from './Carousel';
import { EXERCISES, cleanPlan, musclesOf, saveOnce, savePlan } from '../plan';

/**
 * The counterpart of the "PlanWeek" custom widget of the Head Coach: the plan, day by day, in the conversation. Showing it
 * also saves it for the Home and Plan screens, so the chat and the screens never disagree.
 *
 * Agent props: `{ title, summary, goal, weeks, days: [{ day, focus, minutes, exercises: [{ id, sets, reps, load, rest, why }] }] }`.
 */
export function PlanWeek(props: Record<string, unknown>) {
  const plan = useMemo(() => cleanPlan(props), [props]);
  const [open, setOpen] = useState(0);
  useEffect(() => {
    if (plan.days.length) saveOnce(plan, () => savePlan(plan));
  }, [plan]);
  const day = plan.days[open];
  return (
    <div className="w">
      <div className="h h3" style={{ marginBottom: 8 }}>{plan.title ?? 'Your plan'}</div>
      <div className="pds" role="tablist">
        {plan.days.map((d, i) => (
          <button key={d.day} type="button" role="tab" aria-selected={i === open} className={i === open ? 'on' : ''} onClick={() => setOpen(i)}>
            {d.day}
            {d.focus ? ` · ${d.focus}` : ''}
          </button>
        ))}
      </div>
      {day && (
        <Carousel>
          {day.exercises.map((e, i) => (
            <div key={`${e.id}-${i}`} className="xc">
              <div className="xs" style={{ background: tintOf(e.id) }}>
                <ExerciseFigure id={e.id} />
              </div>
              <b>{EXERCISES[e.id].n}</b>
              <span className="q">{[e.sets && e.reps ? `${e.sets} × ${e.reps}` : undefined, e.load].filter(Boolean).join(' · ')}</span>
              <span className="q" style={{ color: '#D9592E' }}>{musclesOf(e.id)}</span>
            </div>
          ))}
        </Carousel>
      )}
      {plan.summary && <p className="mu" style={{ margin: '8px 0 0' }}>{plan.summary}</p>}
    </div>
  );
}
