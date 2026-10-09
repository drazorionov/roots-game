# Woodland art

`woodland-travelers.webp` is an original illustration generated with the built-in imagegen tool, using the user's supplied Root character image as a visual reference. It is optimized to 960 × 640 WebP with its alpha channel preserved. The full-resolution source remains in the user's generated-images library.

Visual reference: https://www.direwolfdigital.com/root/ — parchment, dark ink contours, earthy faction colors, and woodland characters. No official logo or downloaded game assets are included.

`paper-grain.svg` and the fallback portrait in `src/components/art.tsx` are code-native artwork. The supported class/species pairs use the generated character portraits described below. UI headings use system Georgia with serif fallbacks; body text retains the system sans-serif for readability and Cyrillic support.

Generation prompt:

Use case: illustration-story. Asset type: a single wide decorative illustration for a mobile Root RPG character companion. Input image is a STYLE REFERENCE ONLY, not an edit target. Create original woodland vagabonds: a rusty orange fox with a sage cloak and travel pack, a cream rabbit with a mustard scarf and little round shield, and a slate-blue bird cartographer holding a folded map, together resting beside an old trail sign under a few oak leaves. Thick irregular dark brown ink contours, expressive large round eyes, flat earthy watercolor and gouache colors, sparse scratchy hatching, charming tabletop rulebook illustration. Keep silhouettes distinct and complete, arranged as one cohesive horizontal vignette, compact foliage only at the edges and ground. Warm parchment highlights, terracotta, dusty blue, olive green, ochre. Transparent background, no backdrop rectangle, no lettering, no logo, no UI, no watermark. Wide landscape composition with comfortable transparent padding all around.

## Welcome and home backgrounds

`welcome-forest.webp` and `home-camp.webp` are original illustrations generated with the built-in imagegen tool from the user’s woodland RPG visual references. Both are 1536 × 1024 WebP, optimized at quality 82, and are stored locally with the app. The welcome scene frames battle-worn animal vagabonds with armor, weapons, and ammunition on a forest trail; the home scene frames a hollow-tree camp with weapons and supplies. The final revisions follow the user’s request for tougher expressions and combat equipment. No original game logo is included. The exact prompt set is in [scene-prompts.json](scene-prompts.json).

## Distinct screen scenes

`characters-armory.webp`, `campaigns-crossroads.webp`, and `game-watchtower.webp` are original 1536 × 1024 illustrations generated with the built-in imagegen tool, optimized as WebP at quality 82. The scenes distinguish character management, campaign management/selection, and the active game while retaining the established ink-and-paper woodland look. Exact prompts are in [screen-prompts.json](screen-prompts.json).

## Class and species character portraits

The `portraits/cartoon/` collection covers the app's 9 playbooks × 10 species. Each combination is generated individually with the built-in imagegen tool using the user's attached woodland character illustrations as visual references. The requested direction is oversized heads, squat cartoon proportions, flat earthy colors, sparse rough ink, warrior equipment, and crooked smirks. No official character artwork is copied into the app.

Files use the naming convention `{playbook}-{species}.webp`, with lowercase English identifiers. The 1024 × 1024 WebP exports preserve transparency and use quality 90; full-resolution original PNGs remain in the local generated-images library. [prompts.json](portraits/prompts.json) contains every exact generation prompt. [The gallery](portraits/index.html) supports filtering by class and species and downloading individual images.

The character list, editor, and play sheet select images from both the species and playbook. Custom values outside the built-in lists retain the code-native fallback illustration.

## Faction icons

`factions/` contains ten original transparent character-bust icons made with the built-in imagegen tool. The supplied faction chart informed the species, costumes, colors, and squat cartoon proportions. The final direction uses oversized circular eyes, sparse black outlines, and flat muted colors; the earlier naturalistic head studies are not used in the app. Each local WebP is 256 × 256 with alpha preserved. Exact prompts are recorded in [factions/prompts.json](factions/prompts.json).

These cover the ten factions in the supplied RPG handout: Denizens, Marquisate, Eyrie Dynasties, Woodland Alliance, Grand Duchy, Riverfolk Company, Lizard Cult, Corvid Conspiracy, Keepers in Iron, and The Hundreds. The icons accompany the editable reputation ledger and are cached for quick-game offline use. These are original fan-companion illustrations, not official game artwork.
