"""End-to-end API test against Render."""

import json
import sys
from pathlib import Path

import requests

BASE = "https://ic50-viability.onrender.com"


def main() -> None:
    hexa = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if not hexa or not hexa.exists():
        print("Usage: python scripts/test_render_e2e.py path/to/file.xlsx")
        sys.exit(1)

    with hexa.open("rb") as f:
        r = requests.post(f"{BASE}/api/parse", files={"file": (hexa.name, f)}, timeout=120)
    print("parse", r.status_code)
    if not r.ok:
        print(r.text[:500])
        sys.exit(1)

    parsed = r.json()
    block = parsed["blocks"][0]
    payload = {
        "block": block,
        "selected_row_ids": [rep["row_id"] for rep in block["replicates"]],
        "mw": 523.66,
        "dilution": {"start_mg_l": 50, "dilution_factor": 2, "n_doses": block.get("n_doses", 10)},
        "excluded_dose_indices": [],
    }
    r2 = requests.post(f"{BASE}/api/calculate", json=payload, timeout=120)
    print("calculate", r2.status_code)
    if not r2.ok:
        print(r2.text[:800])
        sys.exit(1)

    calc = r2.json()
    print("dose_points", len(calc.get("dose_points", [])))

    r3 = requests.post(f"{BASE}/api/fit", json={"dose_points": calc["dose_points"]}, timeout=120)
    print("fit", r3.status_code, r3.text[:200])

    plot_payload = {
        "series": [
            {
                "dose_points": calc["dose_points"],
                "fit_result": r3.json() if r3.ok else None,
                "compound_name": "Test",
                "style": {},
            }
        ],
        "x_axis_title": "Concentration [µM]",
        "y_axis_title": "Cell Viability [%]",
        "y_min": 0,
        "y_max": 150,
        "x_axis_title_size": 14,
        "y_axis_title_size": 14,
        "tick_font_size": 12,
        "axis_line_width": 1.5,
        "tick_length": 6,
        "tick_width": 1,
        "y_tick_step": None,
        "legend_font_size": 12,
        "plot_height": 520,
        "export_width": 900,
        "export_height": 600,
    }
    r4 = requests.post(f"{BASE}/api/plot-data", json=plot_payload, timeout=120)
    print("plot-data", r4.status_code, "traces", len(r4.json().get("data", [])) if r4.ok else r4.text[:200])


if __name__ == "__main__":
    main()
