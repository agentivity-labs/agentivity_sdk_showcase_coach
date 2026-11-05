import { useEffect, useRef, useState } from 'react';
import { loadEngine } from './engine';
import { EXERCISES } from '../plan';

interface Engine {
  draw(target: HTMLCanvasElement, key: string, now: number): void;
  thumb(key: string): string;
  muscleMap(key: string): [string, string];
}
const engine = () => loadEngine() as Promise<Engine>;

/** One exercise, moving. The canvas only draws while it is on screen. */
export function ExerciseFigure({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let alive = true;
    let visible = true;
    let raf = 0;
    const seen = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    seen.observe(canvas);
    void engine().then((e) => {
      const loop = (now: number) => {
        if (!alive) return;
        raf = requestAnimationFrame(loop);
        if (visible) e.draw(canvas, id, now);
      };
      raf = requestAnimationFrame(loop);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      seen.disconnect();
    };
  }, [id]);
  return (
    <div className="f3">
      <canvas ref={ref} role="img" aria-label={EXERCISES[id]?.n} />
    </div>
  );
}

const TINTS = ['#E7E0FF', '#CFF3E3', '#FFE1D2', '#D7ECFF', '#FFF0BF'];
export const tintOf = (id: string) => TINTS[Object.keys(EXERCISES).indexOf(id) % 5];

/** A still of the exercise, for long lists. */
export function Thumb({ id }: { id: string }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    let alive = true;
    void engine().then((e) => alive && setSrc(e.thumb(id)));
    return () => {
      alive = false;
    };
  }, [id]);
  return <span className="th" style={{ background: tintOf(id) }}>{src && <img alt="" src={src} />}</span>;
}

/** The muscles an exercise works, front and back. */
export function MuscleMap({ id }: { id: string }) {
  const [map, setMap] = useState<[string, string]>();
  useEffect(() => {
    let alive = true;
    void engine().then((e) => alive && setMap(e.muscleMap(id)));
    return () => {
      alive = false;
    };
  }, [id]);
  if (!map) return null;
  return (
    <div className="mm">
      <div>
        <img alt="Muscles worked, front" src={map[0]} />
        <span>Front</span>
      </div>
      <div>
        <img alt="Muscles worked, back" src={map[1]} />
        <span>Back</span>
      </div>
    </div>
  );
}
