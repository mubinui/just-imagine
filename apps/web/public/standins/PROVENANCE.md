# Stand-in art provenance

Painted stand-ins replace a hero's or character's generated picture when it does not arrive in time. The builder's manifest is `services/builder/src/standins.ts`; each file's width and height there are the real pixel size of the WebP here. All fifteen files are transparent WebP (quality 90, alpha quality 100), at most 512 px on the long side, created 2026-10-27. Raw model PNGs were reviewed locally and are not kept in the repository.

## Generated subjects

Generated with `services/builder/scripts/make-standins.mts`, which calls the builder's own `VertexModels.image` with `hero: true` (model `gemini-nano-banana-2.1`, 1:1, 1K; no rate-limit fallback to the prop model occurred), then cleans the picture with the builder's own `processSprite` (magenta key, despill and exterior matte, trimmed with 4 px transparent padding), applies the builder's cutout gate (background under 2 %, opaque border under 5 %) and resizes to fit 512 × 512 with Sharp. Every output was checked by eye for text, ground lines, cast shadows, clipped edges, key-coloured remnants, extra subjects and style.

Prompt frame (the subject below replaces `${subject}`):

> Single transparent 2D game sprite for the Just Imagine children's physics playground: one friendly ${subject}, side view facing right, broad simple readable silhouette, warm painterly 2D cartoon with soft rounded forms, premium picture-book gouache feel, cheerful but not goofy. Entire subject visible and centered with generous transparent padding. Full body, centered, flat pure magenta #FF00FF background, no ground, no cast shadow, no props, no text, no border, no scene. Render the character as an opaque painted cartoon: use internal highlights for jelly, glass or light, never let the chroma background show through the body. Crisp clean silhouette, no outer glow, no floating particles, no background shadow, no text. The flat background color is only outside the silhouette.

Image models paint no real alpha, so the frame's "Actual transparent background" sentence is replaced by the builder's own chroma-key sprite sentences; the transparency comes from `processSprite`.

| File          | Subject                                                           | Pixels  | Bytes  |
| ------------- | ----------------------------------------------------------------- | ------- | ------ |
| `car.webp`    | small rounded toy car                                             | 512×372 | 24,338 |
| `truck.webp`  | small rounded toy pickup truck with opaque painted windows        | 512×333 | 22,200 |
| `ball.webp`   | bouncy striped play ball                                          | 511×512 | 23,424 |
| `rocket.webp` | little rounded toy rocket lying sideways, no flame or smoke       | 512×320 | 21,658 |
| `boat.webp`   | little wooden sailboat                                            | 505×512 | 37,546 |
| `robot.webp`  | small round toy robot                                             | 405×512 | 31,062 |
| `dog.webp`    | small puppy dog standing on four legs                             | 512×444 | 33,116 |
| `cat.webp`    | small cat standing on four legs                                   | 512×469 | 30,536 |
| `bird.webp`   | small round songbird                                              | 512×463 | 22,718 |
| `fish.webp`   | small round fish                                                  | 512×442 | 23,724 |
| `child.webp`  | young child with short neat hair in simple play clothes, standing | 163×512 | 13,870 |
| `crate.webp`  | plain wooden crate seen flat from the side                        | 511×512 | 39,632 |

## Friend frames

Not generated. Cut with Sharp by the same script (`--friends`) from `apps/web/public/characters/acting/friends-pets-acting-v2.webp` (2048×768, eight equal columns by three equal rows, 256×256 cells; prompt and date in its `.webp.json` sidecar). Column 0 is the relaxed smile pose. Each cell is trimmed to its alpha bounds with 4 px transparent padding.

| File                  | Source cell     | Pixels  | Bytes  |
| --------------------- | --------------- | ------- | ------ |
| `friend-mishti.webp`  | row 0, column 0 | 167×217 | 13,664 |
| `friend-bhombol.webp` | row 1, column 0 | 193×219 | 15,212 |
| `friend-chandni.webp` | row 2, column 0 | 164×216 | 14,322 |
