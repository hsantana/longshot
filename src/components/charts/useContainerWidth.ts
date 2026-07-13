"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Measure the rendered width of a container so SVG charts draw at real pixel
 * size instead of scaling a fixed viewBox (which distorts font sizes).
 */
export function useContainerWidth<T extends HTMLElement>(): [
  React.RefObject<T | null>,
  number,
] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
