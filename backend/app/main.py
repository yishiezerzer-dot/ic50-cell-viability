"""FastAPI application for IC50 cell viability analysis."""

from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.calc.ic50 import fit_ic50
from app.calc.plot_layout import build_plot_layout
from app.calc.viability import calculate_block_viability
from app.parsers.spark import parse_spark_xlsx
from app.schemas import CalculateRequest, FitRequest, PlotDataRequest

app = FastAPI(title="IC50 Cell Viability Platform", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/parse")
async def parse_file(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Please upload an Excel (.xlsx) file.")
    try:
        content = await file.read()
        result = parse_spark_xlsx(content)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to parse file: {exc}") from exc


@app.post("/api/calculate")
def calculate(request: CalculateRequest):
    try:
        result = calculate_block_viability(
            block=request.block,
            selected_row_ids=request.selected_row_ids,
            mw=request.mw,
            start_mg_l=request.dilution.start_mg_l,
            dilution_factor=request.dilution.dilution_factor,
            n_doses=request.dilution.n_doses,
            excluded_dose_indices=request.excluded_dose_indices,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/fit")
def fit(request: FitRequest):
    return fit_ic50(request.dose_points)


@app.post("/api/plot-data")
def plot_data(request: PlotDataRequest):
    """Build Plotly-compatible trace data for the frontend."""
    traces = []
    all_concentrations: list[float] = []

    for idx, series in enumerate(request.series):
        style = series.style
        name_base = series.compound_name
        fit = series.fit_result or {}
        ic50_label = style.legend_label or fit.get("legend_label", "")
        trace_name = f"{name_base} {ic50_label}".strip()

        x_vals = [pt["um"] for pt in series.dose_points if pt.get("mean_viability") is not None]
        y_vals = [pt["mean_viability"] for pt in series.dose_points if pt.get("mean_viability") is not None]
        y_err = [pt.get("sd") or 0 for pt in series.dose_points if pt.get("mean_viability") is not None]
        all_concentrations.extend(x_vals)

        if style.show_error_bars:
            err_color = style.error_bar_color or style.color
            traces.append(
                {
                    "type": "scatter",
                    "mode": "markers",
                    "name": trace_name,
                    "x": x_vals,
                    "y": y_vals,
                    "error_y": {
                        "type": "data",
                        "array": y_err,
                        "visible": True,
                        "thickness": style.error_bar_thickness,
                        "width": style.error_bar_cap_width,
                        "color": err_color,
                    },
                    "marker": {
                        "color": style.color,
                        "size": style.marker_size,
                        "symbol": style.marker,
                        "line": {"width": 0},
                    },
                    "legendgroup": f"g{idx}",
                    "showlegend": True,
                }
            )
        else:
            traces.append(
                {
                    "type": "scatter",
                    "mode": "markers",
                    "name": trace_name,
                    "x": x_vals,
                    "y": y_vals,
                    "marker": {
                        "color": style.color,
                        "size": style.marker_size,
                        "symbol": style.marker,
                        "line": {"width": 0},
                    },
                    "legendgroup": f"g{idx}",
                    "showlegend": True,
                }
            )

        if style.show_fit_curve and fit.get("success") and fit.get("curve_points"):
            curve = fit["curve_points"]
            all_concentrations.extend(p["um"] for p in curve)
            traces.append(
                {
                    "type": "scatter",
                    "mode": "lines",
                    "name": trace_name,
                    "x": [p["um"] for p in curve],
                    "y": [p["viability"] for p in curve],
                    "line": {"color": style.color, "width": style.line_width},
                    "legendgroup": f"g{idx}",
                    "showlegend": False,
                }
            )

    layout = build_plot_layout(
        x_axis_title=request.x_axis_title,
        y_axis_title=request.y_axis_title,
        y_min=request.y_min,
        y_max=request.y_max,
        concentrations_um=all_concentrations,
        x_axis_title_size=request.x_axis_title_size,
        y_axis_title_size=request.y_axis_title_size,
        tick_font_size=request.tick_font_size,
        axis_line_width=request.axis_line_width,
        tick_length=request.tick_length,
        tick_width=request.tick_width,
        y_tick_step=request.y_tick_step,
        legend_font_size=request.legend_font_size,
        plot_height=request.plot_height,
    )

    return {"data": traces, "layout": layout, "export_width": request.export_width, "export_height": request.export_height}


# Serve React frontend in production
FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        index = FRONTEND_DIST / "index.html"
        if index.exists():
            return FileResponse(index)
        raise HTTPException(status_code=404, detail="Frontend not built")
