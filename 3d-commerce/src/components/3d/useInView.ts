"use client";

import { useEffect, useRef, useState } from "react";

export function useInView<T extends Element>(margin = "200px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: margin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [margin]);

  return [ref, inView] as const;
}
