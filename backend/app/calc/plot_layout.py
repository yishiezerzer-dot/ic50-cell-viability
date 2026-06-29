"""Publication-style Plotly layout helpers."""

import math
from typing import Any


def _format_tick_label(value: float) -> str:
    if value >= 1:
        return str(int(value)) if value == int(value) else f"{value:g}"
    return f"{value:g}"


def log_axis_ticks(concentrations_um: list[float]) -> tuple[list[float], list[str]]:
    """Pick decade tick marks that span the data range."""
    if not concentrations_um:
        ticks = [0.01, 0.1, 1, 10, 100]
    else:
        lo = math.log10(min(concentrations_um))
        hi = math.log10(max(concentrations_um))
        decades = range(math.floor(lo) - 1, math.ceil(hi) + 2)
        ticks = [10**d for d in decades if 1e-4 <= 10**d <= 1e5]
        if len(ticks) < 3:
            ticks = [0.01, 0.1, 1, 10, 100]

    return ticks, [_format_tick_label(t) for t in ticks]


def linear_axis_dtick(y_min: float, y_max: float) -> float:
    span = y_max - y_min
    if span >= 120:
        return 50.0
    if span >= 60:
        return 25.0
    if span >= 30:
        return 10.0
    return max(span / 5, 1.0)


def build_plot_layout(
    x_axis_title: str,
    y_axis_title: str,
    y_min: float,
    y_max: float,
    concentrations_um: list[float],
    *,
    x_axis_title_size: float = 14.0,
    y_axis_title_size: float = 14.0,
    tick_font_size: float = 12.0,
    axis_line_width: float = 1.5,
    tick_length: float = 6.0,
    tick_width: float = 1.0,
    y_tick_step: float | None = None,
    legend_font_size: float = 12.0,
    plot_height: float = 520.0,
) -> dict[str, Any]:
    """Build publication-style axes matching reference dose-response figures."""
    x_ticks, x_ticktext = log_axis_ticks(concentrations_um)
    y_dtick = y_tick_step if y_tick_step and y_tick_step > 0 else linear_axis_dtick(y_min, y_max)

    axis_base = {
        "showline": True,
        "linewidth": axis_line_width,
        "linecolor": "#000000",
        "mirror": False,
        "ticks": "outside",
        "ticklen": tick_length,
        "tickwidth": tick_width,
        "tickcolor": "#000000",
        "tickfont": {"size": tick_font_size, "color": "#000000"},
    }

    bottom_margin = max(72, int(x_axis_title_size * 4))
    left_margin = max(72, int(y_axis_title_size * 4))

    return {
        "font": {"family": "Arial, Helvetica, sans-serif", "size": tick_font_size, "color": "#000000"},
        "height": plot_height,
        "xaxis": {
            **axis_base,
            "title": {
                "text": x_axis_title,
                "font": {"size": x_axis_title_size, "color": "#000000"},
                "standoff": max(10, x_axis_title_size * 0.8),
            },
            "type": "log",
            "showgrid": False,
            "zeroline": False,
            "showexponent": "none",
            "tickmode": "array",
            "tickvals": x_ticks,
            "ticktext": x_ticktext,
        },
        "yaxis": {
            **axis_base,
            "title": {
                "text": y_axis_title,
                "font": {"size": y_axis_title_size, "color": "#000000"},
                "standoff": max(10, y_axis_title_size * 0.8),
            },
            "range": [y_min, y_max],
            "dtick": y_dtick,
            "showgrid": False,
            "zeroline": False,
        },
        "legend": {
            "x": 1.02,
            "y": 1,
            "xanchor": "left",
            "font": {"size": legend_font_size, "color": "#000000"},
            "bgcolor": "rgba(255,255,255,0.8)",
            "borderwidth": 0,
        },
        "margin": {"l": left_margin, "r": 200, "t": 32, "b": bottom_margin},
        "plot_bgcolor": "white",
        "paper_bgcolor": "white",
    }
