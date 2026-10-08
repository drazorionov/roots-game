"use client";
import { useTranslation } from "@/lib/i18n";
export function Portrait({
  species,
  variant = 0,
}: {
  species: string;
  playbook?: string;
  variant?: number;
}) {
  const { t } = useTranslation();
  const rabbit = species === "Rabbit",
    owl = species === "Owl",
    mouse = species === "Mouse",
    raccoon = species === "Raccoon" || species === "Badger";
  const roundEars = mouse || species === "Otter";
  const fur =
    (
      {
        Fox: "#df8c42",
        Rabbit: "#e3cd95",
        Mouse: "#aaa97d",
        Raccoon: "#9f9b86",
        Cat: "#d0af64",
        Owl: "#819aa8",
        Otter: "#ad8558",
        Badger: "#bbb9a5",
        Squirrel: "#b86e42",
        Wolf: "#89918b",
      } as Record<string, string>
    )[species] || "#c39765";
  return (
    <svg
      viewBox="55 0 200 245"
      role="img"
      aria-label={t("{species} woodland adventurer", { species: t(species) })}
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
        stroke="#342c23"
        strokeWidth="3"
      />
      <path d="M115 173L141 244H181L188 170" fill="#d4b678" />
      <path d="M179 169L101 240" stroke="#634b35" strokeWidth="16" />
      <path d="M179 169L101 240" stroke="#b39465" strokeWidth="2" />
      <g stroke="#342c23" strokeWidth="3.8" strokeLinejoin="round">
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
        ) : roundEars ? (
          <>
            <circle cx="100" cy="79" r={mouse ? 30 : 19} fill={fur} />
            <circle cx="197" cy="79" r={mouse ? 30 : 19} fill={fur} />
            <circle cx="100" cy="79" r={mouse ? 18 : 10} fill="#d8b789" />
            <circle cx="197" cy="79" r={mouse ? 18 : 10} fill="#d8b789" />
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
        <ellipse
          cx="121"
          cy="118"
          rx="14"
          ry="19"
          fill="#f8ebbc"
          strokeWidth="2.5"
          transform="rotate(-9 121 118)"
        />
        <ellipse
          cx="179"
          cy="116"
          rx="13"
          ry="18"
          fill="#f8ebbc"
          strokeWidth="2.5"
          transform="rotate(8 179 116)"
        />
        <ellipse
          cx="127"
          cy="119"
          rx="6"
          ry="12"
          fill={rabbit ? "#a94525" : "#4c5d3c"}
          stroke="none"
        />
        <ellipse
          cx="184"
          cy="116"
          rx="5"
          ry="11"
          fill={rabbit ? "#a94525" : "#4c5d3c"}
          stroke="none"
        />
        {owl ? (
          <path d="M139 142L155 134L165 153L149 165Z" fill="#d5ac44" />
        ) : (
          <path d="M143 145Q151 139 160 145L152 154Z" fill="#342c23" />
        )}
        <path
          d="M102 101L112 96M182 94L194 100M97 145L111 150M191 150L205 143M117 86L121 91M177 85L175 91"
          fill="none"
          strokeWidth="2"
        />
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
      <g stroke="#342c23" strokeWidth="2" fill="none" opacity=".8">
        <path d="M92 208L104 214M96 203L100 219M192 213L206 217M195 208L201 222M122 222L137 231M127 217L134 235" />
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
