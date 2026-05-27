import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width:767px)";

function getIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

export function useResponsive() {
  const [isMobile, setIsMobile] = useState<boolean>(getIsMobile);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(MOBILE_QUERY);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    mediaQueryList.addEventListener("change", handleChange);

    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, []);

  return { isMobile };
}
