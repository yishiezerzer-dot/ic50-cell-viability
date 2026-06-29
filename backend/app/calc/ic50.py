"""4-parameter logistic dose-response fit and IC50 estimation."""

import warnings
from typing import Any

import numpy as np
from scipy.optimize import curve_fit


def four_pl(x: np.ndarray, top: float, bottom: float, ic50: float, hill: float) -> np.ndarray:
    """Inhibitory 4PL: Y = bottom + (top - bottom) / (1 + (x / IC50)^hill)."""
    x = np.asarray(x, dtype=float)
    with np.errstate(divide="ignore", invalid="ignore", over="ignore"):
        ratio = np.power(np.maximum(x, 1e-12) / ic50, hill)
        return bottom + (top - bottom) / (1.0 + ratio)


def _fit_4pl(concentrations_um: np.ndarray, viabilities: np.ndarray) -> dict[str, Any] | None:
    """Fit 4PL on linear µM concentrations."""
    if len(concentrations_um) < 4:
        return None

    x = np.asarray(concentrations_um, dtype=float)
    y = np.asarray(viabilities, dtype=float)

    mask = (x > 0) & np.isfinite(y)
    x, y = x[mask], y[mask]
    if len(x) < 4:
        return None

    top_guess = float(np.max(y))
    bottom_guess = float(np.min(y))
    ic50_guess = float(np.exp(np.mean(np.log(x))))
    hill_guess = 1.0

    bounds = (
        [0.0, -50.0, 1e-6, 0.1],
        [200.0, 150.0, 1e6, 10.0],
    )

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            popt, pcov = curve_fit(
                four_pl,
                x,
                y,
                p0=[top_guess, bottom_guess, ic50_guess, hill_guess],
                bounds=bounds,
                maxfev=20000,
            )
    except (RuntimeError, ValueError):
        return None

    top, bottom, ic50, hill = [float(v) for v in popt]
    perr = np.sqrt(np.diag(pcov)) if pcov is not None else [np.nan] * 4
    ic50_se_analytical = float(perr[2]) if len(perr) > 2 else np.nan

    return {
        "top": top,
        "bottom": bottom,
        "ic50": ic50,
        "hill": hill,
        "ic50_se_analytical": ic50_se_analytical,
        "params": popt,
    }


def _bootstrap_ic50(
    dose_points: list[dict[str, Any]],
    n_bootstrap: int = 200,
) -> tuple[float | None, float | None]:
    """Bootstrap IC50 SE from replicate-level data."""
    pool_x: list[float] = []
    pool_y: list[float] = []

    for pt in dose_points:
        um = pt.get("um")
        if um is None or um <= 0:
            continue
        for rep in pt.get("replicates", []):
            v = rep.get("viability")
            if v is not None:
                pool_x.append(float(um))
                pool_y.append(float(v))

    if len(pool_x) < 4:
        return None, None

    x_arr = np.array(pool_x)
    y_arr = np.array(pool_y)
    rng = np.random.default_rng(42)
    ic50_samples: list[float] = []

    for _ in range(n_bootstrap):
        idx = rng.integers(0, len(x_arr), size=len(x_arr))
        bx, by = x_arr[idx], y_arr[idx]
        # aggregate by concentration for bootstrap sample
        conc_map: dict[float, list[float]] = {}
        for xv, yv in zip(bx, by):
            conc_map.setdefault(xv, []).append(yv)
        cx = np.array(list(conc_map.keys()))
        cy = np.array([np.mean(v) for v in conc_map.values()])
        if len(cx) < 4:
            continue
        fit = _fit_4pl(cx, cy)
        if fit and fit["ic50"] > 0:
            ic50_samples.append(fit["ic50"])

    if len(ic50_samples) < 10:
        return None, None

    return float(np.median(ic50_samples)), float(np.std(ic50_samples))


def generate_curve_points(fit: dict[str, Any], x_min: float, x_max: float, n: int = 200) -> list[dict[str, float]]:
    """Generate smooth curve for plotting on log scale."""
    x_vals = np.logspace(np.log10(x_min), np.log10(x_max), n)
    params = fit["params"]
    y_vals = four_pl(x_vals, *params)
    return [{"um": float(x), "viability": float(y)} for x, y in zip(x_vals, y_vals)]


def fit_ic50(dose_points: list[dict[str, Any]], n_bootstrap: int = 200) -> dict[str, Any]:
    """
    Fit 4PL to aggregated dose points and compute IC50 ± SE.

    dose_points: list with keys um, mean_viability, replicates
    """
    concentrations: list[float] = []
    viabilities: list[float] = []

    for pt in dose_points:
        um = pt.get("um")
        mean_v = pt.get("mean_viability")
        if um is None or mean_v is None or um <= 0:
            continue
        concentrations.append(float(um))
        viabilities.append(float(mean_v))

    if len(concentrations) < 4:
        return {
            "success": False,
            "message": "Need at least 4 dose points for IC50 fitting.",
            "ic50": None,
            "ic50_se": None,
            "curve_points": [],
        }

    x = np.array(concentrations)
    y = np.array(viabilities)
    fit = _fit_4pl(x, y)

    if fit is None:
        return {
            "success": False,
            "message": "Curve fit failed. Check data for a sigmoidal dose-response.",
            "ic50": None,
            "ic50_se": None,
            "curve_points": [],
        }

    ic50_bs, ic50_se_bs = _bootstrap_ic50(dose_points, n_bootstrap)
    ic50 = fit["ic50"]
    ic50_se = ic50_se_bs if ic50_se_bs is not None else fit.get("ic50_se_analytical")

    x_min = float(np.min(x)) * 0.5
    x_max = float(np.max(x)) * 2.0
    curve_points = generate_curve_points(fit, x_min, x_max)

    return {
        "success": True,
        "message": "Fit successful",
        "ic50": round(ic50, 2),
        "ic50_se": round(ic50_se, 2) if ic50_se is not None and np.isfinite(ic50_se) else None,
        "top": round(fit["top"], 2),
        "bottom": round(fit["bottom"], 2),
        "hill": round(fit["hill"], 2),
        "curve_points": curve_points,
        "legend_label": _format_legend(ic50, ic50_se),
    }


def _format_legend(ic50: float, ic50_se: float | None) -> str:
    if ic50_se is not None and np.isfinite(ic50_se):
        return f"{ic50:.1f} ± {ic50_se:.1f} µM"
    return f"{ic50:.1f} µM"
