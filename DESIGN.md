---
name: Drop4
extends: ../amg-engine/DESIGN.md
colors:
  # ── Inherited from AMG Studios (see amg-engine/DESIGN.md) ──
  # primary, bgDark, bgMid, bgLight, surface, surfaceBorder,
  # textPrimary/Secondary/Muted, coinGold, gemGreen, rarity*.
  #
  # ── Drop4-specific ──
  # Game pieces
  pieceRed: "#e63946"
  pieceRedDark: "#b82d38"
  pieceRedGlow: "#ff4d5a"
  pieceYellow: "#f4a623"
  pieceYellowDark: "#c4841a"
  pieceYellowGlow: "#ffc247"
  # Board
  boardBlue: "#1a3a8a"
  boardDark: "#0d1f5c"
  boardFrame: "#2548a8"
  boardHole: "#0a1440"
  # Mode variant accents (used on home cards)
  orangePlay: "#ff8c00"       # PLAY — AI vs player
  purpleCareer: "#9b59b6"     # CAREER — Take the City
  tealLocal: "#1abc9c"        # LOCAL PLAY — pass & play
  # Live wallpaper base hue — Drop4 home is "0deg" (magenta/cyan)
  nebulaHueHome: 0
  nebulaHueShop: 60           # gold/amber
  nebulaHueProfile: -40       # violet
  nebulaHueCustomize: 20      # warm pink
  nebulaHueCareer: -90        # deep purple dusk
  nebulaHuePlay: 30           # warm orange fire
  nebulaHueMatchup: 180       # cyan/blue VS
  nebulaHueChallenges: -60    # magenta missions
typography:
  logo:
    fontFamily: Fredoka
    fontWeight: "900"
    letterSpacing: -0.5
    style: "3D block letters with orange-to-crimson gradient + gold bevel + magenta halo"
  stat:
    fontFamily: Fredoka
    fontWeight: "700"
    fontSize: 28
---

## Overview

Drop4 is a premium Connect 4 mobile game — the first game in the AMG Studios ecosystem. Ships mid-May 2026. Inherits all brand tokens from `amg-engine/DESIGN.md` and adds game-specific pieces, board palette, and per-screen nebula hue shifts.

**Aesthetic target:** "Apex Legends lobby × The Sims 4 Create A Sim × Fortnite locker." Polished, painterly, expensive-feeling. Every screen is either showing off cosmetics, earning them, or discovering them.

## Colors

**Red/Yellow pieces** (`pieceRed` / `pieceYellow`) are the only place those hues appear — reserved for gameplay, never for UI. Each piece has a dark variant (bottom shadow) and a glow variant (rim highlight + drop effect).

**Board navy** (`boardBlue`/`boardDark`/`boardFrame`/`boardHole`) is the classic Connect-4 blue, slightly darker than the AMG base `bgDark` so the board reads as a discrete object against the cosmic background. Frame color `#2548a8` sits between the two for visible border definition.

**Mode card accents** pair with painted bg art:
- PLAY → `orangePlay` — fire arena scene, warm embers
- CAREER → `purpleCareer` — dusk city skyline, gold trophy beam
- LOCAL PLAY → `tealLocal` — neon controllers, teal grid floor

**Nebula hue shifts** live at the ScreenBackground layer. Same 3-layer parallax PNGs (nebula-back/mid/near in `src/assets/images/ui/`) composited through a `filter: hue-rotate(Ndeg)` wrap so every tab gets a unique palette at zero asset cost. Keep `nebulaHueHome = 0` — it's the "true" color of the shared assets; every other screen is a shift off the hero.

## Typography

**DROP4 wordmark** is the signature — chunky 3D block letters (Fredoka 900), orange-to-crimson gradient fill, gold bevel highlight at top edge, magenta glow halo behind (CSS `keyframes` pulse at 3.2s cycle on web). The halo is a separate animated `<View>` behind the logo `<Image>` — never bake it into the PNG.

**Match scoreboards** use `titleLG` (Outfit extrabold 18) for names, `stat` (Fredoka bold 28) for the big center numbers.

**UI labels** follow AMG base — Outfit 600-700 with tracking.

## Layout

Canonical: 390×844 portrait. PhoneFrame wraps content on web only (native renders children directly via `PhoneFrame` component in `src/components/ui/`).

**Home screen stack** (top → bottom):
1. TopBar — settings gear, currency row, profile portrait + rank
2. DROP4 logo — breathing scale + magenta halo
3. Character stage — 3D character on warm orange foot-glow, left/right side buttons (Emotes / Idles), 12 rising ember sparkles
4. Free Spin pill
5. 3 mode cards — PLAY, CAREER, LOCAL PLAY with painted bg + gold rim
6. Bottom tab bar (gold top edge, backdrop-blur on web)

Every other screen respects the TopBar + BottomTabs frame.

## Elevation & Depth

**Live wallpaper layer** (3 parallax nebula planes) sits behind everything. Even on the GameScreen with the board, the nebula peeks through at the top and bottom.

**Warm foot-glow** (two stacked radial gradients, `screen` blend mode on web) sits at the character's feet on home. No hard bounding box — gradients extend past the frame edges with 100% transparent end-stops so no hard cut is visible.

**Gold rim pattern** — every card, pill, and section wrapper gets a `rgba(255,210,120,0.3-0.55)` border + optional inset gold sheen boxShadow on web. This is THE signature treatment.

## Shapes

**Mode cards** — `rounded: xl (20)`, 2px gold rim, inset shadow.
**Pieces** — perfect circles, glossy radial gradient fill.
**Board cells** — circles with inner shadow for "hole" depth.
**Tabs** — capsule pills with active-state orange glow ring.

## Components

**Shop > Clothes tab** — species chips + slot-bucket chips + pack-grouped grid of `AmgPartCard`. Slot-specific emoji hero (`slotEmoji` map in `src/data/amgPackMeta.ts`), rarity-tinted border, price or OWNED chip, NEW ribbon with wobble animation.

**AMG character creator** — bridged via `src/screens/CharacterCreatorScreen.tsx` to `@amg/character-creator` package. Five tabs (BODY/FACE/HAIR/OUTFIT/COLOR). `getRarityColor` + `getPriceLabel` callbacks flow from Drop4 through the creator so PartGrid thumbnails show the same economy borders as the Shop.

**StagePremiumFX** — home-only. 18 rising embers at varied speeds/colors matching nebula palette + 45s rotating conic shimmer.

**GlossyButton** — variants match mode cards (orange/purple/teal). When `bgImage` is set, gradient overlay drops to bottom-only 0-0-35% vignette so painted art reads at full brightness.

## Do's and Don'ts

**Do:**
- Use the live nebula wallpaper on every new screen (`liveWallpaper` + `nebulaHue` props).
- Keep the DROP4 logo on a magenta-halo animated backdrop.
- Match piece colors to `pieceRed`/`pieceYellow` exactly — never use `error` or `gold` as piece fills.
- Route all animations through Reanimated on native, CSS keyframes on web (React-Native-Web rejects the `animation` shorthand — use `animationName`/`animationDuration`/etc).

**Don't:**
- Use `Alert.alert` for confirm dialogs — web silently no-ops. Use the `Platform.OS === 'web' ? window.confirm : Alert.alert` pattern.
- Bake the magenta halo into the logo PNG — it's an animated layer.
- Add a new mode card color — stick to orange/purple/teal.
- Break the "cards have gold rims" rule on any new component.
