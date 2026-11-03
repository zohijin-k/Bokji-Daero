"use client";

import { useCallback, useState } from "react";

/** 요소 크기를 따라가는 ref 콜백. 지도 비율과 하단 시트 높이를 맞출 때 씁니다. */
export function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useCallback((node: T | null) => {
    if (!node) return;
    const update = () => setSize({ width: node.offsetWidth, height: node.offsetHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}
