"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * IntersectionObserver hook that returns a *callback ref* (avoiding the
 * react-hooks/refs rule that flags `ref.current` reads from JSX `ref={...}`)
 * plus the current intersecting flag.
 *
 *   const { setRef, isIntersecting } = useIntersection({ rootMargin: "400px" });
 *   return <div ref={setRef} />;
 *
 * Options are read on mount and when rootMargin/threshold change. Don't pass
 * an inline object that changes every render unless you actually want to
 * re-observe.
 */
export function useIntersection(options?: IntersectionObserverInit): {
  setRef: (node: HTMLDivElement | null) => void;
  isIntersecting: boolean;
} {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const rootMargin = options?.rootMargin ?? "200px";
  const threshold = options?.threshold ?? 0;
  const root = options?.root ?? null;

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsIntersecting(entry.isIntersecting);
        }
      },
      { rootMargin, threshold, root }
    );
    observerRef.current = observer;
    const current = nodeRef.current;
    if (current) observer.observe(current);
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [rootMargin, threshold, root]);

  const setRef = useCallback((node: HTMLDivElement | null) => {
    const observer = observerRef.current;
    if (nodeRef.current && observer) observer.unobserve(nodeRef.current);
    nodeRef.current = node;
    if (node && observer) observer.observe(node);
  }, []);

  return { setRef, isIntersecting };
}
