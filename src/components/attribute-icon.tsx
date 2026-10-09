import type { stats } from "@/lib/sheet";

// Original small-format woodland symbols, drawn in SVG to stay crisp on iPad.
export default function AttributeIcon({
  stat,
}: {
  stat: (typeof stats)[number];
}) {
  return (
    <svg
      className="attribute-icon"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g
        stroke="#302e22"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {stat === "Charm" && (
          <>
            <path
              d="M9 11 16 5 21 12 28 11 35 5 39 15 36 31 25 43 12 33Z"
              fill="#dc6631"
            />
            <path d="m12 16 11 3 12-3-3 15-8 8-8-8Z" fill="#ffd28a" />
            <path d="m13 21 6-1-2 5-4-1Zm15-1 6 1-1 3-4 1Z" fill="#302e22" />
            <path d="m21 29 3 2 4-3M20 34q5 3 9-2M10 12l4 2m21-4-3 3" />
          </>
        )}
        {stat === "Cunning" && (
          <>
            <path
              d="m5 16 4-9 12 7 7-1 13-7-2 15-7 13-10 7L9 30Z"
              fill="#519653"
            />
            <path d="M7 23q16-18 33-2-13 19-33 2Z" fill="#ffe29a" />
            <path d="M23 15q-6 9 1 17 8-9-1-17Z" fill="#302e22" />
            <path d="m8 11 6 6m20-2 3-5M14 32l5 2m10-1-4 5" />
            <path d="m27 18 2 3" stroke="#fff5d8" />
          </>
        )}
        {stat === "Finesse" && (
          <>
            <path
              d="M10 36C6 22 22 4 39 5l-4 14-6 1 2 4-9 5-1 7Z"
              fill="#319da9"
            />
            <path d="m10 43 22-29M14 33l-2-8m8 2 11-3m-7-3-1-8M29 17l7-3" />
            <path d="m12 38 5-2" stroke="#d65c2f" strokeWidth="3" />
            <path d="m29 8 5-1" stroke="#fff0bf" />
          </>
        )}
        {stat === "Luck" && (
          <>
            <path
              d="m11 21 23-4 4 8c2 9-7 15-15 18-10-5-14-11-12-22Z"
              fill="#efb52f"
            />
            <path d="M8 23C5 9 27 6 34 12l4 9-14 5Z" fill="#739137" />
            <path d="m21 12 1-8 7-1M13 16l3 5m5-8 3 10m4-10 5 8" />
            <path d="m15 29 3 5m3 3 3 1" stroke="#f5e6b4" />
            <path d="m40 5-1 5m-2-3 5 1" />
          </>
        )}
        {stat === "Might" && (
          <>
            <path d="m13 43-5-4L30 7l5 4Z" fill="#cc853a" />
            <path d="m25 9 7-5 3 6 9 2-4 15-13-7-7-1Z" fill="#68999e" />
            <path d="m38 13-2 10 4 4 4-15Z" fill="#e3eee0" />
            <path d="m26 12 7 5m-13 9 5 3m-8 1 5 3" />
            <path d="m7 15-3-2m5-5-1-4" stroke="#cc542c" />
          </>
        )}
      </g>
    </svg>
  );
}
