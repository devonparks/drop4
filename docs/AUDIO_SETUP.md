# Drop4 Audio Setup — Sonniss GameAudioGDC pipeline

Drop4 ships with 25 SFX slots wired in `src/services/audio.ts`. The
current files in `src/assets/sounds/` are placeholder Kenney + Dustyroom
clips that Devon flagged as low-quality. This doc walks the replacement
pipeline using **Sonniss GameAudioGDC** — free, royalty-free, AAA-quality.

---

## Step 1 — Download Sonniss bundle

1. Go to <https://sonniss.com/gameaudiogdc/>
2. Free email signup (no credit card)
3. Download the latest year (2024 bundle is ~30 GB; 2023 is also great
   and a few GB smaller)
4. Extract to a folder you have space for, e.g. `D:/sonniss/GameAudioGDC2024/`

**Optional but recommended**: also grab 2022 and 2023 bundles for more
variety. They cost nothing.

The bundles are organized like:
```
GameAudioGDC2024/
├── Boom Library - GameMaster/
│   ├── UI/
│   ├── Magic/
│   └── Foley/
├── HISS and a ROAR - Atmospheres/
├── PolePos - Casual UI Pack/
├── (dozens more sub-vendors)
```

---

## Step 2 — Set bundle path

Set `SONNISS_DIR` so the picker tool knows where to search.

**Git Bash / WSL:**
```bash
export SONNISS_DIR="/d/sonniss/GameAudioGDC2024"
```

**PowerShell:**
```powershell
$env:SONNISS_DIR = "D:\sonniss\GameAudioGDC2024"
```

To make this permanent in PowerShell:
```powershell
[System.Environment]::SetEnvironmentVariable('SONNISS_DIR', 'D:\sonniss\GameAudioGDC2024', 'User')
```

---

## Step 3 — Pick clips with the interactive tool

`tools/sonniss-pick.py` is an interactive picker. For each Drop4 SFX
slot it searches the Sonniss bundle, lists candidates ranked by
filename keyword match, lets you preview each one in your default
audio player, and copies the chosen clip into `src/assets/sounds/`.

### Pick one slot at a time

```bash
python tools/sonniss-pick.py click
```

Workflow inside the picker:
- Type a number `1`, `2`, etc. → opens that clip in default audio app
- Type `c 3` → copies candidate #3 to `src/assets/sounds/click.wav`
- Type `s` → skip this slot, leave the existing clip
- Type `q` → quit

### Pick everything in one session

```bash
python tools/sonniss-pick.py --all
```

Walks every slot in order. Skip any you don't want to replace.

### Add custom search terms

If the default keywords don't surface what you want:

```bash
python tools/sonniss-pick.py drop --search "wood thud heavy"
python tools/sonniss-pick.py win --search "fanfare bright short"
```

### List all slots

```bash
python tools/sonniss-pick.py --list
```

---

## Step 4 — All 25 Drop4 SFX slots

For reference — these are what you're filling. Default search keywords
in parentheses; override with `--search` if you want different vibes.

### Core UI (taps + clicks, very short)
- `tap` — light tap (tap, touch, blip)
- `click` — main button click (click, button, ui_press)
- `tick` — subtle nav tick (tick, tock, subtle_click)
- `pluck` — selection accent (pluck, blip, ping)
- `whoosh` — navigation transition (whoosh, swoosh, swipe)
- `swoosh` — alt navigation (swoosh, whoosh, transition_quick)

### Interactions
- `select` — picking an item / category (select, highlight)
- `toggle` — switches (toggle, switch, flip)
- `tab_switch` — bottom tab change (tab, switch, swipe, slide)
- `back` — back navigation (back, cancel, return)

### Modals (open / close transitions)
- `open` — modal/sheet opens (open, modal, popup, appear)
- `close` — modal/sheet closes (close, dismiss, modal_close)
- `modal_in` — large modal entrance (whoosh_in, appear, rise)
- `modal_out` — large modal exit (whoosh_out, disappear, fall)

### Feedback
- `error` — invalid taps / failed actions (error, fail, wrong, denied)
- `purchase` — coin spend confirmation (coin, purchase, kaching, register)

### Gameplay (Connect 4 specific)
- `drop` — piece falls into board slot (drop, thud, wood, click_heavy)
- `win` — match victory (win, victory, fanfare, success)
- `lose` — match loss (lose, fail, sad, lost)
- `coin` — coin earned (coin, ding, gold, reward)

### Events
- `level_up` — player level up (level_up, rise, fanfare_short)
- `achievement` — milestone unlocked (achievement, unlock, earn, trophy)
- `countdown` — timer pulse (countdown, tick_pulse, beep_pulse)
- `boss_intro` — career boss intro (boss, intro, tension, stinger)
- `match_found` — opponent ready (match, found, ready, fanfare_short)

---

## Step 5 — Test

After picking + copying clips, reload the dev server and play through:

```bash
npx expo start --web --port 8086
```

Verify each SFX fires at the right moment:
- Tap any button → click sound
- Drop a piece in Game → drop sound
- Win a match → win sound
- Open a modal → open sound
- Earn coins → coin sound

If anything sounds off, run `sonniss-pick.py <slot>` again and pick a
different candidate. The tool overwrites the previous file without
asking.

---

## Notes

### File format
The picker copies the Sonniss source file as-is, renamed to
`<slot>.wav` in `src/assets/sounds/`. Sonniss clips are usually 44.1k
or 48k stereo .wav at high bit depth — slightly bigger than what
mobile games typically ship, but Drop4 already loads .wav so no
conversion needed for v1. (Post-v1 polish: convert to .mp3 or .ogg
to shrink bundle size. Needs ffmpeg.)

### Volume balancing
Sonniss clips have varied source volumes. After picking, you may want
to adjust `playSound(name)` calls in code or normalize the .wav files
themselves. Hold this for a polish pass after picking is done.

### Music tracks
This guide is for SFX only. For menu / game / victory music loops,
see the AI music generation plan (MusicGen-Large via Replicate or
local). That's a separate workflow.
