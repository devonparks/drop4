# Drop4 Visual Style Brief

The cohesion contract every art prompt inherits. If a prompt doesn't reference
this style, it doesn't get generated. Locked 2026-04-26 to ensure every asset
across the app reads as one premium product.

---

## North star

**Cinematic premium mobile, restrained.** Marvel Snap polish + NBA Street Vol 2
night-court atmosphere + Clash Royale clarity. The app is a Connect 4 game,
not a fantasy world — the art should feel like a real *product*, not a theme
park.

## Mood

- Low-key cinematic lighting (warm key + cool fill, soft rim)
- Calm, atmospheric, premium — never frantic, never busy, never childish
- Strong vignette: dark corners, focal point centered (or center-bottom for
  scenes where a character stands)
- Negative space respected — every asset has *room around it*

## Palette

Locked palette. Every asset uses these tones:

- **Base**: deep navy / indigo / midnight (`#0A0E27` to `#1A1F3E`)
- **Warm accent**: amber / burnt orange — the brand signature
  (`#FFB347` to `#FF8C00`). Used sparingly, where the eye should land.
- **Cool accent**: teal / cyan (`#1ABC9C` to `#3498DB`). Secondary highlights.
- **Premium gold**: rich metallic (`#FFD700`, `#C89030`). For currency, rare
  loot, premium UI accents only.
- **Crimson**: player-1 / hero red (`#E63946`, `#C0392B`). Used for the
  Connect 4 disc and "go" CTAs.
- **Goldenrod**: player-2 / opponent yellow (`#F4C435`, `#E0A82E`).

Avoid: any color outside this palette (no greens, purples, magentas as
primaries — except the rare "rarity tier" UI bands).

## Material

- Painterly **semi-gloss** — has weight and reflectivity but isn't photoreal
- No plastic-toy look, no balloon-font shapes, no glossy 90s-CGI
- Soft rim light on hero objects (currency, character props, logo elements)
- Subtle bevels on metallic surfaces (gold, gunmetal)
- Surfaces breathe — every painted asset has a hint of grain or canvas, not
  flat vector

## Composition rules

- One focal point per asset
- Strong center-weighted vignette: corners darker, focal area lit
- For BG scenes: bottom-center spotlight (where a character stands), top
  corners darkest
- For ICON assets: full-bleed silhouette of the object, transparent BG, soft
  glow underneath
- For LOGO/wordmark: horizontal lockup, plenty of negative space, never fills
  the frame edge-to-edge

## Hard negatives — never include

- NO text, letters, numbers, words, captions in any image (text is rendered
  in code, not baked into art)
- NO logos baked into scenes (other than the official wordmark itself)
- NO lens flares, NO bright stars, NO busy particle clouds, NO "cosmic dust"
  unless explicitly the subject of the asset
- NO sharp hard-edge geometry where a soft painterly form is appropriate
- NO childish balloon-font 3D, NO bubble shapes, NO cartoon outlines
- NO photorealism, NO 3D-render look, NO low-poly chunky geometry
- NO over-saturation, NO neon-everywhere, NO maximalism
- NO drop shadows on logos / wordmarks (handled in code if needed)

## Format rules per asset class

### Backgrounds (full-screen scene)
- 1024×1536 portrait (mapped to GPT 1024x1536)
- Background: opaque, painterly, atmospheric
- Designed to RECEDE behind UI — the bg is never the hero
- Vignette: bottom-center is the lightest area (where character stands)
- Output: PNG, opaque

### Logo / wordmark
- 1024×1024 or 1024×1536 — depending on lockup
- Transparent background
- Centered with breathing room (~15% padding all sides)
- Output: PNG, transparent

### Icons (currency, tab, action, stat, etc.)
- 1024×1024
- Transparent background
- Single-object hero silhouette, painterly, soft glow underneath
- Designed to read clearly at 32-64px on a phone
- Output: PNG, transparent

### Banners / cards (mode buttons, shop banners)
- 1024×1024 (or wider if specified)
- Atmospheric tile that supports text overlaid in code
- The art should NEVER fight the text — soft, low-contrast, vignetted

## Prompt template

Every manifest prompt starts with this preamble (or its essence):

> Drop4 premium mobile game asset, painterly cinematic style. Deep navy
> base with warm amber accent and cool teal secondary. Low-key dramatic
> lighting, semi-gloss painterly material, soft rim light. Strong vignette,
> calm restrained composition. NO text, NO numbers, NO words, NO logos in
> image (unless this asset IS the logo), NO lens flares, NO busy particles,
> NO photorealism, NO childish balloon shapes. [SPECIFIC ASSET DESCRIPTION].

This preamble is non-negotiable. If the asset description tries to override
the palette, the preamble wins.
