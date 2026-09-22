#!/usr/bin/env python3
"""Verify i18n key parity across all languages and presence of required keys.

Exit non-zero if any language:
  - has a different key set than the first language, or
  - is missing any REQUIRED_KEY.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRANSLATIONS = ROOT / "frontend" / "src" / "i18n" / "translations.json"

REQUIRED_KEYS = [
    "day_sunday", "day_monday", "day_tuesday", "day_wednesday",
    "day_thursday", "day_friday", "day_saturday",
    "day_sun", "day_mon", "day_tue", "day_wed",
    "day_thu", "day_fri", "day_sat",
    "trend_up", "trend_down", "trend_stable",
]


def main() -> int:
    data = json.loads(TRANSLATIONS.read_text(encoding="utf-8"))
    langs = list(data.keys())
    if not langs:
        print("ERROR: no languages found")
        return 1

    key_sets = {lang: set(data[lang]["translation"].keys()) for lang in langs}
    base = key_sets[langs[0]]
    errors = []

    for lang in langs:
        keys = key_sets[lang]
        if keys != base:
            missing = base - keys
            extra = keys - base
            errors.append(
                f"{lang}: key set differs from {langs[0]} "
                f"(missing {len(missing)}: {sorted(missing)[:5]}..., "
                f"extra {len(extra)}: {sorted(extra)[:5]}...)"
            )
        missing_required = [k for k in REQUIRED_KEYS if k not in keys]
        if missing_required:
            errors.append(f"{lang}: missing required keys {missing_required}")

    if errors:
        print("FAIL")
        for err in errors:
            print("  -", err)
        return 1

    print(f"OK: {len(langs)} langs x {len(base)} keys, all required keys present")
    return 0


if __name__ == "__main__":
    sys.exit(main())