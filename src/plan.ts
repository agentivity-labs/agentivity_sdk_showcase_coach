import { useSyncExternalStore } from 'react';
import data from './figure/exercises.json';

export interface PlanExercise {
  id: string;
  sets?: number;
  reps?: string;
  load?: string;
  rest?: string;
  why?: string;
  /** Set by the app when a new plan changes this exercise. */
  tag?: 'NEW' | 'CHANGED';
}
export interface PlanDay {
  day: string;
  focus?: string;
  minutes?: number;
  exercises: PlanExercise[];
}
export interface Plan {
  title?: string;
  summary?: string;
  goal?: string;
  weeks?: number;
  startedOn?: string;
  days: PlanDay[];
}
export interface Food {
  rules: string[];
  meals: { day: string; lunch?: string; dinner?: string }[];
  shop: string[];
}
export interface Profile {
  name?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  level?: string;
  goal?: string;
  constraints?: string[];
}
export interface Session {
  day: string;
  index: number;
  sets: Record<number, number>;
  /** What the person changed during the session, by exercise. */
  adjust?: Record<number, { reps?: string; load?: string }>;
}
export interface Lift {
  id: string;
  sets: number;
  reps?: string;
  load?: string;
}
export interface LogEntry {
  date: string;
  title: string;
  sets: number;
  lifts?: Lift[];
  rating?: string;
}
interface State {
  plan?: Plan;
  food?: Food;
  profile?: Profile;
  /** ISO date of each session finished. */
  done: Record<string, boolean>;
  session?: Session;
  log: LogEntry[];
  shop: Record<string, boolean>;
  past: string[];
}

export const EXERCISES = data.EX as unknown as Record<string, { n: string; m: string; cue: string[]; hide?: unknown }>;
export const inCatalogue = (id: unknown): id is string => typeof id === 'string' && id in EXERCISES;
const MUSCLE: Record<string, string> = { pec: 'Chest', abs: 'Abs', lats: 'Lats', traps: 'Traps', delt: 'Shoulders', bi: 'Biceps', tri: 'Triceps', quad: 'Quads', ham: 'Hamstrings', glute: 'Glutes', calf: 'Calves' };
const MUS = data.MUS as unknown as Record<string, string[][]>;
export const musclesOf = (id: string) => (MUS[id]?.[0] ?? []).map((m) => MUSCLE[m]).join(', ') || EXERCISES[id]?.m || '';

export const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** This week, Monday first, with real dates. */
export function thisWeek() {
  // In development, ?date=2026-11-05 shows the app on another day, to see each moment of Home.
  const forced = import.meta.env.DEV ? new URLSearchParams(location.search).get('date') : null;
  const now = forced ? new Date(`${forced}T12:00:00`) : new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return WEEK.map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { name, date: d.getDate(), iso: iso(d), isToday: iso(d) === iso(now), isPast: iso(d) < iso(now) };
  });
}
export const dayOf = (plan: Plan | undefined, name: string) => plan?.days.find((d) => d.day === name);

const KEY = 'momentum.state';
const listeners = new Set<() => void>();
function read(): State {
  const empty: State = { done: {}, log: [], shop: {}, past: [] };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty, ...(JSON.parse(raw) as Partial<State>) } : empty;
  } catch {
    return empty;
  }
}
let state = read();

/** What the team and the person built lives here; the screens read it, and only the chat changes the plan. */
export function update(change: (s: State) => Partial<State>) {
  const next = change(state);
  // A widget renders again and again in the chat: writing only real changes keeps the screens from looping on it.
  if (Object.entries(next).every(([k, v]) => JSON.stringify(v) === JSON.stringify(state[k as keyof State]))) return;
  state = { ...state, ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private window: the data still lives for this visit.
  }
  listeners.forEach((l) => l());
}
export function useApp() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

/**
 * Each widget saves what it brought once. The chat keeps old widgets on screen and renders them again: without this, an old
 * plan and the new one would overwrite each other for ever.
 */
const seen = new Set<string>();
export function saveOnce(content: unknown, save: () => void) {
  const key = JSON.stringify(content);
  if (seen.has(key)) return;
  seen.add(key);
  save();
}

/** The agent may say Monday or Day 2: every day ends on a day of the week, because the screens are a real calendar. */
function normaliseDay(day: string, index: number, count: number) {
  const named = WEEK.find((w) => day.toLowerCase().startsWith(w.toLowerCase()));
  if (named) return named;
  const spread: Record<number, string[]> = { 1: ['Mon'], 2: ['Mon', 'Thu'], 3: ['Mon', 'Wed', 'Fri'], 4: ['Mon', 'Tue', 'Thu', 'Sat'], 5: ['Mon', 'Tue', 'Wed', 'Fri', 'Sat'], 6: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };
  return (spread[count] ?? WEEK)[index] ?? WEEK[index % 7];
}

/** Keeps what an agent sent that the app can draw: an exercise must come from the catalogue. */
export function cleanPlan(props: Record<string, unknown>): Plan {
  const days = Array.isArray(props['days']) ? (props['days'] as PlanDay[]).filter((d) => d && typeof d.day === 'string') : [];
  return {
    title: typeof props['title'] === 'string' ? props['title'] : undefined,
    summary: typeof props['summary'] === 'string' ? props['summary'] : undefined,
    goal: typeof props['goal'] === 'string' ? props['goal'] : undefined,
    weeks: typeof props['weeks'] === 'number' ? props['weeks'] : undefined,
    days: days.map((d, i) => ({ ...d, day: normaliseDay(d.day, i, days.length), exercises: (Array.isArray(d.exercises) ? d.exercises : []).filter((e) => e && inCatalogue(e.id)) })),
  };
}

/** A plan shown in the chat replaces the current one. What differs is tagged, as the plan screens show. */
export function savePlan(plan: Plan) {
  update((s) => {
    const old = s.plan;
    if (old && JSON.stringify(old.days.map((d) => [d.day, d.exercises.map((e) => [e.id, e.sets, e.reps, e.load])])) === JSON.stringify(plan.days.map((d) => [d.day, d.exercises.map((e) => [e.id, e.sets, e.reps, e.load])]))) return {};
    const days = plan.days.map((d) => {
      const before = dayOf(old, d.day);
      return {
        ...d,
        exercises: d.exercises.map((e) => {
          if (!old) return e;
          const was = before?.exercises.find((x) => x.id === e.id);
          if (!was) return { ...e, tag: 'NEW' as const };
          return was.sets !== e.sets || was.reps !== e.reps ? { ...e, tag: 'CHANGED' as const } : e;
        }),
      };
    });
    return { plan: { ...plan, days, startedOn: old?.startedOn ?? iso(new Date()) } };
  });
}

/** Moves the current plan to the past: the next plan the team shows starts fresh. */
export function archivePlan() {
  update((s) => (s.plan ? { past: [s.plan.title ?? 'Previous plan', ...s.past], plan: undefined, done: {}, session: undefined } : {}));
}

export const finishSession = (name: string, iso: string, title: string, sets: number, lifts: Lift[]) =>
  update((s) => ({ done: { ...s.done, [iso]: true }, session: undefined, log: [{ date: `${name}`, title, sets, lifts }, ...s.log] }));

export const rateLastSession = (rating: string) => update((s) => (s.log.length ? { log: [{ ...s.log[0], rating }, ...s.log.slice(1)] } : {}));

/** Moves every number of "8-10 reps" or "80 kg" by the same step, and keeps the words around them. */
export function shiftNumbers(text: string, step: number) {
  return text.replace(/\d+(\.\d+)?/g, (n) => String(Math.max(0, Number(n) + step)));
}
export const kilos = (load?: string) => {
  const m = load?.match(/(\d+(?:\.\d+)?)\s*kg/i);
  return m ? Number(m[1]) : undefined;
};

/** Load of the exercise lifted most often, oldest session first: only what the person really did. */
export function loadTrend(log: LogEntry[]) {
  const seen = new Map<string, { date: string; kg: number }[]>();
  [...log].reverse().forEach((entry) =>
    entry.lifts?.forEach((l) => {
      const kg = kilos(l.load);
      if (kg !== undefined) seen.set(l.id, [...(seen.get(l.id) ?? []), { date: entry.date, kg }]);
    }),
  );
  const best = [...seen.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  return best ? { id: best[0], points: best[1] } : undefined;
}

/**
 * What the app knows, sent with a new request: a finished execution cannot be continued, so the team reads this instead.
 * It travels after the mark @context, and the chat never shows it.
 */
export function teamContext() {
  const { profile, plan, food, log, session, past } = state;
  if (!plan && !profile) return '';
  return JSON.stringify({ today: new Date().toDateString(), profile, pastPlans: past, plan: plan && { title: plan.title, goal: plan.goal, weeks: plan.weeks, days: plan.days.map((d) => ({ day: d.day, focus: d.focus, minutes: d.minutes, exercises: d.exercises.map(({ id, sets, reps, load, rest }) => ({ id, sets, reps, load, rest })) })) }, food, sessionsDone: log.length, recentSessions: log.slice(0, 8), sessionInProgress: session?.day });
}

export const clearDemo = () => {
  update(() => ({ plan: undefined, food: undefined, profile: undefined, done: {}, session: undefined, log: [], shop: {}, past: [] }));
};
