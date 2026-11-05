import { useState } from 'react';
import { ExerciseFigure, tintOf } from '../figure/ExerciseFigure';
import { Carousel } from './Carousel';
import { EXERCISES, inCatalogue, musclesOf } from '../plan';

interface Option {
  id: string;
  why?: string;
}

/**
 * The counterpart of the "ExerciseChoice" custom widget of the Head Coach. The agent names exercises by catalogue id, never
 * by a drawing: the app owns the animation, so an exercise outside the catalogue cannot appear.
 *
 * Agent props: `{ question?, options: [{ id, why }] }`. The reply is the name of the exercise chosen.
 */
export function ExerciseChoice(props: Record<string, unknown>) {
  const options = Array.isArray(props['options']) ? (props['options'] as Option[]).filter((o) => o && inCatalogue(o.id)) : [];
  const onSubmit = typeof props['__onSubmit'] === 'function' ? (props['__onSubmit'] as (response: string) => void) : undefined;
  const [chosen, setChosen] = useState<string>();
  return (
    <div className="w">
      <div className="h h3">{typeof props['question'] === 'string' ? props['question'] : 'Which one suits you?'}</div>
      <Carousel>
        {options.map((o) => (
          <div key={o.id} className="xc" style={{ opacity: chosen && chosen !== o.id ? 0.45 : 1 }}>
            <div className="xs" style={{ background: tintOf(o.id) }}>
              <ExerciseFigure id={o.id} />
            </div>
            <b>{EXERCISES[o.id].n}</b>
            <span className="q" style={{ color: '#D9592E' }}>{musclesOf(o.id)}</span>
            {o.why && <span className="q">{o.why}</span>}
            {options.length > 1 && (
            <button
              type="button"
              className="xb"
              disabled={chosen !== undefined}
              onClick={() => {
                setChosen(o.id);
                onSubmit?.(EXERCISES[o.id].n);
              }}
            >
              {chosen === o.id ? 'Chosen' : 'This one'}
            </button>
            )}
          </div>
        ))}
      </Carousel>
    </div>
  );
}
