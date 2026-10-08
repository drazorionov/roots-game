# Root Helper identity

Selected identity: **concept 4, the raccoon wanderer**. The user-approved image in `concepts/04-raccoon-face.png` is the source for every icon and logo export. It was created with the built-in image_gen tool using the supplied Root RPG wordmark as a visual reference; its prompt is recorded in `concepts/prompts.json`. The artwork is preserved, with only resizing and format conversion for platform assets. The accompanying wordmark reads only **helper**, set in bold Georgia in `scripts/generate-brand.mjs`. This remains an unofficial fan companion.

| Asset | Use |
| --- | --- |
| `root-helper.svg` | The helper wordmark with embedded raster raccoon tile on a transparent canvas |
| `root-helper-light.svg` | Cream helper lettering with the same raccoon tile for dark backgrounds |
| `root-helper-light.webp` | Optimized 540 × 180 transparent header logo, also cached for Quick game |
| `root-helper.png` | Transparent 1440 × 480 export for reuse |
| `mark.png`, `mark.svg` | Standalone raccoon tile; the SVG embeds raster artwork |
| `icon-192.png`, `icon-512.png` | Android / saved web-app icons |
| `icon-maskable-512.png` | Full-bleed Android adaptive icon with safe padding |
| `share-preview.png` | 1200 × 630 Open Graph and Twitter / X sharing card |
| `share-preview.svg` | Editable vector source of the sharing card |

Next.js also serves generated `src/app/icon.png` (64 px), `src/app/favicon.ico` (16, 32, 48 px), and `src/app/apple-icon.png` (180 px). `src/app/manifest.ts` supplies the saved app's name, icons, colors, and standalone display preference. The maskable icon fits the complete artwork in a 280 px square inside Android's central safe circle on a 512 px cream canvas.

Regenerate all exports with `npm run brand:generate`. The helper wordmark and sharing-card tagline use Georgia / serif; supporting labels use Arial / sans-serif. PNG exports are checked in so deployment does not depend on rendering fonts. Colors: forest `#344b3b`, cream `#fff3d6`, rust `#a95638`, ochre `#d3ad56`, parchment `#eee5cd`.

The production sharing-image URL is resolved against `https://root-helper.vercel.app` in `src/app/layout.tsx`; update that base if the public domain changes. Sharing services will see the new assets once these changes are deployed, subject to their own preview caches.
