import { useEffect, useMemo } from 'react';
import { saveOnce, update, type Food } from '../plan';

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/**
 * The counterpart of the "FoodWeek" custom widget of the Head Coach. Showing it saves the week for the Food screen.
 *
 * Agent props: `{ rules: string[], meals: [{ day, lunch, dinner }], shop: string[] }`.
 */
export function FoodWeek(props: Record<string, unknown>) {
  const food = useMemo<Food>(
    () => ({
      rules: strings(props['rules']),
      meals: Array.isArray(props['meals']) ? (props['meals'] as Food['meals']).filter((m) => m && typeof m.day === 'string') : [],
      shop: strings(props['shop']),
    }),
    [props],
  );
  useEffect(() => {
    if (food.rules.length || food.meals.length) saveOnce(food, () => update(() => ({ food })));
  }, [food]);
  return (
    <div className="w">
      <div className="h h3" style={{ marginBottom: 8 }}>Your food week</div>
      {food.rules.map((r) => (
        <div key={r} className="l" style={{ justifyContent: 'flex-start' }}>
          <span style={{ color: 'var(--ok)', fontWeight: 800 }}>✓</span>
          <span style={{ color: 'var(--tx)', textAlign: 'left' }}>{r}</span>
        </div>
      ))}
    </div>
  );
}
