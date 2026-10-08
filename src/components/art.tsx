export function Portrait({
  species,
  variant = 0,
}: {
  species: string;
  variant?: number;
}) {
  const rabbit = species === "Rabbit",
    owl = species === "Owl",
    mouse = species === "Mouse",
    raccoon = species === "Raccoon" || species === "Badger";
  const fur = rabbit
    ? "#b3a28d"
    : raccoon
      ? "#8e9187"
      : mouse
        ? "#b39880"
        : owl
          ? "#ae8961"
          : species === "Otter"
            ? "#967757"
            : "#c77e4d";
  return (
    <svg
      viewBox="0 0 300 240"
      role="img"
      aria-label={`${species} woodland adventurer`}
      className={`portrait portrait-${variant % 3}`}
    >
      <circle cx="150" cy="105" r="79" fill="#e5d8b8" opacity=".65" />
      <g stroke="#75866b" strokeWidth="2" fill="#869575" opacity=".65">
        <path d="M45 231Q75 166 54 98M249 231Q222 170 254 82" fill="none" />
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <ellipse
              cx={52 + i * 3}
              cy={124 + i * 24}
              rx="7"
              ry="19"
              transform={`rotate(-35 ${52 + i * 3} ${124 + i * 24})`}
            />
            <ellipse
              cx={247 - i * 3}
              cy={117 + i * 25}
              rx="7"
              ry="18"
              transform={`rotate(35 ${247 - i * 3} ${117 + i * 25})`}
            />
          </g>
        ))}
      </g>
      <path
        d="M80 244Q75 175 115 163L187 162Q224 191 224 244Z"
        fill={variant % 3 === 1 ? "#9b7251" : "#59694d"}
        stroke="#434c3a"
        strokeWidth="3"
      />
      <path d="M115 173L141 244H181L188 170" fill="#d4b678" />
      <path d="M179 169L101 240" stroke="#634b35" strokeWidth="16" />
      <path d="M179 169L101 240" stroke="#b39465" strokeWidth="2" />
      <g stroke="#51483b" strokeWidth="3" strokeLinejoin="round">
        {rabbit ? (
          <>
            <path d="M111 100Q64 -5 103 5Q128 17 132 96" fill={fur} />
            <path d="M161 90Q164 -14 196 4Q213 34 183 107" fill={fur} />
            <path
              d="M107 24L120 84M185 24L174 85"
              stroke="#d3b3a0"
              strokeWidth="12"
            />
          </>
        ) : mouse ? (
          <>
            <circle cx="100" cy="79" r="30" fill={fur} />
            <circle cx="197" cy="79" r="30" fill={fur} />
            <circle cx="100" cy="79" r="18" fill="#cea99a" />
            <circle cx="197" cy="79" r="18" fill="#cea99a" />
          </>
        ) : (
          <>
            <path d="M96 110L85 38L136 78M161 75L213 38L204 111" fill={fur} />
            <path
              d="M100 76L96 57L118 79M183 80L202 58L196 89"
              fill="#e2b193"
              stroke="none"
            />
          </>
        )}
        <path
          d="M94 96Q113 62 152 72Q192 67 209 102L222 134L204 140L209 151Q182 183 151 184Q116 181 91 153L99 141L82 132Z"
          fill={fur}
        />
        {raccoon && (
          <path
            d="M93 106Q121 90 146 116Q178 91 211 108L203 135L158 125L147 126L104 136Z"
            fill="#494b43"
            stroke="none"
          />
        )}
        <path
          d="M103 141Q116 128 150 151Q179 129 200 141Q187 176 152 179Q117 174 103 141"
          fill="#eee3c8"
          stroke="none"
        />
        {owl && (
          <>
            <circle cx="123" cy="118" r="25" fill="#eee3c8" />
            <circle cx="179" cy="118" r="25" fill="#eee3c8" />
          </>
        )}
        <ellipse cx="122" cy="120" rx="5" ry="7" fill="#373a32" stroke="none" />
        <ellipse cx="179" cy="120" rx="5" ry="7" fill="#373a32" stroke="none" />
        <path d="M143 145Q151 139 160 145L152 154Z" fill="#4e4336" />
        <path d="M152 154V161L160 164" fill="none" strokeWidth="2" />
        <path
          d="M98 175Q135 197 195 172L194 193Q137 212 106 192Z"
          fill={variant % 3 === 1 ? "#637d7c" : "#c6a15d"}
        />
        <path
          d="M173 196L194 227L169 223L155 201"
          fill={variant % 3 === 1 ? "#637d7c" : "#c6a15d"}
        />
      </g>
      <path
        d="M236 240L230 103"
        stroke="#755337"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M230 105Q214 96 230 85Q244 82 240 94"
        fill="none"
        stroke="#755337"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Forest() {
  return (
    <svg viewBox="0 0 580 240" className="forest" aria-hidden="true">
      <circle cx="370" cy="76" r="49" fill="#d6c48d" />
      <path d="M0 220Q130 101 271 175T580 118V240H0Z" fill="#9fAA86" />
      <path d="M0 241Q172 168 295 215Q460 150 580 181V240Z" fill="#7f906c" />
      {[30, 94, 155, 438, 497, 554].map((x, i) => (
        <g key={x} transform={`translate(${x} ${(i % 2) * 25})`}>
          <path d="M0 215V40" stroke="#4f654e" strokeWidth="6" />
          <path
            d="M0 0L-38 92H-24L-51 143H-35L-64 198H64L36 143H51L24 92H38Z"
            fill={i % 2 ? "#526d55" : "#668060"}
          />
          <path d="M0 52V224" stroke="#415b48" strokeWidth="3" />
        </g>
      ))}
      <path
        d="M300 240Q255 203 322 173Q350 157 326 143Q378 157 350 182Q317 211 367 240"
        fill="#d8c69e"
      />
      <g fill="#536b50">
        <path d="M260 110q8-9 16 0q-8-3-8 1q0-4-8-1M297 84q9-9 18 0q-9-4-9 1q0-5-9-1" />
      </g>
    </svg>
  );
}
