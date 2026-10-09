// Small pen drawings live in section margins, separate from interactive controls.
export function NotebookDoodle({
  kind,
}: {
  kind: "harm" | "dice" | "gear" | "story";
}) {
  return (
    <svg
      className={`notebook-doodle doodle-${kind}`}
      viewBox="0 0 120 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "harm" && (
        <>
          <path d="M60 65C48 55 22 40 30 24c7-14 24-9 30 2 8-15 27-13 32 0 6 16-15 32-32 39Z" />
          <path d="m39 28 35 24 9-13-35-24Z M48 25l17 12m3 2 5 4M48 43l4 3m20-16 3 2M52 51q8 6 13 0M17 21l-5-4m86 37 8 3M19 50l-4 5" />
          <path d="m97 12 2 5 5 1-5 2-1 5-2-5-5-1 5-2Z" />
        </>
      )}
      {kind === "dice" && (
        <>
          <path d="m33 28 34-8 16 18-8 32-37-2Z m0 0 30 12 20-2M63 40l12 30" />
          <path d="M43 29C18 7 35-4 50 24M55 24C47-4 70 0 63 22" />
          <circle cx="44" cy="43" r="2" />
          <circle cx="54" cy="58" r="2" />
          <circle cx="72" cy="47" r="2" />
          <path d="M89 24q10 6 4 19m-1-26q19 13 8 33M18 59l5 3m-2-13-8 2m77 16 11-4" />
        </>
      )}
      {kind === "gear" && (
        <>
          <path d="m36 59 43-47 3 17-36 38Zm-7-5 22 19m-14-9-10 11m-3-5 7 7M69 63q-2-22 16-24 14 2 18 15Z" />
          <path d="m81 61 3 12 9-2-4-13m-12-8 1 1m10-4 1 1m4 5 1 1M11 31q9-11 22-3m-4-5 5 5-5 4" />
          <path d="m100 15 1 5 5 1-5 2-1 5-2-5-5-1 5-2Z" />
        </>
      )}
      {kind === "story" && (
        <>
          <path d="m24 67 7-53q18-9 34 4 15-8 29-3l-5 49q-16-5-29 2-17-9-36 1Z M65 18l-5 48m-21-39 15 2m-17 9 15 2m-17 9 12 2m28-19 11-3m-13 14 10-3" />
          <path d="M88 18q0-15 13-12l-1 10-12 7m5-13 1 1m5 6 6 2m-89 29-5 3m8-16-7-2" />
        </>
      )}
    </svg>
  );
}

export function MasterPortrait() {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <circle cx="40" cy="40" r="37" fill="#d9c49b" />
      <g stroke="#4d493b" strokeWidth="2" strokeLinejoin="round">
        <path d="m20 35-3-23 16 9q7-3 14 0l16-9-3 24-7 18H29Z" fill="#8b8167" />
        <path
          d="M21 28q15-12 19 9 5-21 19-9l-3 16-16 10-16-10Z"
          fill="#f5e9c9"
        />
        <circle cx="30" cy="33" r="4" fill="#4d493b" />
        <circle cx="50" cy="33" r="4" fill="#4d493b" />
        <path d="m36 41 4 6 4-6Z" fill="#c99742" />
        <path
          d="m10 46 20 4 10-4 10 4 20-4v25l-20 3-10-4-10 4-20-3Z"
          fill="#69775b"
        />
        <path d="M30 50v24m20-24v24" />
        <path d="m36 59 4-4 5 6-5 4Z" stroke="#eadab8" />
      </g>
    </svg>
  );
}
