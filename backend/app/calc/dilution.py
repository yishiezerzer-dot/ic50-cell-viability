"""Serial dilution and µM conversion."""


def mg_l_series(start_mg_l: float, factor: float, n_points: int) -> list[float]:
    """Generate a serial dilution series in mg/L."""
    return [start_mg_l / (factor ** i) for i in range(n_points)]


def mg_l_to_um(mg_l: float, mw: float) -> float:
    """Convert mg/L to µM: µM = (mg/L × 1000) / Mw."""
    if mw <= 0:
        raise ValueError("Molecular weight must be positive")
    return mg_l * 1000.0 / mw


def build_concentrations(
    start_mg_l: float = 50.0,
    factor: float = 2.0,
    n_points: int = 10,
    mw: float = 500.0,
) -> list[dict]:
    """Build dose concentration table (mg/L and µM) for dose indices 0..n-1."""
    mg_series = mg_l_series(start_mg_l, factor, n_points)
    return [
        {
            "dose_index": i,
            "mg_l": mg,
            "um": mg_l_to_um(mg, mw),
        }
        for i, mg in enumerate(mg_series)
    ]
