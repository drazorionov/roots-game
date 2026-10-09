// An inked cross for marked harm boxes; track colors come from the sheet.
export function HarmMark() {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className="harm-mark"
    >
      <path
        d="m8 6 12 11L31 6l3 4-11 11 11 11-4 3-11-11L8 35l-3-4 11-11L5 10Z"
        fill="currentColor"
      />
      <path
        d="m10 10 19 20M29 11 10 30"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
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
