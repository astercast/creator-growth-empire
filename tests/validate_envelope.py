#!/usr/bin/env python3
"""tests/validate_envelope.py — validate one function response against
data/v1/schema/envelope.json (§1.10). Usage: curl -s URL | python3 tests/validate_envelope.py
Exit 0 when valid, 1 with the violation printed otherwise."""
import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = json.loads((ROOT / "data" / "v1" / "schema" / "envelope.json").read_text())


def main():
    raw = sys.stdin.read()
    try:
        doc = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"not JSON: {e}")
        return 1
    errors = list(Draft202012Validator(SCHEMA).iter_errors(doc))
    if errors:
        for e in errors[:10]:
            print(f"schema violation at /{'/'.join(map(str, e.path))}: {e.message}")
        return 1
    # extra spec rules the schema can't fully express
    meta = doc.get("meta", {})
    if doc.get("ok") is True and "upstream" not in meta and "note" not in meta:
        pass  # upstream/note are optional on success; present on degraded
    print("envelope valid")
    return 0


if __name__ == "__main__":
    sys.exit(main())
