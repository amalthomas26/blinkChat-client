import { useEffect, useRef } from "react";

interface UseInfiniteScrollOptions {
  enabled: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
}

export function useInfiniteScroll({
  enabled,
  isLoading,
  onLoadMore,
  rootMargin = "160px 0px",
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !enabled || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin,
        threshold: 0,
      },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [enabled, isLoading, onLoadMore, rootMargin]);

  return sentinelRef;
}
