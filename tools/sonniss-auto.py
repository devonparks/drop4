#!/usr/bin/env python3
r"""
sonniss-auto.py — non-interactive auto-pick variant of sonniss-pick.

For each Drop4 SFX slot, scans the Sonniss bundle, ranks candidates by
keyword + filesize heuristics, and auto-copies the top candidate to
src/assets/sounds/<slot>.wav. Outputs a report so you can manually
swap any picks that don't sound right.

Usage:
    SONNISS_DIR="$HOME/sonniss/bundle1" python tools/sonniss-auto.py
    python tools/sonniss-auto.py --bundle D:/sonniss --dry-run
    python tools/sonniss-auto.py --slot click   # auto-pick one slot

Use --dry-run to preview picks without copying.
Use --backup to save existing sounds to src/assets/sounds/_backup/ first.
"""

import argparse
import os
import shutil
import sys
from pathlib import Path

# Reuse the slot taxonomy from sonniss-pick.py to keep them in sync.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module
spec = import_module("sonniss-pick" if False else "sonniss-pick")  # noqa


def load_slots():
    """Load DROP4_SLOTS from sibling sonniss-pick.py without import games."""
    here = Path(__file__).resolve().parent
    pick_path = here / "sonniss-pick.py"
    src = pick_path.read_text(encoding="utf-8")
    # Lazy: just exec the dict literal block
    ns = {}
    # Find the dict and exec a slice
    start = src.index("DROP4_SLOTS = {")
    end = src.index("}", start) + 1
    exec(src[start:end], ns)
    return ns["DROP4_SLOTS"]


DROP4_SLOTS = load_slots()
DROP4_ROOT = Path(__file__).resolve().parent.parent
SOUNDS_DIR = DROP4_ROOT / "src" / "assets" / "sounds"


def find_sonniss_dir(cli_arg: str | None) -> Path:
    if cli_arg:
        p = Path(cli_arg).expanduser().resolve()
    else:
        env = os.environ.get("SONNISS_DIR")
        if not env:
            print("ERROR: pass --bundle <path> or set SONNISS_DIR", file=sys.stderr)
            sys.exit(2)
        p = Path(env).expanduser().resolve()
    if not p.is_dir():
        print(f"ERROR: {p} is not a directory.", file=sys.stderr)
        sys.exit(2)
    return p


def search_bundle(bundle: Path, keywords: list[str]) -> list[tuple[Path, int]]:
    """Walk the bundle and return (path, score) tuples for matching clips."""
    matches: dict[Path, int] = {}
    terms = [k.lower() for k in keywords]
    for path in bundle.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in (".wav", ".mp3", ".ogg", ".flac"):
            continue
        name = path.name.lower()
        score = 0
        for i, term in enumerate(terms):
            if term in name:
                # Earlier keywords score higher
                score += (len(terms) - i) * 10
        if score > 0:
            try:
                size = path.stat().st_size
                # Drop4 SFX are short (UI: <2s, gameplay: <5s).
                # Penalize very long clips, prefer 30kb-2mb range.
                if 30_000 <= size <= 500_000:
                    score += 8  # ideal short UI clip
                elif 500_000 < size <= 2_000_000:
                    score += 4  # acceptable medium clip
                elif size < 10_000:
                    score -= 5  # too short, probably broken
                elif size > 5_000_000:
                    score -= 30  # long ambient/music, bad fit
            except OSError:
                pass
            matches[path] = score
    return sorted(matches.items(), key=lambda kv: -kv[1])


def auto_pick(slot: str, bundle: Path, dry_run: bool, backup: bool) -> dict:
    keywords = DROP4_SLOTS.get(slot)
    if keywords is None:
        return {"slot": slot, "status": "unknown_slot"}
    candidates = search_bundle(bundle, keywords)
    if not candidates:
        return {"slot": slot, "status": "no_match", "tried_keywords": keywords}
    src, score = candidates[0]
    rel = src.relative_to(bundle)
    size_kb = src.stat().st_size / 1024
    dst = SOUNDS_DIR / f"{slot}.wav"
    result = {
        "slot": slot,
        "status": "picked",
        "from": str(rel),
        "size_kb": round(size_kb, 1),
        "score": score,
        "to": str(dst.relative_to(DROP4_ROOT)),
        "alternates": [str(p.relative_to(bundle)) for p, _ in candidates[1:4]],
    }
    if dry_run:
        result["status"] = "dry_run"
        return result
    if backup and dst.exists():
        backup_dir = SOUNDS_DIR / "_backup"
        backup_dir.mkdir(exist_ok=True)
        shutil.copy2(dst, backup_dir / f"{slot}.wav")
    SOUNDS_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    return result


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--bundle", help="Path to Sonniss bundle (default: $SONNISS_DIR)")
    ap.add_argument("--slot", help="Auto-pick a single slot (default: all slots)")
    ap.add_argument("--dry-run", action="store_true", help="Preview picks, don't copy")
    ap.add_argument("--backup", action="store_true", default=True, help="Backup existing sounds (default: yes)")
    ap.add_argument("--no-backup", dest="backup", action="store_false")
    args = ap.parse_args()

    bundle = find_sonniss_dir(args.bundle)
    print(f"Bundle: {bundle}")
    print(f"Output: {SOUNDS_DIR}")
    print(f"Mode:   {'dry-run' if args.dry_run else 'copy'}{', with backup' if args.backup else ''}")
    print()

    slots = [args.slot] if args.slot else list(DROP4_SLOTS.keys())

    picked, missed = [], []
    for slot in slots:
        result = auto_pick(slot, bundle, args.dry_run, args.backup)
        if result["status"] in ("picked", "dry_run"):
            picked.append(result)
            print(f"  [OK]{slot:14}  <-{result['from']}  ({result['size_kb']} kb, score {result['score']})")
            for alt in result["alternates"]:
                print(f"        alt: {alt}")
        else:
            missed.append(result)
            print(f"  [--]{slot:14}  no match (kw: {', '.join(DROP4_SLOTS[slot])})")

    print()
    print(f"Picked: {len(picked)} / {len(slots)}  |  Missed: {len(missed)}")
    if missed:
        print()
        print("Missed slots — try downloading more bundles or use:")
        for m in missed:
            print(f"  python tools/sonniss-pick.py {m['slot']} --search '<custom terms>'")


if __name__ == "__main__":
    main()
