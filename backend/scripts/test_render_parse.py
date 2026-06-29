import json
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("pip install requests")
    sys.exit(1)

BASE = "https://ic50-viability.onrender.com"
file_path = Path(sys.argv[-1])

if not file_path.exists():
    print("File not found:", file_path)
    sys.exit(1)

with file_path.open("rb") as f:
    r = requests.post(
        f"{BASE}/api/parse",
        files={"file": (file_path.name, f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        timeout=120,
    )

print("status", r.status_code)
print("content-type", r.headers.get("content-type"))
if r.ok:
    data = r.json()
    print("OK blocks", len(data.get("blocks", [])))
else:
    print(r.text[:800])
