// BlinkChatLogo — self-contained SVG brand component.
// Keyframes are injected once into <head> via a module-level guard.

let _keyframesInjected = false;

function injectKeyframes(): void {
  if (_keyframesInjected || typeof document === "undefined") return;
  _keyframesInjected = true;
  const style = document.createElement("style");
  style.dataset.bcLogo = "1";
  style.textContent = `
    @keyframes bc-glow {
      0%,100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.55), 0 4px 18px rgba(139,92,246,0.35); }
      50%      { box-shadow: 0 0 0 10px rgba(139,92,246,0),  0 4px 18px rgba(139,92,246,0.35); }
    }
    @keyframes bc-entrance {
      from { opacity: 0; transform: scale(0.78) translateY(-6px); }
      to   { opacity: 1; transform: scale(1)    translateY(0); }
    }
    .bc-logo-glow     { animation: bc-glow 2.6s ease-in-out infinite; }
    .bc-logo-entrance { animation: bc-entrance 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }
  `;
  document.head.appendChild(style);
}

interface BlinkChatLogoProps {
  /** Pixel size of the square container (default 40) */
  size?: number;
  /** Continuous purple pulse-glow ring around the logo */
  animated?: boolean;
  /** One-shot scale-up entrance animation on mount */
  entrance?: boolean;
  className?: string;
}

/**
 * BlinkChat brand logo — purple rounded square with a white speech bubble
 * and three purple dots inside, matching the email verification screenshot.
 *
 * Usage:
 *   <BlinkChatLogo size={38} animated />          // nav rail
 *   <BlinkChatLogo size={56} entrance />          // auth pages
 *   <BlinkChatLogo size={28} />                   // toast icon
 */
export function BlinkChatLogo({
  size = 40,
  animated = false,
  entrance = false,
  className = "",
}: BlinkChatLogoProps): React.ReactElement {
  if (animated || entrance) injectKeyframes();

  const glow = animated ? "bc-logo-glow" : "shadow-[0_4px_18px_rgba(139,92,246,0.3)]";
  const enter = entrance ? "bc-logo-entrance" : "";

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-[22%] bg-[#8b5cf6] ${glow} ${enter} ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: size * 0.58, height: size * 0.58 }}
      >
        {/*
          Speech bubble: rounded rectangle body with a small downward tail
          at the bottom-left corner, matching the email logo shape.
        */}
        <path
          d="M20 2H4C2.895 2 2 2.895 2 4V16C2 17.105 2.895 18 4 18H9.5V22L14.5 18H20C21.105 18 22 17.105 22 16V4C22 2.895 21.105 2 20 2Z"
          fill="white"
        />
        {/* Three typing dots — purple against the white bubble */}
        <circle cx="8.5"  cy="10" r="1.65" fill="#8b5cf6" />
        <circle cx="12"   cy="10" r="1.65" fill="#8b5cf6" />
        <circle cx="15.5" cy="10" r="1.65" fill="#8b5cf6" />
      </svg>
    </div>
  );
}
