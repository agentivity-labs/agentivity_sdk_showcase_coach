import { useEffect, useState, type ReactNode } from 'react';
import { ExerciseFigure, MuscleMap, Thumb } from '../figure/ExerciseFigure';
import { EXERCISES, WEEK, archivePlan, clearDemo, dayOf, finishSession, kilos, loadTrend, musclesOf, shiftNumbers, thisWeek, update, useApp, type PlanDay, type PlanExercise } from '../plan';
import type { ChatContext } from './CoachChat';

const count = (n: number) => `${n} exercise${n === 1 ? '' : 's'}`;

export type Screen = 'home' | 'plan' | 'food' | 'prog' | 'profile' | 'today' | 'exercise' | 'session';
export interface Nav {
  to: (s: Screen, day?: string) => void;
  chat: (c: ChatContext) => void;
  show: (e: { exercise: PlanExercise; back: Screen }) => void;
}

const ICONS: Record<string, ReactNode> = {
  home: <path d="M3 11l9-8 9 8v9h-6v-6H9v6H3z" />,
  plan: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  food: <path d="M7 3v8a3 3 0 0 0 3 3v7M7 3v5M10 3v5M4 3v5a3 3 0 0 0 3 3M17 3c-2 2-3 5-3 8h3v10" />,
  prog: <path d="M3 20V4M3 20h18M7 15l4-4 3 3 6-7" />,
};
export const Back = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14.500 5.500L8 12l6.500 6.500" />
  </svg>
);
const TileIcon = ({ children }: { children: ReactNode }) => (
  <span className="ti">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
  </span>
);
const Spark = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l2.2 7.3L21.5 12l-7.3 2.2L12 21.5l-2.2-7.3L2.500 12l7.300-2.700zM19 2l.8 2.200L22 5l-2.200.8L19 8l-.8-2.200L16 5l2.200-.8z" />
  </svg>
);
const Plate = ({ a = '#7ED6A5', b = '#FFC46B', c = '#FF8E72' }) => (
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="30" fill="#F1F0F8" />
    <circle cx="32" cy="32" r="24" fill="#fff" />
    <path d="M32 32L32 9A23 23 0 0 1 54 38Z" fill={a} />
    <path d="M32 32L54 38A23 23 0 0 1 14 46Z" fill={b} />
    <path d="M32 32L14 46A23 23 0 0 1 32 9Z" fill={c} />
    <circle cx="32" cy="32" r="6" fill="#F4E9D8" />
  </svg>
);

function NavBar({ on, nav }: { on: Screen; nav: Nav }) {
  const item = (id: Screen, label: string) => (
    <button type="button" className={on === id ? 'on' : ''} aria-label={label} onClick={() => nav.to(id)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[id]}</svg>
    </button>
  );
  return (
    <div className="nav">
      {item('home', 'Home')}
      {item('plan', 'Plan')}
      <button type="button" aria-label="Your team" onClick={() => nav.chat({ suggestions: ['Only 20 minutes today', 'Show me a deadlift', 'This week I am away'] })}>
        <span className="fab"><Spark /></span>
      </button>
      {item('food', 'Food')}
      {item('prog', 'Stats')}
    </div>
  );
}

const line = (e: PlanExercise) => (
  <span className="sp">
    {e.sets ? <span><em>{e.sets}</em> sets</span> : null}
    {e.reps ? <span><em>{e.reps}</em></span> : null}
    {e.load ? <span><em>{e.load}</em></span> : null}
    {e.rest ? <span>Rest <em>{e.rest}</em></span> : null}
  </span>
);
function ExRow({ e, onOpen }: { e: PlanExercise; onOpen: () => void }) {
  return (
    <button type="button" className="ex" onClick={onOpen}>
      <Thumb id={e.id} />
      <span style={{ minWidth: 0, flex: 1 }}>
        <b>{EXERCISES[e.id].n}{e.tag && <span className="bdg">{e.tag}</span>}</b>
        {line(e)}
      </span>
    </button>
  );
}

function useWeek() {
  const app = useApp();
  const week = thisWeek();
  const planned = week.filter((d) => dayOf(app.plan, d.name));
  const started = app.plan?.startedOn ?? '';
  const missed = planned.find((d) => d.isPast && !app.done[d.iso] && d.iso >= started);
  const next = planned.find((d) => !d.isPast && !app.done[d.iso]);
  const today = week.find((d) => d.isToday)!;
  return { app, week, planned, missed, next, today };
}

function Hero({ figure, tag, title, sub, action, onAction }: { figure: string; tag: string; title: string; sub: string; action: string; onAction: () => void }) {
  return (
    <div className="hero">
      <div className="scn"><ExerciseFigure id={figure} /></div>
      <div className="tx">
        <span className="tagp">{tag}</span>
        <h2 className="h h2" style={{ marginTop: 7 }}>{title}</h2>
      </div>
      <div className="go">
        <span className="mu">{sub}</span>
        <button type="button" onClick={onAction}>{action}</button>
      </div>
    </div>
  );
}

function WeekStrip({ active, onPick }: { active?: string; onPick: (day: string) => void }) {
  const { app, week } = useWeek();
  return (
    <div className="wk">
      {week.map((d) => (
        <button key={d.name} type="button" className={`wd ${dayOf(app.plan, d.name) ? 'hs ' : ''}${app.done[d.iso] ? 'd ' : ''}${active === d.name ? 'on' : ''}`} onClick={() => onPick(d.name)}>
          {d.name[0]}<b>{d.date}</b><i />
        </button>
      ))}
    </div>
  );
}

/** Home leads with the moment: today's session, a session left halfway, a miss, a rest day, the review, the end of the plan. */
function MomentHero({ nav }: { nav: Nav }) {
  const { app, planned, missed, next, today } = useWeek();
  const plan = app.plan!;
  const figureOf = (d?: PlanDay) => d?.exercises[0]?.id ?? 'walk';
  if (app.session) {
    const d = dayOf(plan, app.session.day);
    if (d) return <Hero figure={d.exercises[app.session.index]?.id ?? 'walk'} tag="In progress" title={d.focus ?? 'Session'} sub={`${d.exercises.length - app.session.index} exercises left`} action="Continue" onAction={() => nav.to('session')} />;
  }
  const total = (plan.weeks ?? 0) * plan.days.length;
  if (total && app.log.length >= total) return <Hero figure="deadlift" tag="Plan complete" title="What’s next?" sub="Your results are in" action="Next plan" onAction={() => nav.chat({ about: 'New plan', suggestions: ['I want a new goal'] })} />;
  if (missed) {
    const d = dayOf(plan, missed.name)!;
    return <Hero figure={figureOf(d)} tag="Missed" title={`You missed ${d.focus ?? missed.name}`} sub="Want to rearrange?" action="Rearrange" onAction={() => nav.chat({ about: 'Missed session', send: `I missed my ${missed.name} session (${d.focus ?? ''}). Can we rearrange my week?` })} />;
  }
  if (planned.length && !next) return <Hero figure="press" tag="End of week" title="Your week is ready to review" sub="Your team has notes" action="Review" onAction={() => nav.chat({ about: 'Weekly review', send: 'My week is done. Can you review it and set up next week?' })} />;
  const todays = dayOf(plan, today.name);
  if (todays && next?.iso === today.iso) return <Hero figure={figureOf(todays)} tag={`Today · ${todays.minutes ?? ''} min`} title={todays.focus ?? 'Your session'} sub={count(todays.exercises.length)} action="Start" onAction={() => nav.to('today', today.name)} />;
  return <Hero figure="walk" tag="Rest day" title="Recover today" sub={next ? `Next: ${next.name}, ${dayOf(plan, next.name)?.focus ?? ''}` : 'Enjoy it'} action="Ask team" onAction={() => nav.chat({})} />;
}

export function Welcome({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="s" style={{ background: 'linear-gradient(170deg,#EFEAFF 0%,#FFE9DF 100%)' }}>
      <div style={{ padding: '14px 26px 0' }}>
        <div className="lb">Momentum</div>
        <h1 className="h h1" style={{ marginTop: 12 }}>Four coaches.<br /><span className="ac">One plan.</span></h1>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}><ExerciseFigure id="deadlift" /></div>
      <div style={{ padding: '0 22px 22px' }}>
        <p className="mu" style={{ fontSize: 14.5, margin: '0 0 14px', textAlign: 'center' }}>Talk to your team. It builds every set and every meal, and changes them when your life does.</p>
        <button type="button" className="cta" onClick={onBegin}>Meet your team</button>
      </div>
    </div>
  );
}

export function Home({ nav }: { nav: Nav }) {
  const { app, planned, next } = useWeek();
  const done = planned.filter((d) => app.done[d.iso]).length;
  const pc = planned.length ? Math.round((done / planned.length) * 100) : 0;
  const tonight = app.food?.meals.find((m) => m.day === thisWeek().find((d) => d.isToday)?.name) ?? app.food?.meals[0];
  const name = app.profile?.name;
  return (
    <div className="s">
      <div className="top">
        <div>
          <div className="mu">{app.plan?.title}</div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>Hi{name ? `, ${name}` : ''}</div>
        </div>
        <button type="button" className="av" onClick={() => nav.to('profile')} aria-label="Profile">{name?.[0] ?? '?'}</button>
      </div>
      <div className="sc">
        <MomentHero nav={nav} />
        <button type="button" className="ask" onClick={() => nav.chat({ suggestions: ['Only 20 minutes today', 'Show me a deadlift'] })}><Spark />Ask, change, show me…</button>
        <WeekStrip active={next?.name} onPick={(d) => nav.to('plan', d)} />
        <div className="tl">
          <button type="button" className="tile" onClick={() => nav.to('plan')}>
            <span className="ring" style={{ ['--p' as string]: pc }} />
            <span><b>This week</b><br /><small>{done} of {planned.length} sessions</small></span>
          </button>
          <button type="button" className="tile" onClick={() => nav.to('plan', 'plans')}>
            <TileIcon><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M9 8h6M9 12h6M9 16h3" /></TileIcon>
            <span><b>My plans</b><br /><small>{app.past.length ? `${app.past.length + 1} plans so far` : 'Review or build'}</small></span>
          </button>
          <button type="button" className="tile" onClick={() => nav.to('plan', 'cal')}>
            <TileIcon>{ICONS.plan}</TileIcon>
            <span><b>Planning</b><br /><small>{next ? `Next: ${next.name} ${next.date}` : 'Week complete'}</small></span>
          </button>
          <button type="button" className="tile" onClick={() => nav.to('prog')}>
            <TileIcon>{ICONS.prog}</TileIcon>
            <span><b>Progression</b><br /><small>{app.log.length} session{app.log.length === 1 ? '' : 's'} done</small></span>
          </button>
        </div>
        {tonight ? (
          <button type="button" className="ml" onClick={() => nav.to('food')} style={{ width: '100%', textAlign: 'left' }}>
            <Plate /><span><b style={{ fontSize: 14.5 }}>{tonight.dinner}</b><br /><span className="mu">Tonight’s dinner</span></span>
          </button>
        ) : (
          <button type="button" className="ml" onClick={() => nav.chat({ about: 'Food', send: 'Please build my food week from what you know about me.' })} style={{ width: '100%', textAlign: 'left' }}>
            <Plate /><span><b style={{ fontSize: 14.5 }}>Build my food week</b><br /><span className="mu">From your own rules</span></span>
          </button>
        )}
      </div>
      <NavBar on="home" nav={nav} />
    </div>
  );
}

export function Today({ day, nav }: { day: string; nav: Nav }) {
  const { app, week } = useWeek();
  const d = dayOf(app.plan, day);
  if (!d) return null;
  const date = week.find((w) => w.name === day);
  return (
    <div className="s">
      <div className="hero" style={{ borderRadius: 0, height: 252, flex: 'none' }}>
        <div className="scn"><ExerciseFigure id={d.exercises[0]?.id ?? 'walk'} /></div>
        <div className="tx"><button type="button" className="bk" onClick={() => nav.to('home')} aria-label="Back"><Back /></button></div>
        <div className="tx tx--low">
          <span className="tagp">{day} · {d.minutes ?? ''} min</span>
          <h2 className="h h2" style={{ marginTop: 6 }}>{d.focus}</h2>
        </div>
      </div>
      <div className="sc" style={{ paddingTop: 12, paddingBottom: 12 }}>
        {d.exercises.map((e, i) => <ExRow key={`${e.id}-${i}`} e={e} onOpen={() => nav.show({ exercise: e, back: 'today' })} />)}
        <button type="button" className="chg" style={{ textAlign: 'left' }} onClick={() => nav.chat({ about: 'Today’s session', suggestions: ['Only 20 minutes today', 'I feel tired, make it easier'] })}>Change today’s session</button>
      </div>
      <div style={{ padding: '0 16px 16px', flex: 'none' }}>
        <button
          type="button"
          className="cta"
          disabled={date ? !!app.done[date.iso] : false}
          onClick={() => {
            update(() => ({ session: { day, index: 0, sets: {} } }));
            nav.to('session');
          }}
        >
          {date && app.done[date.iso] ? 'Done' : 'Start session'}
        </button>
      </div>
    </div>
  );
}

export function PlanScreen({ nav, start }: { nav: Nav; start?: string }) {
  const { app, week, next } = useWeek();
  const [seg, setSeg] = useState(start === 'cal' || start === 'plans' || start === 'lib' ? start : 'week');
  const [day, setDay] = useState(start && WEEK.includes(start) ? start : (next?.name ?? app.plan?.days[0]?.day));
  const [q, setQ] = useState('');
  const x = day ? dayOf(app.plan, day) : undefined;
  const date = week.find((w) => w.name === day);
  const lib = Object.keys(EXERCISES).filter((k) => `${EXERCISES[k].n} ${musclesOf(k)}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="s">
      <div style={{ padding: '6px 16px 8px', flex: 'none' }}>
        <div className="r" style={{ marginBottom: 9 }}><h1 className="h h2">My plan</h1></div>
        <div className="tabs">
          {[['week', 'Week'], ['cal', 'Planning'], ['plans', 'My plans'], ['lib', 'Library']].map(([id, label]) => (
            <button key={id} type="button" className={seg === id ? 'on' : ''} onClick={() => setSeg(id)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="sc">
        {seg === 'week' && (
          <>
            <WeekStrip active={day} onPick={setDay} />
            {x ? (
              <>
                <div className="r">
                  <div>
                    <h2 className="h h3">{x.focus}</h2>
                    <div className="mu">{day} · {x.minutes ?? ''} min · {count(x.exercises.length)}{date && app.done[date.iso] ? ' · Done' : ''}</div>
                  </div>
                  <button type="button" className="chg" onClick={() => nav.chat({ about: `About: ${day}`, suggestions: ['Replace an exercise', 'More legs', 'Less on this day'] })}>Change</button>
                </div>
                {x.exercises.map((e, i) => <ExRow key={`${e.id}-${i}`} e={e} onOpen={() => nav.show({ exercise: e, back: 'plan' })} />)}
                {!(date && app.done[date.iso]) && <button type="button" className="cta" onClick={() => nav.to('today', day)}>Start session</button>}
              </>
            ) : (
              <div className="c"><div className="h h3">Rest day</div><p className="mu" style={{ margin: '6px 0 0' }}>Recovery is part of the plan.</p></div>
            )}
          </>
        )}
        {seg === 'cal' && (
          <>
            <div className="r">
              <h2 className="h h3">{monthName()}</h2>
              <button type="button" className="chg" onClick={() => nav.chat({ about: 'Planning', suggestions: ['Move a session to another day', 'I am away next week', 'I am ill this week'] })}>Move a session</button>
            </div>
            <div className="days">
              {week.map((w) => {
                const y = dayOf(app.plan, w.name);
                const state = app.done[w.iso] ? 'd' : y ? 'hs' : '';
                return (
                  <button
                    key={w.name}
                    type="button"
                    className={`dayr ${state}`}
                    disabled={!y}
                    onClick={() => {
                      setDay(w.name);
                      setSeg('week');
                    }}
                  >
                    <span className="dayr__date"><small>{w.name}</small><b>{w.date}</b></span>
                    <span className="dayr__text">
                      <b>{y ? y.focus : 'Rest'}</b>
                      {y && <small>{y.minutes ? `${y.minutes} min · ` : ''}{count(y.exercises.length)}{app.done[w.iso] ? ' · Done' : ''}</small>}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mu">Moving one session can change the load of the week, so your team handles it.</div>
          </>
        )}
        {seg === 'plans' && (
          <>
            <div className="c" style={{ borderColor: 'rgba(122,92,250,.5)' }}>
              <div className="lb ac">Active</div>
              <h2 className="h h3" style={{ marginTop: 4 }}>{app.plan?.title}</h2>
              {(app.plan?.goal ?? app.profile?.goal) && <p className="mu" style={{ margin: '4px 0 8px' }}>{app.plan?.goal ?? app.profile?.goal}</p>}
              <div className="l"><span>Sessions</span><span>{app.plan?.days.length} a week</span></div>
              {app.plan?.weeks && <div className="l"><span>Length</span><span>{app.plan.weeks} weeks</span></div>}
              <div className="wb"><button type="button" className="g" onClick={() => nav.chat({ about: 'Your plan', suggestions: ['How is my plan built?', 'Make it harder'] })}>Review with my team</button></div>
            </div>
            {app.past.map((p) => <div key={p} className="c"><div className="lb">Past</div><b>{p}</b></div>)}
            <button
              type="button"
              className="cta"
              onClick={() => {
                archivePlan();
                nav.chat({ about: 'New plan', suggestions: ['Now I want to run a half marathon', 'I want to build muscle'] });
              }}
            >
              Build a new plan
            </button>
          </>
        )}
        {seg === 'lib' && (
          <>
            <input className="ask" style={{ color: 'var(--tx)', border: 0 }} aria-label="Search exercises" placeholder={`Search ${lib.length} exercises`} value={q} onChange={(e) => setQ(e.target.value)} />
            {lib.map((k) => (
              <button key={k} type="button" className="ex" onClick={() => nav.show({ exercise: { id: k }, back: 'plan' })}>
                <Thumb id={k} /><span><b>{EXERCISES[k].n}</b><span className="sp"><span>{musclesOf(k)}</span></span></span>
              </button>
            ))}
            <button type="button" className="cta g" onClick={() => nav.chat({ about: 'Library', suggestions: ['Which exercise should I add?'] })}>Ask your team to choose for you</button>
          </>
        )}
      </div>
      <NavBar on="plan" nav={nav} />
    </div>
  );
}

export function ExerciseDetail({ exercise: e, onBack, nav }: { exercise: PlanExercise; onBack: () => void; nav: Nav }) {
  const m = EXERCISES[e.id];
  return (
    <div className="s">
      <div className="rn">
        <div className="scn"><ExerciseFigure id={e.id} /></div>
        <div className="rntop"><button type="button" className="bk" onClick={onBack} aria-label="Back"><Back /></button></div>
      </div>
      <div className="sc" style={{ paddingBottom: 14 }}>
        <div><div className="lb">{musclesOf(e.id)}</div><h2 className="h h2">{m.n}</h2></div>
        {e.sets && (
          <>
            <div className="st3 st3--short">
              <div><b>{e.sets}</b><span>Sets</span></div>
              <div><b>{e.reps}</b><span>Reps</span></div>
              <div><b>{e.rest ?? '–'}</b><span>Rest</span></div>
            </div>
            {e.load && <div className="c"><div className="lb">Load</div><p style={{ margin: '4px 0 0', fontSize: 14.5, lineHeight: 1.45 }}>{e.load}</p></div>}
          </>
        )}
        <MuscleMap id={e.id} />
        <div className="c">{m.cue.map((c, i) => <div key={c} className="l"><span>{i + 1}. {c}</span><span /></div>)}</div>
        {e.why && <div className="c"><div className="lb">Why this one</div><p style={{ margin: '5px 0 0', fontSize: 14 }}>{e.why}</p></div>}
        <button type="button" className="cta g" onClick={() => nav.chat({ about: m.n, suggestions: [`Make ${m.n} easier`, `Add ${m.n} to my plan`, `Replace ${m.n}`] })}>Ask about it, or change it</button>
      </div>
    </div>
  );
}

const monthName = () => new Date().toLocaleDateString('en-GB', { month: 'long' });

const restSeconds = (rest?: string) => {
  const n = parseFloat(rest ?? '');
  if (!n) return 0;
  return /min/.test(rest ?? '') ? n * 60 : n;
};

/** The one place with no chat in the way: big buttons, hands busy. Any change opens the chat with the exercise in context. */
export function SessionRunner({ nav }: { nav: Nav }) {
  const { app, week } = useWeek();
  const s = app.session;
  const d = s ? dayOf(app.plan, s.day) : undefined;
  const [rest, setRest] = useState(0);
  useEffect(() => {
    if (rest <= 0) return;
    const t = setTimeout(() => setRest(rest - 1), 1000);
    return () => clearTimeout(t);
  }, [rest]);
  if (!s || !d) return null;
  const e = d.exercises[s.index];
  if (!e) return null;
  const count = e.sets ?? 1;
  const dn = s.sets[s.index] ?? 0;
  const reps = s.adjust?.[s.index]?.reps ?? e.reps;
  const load = s.adjust?.[s.index]?.load ?? e.load;
  const adjust = (change: { reps?: string; load?: string }) =>
    update((st) => ({ session: { ...st.session!, adjust: { ...st.session!.adjust, [s.index]: { ...st.session!.adjust?.[s.index], ...change } } } }));
  const close = () => {
    setRest(0);
    if (s.index >= d.exercises.length - 1) {
      const date = week.find((w) => w.name === s.day)!;
      const sets = Object.values(s.sets).reduce((a, b) => a + b, 0);
      const lifts = d.exercises.map((x, i) => ({ id: x.id, sets: s.sets[i] ?? 0, reps: s.adjust?.[i]?.reps ?? x.reps, load: s.adjust?.[i]?.load ?? x.load })).filter((l) => l.sets > 0);
      const changed = d.exercises.flatMap((x, i) => {
        const a = s.adjust?.[i];
        return a ? [`${EXERCISES[x.id].n}: ${[a.reps, a.load].filter(Boolean).join(', ')} instead of ${[a.reps && x.reps, a.load && x.load].filter(Boolean).join(', ')}`] : [];
      });
      finishSession(`${s.day} · ${date.date}`, date.iso, d.focus ?? 'Session', sets, lifts);
      nav.to('home');
      nav.chat({ about: 'After your session', rate: `I just finished my ${s.day} session, ${d.focus ?? ''}, ${sets} sets done.${changed.length ? ` I changed: ${changed.join('; ')}.` : ''}` });
    } else update((st) => ({ session: { ...st.session!, index: s.index + 1 } }));
  };
  return (
    <div className="s">
      <div className="rn">
        <div className="scn"><ExerciseFigure id={e.id} /></div>
        <div className="rntop">
          <button type="button" className="bk" onClick={() => nav.to('home')} aria-label="Pause and go home"><Back /></button>
          <span className="tagp">{s.index + 1} of {d.exercises.length}</span>
        </div>
      </div>
      <div className="sc" style={{ paddingTop: 12, paddingBottom: 10 }}>
        <div>
          <div className="lb">{musclesOf(e.id)}</div>
          <h2 className="h h2">{EXERCISES[e.id].n}</h2>
        </div>
        <div className="adj">
          {reps && /^\d+(-\d+)?( reps)?$/.test(reps.trim()) && (
            <div>
              <span className="lb">Reps</span>
              <button type="button" aria-label="Fewer reps" onClick={() => adjust({ reps: shiftNumbers(reps, -1) })}>−</button>
              <b>{reps}</b>
              <button type="button" aria-label="More reps" onClick={() => adjust({ reps: shiftNumbers(reps, 1) })}>+</button>
            </div>
          )}
          {kilos(load) !== undefined && (
            <div>
              <span className="lb">Load</span>
              <button type="button" aria-label="Lighter" onClick={() => adjust({ load: `${Math.max(0, kilos(load)! - 2.5)} kg` })}>−</button>
              <b>{kilos(load)} kg</b>
              <button type="button" aria-label="Heavier" onClick={() => adjust({ load: `${kilos(load)! + 2.5} kg` })}>+</button>
            </div>
          )}
          {e.load && !s.adjust?.[s.index]?.load && e.load.replace(/^\s*\d+(\.\d+)?\s*kg[,.]?\s*/i, '') && <p className="mu" style={{ margin: 0, flexBasis: '100%' }}>{e.load.replace(/^\s*\d+(\.\d+)?\s*kg[,.]?\s*/i, '')}</p>}
        </div>
        {rest > 0 && (
          <div className="rest">
            <span>Rest</span><b className="n" style={{ fontSize: 22 }}>{rest} s</b>
            <button type="button" className="chg" style={{ padding: 0 }} onClick={() => setRest(0)}>Skip</button>
          </div>
        )}
        <div className="sets">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className={`set ${i < dn ? 'dn' : ''}`}>
              <span className="mu">Set {i + 1}</span>
              <b style={{ fontSize: 14 }}>{reps}</b>
              <button
                type="button"
                className="tick"
                aria-label={`Set ${i + 1} done`}
                onClick={() => {
                  update((st) => ({ session: { ...st.session!, sets: { ...st.session!.sets, [s.index]: i + 1 } } }));
                  if (i + 1 < count) setRest(restSeconds(e.rest));
                }}
              >
                ✓
              </button>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '0 16px 16px', flex: 'none', display: 'flex', gap: 8 }}>
        <button type="button" className="cta g" style={{ flex: 1, padding: '14px 6px', fontSize: 13.5 }} onClick={() => nav.chat({ about: EXERCISES[e.id].n, send: `I am in my session and the equipment for ${EXERCISES[e.id].n} is taken. What should I do instead?`, suggestions: ['This hurts, what should I do?', 'Too heavy'] })}>Machine taken?</button>
        <button type="button" className="cta" style={{ flex: 1.2, padding: '14px 6px' }} onClick={close}>Close exercise</button>
      </div>
    </div>
  );
}

export function FoodScreen({ nav }: { nav: Nav }) {
  const { food, shop } = useApp();
  const plates = [['#7ED6A5', '#FFC46B', '#FF8E72'], ['#FF8E72', '#7ED6A5', '#FFE08A'], ['#FFC46B', '#A98CFF', '#7ED6A5'], ['#7ED6A5', '#FF8E72', '#FFC46B']];
  return (
    <div className="s">
      <div className="top">
        <h1 className="h h2">Food</h1>
        {food && <button type="button" className="chg" onClick={() => nav.chat({ about: 'Food', suggestions: ['Not this dish on Monday', 'Guests on Saturday'] })}>Change</button>}
      </div>
      <div className="sc">
        {!food ? (
          <div className="c">
            <div className="h h3">Your food week starts with your rules</div>
            <p className="mu" style={{ margin: '7px 0 12px' }}>Write them in plain words, however complex. The Nutrition Coach does the rest.</p>
            <button type="button" className="cta" onClick={() => nav.chat({ about: 'Food', suggestions: ['Vegetarian, no mushrooms, under €8 a meal', 'High protein, I cook on Sundays'] })}>Write my rules</button>
          </div>
        ) : (
          <>
            {food.meals.map((m, i) => (
              <div key={m.day} className="ml">
                <Plate a={plates[i % 4][0]} b={plates[i % 4][1]} c={plates[i % 4][2]} />
                <span style={{ flex: 1 }}><span className="lb">{m.day}</span><br /><b style={{ fontSize: 14.5 }}>{m.dinner}</b><br /><span className="mu">Lunch: {m.lunch}</span></span>
              </div>
            ))}
            {food.shop.length > 0 && (
              <div className="c">
                <div className="r"><b>Shopping list</b><span className="mu">{food.shop.length} items</span></div>
                {food.shop.map((it) => (
                  <button key={it} type="button" className={`shop ${shop[it] ? 'on' : ''}`} onClick={() => update((s) => ({ shop: { ...s.shop, [it]: !s.shop[it] } }))}>
                    <i>{shop[it] ? '✓' : ''}</i>{it}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <NavBar on="food" nav={nav} />
    </div>
  );
}

export function Progression({ nav }: { nav: Nav }) {
  const { app, planned } = useWeek();
  const done = planned.filter((d) => app.done[d.iso]).length;
  const sets = app.log.reduce((n, l) => n + l.sets, 0);
  const goal = app.plan?.goal ?? app.profile?.goal;
  const trend = loadTrend(app.log);
  const kg = trend?.points.map((p) => p.kg) ?? [];
  const low = Math.min(...kg);
  const span = Math.max(...kg) - low || 1;
  const line = kg.map((v, i) => [10 + (i * 260) / Math.max(1, kg.length - 1), 92 - ((v - low) / span) * 74]);
  return (
    <div className="s">
      <div className="top">
        <h1 className="h h2">Progression</h1>
        <button type="button" className="chg" onClick={() => nav.chat({ about: 'Your progress', suggestions: ['Am I on track?', 'Why am I stuck?'] })}>Ask why</button>
      </div>
      <div className="sc">
        <div className="st3">
          <div><b>{done}<small style={{ fontSize: 15, color: 'var(--mu)' }}>/{planned.length}</small></b><span>This week</span></div>
          <div><b>{sets}</b><span>Sets</span></div>
          <div><b>{app.log.length}</b><span>Sessions</span></div>
        </div>
        {goal && (
          <div className="c">
            <div className="lb">Road to your goal</div>
            <p style={{ margin: '5px 0 8px', fontSize: 14 }}>{goal}</p>
            <svg viewBox="0 0 280 110" style={{ width: '100%', display: 'block' }} role="img" aria-label="The planned road to your goal">
              <path d="M6 92C90 86 190 54 272 16" stroke="#C9C7DA" strokeWidth="2.500" strokeDasharray="3 7" fill="none" />
              <circle cx="6" cy="92" r="5.500" fill="#7A5CFA" />
              <circle cx="272" cy="16" r="5.500" fill="#17161F" />
            </svg>
          </div>
        )}
        <div className="c">
          <div className="lb">Your load</div>
          {trend && kg.length > 1 ? (
            <>
              <p style={{ margin: '5px 0 8px', fontSize: 14 }}>{EXERCISES[trend.id].n}: {kg[0]} kg to {kg[kg.length - 1]} kg</p>
              <svg viewBox="0 0 280 110" style={{ width: '100%', display: 'block' }} role="img" aria-label={`Load on ${EXERCISES[trend.id].n}, session by session`}>
                <polyline points={line.map((p) => p.join(',')).join(' ')} stroke="#7A5CFA" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none" />
                {line.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="4.500" fill="#7A5CFA" />)}
              </svg>
            </>
          ) : (
            <p className="mu" style={{ margin: '6px 0 0' }}>Your load curve starts after two sessions.</p>
          )}
        </div>
        <div className="c">
          <b>Sessions</b>
          {app.log.length ? app.log.map((l, i) => <div key={i} className="l"><span>{l.date} · {l.title}{l.rating ? ` · ${l.rating}` : ''}</span><span>{l.sets} sets</span></div>) : <p className="mu" style={{ margin: '6px 0 0' }}>Your sessions appear here, set by set.</p>}
        </div>
      </div>
      <NavBar on="prog" nav={nav} />
    </div>
  );
}

export function ProfileScreen({ nav }: { nav: Nav }) {
  const { profile: p } = useApp();
  return (
    <div className="s">
      <div className="top">
        <button type="button" className="bk" onClick={() => nav.to('home')} aria-label="Back"><Back /></button>
        <span className="lb">What your team knows</span>
        <span style={{ width: 40 }} />
      </div>
      <div className="sc">
        <div className="c"><div className="r"><div><div style={{ fontSize: 20, fontWeight: 700 }}>{p?.name ?? 'You'}</div><div className="mu">{p?.level}</div></div><span className="av">{p?.name?.[0] ?? '?'}</span></div></div>
        <div className="st3">
          <div><b>{p?.age ?? '–'}</b><span>Age</span></div>
          <div><b>{p?.heightCm ?? '–'}</b><span>cm</span></div>
          <div><b>{p?.weightKg ?? '–'}</b><span>kg</span></div>
        </div>
        {p?.goal && <div className="c"><div className="lb">Goal</div><p style={{ margin: '5px 0 0' }}>{p.goal}</p></div>}
        {!!p?.constraints?.length && <div className="c"><div className="lb" style={{ marginBottom: 5 }}>Constraints</div><div className="chips">{p.constraints.map((c) => <span key={c} className="chip">{c}</span>)}</div></div>}
        <button type="button" className="cta" onClick={() => nav.chat({ about: 'Your profile', suggestions: ['I hurt my shoulder', 'I bought dumbbells'] })}>Something changed</button>
        <button type="button" className="chg" onClick={clearDemo}>Start the demo again</button>
      </div>
    </div>
  );
}
