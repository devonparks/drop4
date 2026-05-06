#!/usr/bin/env python3
r"""
sonniss-pick.py — interactive Sonniss GameAudioGDC clip picker for Drop4.

Given a Sonniss bundle directory and a Drop4 SFX slot name, searches the
bundle for matching filenames, lets you preview each candidate via the
default audio player, and copies the chosen one into Drop4's
src/assets/sounds/<slot>.wav.

Usage:
    python tools/sonniss-pick.py click
    python tools/sonniss-pick.py drop --search "piece drop falling"
    python tools/sonniss-pick.py --all   # walk every Drop4 slot

Setup:
    Set SONNISS_DIR env var to the extracted Sonniss bundle root, e.g.:
      $env:SONNISS_DIR = "D:\sonniss\GameAudioGDC2024"   (PowerShell)
      export SONNISS_DIR="/d/sonniss/GameAudioGDC2024"   (Git Bash)
    Or pass --bundle <path> on each call.
"""

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

# ── Drop4 SFX slot taxonomy ─────────────────────────────────────────────
# Each slot maps to a list of search keywords likely to match Sonniss
# filenames. Order matters — first hit wins when sorting candidates.
DROP4_SLOTS = {
    # Core UI taps + clicks (short, ~50-200ms)
    "tap":         ["tap", "touch", "blip"],
    "click":       ["click", "button", "ui_press"],
    "tick":        ["tick", "tock", "subtle_click"],
    "pluck":       ["pluck", "blip", "ping"],
    "whoosh":      ["whoosh", "swoosh", "swipe", "transition"],
    "swoosh":      ["swoosh", "whoosh", "transition_quick"],
    # Interactions
    "select":      ["select", "highlight", "ui_select"],
    "toggle":      ["toggle", "switch", "flip"],
    "tab_switch":  ["tab", "switch", "swipe", "slide"],
    "back":        ["back", "cancel", "return"],
    # Modals
    "open":        ["open", "modal", "popup", "appear"],
    "close":       ["close", "dismiss", "modal_close"],
    "modal_in":    ["whoosh_in", "appear", "rise"],
    "modal_out":   ["whoosh_out", "disappear", "fall"],
    # Feedback
    "error":       ["error", "fail", "wrong", "denied"],
    "purchase":    ["coin", "purchase", "kaching", "register"],
    # Gameplay (Connect 4 piece falling, win, lose)
    "drop":        ["drop", "thud", "wood", "click_heavy"],
    "win":         ["win", "victory", "fanfare", "success"],
    "lose":        ["lose", "fail", "sad", "lost"],
    "coin":        ["coin", "ding", "gold", "reward"],
    # Events
    "level_up":    ["level_up", "rise", "fanfare_short", "achievement"],
    "achievement": ["achievement", "unlock", "earn", "trophy"],
    "countdown":   ["countdown", "tick_pulse", "beep_pulse"],
    "boss_intro":  ["boss", "intro", "tension", "stinger"],
    "match_found": ["match", "found", "ready", "fanfare_short"],
}

DROP4_ROOT = Path(__file__).resolve().parent.parent
SOUNDS_DIR = DROP4_ROOT / "src" / "assets" / "sounds"


def find_sonniss_dir(cli_arg: str | None) -> Path:
    """Resolve the Sonniss bundle root from --bundle, $SONNISS_DIR, or fail."""
    if cli_arg:
        p = Path(cli_arg).expanduser().resolve()
    else:
        env = os.environ.get("SONNISS_DIR")
        if not env:
            print("ERROR: pass --bundle <path> or set SONNISS_DIR env var.", file=sys.stderr)
            print("       Sonniss bundles live at sonniss.com/gameaudiogdc (free).", file=sys.stderr)
            sys.exit(2)
        p = Path(env).expanduser().resolve()
    if not p.is_dir():
        print(f"ERROR: {p} is not a directory.", file=sys.stderr)
        sys.exit(2)
    return p


def search_bundle(bundle: Path, keywords: list[str], extra: str | None = None) -> list[Path]:
    """Walk the bundle and return .wav/.mp3/.ogg files whose filename matches
    any keyword. Higher matches surface first."""
    matches: dict[Path, int] = {}
    terms = [k.lower() for k in keywords]
    if extra:
        # Split extra search string into additional terms
        terms = [t.lower() for t in extra.split()] + terms
    for path in bundle.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in (".wav", ".mp3", ".ogg", ".flac"):
            continue
        name = path.name.lower()
        score = 0
        for i, term in enumerate(terms):
            if term in name:
                # Earlier keywords score higher (more relevance)
                score += (len(terms) - i) * 10
        if score > 0:
            # Prefer shorter/UI-typical clip lengths via filesize heuristic
            # (Sonniss has both short SFX and long ambient — UI wants short)
            try:
                size = path.stat().st_size
                if size < 200_000:  # < ~200kb suggests <2s @ 44.1k stereo
                    score += 5
                if size > 5_000_000:  # > 5mb suggests long ambient/music
                    score -= 20
            except OSError:
                pass
            matches[path] = score
    return sorted(matches.keys(), key=lambda p: -matches[p])


def play(path: Path) -> None:
    """Play a clip using the OS default audio handler."""
    try:
        if sys.platform.startswith("win"):
            os.startfile(path)  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.Popen(["afplay", str(path)])
        else:
            subprocess.Popen(["xdg-open", str(path)])
    except Exception as e:
        print(f"  [could not play: {e}]", file=sys.stderr)


def pick_one(slot: str, bundle: Path, extra_search: str | None = None, limit: int = 20) -> bool:
    """Interactive pick for a single slot. Returns True when copied, False if skipped."""
    keywords = DROP4_SLOTS.get(slot)
    if keywords is None:
        print(f"Unknown slot '{slot}'. Known slots: {', '.join(DROP4_SLOTS.keys())}")
        return False
    print(f"\n══ Picking SFX for slot: {slot} ══")
    print(f"   Keywords: {', '.join(keywords)}")
    if extra_search:
        print(f"   Extra search: {extra_search}")
    print(f"   Searching {bundle}...")
    candidates = search_bundle(bundle, keywords, extra_search)
    if not candidates:
        print("   No matches. Try --search 'your terms'.")
        return False
    print(f"   Found {len(candidates)} candidates. Showing top {min(limit, len(candidates))}.\n")
    candidates = candidates[:limit]

    for i, path in enumerate(candidates, 1):
        size_kb = path.stat().st_size / 1024
        rel = path.relative_to(bundle)
        print(f"  [{i:2d}] {rel}  ({size_kb:.0f} kb)")
    print()

    while True:
        choice = input(f"  [number] play | [c <num>] copy | [s] skip | [q] quit: ").strip().lower()
        if not choice:
            continue
        if choice == "q":
            sys.exit(0)
        if choice == "s":
            print("   skipped.")
            return False
        if choice.startswith("c "):
            try:
                n = int(choice.split()[1])
                if 1 <= n <= len(candidates):
                    src = candidates[n - 1]
                    dst = SOUNDS_DIR / f"{slot}.wav"
                    SOUNDS_DIR.mkdir(parents=True, exist_ok=True)
                    # If source isn't .wav, you'll need ffmpeg for conversion;
                    # for now copy as .wav extension with original bytes.
                    shutil.copy2(src, dst)
                    print(f"   ✓ copied {src.name} → {dst}")
                    return True
                else:
                    print(f"   out of range (1..{len(candidates)})")
            except (ValueError, IndexError):
                print("   bad copy command. use: c 3")
            continue
        try:
            n = int(choice)
            if 1 <= n <= len(candidates):
                play(candidates[n - 1])
            else:
                print(f"   out of range (1..{len(candidates)})")
        except ValueError:
            print("   not a number. enter a number to play, 'c <num>' to copy, 's' to skip.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slot", nargs="?", help="Drop4 SFX slot name (or omit with --all)")
    ap.add_argument("--bundle", help="Path to extracted Sonniss bundle (default: $SONNISS_DIR)")
    ap.add_argument("--search", help="Extra search terms to narrow matches")
    ap.add_argument("--all", action="store_true", help="Walk every Drop4 slot")
    ap.add_argument("--list", action="store_true", help="List all Drop4 slot names + keywords")
    args = ap.parse_args()

    if args.list:
        print("Drop4 SFX slots and search keywords:\n")
        for slot, kws in DROP4_SLOTS.items():
            print(f"  {slot:14}  {', '.join(kws)}")
        return

    bundle = find_sonniss_dir(args.bundle)
    print(f"Using bundle: {bundle}")
    print(f"Output dir:   {SOUNDS_DIR}")

    if args.all:
        for slot in DROP4_SLOTS:
            pick_one(slot, bundle)
        print("\nAll slots processed.")
        return

    if not args.slot:
        print("Pick a slot or use --all. See --list for names.")
        sys.exit(2)

    pick_one(args.slot, bundle, args.search)


if __name__ == "__main__":
    main()
