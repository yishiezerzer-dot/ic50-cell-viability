"""Pydantic schemas for API requests and responses."""

from typing import Any, Literal

from pydantic import BaseModel, Field


class DilutionConfig(BaseModel):
    start_mg_l: float = 50.0
    dilution_factor: float = 2.0
    n_doses: int = 10


class CalculateRequest(BaseModel):
    block: dict[str, Any]
    selected_row_ids: list[str]
    mw: float = Field(gt=0)
    dilution: DilutionConfig = DilutionConfig()
    excluded_dose_indices: list[int] = []


class FitRequest(BaseModel):
    dose_points: list[dict[str, Any]]


class SeriesStyle(BaseModel):
    color: str = "#E41A1C"
    marker: Literal["circle", "square", "diamond", "triangle-up", "triangle-down", "cross", "x"] = "circle"
    marker_size: float = 10.0
    line_width: float = 2.0
    show_error_bars: bool = True
    error_bar_thickness: float = 1.5
    error_bar_cap_width: float = 4.0
    error_bar_color: str | None = None
    show_fit_curve: bool = True
    legend_label: str | None = None


class PlotSeriesRequest(BaseModel):
    dose_points: list[dict[str, Any]]
    fit_result: dict[str, Any] | None = None
    compound_name: str = "Compound"
    style: SeriesStyle = SeriesStyle()


class PlotDataRequest(BaseModel):
    series: list[PlotSeriesRequest]
    x_axis_title: str = "Concentration [µM]"
    y_axis_title: str = "Cell Viability [%]"
    y_min: float = 0.0
    y_max: float = 150.0
    x_axis_title_size: float = 14.0
    y_axis_title_size: float = 14.0
    tick_font_size: float = 12.0
    axis_line_width: float = 1.5
    tick_length: float = 6.0
    tick_width: float = 1.0
    y_tick_step: float | None = None
    legend_font_size: float = 12.0
    plot_height: float = 520.0
    export_width: float = 900.0
    export_height: float = 600.0


class CompoundConfigRequest(CalculateRequest):
    compound_name: str = "Compound"
    style: SeriesStyle = SeriesStyle()
