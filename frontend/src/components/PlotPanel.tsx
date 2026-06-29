import { useEffect, useRef, useState } from "react";
import Plotly from "plotly.js-dist-min";
import Plot from "react-plotly.js";
import { getPlotData } from "../api/client";
import type { CompoundSeries, PlotSettings } from "../types";

interface Props {
  seriesList: CompoundSeries[];
  plotSettings: PlotSettings;
  onPlotSettingsChange: (settings: PlotSettings) => void;
}

function num(value: string, fallback: number): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function optionalNum(value: string): number | null {
  if (value.trim() === "") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export default function PlotPanel({ seriesList, plotSettings, onPlotSettingsChange }: Props) {
  const plotRef = useRef<Plot>(null);
  const [plotState, setPlotState] = useState<{
    data: Plotly.Data[];
    layout: Partial<Plotly.Layout>;
    export_width: number;
    export_height: number;
  }>({ data: [], layout: {}, export_width: 900, export_height: 600 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(true);

  const patch = (partial: Partial<PlotSettings>) => onPlotSettingsChange({ ...plotSettings, ...partial });

  useEffect(() => {
    if (!seriesList.length || !seriesList.some((s) => s.dose_points.length)) {
      setPlotState({ data: [], layout: {}, export_width: 900, export_height: 600 });
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getPlotData(seriesList, plotSettings)
      .then((result) => {
        if (!cancelled) {
          setPlotState({
            data: result.data,
            layout: result.layout,
            export_width: result.export_width ?? plotSettings.export_width,
            export_height: result.export_height ?? plotSettings.export_height,
          });
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Plot failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [seriesList, plotSettings]);

  const downloadImage = (format: "png" | "svg") => {
    const el = plotRef.current?.el;
    if (!el) return;
    Plotly.downloadImage(el, {
      format,
      width: plotState.export_width,
      height: plotState.export_height,
      filename: `ic50_plot.${format}`,
    });
  };

  return (
    <section className="card plot-panel">
      <h2>Plot customization</h2>

      <h3 className="subsection">Axis titles & range</h3>
      <div className="form-grid plot-settings">
        <label>
          X-axis title
          <input
            type="text"
            value={plotSettings.x_axis_title}
            onChange={(e) => patch({ x_axis_title: e.target.value })}
          />
        </label>
        <label>
          Y-axis title
          <input
            type="text"
            value={plotSettings.y_axis_title}
            onChange={(e) => patch({ y_axis_title: e.target.value })}
          />
        </label>
        <label>
          Y min
          <input
            type="number"
            value={plotSettings.y_min}
            onChange={(e) => patch({ y_min: num(e.target.value, 0) })}
          />
        </label>
        <label>
          Y max
          <input
            type="number"
            value={plotSettings.y_max}
            onChange={(e) => patch({ y_max: num(e.target.value, 150) })}
          />
        </label>
        <label>
          Y tick step <span className="hint">blank = auto</span>
          <input
            type="number"
            min={0}
            step={1}
            placeholder="auto"
            value={plotSettings.y_tick_step ?? ""}
            onChange={(e) => patch({ y_tick_step: optionalNum(e.target.value) })}
          />
        </label>
      </div>

      <button type="button" className="btn link-btn" onClick={() => setShowAdvanced((v) => !v)}>
        {showAdvanced ? "Hide" : "Show"} axis & size options
      </button>

      {showAdvanced && (
        <>
          <h3 className="subsection">Axis appearance</h3>
          <div className="form-grid plot-settings">
            <label>
              X-axis title size
              <input
                type="number"
                min={8}
                max={32}
                value={plotSettings.x_axis_title_size}
                onChange={(e) => patch({ x_axis_title_size: num(e.target.value, 14) })}
              />
            </label>
            <label>
              Y-axis title size
              <input
                type="number"
                min={8}
                max={32}
                value={plotSettings.y_axis_title_size}
                onChange={(e) => patch({ y_axis_title_size: num(e.target.value, 14) })}
              />
            </label>
            <label>
              Tick label size
              <input
                type="number"
                min={6}
                max={24}
                value={plotSettings.tick_font_size}
                onChange={(e) => patch({ tick_font_size: num(e.target.value, 12) })}
              />
            </label>
            <label>
              Axis line width
              <input
                type="number"
                min={0.5}
                max={5}
                step={0.5}
                value={plotSettings.axis_line_width}
                onChange={(e) => patch({ axis_line_width: num(e.target.value, 1.5) })}
              />
            </label>
            <label>
              Tick length
              <input
                type="number"
                min={0}
                max={20}
                value={plotSettings.tick_length}
                onChange={(e) => patch({ tick_length: num(e.target.value, 6) })}
              />
            </label>
            <label>
              Tick line width
              <input
                type="number"
                min={0.5}
                max={5}
                step={0.5}
                value={plotSettings.tick_width}
                onChange={(e) => patch({ tick_width: num(e.target.value, 1) })}
              />
            </label>
            <label>
              Legend font size
              <input
                type="number"
                min={6}
                max={24}
                value={plotSettings.legend_font_size}
                onChange={(e) => patch({ legend_font_size: num(e.target.value, 12) })}
              />
            </label>
            <label>
              Plot height (px)
              <input
                type="number"
                min={300}
                max={1200}
                value={plotSettings.plot_height}
                onChange={(e) => patch({ plot_height: num(e.target.value, 520) })}
              />
            </label>
            <label>
              Export width (px)
              <input
                type="number"
                min={400}
                max={2400}
                value={plotSettings.export_width}
                onChange={(e) => patch({ export_width: num(e.target.value, 900) })}
              />
            </label>
            <label>
              Export height (px)
              <input
                type="number"
                min={300}
                max={1800}
                value={plotSettings.export_height}
                onChange={(e) => patch({ export_height: num(e.target.value, 600) })}
              />
            </label>
          </div>
        </>
      )}

      <p className="muted">
        Per-series options (marker size, fit line width, error bars) are under each compound in section 2.
      </p>

      <div className="btn-row">
        <button type="button" className="btn secondary" onClick={() => downloadImage("png")}>
          Download PNG
        </button>
        <button type="button" className="btn secondary" onClick={() => downloadImage("svg")}>
          Download SVG
        </button>
      </div>

      {loading && <p className="muted">Updating plot...</p>}
      {error && <p className="error">{error}</p>}

      {plotState.data.length > 0 ? (
        <Plot
          ref={plotRef}
          data={plotState.data}
          layout={{
            ...plotState.layout,
            autosize: true,
            height: plotSettings.plot_height,
            xaxis: {
              ...(plotState.layout.xaxis as object),
              showline: true,
              ticks: "outside",
            },
            yaxis: {
              ...(plotState.layout.yaxis as object),
              showline: true,
              ticks: "outside",
            },
          }}
          config={{ responsive: true, displayModeBar: true, displaylogo: false }}
          style={{ width: "100%" }}
          useResizeHandler
        />
      ) : (
        <div className="plot-placeholder">Add compounds and configure data to see the dose-response plot.</div>
      )}
    </section>
  );
}
