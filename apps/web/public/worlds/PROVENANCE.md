# Demo art provenance

`jelly-dragon.webp` is an AI-generated demonstration sprite, created 2026-10-16 with the built-in image-generation tool for the user's requested visual polish. It is a static local fixture asset, not evidence of live Vertex generation. The production asset pipeline remains separate. Transparent WebP, 640×585, about 59 KB. Source PNG retained at `/Users/mubinuiislam/.codex/generated_images/01a13f7a-2413-72d0-a99b-a24cabdb912b/exec-a000389a-6650-4284-85d2-117e89ee73c6.png`; the app depends only on the checked-in WebP.

Prompt:

> Use case: illustration-story. Asset type: single transparent 2D game sprite for a children's physics playground called Just Imagine. Subject: one adorable small jelly dragon, soft pear-shaped squashy body, cheerful curious face, stubby legs, tiny folded wings and rounded horns, three-quarter side view facing right, a broad simple readable silhouette. The body is warm muted mint green with cream belly and a few soft sunshine yellow accents, dark forest green eyes, warm peach cheek. Art direction: premium children's picture-book gouache illustration, subtle tangible pigment, carefully controlled soft shading, friendly rather than glossy plastic, readable at small size, charming asymmetric posture. Entire character visible, centered, generous transparent padding. Actual transparent background, no ground, no cast shadow, no props, no border, no text, no lettering, no background scene. Isolated sprite only; edges clean for physics mesh deformation.

## Cloud platform and meadow

Generated with the same built-in tool, 2026-10-16. `cloud.webp` is transparent, 720×240. `meadow.webp` is opaque, 1280×720. Compressed to WebP for local preview; no runtime image-generation call occurs. PNG sources remain beside the dragon source above, named `exec-abc81ebd-c2d2-4f83-b056-746c4f3c60ff.png` (cloud) and `exec-ef7999ff-fd4b-4bca-97b3-a6353424958c.png` (meadow).

Cloud prompt:

> Use case: illustration-story. Asset type: a single transparent 2D platform sprite for the Just Imagine children's physics game. One wide, low, soft fluffy cloud seen straight from the side, approximately 3:1 width-to-height. Warm ivory cream, very pale mint and honey shadows, soft rounded uneven organic lobes, a fairly level upper edge for a creature to stand on. Premium hand-painted gouache picture-book style with subtle pigment texture, controlled gentle shading. Isolated and centered with small transparent margins, actual transparent background. No face, no eyes, no creatures, no text, no stars, no sky or scene, no cast shadow beneath it. Crisp alpha edge suitable for a physics platform.

Meadow prompt:

> Use case: illustration-story. Asset type: 16:9 wide backdrop for a children's 2D side-view physics playground, premium hand-painted gouache picture-book illustration. A quiet dream meadow high among clouds. Keep the central 80 percent mostly open pale powder-blue sky with a very faint warm ivory haze, usable for moving game sprites and physics play. Delicate cloud wisps only at far upper corners. Far below, along the bottom 15 percent, layered low rolling sage-green hills with two tiny stylized round forest trees on the extreme sides and a few tiny peach/yellow flowers. A small soft sunshine disk near the upper-right edge, restrained muted pastel palette of warm cream #fff9ee, forest #245e4e, pale leaf greens, and powder blue. Organic brushed edges and subtle tangible pigment, elegant quiet composition, low contrast backdrop that lets foreground sprites stand out. Flat side-view, no perspective ground plane. No animals, no characters, no dragons, no text, no UI, no platforms or obstacles in central playing area, no borders. Deliver landscape 16:9.

## Playable-world upgrade — 2026-10-16

Created with the built-in image-generation tool for the user's request for richer, more inviting game worlds. Exact prompts: `PLAYABLE-PROMPTS.json`; Impeccable provenance sidecars accompany each WebP (the CLI uses sidecars for this format). These remain static preview assets, not evidence of live Vertex generation. Source originals are retained under `/Users/mubinuiislam/.codex/generated_images/01a13f7a-2413-72d0-a99b-a24cabdb912b/`.

| Asset             | Dimensions     | Source PNG                                    |
| ----------------- | -------------- | --------------------------------------------- |
| moon-garden.webp  | 1600×900       | exec-3c3800fa-b838-4c29-958d-b7fb5988442c.png |
| pond-garden.webp  | 1600×900       | exec-22797aff-b132-4b4f-8ae3-dcb4a960452b.png |
| duck-toy.webp     | 800×687, alpha | exec-d0cfda9b-79a2-4ada-a378-4bb1a09eb2ec.png |
| toy-cannon.webp   | 800×627, alpha | exec-eec65ee4-8f23-498c-9ba0-06d77f3f25b5.png |
| catching-cup.webp | 800×633, alpha | exec-e0e20cae-4fd5-4449-8737-49d7449db308.png |

Converted with Sharp, quality88 WebP. Backgrounds preserve 16:9; sprites trim excess transparent margins and preserve alpha. The five files total about825KB. `catching-cup.collider.json` is authored normalized collision geometry: two sides and a base with an open center, verified with a real Rapier drop. The counting board, fraction workmat, blocks, pegs and round toy objects are deterministic Pixi geometry, not generated pictures.
