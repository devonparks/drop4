# Drop4 ComfyUI / Flux Prompt Pack

Generate all beta art assets in a single 1-2 hour ComfyUI session. Target: 5-10 candidates per asset, pick the best, done.

## Shared style DNA (inject into every prompt)

> `low-poly 3D render, Synty Studios style, flat stylized shading, clean geometry, no textures, vibrant saturated colors, soft rim lighting, no outlines, octane render, Pixar-meets-Polygon-asset-pack, competitive mobile game art, crisp edges, NOT cute, NOT bubbly, NOT Candy Crush, NOT realistic`

> **Palette anchors:** deep navy `#0a0e27` + indigo `#111b47` background, orange accent `#ff8c00 / #ff9a1a`, gold `#f1c40f`, clean white highlights.

> **Model:** Flux.1-dev (preferred) or Flux.1-schnell for speed drafts.
> **Base sampler stack:** `euler` + `simple` scheduler, `guidance: 3.5` (Flux uses distilled guidance, NOT CFG). If using SDXL fallback, swap to `dpmpp_2m_sde` + `karras`, CFG 6.0.

---

## 1. App Icon — 1024x1024, no alpha, must read at 57x57

### Primary prompt

```
Hero app icon for competitive mobile game, bold 3D numeral "4" as the centerpiece, thick chunky geometric letterform in glossy orange #ff8c00 with beveled edges, sitting on a rounded square background of deep navy blue #0a0e27 to indigo #111b47 gradient, subtle gold rim light on the 4's edge, low-poly 3D render, Synty Studios style, flat stylized shading, clean geometry, clear silhouette that reads at 57x57 pixels, centered composition, 15% safe margin on all edges, strong contrast, crisp edges, octane render, competitive mobile game icon, no text, no outlines, no drop shadow, no Candy Crush style
```

### Variations

**V1 — Coin/Chip hero:** replace the "4" with `a single 3D game chip (flat disc) tilted 15 degrees, bold white "4" embossed on its face, chip in gradient orange-to-gold, floating over navy background with soft glow underneath`.

**V2 — Character face:** replace hero with `a single Synty-style low-poly character head from the chest up, confident smirking expression, wearing a gold championship crown, centered on deep navy gradient, orange rim light on one side`.

**V3 — Column stack:** `four 3D Connect 4 chips stacked vertically in a transparent slot — bottom two orange, top two gold — dramatic low angle, navy gradient background, one chip mid-drop with motion blur trail`.

### Negative prompt

```
text, watermark, signature, realistic, photorealistic, blurry, noisy, busy, cluttered, pastel, cute, chibi, bubbly, candy, glitter, sparkles, lens flare, cartoon outlines, ink lines, sketch, flat 2d, pixel art, gradient mesh, bokeh, depth of field, soft focus, multiple icons, grid of items, alpha channel, transparent background, complex detail at edges
```

### Parameters

- Resolution: `1024 x 1024`
- Steps: `28-32` (Flux), `35` (SDXL)
- Guidance: `3.5` Flux / CFG `6.5` SDXL
- Sampler: `euler` + `simple` (Flux)
- Batch: generate **8**, pick the 2-3 with clearest silhouette at thumbnail

### Success criteria

- Squint test: can you tell what it is at 57x57? If not, reject.
- High-contrast hero element against background — no muddy midtones.
- No text readable except the single "4" (or none).
- Hero element fills at least 55% of frame but respects 15% safe margin.
- Feels premium/sports not cute/childish.

---

## 2. Splash Screen — 1284x2778, iPhone portrait title card

### Primary prompt

```
Mobile game splash screen, vertical portrait composition 1284x2778, title card for "DROP4" a competitive Connect 4 game, centered stacked layout: top third shows bold 3D chunky logotype "DROP4" in glossy orange #ff8c00 with gold bevel and soft rim light, middle third shows two Synty Studios style low-poly stylized characters facing off across a vertical Connect 4 board in 3/4 perspective, one character in cool blue outfit, other in warm red outfit, board frame in chrome with a single orange chip mid-fall, bottom third fades to pure deep navy #0a0e27, entire scene lit by dramatic key light from upper right casting soft indigo shadows, background is a deep navy to indigo vertical gradient with subtle radial glow behind the board, low-poly 3D render, Synty Studios aesthetic, flat stylized shading, vibrant saturated colors, clean geometry, competitive mobile game title art, cinematic composition, NOT cute, NOT bubbly
```

### Variations

**V1 — Single hero character:** `one Synty-style low-poly hero character center-frame hands on hips, confident pose, holding a glowing orange chip, DROP4 logotype floating above head, stadium-style bokeh lights in background behind navy gradient`.

**V2 — Abstract chip cascade:** `no characters, just a dramatic cascade of orange and gold Connect 4 chips falling through frame against vertical navy gradient, DROP4 logo anchored in upper third, chips with motion blur and light trails`.

**V3 — Championship podium:** `three Synty-style characters on a three-tier gold podium, center character raising a golden Connect 4 trophy, navy gradient background with stadium spotlights, DROP4 logo above, confetti frozen in air`.

### Negative prompt

```
text other than DROP4 logo, lorem ipsum, UI elements, buttons, HUD, status bar, progress bar, loading icon, realistic people, photorealistic faces, cluttered background, busy pattern, text blur, misspelled logo, DROP 4 with space, DROP4! with punctuation, four logos, duplicate characters, Candy Crush, bubbly, pastel, cute, chibi, sparkle overlay, low resolution
```

### Parameters

- Resolution: generate at `896 x 1920` then upscale to `1284 x 2778` (Flux handles non-square well but stays stable at this ratio)
- Steps: `32-36`
- Guidance: `3.5` Flux
- Sampler: `euler` + `simple`
- Upscaler: `4x-UltraSharp` or `4x_NMKD-Siax` node, then crop/fit to 1284x2778
- Batch: **6**

### Success criteria

- "DROP4" text is legible and spelled correctly (regen if it's "DR0P4" / "DROP 4" / "DRPO4").
- Visual hierarchy top-to-bottom: logo → scene → breathing room.
- Iphone notch area (top 50px) has no critical content.
- Bottom 100px is calm (room for "Loading..." if needed).
- Feels like a game title card, not a movie poster or sticker.

---

## 3. Logo — replacement for current ChatGPT one

### Primary prompt

```
Game logo lockup for "DROP4", horizontal composition on transparent checker or flat navy background, bold 3D chunky geometric sans-serif wordmark "DROP4" rendered as low-poly beveled letters, thick stroke weight, slight forward tilt for dynamism, primary color glossy orange #ff9a1a with gold bevel highlights #f1c40f and deep navy core shadow, the "4" is slightly larger and punchier than DROP, a single orange Connect 4 chip sits inside the lower bowl of the "4" as an integrated element, soft orange rim light, clean flat stylized shading with no outlines, Synty Studios 3D asset style, confident sports-game branding, competitive not cute, reads clearly at 200px wide
```

### Variations

**V1 — Stacked layout:** `"DROP" on top line, "4" huge underneath at 2x size, vertical stacked lockup, same Synty low-poly 3D treatment, orange and gold palette`.

**V2 — Badge/crest:** `DROP4 wordmark inside a rounded hexagonal badge frame in brushed chrome, orange lettering on navy interior, gold outer ring, esports-championship aesthetic`.

**V3 — Chip-as-O replacement:** `"DR[chip]P4" where the O in DROP is literally a 3D orange Connect 4 chip with the column-slot texture visible, rest of letters matching low-poly style`.

### Negative prompt

```
cursive, script font, handwritten, italic calligraphy, comic sans, bubbly rounded font, balloon letters, Candy Crush font, Fortnite font, realistic metal texture, gradient mesh, photoshop bevel preset, generic rainbow, pastel, pink, purple dominant, text misspelled, DRPO4, DR0P4, DROP 4 with space, extra numbers, multiple logos, watermark, artist signature, noise, grain, film photo, blur, motion blur, 2D flat vector, SVG style
```

### Parameters

- Resolution: `1536 x 1024` (horizontal lockup) or `1024 x 1536` for stacked V1
- Steps: `30-35`
- Guidance: `3.5-4.0` Flux (slightly higher to nail text shapes)
- Sampler: `euler` + `simple`
- Batch: **10** (text is the hardest thing for diffusion — generate extra)
- Post: bring winner into Photoshop/Affinity, cut out background, clean any text artifacts manually if needed

### Success criteria

- "DROP4" is perfectly spelled and legible (no D0OP4, DROP44, etc).
- Letters have 3D depth, not flat vector look.
- Matches Synty low-poly character aesthetic (feels like it belongs on the same shelf).
- Does NOT look like Candy Crush, Toon Blast, or any match-3 game.
- Works at small size (scale to 200px, still reads).
- Tilts toward "esports/arcade sports" not "casual puzzle."

---

## 4. Store Screenshots (hero renders x3)

Three App Store / Play Store screenshots, each `1284 x 2778`. The game webview capture goes in the middle band of each; these prompts generate the **stylized background + hero character + promo headline band** around the gameplay capture. Compose in Figma/Photoshop after.

### Screenshot A — "Drop. Connect. Dominate." (hero pose)

#### Primary prompt

```
Vertical mobile game store screenshot background, 1284x2778, top band with bold 3D chunky headline text "DROP. CONNECT. DOMINATE." in glossy orange #ff8c00 with gold bevel stacked on three lines, middle area has a single Synty Studios style low-poly hero character in confident victory pose fist raised holding a glowing orange Connect 4 chip, character wears street athleisure in navy and orange, deep navy to indigo radial gradient background with subtle spotlight glow behind character, scattered orange and gold chip particles frozen mid-air around character, bottom third is calm clean navy with room for gameplay screenshot overlay, low-poly 3D render, Synty Studios aesthetic, vibrant saturated colors, clean flat stylized shading, competitive sports game promo art, NOT cute
```

#### Variations

- **V1:** swap victory pose for `character leaning forward with finger on chip about to drop, intense focused expression, motion lines`.
- **V2:** `two characters in a face-off pose back to back, purple vs orange color split background`.
- **V3:** `low-angle hero shot of character from below, dramatic up-lighting, trophy visible in background`.

### Screenshot B — "Unlock 12+ Characters" (roster wall)

#### Primary prompt

```
Vertical mobile game store screenshot background, 1284x2778, top band bold 3D headline text "UNLOCK 12+ CHARACTERS" in glossy orange with gold bevel, middle area shows a 3x4 grid of Synty Studios style low-poly 3D character busts on circular plinth pedestals, each character in a distinct outfit and color scheme (sports, streetwear, fantasy, business, bosses), characters arranged in soft depth with closer ones larger, one character glowing gold as "featured", deep navy to indigo background with soft purple spotlights, bottom third clean navy for gameplay capture placement, low-poly 3D render, Synty Studios aesthetic, vibrant varied palette, collection showcase composition, NOT cute
```

#### Variations

- **V1:** `characters arranged in a conveyor-belt carousel curving from back to front instead of grid`.
- **V2:** `silhouettes of locked characters in the back row, only front 4 in full color — implying unlockables`.
- **V3:** `characters lined up on a podium staircase, gold champion at top`.

### Screenshot C — "Play Ranked. Climb Tiers." (competitive)

#### Primary prompt

```
Vertical mobile game store screenshot background, 1284x2778, top band bold 3D headline text "PLAY RANKED. CLIMB TIERS." in glossy orange with gold bevel, middle area shows a towering 3D rank ladder with floating tier emblems ascending: bronze shield, silver shield, gold shield, platinum diamond, glowing master crown at top, a Synty Studios low-poly character standing on the gold tier confidently, glowing trail connecting the tiers, deep navy to indigo background with gold particle sparks rising, bottom third clean navy for gameplay capture, low-poly 3D render, Synty Studios aesthetic, competitive esports aesthetic, NOT cute
```

#### Variations

- **V1:** `focus on a single large gold rank emblem center frame with character silhouette kneeling below it`.
- **V2:** `tier emblems arranged as a mountain peak the character is climbing`.
- **V3:** `split screen two characters with VS divider between them, ranked match framing`.

### Shared negative prompt (all 3 screenshots)

```
gameplay screenshot, game UI, HUD, score, timer, health bar, menu buttons, status bar, iOS system UI, Android nav bar, phone mockup, device frame, hand holding phone, realistic people, photorealistic faces, cluttered text, paragraph text, lorem ipsum, misspelled headline, Candy Crush, bubbly, cute, chibi, pastel, pink dominant, low quality, jpeg artifacts, watermark, stock photo, generic mobile ad template
```

### Parameters (all 3 screenshots)

- Resolution: generate at `896 x 1920`, upscale to `1284 x 2778`
- Steps: `30`
- Guidance: `3.5` Flux
- Sampler: `euler` + `simple`
- Batch: **5 per screenshot** = 15 total
- Post: composite the actual gameplay capture into the bottom third in Figma/Photoshop

### Success criteria

- Headline text is spelled correctly and legible on a 3-inch phone preview.
- Bottom third is clean enough to composite a webview capture without clashing.
- Character(s) feel like they belong in the same universe as the Synty Sidekick roster.
- Reads at 1x (App Store thumbnail size) without losing the message.
- All 3 screenshots share obvious visual DNA (same palette, lighting direction, character style).

---

## ComfyUI workflow tips for Devon

1. **Start with a reference image node.** Take the best Synty Sidekick render you have, feed it into a Flux-Redux or IP-Adapter node at 0.25-0.35 strength to lock the "low-poly Synty look" into every generation. This is the single biggest quality win.

2. **Text is hard.** For the logo and splash, generate 8-10 and expect 5 of them to misspell DROP4. That's normal. Cherry-pick, don't fight it.

3. **Batch efficiently.** Queue all 4 asset types back-to-back overnight. You'll wake up to ~40 candidates, triage in the morning over coffee.

4. **Don't upscale junk.** Pick winners at base res first, THEN run upscaler only on the 3-4 keepers. Saves 10x GPU time.

5. **Keep the seeds that work.** When one splash screen nails the layout but the text is wrong, note the seed and re-run with a tweaked prompt at the same seed. Saves re-rolling composition.

6. **Icon edge check.** Before upscaling the icon winner, preview it at 57x57 in ComfyUI's Preview Image node. If it looks muddy, move on — upscaling won't rescue a weak silhouette.

7. **Final delivery sizes:**
   - iOS icon: export 1024x1024 **PNG, no alpha** (App Store rejects alpha).
   - Splash: 1284x2778 PNG.
   - Logo: export on transparent background + solid navy variant.
   - Screenshots: 1284x2778 PNG, three variants.

---

## Time budget estimate

| Asset | Gen time | Triage | Post | Total |
|---|---|---|---|---|
| Icon (batch 8) | 15 min | 10 min | 5 min | 30 min |
| Splash (batch 6) | 20 min | 10 min | 10 min | 40 min |
| Logo (batch 10) | 25 min | 15 min | 15 min | 55 min |
| Screenshots (batch 15) | 30 min | 15 min | 20 min composite | 65 min |
| **Total** | | | | **~3 hrs** |

Aggressive plan: drop logo batch to 6 + use Flux-schnell on screenshots = ~1.5 hrs.

---

## Prompt-engineering checklist (before you hit Queue)

- [ ] Shared style DNA block pasted at the top of the positive prompt?
- [ ] Palette hex codes included?
- [ ] "NOT cute, NOT bubbly, NOT Candy Crush" in the positive prompt (models weight positive > negative for these vibes)?
- [ ] Negative prompt includes `text, watermark, realistic, blurry, pastel`?
- [ ] Resolution matches target deliverable (or upscale plan is set)?
- [ ] Seed set to random for initial batch; pinned for variations?
- [ ] Batch size at least 5 so you have options?
