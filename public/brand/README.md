# Root Helper identity

Selected identity: **concept 3, the fox scout**, with the capitalized wordmark **Helper**. The original square illustration in `concepts/03-fox-face.png` supplies the device icons. `fox-cutout.png` is the transparent header and sharing-card version, made with the built-in image_gen tool by removing the surrounding green background while retaining the fox and scarf. Original prompts are in `concepts/prompts.json`; the cutout edit is recorded in `fox-cutout-prompt.json`. This remains an unofficial fan companion.

The decorative lettering uses Luminari to follow the supplied “The Roleplaying Game” reference. `helper-lettering.json` contains the outlined glyphs for **Helper**, exported from the locally installed typeface. The generator consumes these checked-in outlines; no font file, font installation, or browser font loading is required for the logo.

| Asset | Use |
| --- | --- |
| `root-helper.svg` | Forest-green Helper lettering and a fox cutout, fully transparent background |
| `root-helper-light.svg` | Cream Helper lettering and fox cutout for dark backgrounds |
| `root-helper-light.webp` | Optimized 540 × 180 transparent header logo, also cached for Quick game |
| `root-helper.png` | Transparent 1440 × 480 export for reuse |
| `mark.png`, `mark.svg` | Standalone transparent fox cutout; the SVG embeds raster artwork |
| `icon-192.png`, `icon-512.png` | Android / saved web-app icons |
| `icon-maskable-512.png` | Full-bleed Android adaptive icon with safe padding |
| `share-preview.png` | 1200 × 630 Open Graph and Twitter / X sharing card |
| `share-preview.svg` | Editable vector source of the sharing card |

Next.js also serves generated `src/app/icon.png` (64 px), `src/app/favicon.ico` (16, 32, 48 px), and `src/app/apple-icon.png` (180 px). `src/app/manifest.ts` supplies the saved app's name, icons, colors, and standalone display preference. The maskable icon fits the complete artwork in a 280 px square inside Android's central safe circle on a 512 px cream canvas.

Regenerate all exports with `npm run brand:generate`. The Helper wordmark uses checked-in Luminari outlines; the sharing-card tagline uses Georgia / serif, and supporting labels use Arial / sans-serif. Raster exports are checked in so deployment does not depend on rendering fonts. Colors: forest `#344b3b`, cream `#fff3d6`, rust `#a95638`, ochre `#d3ad56`, parchment `#eee5cd`.

The production sharing-image URL is resolved against `https://root-helper.vercel.app` in `src/app/layout.tsx`; update that base if the public domain changes. Sharing services will see the new assets once these changes are deployed, subject to their own preview caches.
