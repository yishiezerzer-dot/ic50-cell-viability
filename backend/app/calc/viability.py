"""Blank correction, viability calculation, and aggregation."""

import statistics
from typing import Any


def blank_correct(absorbance: float, blank: float) -> float:
    return absorbance - blank


def compute_viability(corrected_sample: float, corrected_control: float) -> float | None:
    if corrected_control == 0:
        return None
    return corrected_sample / corrected_control * 100.0


def aggregate_replicates(values: list[float]) -> dict[str, float | None]:
    """Compute mean and sample SD from replicate viability values."""
    if not values:
        return {"mean": None, "sd": None, "n": 0}
    if len(values) == 1:
        return {"mean": values[0], "sd": 0.0, "n": 1}
    return {
        "mean": statistics.mean(values),
        "sd": statistics.stdev(values),
        "n": len(values),
    }


def calculate_block_viability(
    block: dict[str, Any],
    selected_row_ids: list[str],
    mw: float,
    start_mg_l: float = 50.0,
    dilution_factor: float = 2.0,
    n_doses: int = 10,
    excluded_dose_indices: list[int] | None = None,
) -> dict[str, Any]:
    """
    Compute viability table for one compound block.

    block: parsed block from Spark parser with replicates containing wells
    """
    from app.calc.dilution import build_concentrations

    excluded = set(excluded_dose_indices or [])
    concentrations = build_concentrations(start_mg_l, dilution_factor, n_doses, mw)

    rows_by_id = {r["row_id"]: r for r in block["replicates"]}
    selected = [rows_by_id[rid] for rid in selected_row_ids if rid in rows_by_id]

    dose_points: list[dict[str, Any]] = []
    for conc in concentrations:
        dose_idx = conc["dose_index"]
        if dose_idx in excluded:
            continue

        replicate_values: list[float] = []
        replicate_details: list[dict[str, Any]] = []

        for rep in selected:
            control_abs = rep["control_absorbance"]
            blank_abs = rep["blank_absorbance"]
            dose_wells = [w for w in rep["wells"] if w["role"] == "dose" and w["dose_index"] == dose_idx]
            if not dose_wells:
                continue
            sample_abs = dose_wells[0]["absorbance"]

            corr_control = blank_correct(control_abs, blank_abs)
            corr_sample = blank_correct(sample_abs, blank_abs)
            viability = compute_viability(corr_sample, corr_control)

            if viability is not None:
                replicate_values.append(viability)
                replicate_details.append(
                    {
                        "row_id": rep["row_id"],
                        "plate_row": rep["plate_row"],
                        "absorbance": sample_abs,
                        "viability": round(viability, 2),
                    }
                )

        agg = aggregate_replicates(replicate_values)
        dose_points.append(
            {
                "dose_index": dose_idx,
                "mg_l": conc["mg_l"],
                "um": round(conc["um"], 4),
                "mean_viability": round(agg["mean"], 2) if agg["mean"] is not None else None,
                "sd": round(agg["sd"], 2) if agg["sd"] is not None else None,
                "n_replicates": agg["n"],
                "replicates": replicate_details,
                "excluded": False,
            }
        )

    return {
        "block_id": block["block_id"],
        "compound_name": block.get("compound_name", block["block_id"]),
        "mw": mw,
        "dose_points": dose_points,
    }
