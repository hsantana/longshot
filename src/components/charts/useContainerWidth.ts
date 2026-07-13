"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Measure the rendered width of a container so SVG charts draw at real pixel
 * size instead of scaling a fixed viewBox (which distorts font sizes).
 *
 * Uses a callback ref so the ResizeObserver re-attaches whenever the measured
 * node mounts — important because charts swap the container node between empty
 * and populated states, and a one-shot effect would leave the observer stale
 * (blank chart after toggling back to a state that has data).
 */
export function useContainerWidth<T extends HTMLElement>(): [
  (node: T | null) => void,
  number,
] {
  const [width, setWidth] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(node);
    observerRef.current = observer;
    setWidth(node.getBoundingClientRect().width);
  }, []);

  return [ref, width];
}
