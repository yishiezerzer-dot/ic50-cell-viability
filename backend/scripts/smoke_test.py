"""End-to-end smoke test against a running server."""

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path


def main() -> int:
    base = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"

    health = urllib.request.urlopen(f"{base}/api/health", timeout=10)
    assert json.loads(health.read())["status"] == "ok"

    hexa = Path(__file__).resolve().parents[3] / "Hexa lig-4 rows, dime-2rows.xlsx"
    if hexa.exists():
        import io

        from app.parsers.spark import parse_spark_xlsx

        parsed = parse_spark_xlsx(hexa.read_bytes())
        assert len(parsed["blocks"]) >= 1
        print(f"Parsed Hexa file: {len(parsed['blocks'])} blocks")

    index = urllib.request.urlopen(f"{base}/", timeout=10)
    assert b"IC50" in index.read() or b"root" in index.read()

    print(f"Smoke test passed for {base}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
