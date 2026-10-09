// Slightly different pen outlines keep a row from looking mechanically stamped.
const harmOutlines = [
  "M6 5Q22 3 41 5Q44 19 42 41Q25 44 5 41Q3 24 6 5Z",
  "M5 6Q24 4 41 4Q43 23 41 42Q22 41 6 43Q4 25 5 6Z",
  "M7 4Q24 6 42 5Q41 23 43 40Q25 43 5 42Q6 23 7 4Z",
];

export function HarmBox({ variant = 0 }: { variant?: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="harm-box"
    >
      <path
        className="harm-box-paper"
        d={harmOutlines[variant % harmOutlines.length]}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 7Q23 5 37 7M44 12l-1 22M9 44q15 1 28-1M4 13l-1 19"
        stroke="currentColor"
        strokeWidth=".7"
        strokeLinecap="round"
        opacity=".4"
      />
      <g className="harm-mark">
        <g fill="currentColor">
          <path d="m12 10 3 1 1-1 7 9 7 8 7 7-1 3-3-1-1 1-9-11-7-8-5-6Z" />
          <path d="m34 10 3 2-1 3-8 9-6 5-8 9-3-1 1-4 8-9 8-7 5-7Z" />
        </g>
        <path
          d="m13 14 8 9m7 8 5 5M33 14l-8 9m-7 7-4 5"
          stroke="var(--harm-tint)"
          strokeWidth=".8"
          strokeLinecap="round"
          opacity=".7"
        />
      </g>
    </svg>
  );
}

export function DiceIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="dice-icon"
    >
      <g stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="m26 4 17 8-2 19-17-7Z" fill="currentColor" fillOpacity=".12" />
        <path
          d="m7 16 19-4 10 17-9 15-21-9Z"
          fill="var(--token-paper, #faf0d8)"
        />
        <path d="m7 16 20 7 9 6M27 23v21" />
      </g>
      <g fill="currentColor">
        <circle cx="13" cy="23" r="2" />
        <circle cx="20" cy="33" r="2" />
        <circle cx="13" cy="31" r="2" />
        <circle cx="20" cy="25" r="2" />
        <circle cx="32" cy="13" r="2" />
        <circle cx="37" cy="22" r="2" />
      </g>
      <path
        d="m5 6 1 5M3 9l5-1m33 28 3 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const pips = [
  [],
  [4],
  [0, 8],
  [0, 4, 8],
  [0, 2, 6, 8],
  [0, 2, 4, 6, 8],
  [0, 2, 3, 5, 6, 8],
];
export function DieFace({ value }: { value: number }) {
  return (
    <svg viewBox="0 0 120 132" className="die-face" aria-hidden="true">
      <path
        d="M9 28 27 9h69l17 20v73l-18 21H25L9 104Z"
        fill="#b99350"
        stroke="#493c29"
        strokeWidth="2"
      />
      <path d="m9 28 18-19h69l-17 20Z" fill="#fff1c7" />
      <path d="m94 29 19-1v74l-18 21Z" fill="#9d713e" />
      <rect
        x="7"
        y="27"
        width="89"
        height="96"
        rx="15"
        fill="#f7e6bc"
        stroke="#493c29"
        strokeWidth="2"
      />
      <rect
        x="13"
        y="33"
        width="77"
        height="84"
        rx="11"
        fill="none"
        stroke="#d5b982"
      />
      {pips[value].map((p) => (
        <circle
          key={p}
          cx={29 + (p % 3) * 23}
          cy={51 + Math.floor(p / 3) * 24}
          r="6"
          fill="#3d4c3a"
        />
      ))}
      <path
        d="m30 17 47 0m25 24v47"
        stroke="#fff5d7"
        strokeWidth="2"
        opacity=".6"
      />
    </svg>
  );
}

// Original ink-and-ochre coin stack, matching the sheet's woodland symbols.
export function CoinIcon() {
  return (
    <svg
      className="coin-icon"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g
        stroke="#493c29"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 39v10c0 6 32 6 32 0V39" fill="#bb873e" />
        <ellipse cx="24" cy="39" rx="16" ry="6" fill="#e4bc68" />
        <path d="M9 45c6 5 23 6 30 0m-25 0v5m9-3v6m9-7v5" />
        <path d="M28 31v10c0 6 29 6 29 0V31" fill="#b8833c" />
        <ellipse cx="42.5" cy="31" rx="14.5" ry="6" fill="#efd18a" />
        <path d="m34 37v6m9-6v8m8-9v6" />
        <circle cx="28" cy="22" r="15" fill="#d9a84d" />
        <circle cx="28" cy="22" r="11" stroke="#f4d994" />
        <path d="m28 13-6 9 6 9 6-9Z" fill="#f5dda0" />
        <path d="m28 17-2 5 2 5m-20-7-3-2m39-7 3-4M46 51l3 3" />
      </g>
    </svg>
  );
}
