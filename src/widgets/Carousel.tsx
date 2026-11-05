import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Exercises side by side. On a phone the finger swipes them; with a mouse, the arrows do. */
export function Carousel({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = () => {
    const el = ref.current;
    if (el) setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const seen = new ResizeObserver(measure);
    seen.observe(el);
    return () => seen.disconnect();
  }, [children]);

  const move = (direction: number) => ref.current?.scrollBy({ left: direction * 186, behavior: 'smooth' });
  return (
    <div className="car">
      <div ref={ref} className="xr" onScroll={measure}>{children}</div>
      {edges.left && <button type="button" className="car__arrow car__arrow--left" aria-label="Previous exercise" onClick={() => move(-1)}>‹</button>}
      {edges.right && <button type="button" className="car__arrow car__arrow--right" aria-label="Next exercise" onClick={() => move(1)}>›</button>}
    </div>
  );
}
