import { useEffect, useMemo } from 'react';
import { saveOnce, update, type Profile } from '../plan';

/**
 * The counterpart of the "ProfileCard" custom widget of the Head Coach: "Here is what we understood". Showing it saves the
 * profile for the Profile screen.
 *
 * Agent props: `{ name, age, heightCm, weightKg, level, goal, constraints: string[] }`.
 */
export function ProfileCard(props: Record<string, unknown>) {
  const profile = useMemo(() => {
    const { __onSubmit: _ignored, ...rest } = props;
    return rest as Profile;
  }, [props]);
  useEffect(() => {
    saveOnce(profile, () => update(() => ({ profile })));
  }, [profile]);
  const n = (v: unknown) => (typeof v === 'number' ? v : '–');
  return (
    <div className="w">
      <div className="h h3" style={{ marginBottom: 8 }}>Here is what we understood</div>
      <div className="st3">
        <div><b>{n(profile.age)}</b><span>Age</span></div>
        <div><b>{n(profile.heightCm)}</b><span>cm</span></div>
        <div><b>{n(profile.weightKg)}</b><span>kg</span></div>
      </div>
      {profile.goal && <p style={{ margin: '10px 0 8px', fontSize: 14 }}>{profile.goal}</p>}
      <div className="chips">
        {[profile.level, ...(profile.constraints ?? [])].filter(Boolean).map((c) => (
          <span key={c} className="chip">{c}</span>
        ))}
      </div>
    </div>
  );
}
