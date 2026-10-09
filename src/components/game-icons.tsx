import type { harmTracks } from "@/lib/sheet";

// Original woodland tokens: bandaged wound, fading flame, and empty satchel.
export function HarmIcon({ track }: { track: (typeof harmTracks)[number] }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className="harm-icon"
    >
      <g
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {track === "injury" ? (
          <>
            <path
              d="m11 5 24 24-6 6L5 11Z"
              fill="currentColor"
              fillOpacity=".14"
            />
            <path
              d="M29 5 5 29l6 6L35 11Z"
              fill="var(--token-paper, #faf0d8)"
            />
            <path
              d="m17 14 9 9-3 3-9-9Z"
              fill="currentColor"
              fillOpacity=".25"
            />
            <path d="m27 11 1 1m-17 15 1 1m-1-16 1-1m16 17-1 1" />
          </>
        ) : track === "exhaustion" ? (
          <>
            <path
              d="M21 4c3 9-6 10-2 17 4-1 7-5 7-8 7 8 10 16 3 21-6 5-19 1-20-7-1-6 3-10 7-13-1 6 2 6 2 6-2-6 5-9 3-16Z"
              fill="currentColor"
              fillOpacity=".16"
            />
            <path d="M21 24c-5 4-6 8-1 10 6 0 6-5 1-10Z" fill="currentColor" />
            <path d="m6 8 2 3m24-6-2 4" />
          </>
        ) : (
          <>
            <path
              d="m13 6 6 2 8-2-2 9c8 6 10 15 6 18-6 4-18 3-22-1-4-5 1-13 7-17Z"
              fill="currentColor"
              fillOpacity=".14"
            />
            <path d="m14 14 12 1m-12 3 12-1m-6 2-2 5m5-5 4 4M12 29q8 5 16-1" />
            <path d="m8 5-3-2m26 8 4-2" />
          </>
        )}
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
