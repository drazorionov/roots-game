// Fox cutout + outlined Luminari lettering. Run `npm run brand:generate`.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const out = new URL("../public/brand/", import.meta.url);
const app = new URL("../src/app/", import.meta.url);
await mkdir(out, { recursive: true });
const green = "#344b3b",
  cream = "#fff3d6",
  rust = "#a95638";
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

// Header uses the transparent cutout; device icons keep the original square art.
const source = await readFile(new URL("fox-cutout.png", out));
const tileSource = await readFile(new URL("concepts/03-fox-face.png", out));
const markPng = await sharp(source).resize(512, 512).png().toBuffer();
const mark = () =>
  `<image width="100" height="100" href="data:image/png;base64,${markPng.toString("base64")}"/>`;
await writeFile(new URL("mark.png", out), markPng);

// Checked-in glyph outlines keep the decorative type consistent on every device.
const lettering = JSON.parse(
  await readFile(new URL("helper-lettering.json", out), "utf8"),
);
const wordmark = (ink) =>
  `<svg x="0" y="25" width="236" height="70" viewBox="${lettering.viewBox}" fill="${ink}"><path d="${lettering.path}"/></svg>`;
const lockup = (ink) =>
  `<g transform="translate(0 10)">${mark()}</g><g transform="translate(116 0)">${wordmark(ink)}</g>`;
const logo = svg(360, 120, lockup(green));
await writeFile(new URL("root-helper.svg", out), logo);
await writeFile(
  new URL("root-helper-light.svg", out),
  svg(360, 120, lockup(cream)),
);
// Compact 3× header export keeps the embedded illustration out of the page payload.
await sharp(Buffer.from(svg(360, 120, lockup(cream))))
  .resize(540, 180)
  .webp({ quality: 90 })
  .toFile(new URL("root-helper-light.webp", out).pathname);
await writeFile(new URL("mark.svg", out), svg(100, 100, mark()));
await sharp(Buffer.from(logo))
  .resize(1440, 480)
  .png()
  .toFile(new URL("root-helper.png", out).pathname);

// Raster icon avoids advertising the textured illustration as resolution-independent.
await sharp(source)
  .resize(64, 64)
  .png()
  .toFile(new URL("icon.png", app).pathname);
for (const size of [192, 512]) {
  await sharp(tileSource)
    .resize(size, size)
    .png()
    .toFile(new URL(`icon-${size}.png`, out).pathname);
}
// Fit the entire artwork within Android's central 80%-diameter safe circle:
// a 280px square has a corner radius of 198px, below the 204.8px limit.
await sharp(tileSource)
  .resize(280, 280)
  .extend({
    top: 116,
    bottom: 116,
    left: 116,
    right: 116,
    background: "#fff3d6",
  })
  .png()
  .toFile(new URL("icon-maskable-512.png", out).pathname);
await sharp(tileSource)
  .resize(180, 180)
  .png()
  .toFile(new URL("apple-icon.png", app).pathname);

// ICO container with PNG frames for legacy bookmark / browser support.
const frames = await Promise.all(
  [16, 32, 48].map((size) =>
    sharp(source).resize(size, size).ensureAlpha().png().toBuffer(),
  ),
);
const header = Buffer.alloc(6 + frames.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach((frame, i) => {
  const pos = 6 + i * 16;
  header[pos] = header[pos + 1] = [16, 32, 48][i];
  header.writeUInt16LE(1, pos + 4);
  header.writeUInt16LE(32, pos + 6);
  header.writeUInt32LE(frame.length, pos + 8);
  header.writeUInt32LE(offset, pos + 12);
  offset += frame.length;
});
await writeFile(
  new URL("favicon.ico", app),
  Buffer.concat([header, ...frames]),
);

// Self-contained social card with the fox cutout and Helper lettering.
const fern = `<path d="M0 200Q60 110 50 0M38 115Q-12 104 2 77Q38 79 38 115ZM48 75Q83 54 88 23Q55 28 48 75ZM25 153Q-15 145 -19 119Q13 120 25 153"/>`;
const share = svg(
  1200,
  630,
  `<defs><pattern id="grain" width="17" height="17" patternUnits="userSpaceOnUse"><circle cx="3" cy="8" r=".8" fill="#817253" opacity=".12"/></pattern></defs>
<rect width="1200" height="630" fill="#eee5cd"/><rect width="1200" height="630" fill="url(#grain)"/>
<rect x="24" y="24" width="1152" height="582" rx="4" fill="none" stroke="#b8ac89"/>
<path d="M26 25H1174" stroke="${rust}" stroke-width="6"/>
<g transform="translate(72 142) scale(3)">${mark()}</g>
<g transform="translate(408 156) scale(2.7)">${wordmark(green)}</g>
<path d="M408 428H1064" stroke="#b8ac89" stroke-width="2"/>
<text x="410" y="477" font-family="Georgia, serif" font-size="32" fill="${green}">Your next Woodland story starts here.</text>
<text x="84" y="563" font-family="Arial, sans-serif" font-size="20" fill="#685e4b">CHARACTERS  /  CAMPAIGNS  /  ADVENTURE</text>
<text x="1114" y="563" text-anchor="end" font-family="Arial, sans-serif" font-size="18" fill="#685e4b">Unofficial Root RPG companion</text>
<g fill="${green}" stroke="${green}" stroke-width="3" opacity=".12" transform="translate(1138 351) rotate(12)">${fern}</g>`,
);
await writeFile(new URL("share-preview.svg", out), share);
await sharp(Buffer.from(share))
  .png()
  .toFile(new URL("share-preview.png", out).pathname);
console.log(
  "Generated logo, favicon, Apple/Android icons, and 1200 × 630 sharing preview.",
);
