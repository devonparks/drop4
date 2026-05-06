#!/usr/bin/env python3
r"""
audio-normalize.py — normalize Drop4 SFX to consistent mobile-friendly format.

Sonniss bundle audio ships at 96 kHz / 24-bit / stereo (studio quality)
which bloats the bundle ~3x vs typical mobile game audio. This script
batch-converts every .wav in src/assets/sounds/ to:
  - 44100 Hz mono 16-bit  (matches existing Kenney files; smallest size)

Saves the converted files in place. Preserves the _backup folder.

Usage:
    python tools/audio-normalize.py                # dry-run report
    python tools/audio-normalize.py --apply        # actually convert
"""

import argparse
import os
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal

DROP4_ROOT = Path(__file__).resolve().parent.parent
SOUNDS_DIR = DROP4_ROOT / "src" / "assets" / "sounds"

TARGET_RATE = 44100
TARGET_CHANNELS = 1  # mono


def normalize_one(path: Path, apply: bool) -> dict:
    """Read, downsample to 44100 mono 16-bit, optionally write back."""
    info = sf.info(str(path))
    needs_change = (
        info.samplerate != TARGET_RATE
        or info.channels != TARGET_CHANNELS
        or info.subtype not in ("PCM_16", "PCM_S8")
    )
    result = {
        "file": path.name,
        "before": {
            "rate": info.samplerate,
            "ch": info.channels,
            "subtype": info.subtype,
            "size_kb": round(path.stat().st_size / 1024, 1),
        },
        "needs_change": needs_change,
    }
    if not needs_change:
        result["status"] = "already-normalized"
        return result
    if not apply:
        result["status"] = "would-convert"
        return result

    # Read as float32 (channels, frames)
    data, sr = sf.read(str(path), dtype="float32", always_2d=False)
    if data.ndim == 2:
        # Convert stereo to mono via channel mean
        data = data.mean(axis=1)

    # Resample if needed
    if sr != TARGET_RATE:
        new_len = int(len(data) * TARGET_RATE / sr)
        data = signal.resample(data, new_len).astype(np.float32)

    # Clamp to [-1, 1] then write as 16-bit PCM
    data = np.clip(data, -1.0, 1.0)
    sf.write(str(path), data, TARGET_RATE, subtype="PCM_16")

    info_after = sf.info(str(path))
    result["after"] = {
        "rate": info_after.samplerate,
        "ch": info_after.channels,
        "subtype": info_after.subtype,
        "size_kb": round(path.stat().st_size / 1024, 1),
    }
    result["status"] = "converted"
    return result


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apply", action="store_true", help="Actually convert (default: dry-run)")
    ap.add_argument("--target-rate", type=int, default=TARGET_RATE)
    args = ap.parse_args()

    if not SOUNDS_DIR.is_dir():
        print(f"ERROR: sounds dir not found: {SOUNDS_DIR}", file=sys.stderr)
        sys.exit(2)

    files = sorted(p for p in SOUNDS_DIR.iterdir() if p.suffix.lower() == ".wav")
    print(f"Sounds dir: {SOUNDS_DIR}")
    print(f"Target:     {TARGET_RATE} Hz mono 16-bit")
    print(f"Mode:       {'APPLY (will overwrite)' if args.apply else 'dry-run'}")
    print(f"Files:      {len(files)}")
    print()

    converted, skipped, total_before, total_after = 0, 0, 0, 0
    for f in files:
        r = normalize_one(f, args.apply)
        total_before += r["before"]["size_kb"]
        if r["status"] == "converted":
            after = r["after"]["size_kb"]
            total_after += after
            saved = r["before"]["size_kb"] - after
            converted += 1
            print(f"  [OK] {f.name:18} {r['before']['rate']}->{r['after']['rate']} {r['before']['ch']}ch->{r['after']['ch']}ch  "
                  f"{r['before']['size_kb']:6.0f}->{r['after']['size_kb']:6.0f} kb  (saved {saved:.0f} kb)")
        elif r["status"] == "would-convert":
            converted += 1
            est = (r["before"]["size_kb"] / max(r["before"]["rate"] / 44100, 1)) / max(r["before"]["ch"], 1)
            est = est * (16 / 24 if r["before"]["subtype"] == "PCM_24" else 1)
            total_after += est
            print(f"  [--] {f.name:18} {r['before']['rate']} {r['before']['ch']}ch {r['before']['subtype']}  "
                  f"{r['before']['size_kb']:6.0f} kb  (would shrink to ~{est:.0f} kb)")
        else:
            skipped += 1
            total_after += r["before"]["size_kb"]

    print()
    saved_total = total_before - total_after
    print(f"Files: {converted} converted/would-convert, {skipped} already normalized")
    print(f"Total: {total_before:.0f} kb -> {total_after:.0f} kb  (saved {saved_total:.0f} kb)")


if __name__ == "__main__":
    main()
