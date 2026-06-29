import type {
  Block,
  CompoundSeries,
  DilutionConfig,
  FitResult,
  ParseResult,
  PlotSettings,
  SeriesStyle,
  ViabilityResult,
} from "./types";

const API_BASE = "";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export async function parseFile(file: File): Promise<ParseResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/parse`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Parse failed");
  }
  return res.json();
}

export async function calculateViability(
  block: Block,
  selected_row_ids: string[],
  mw: number,
  dilution: DilutionConfig,
  excluded_dose_indices: number[],
): Promise<ViabilityResult> {
  return postJson("/api/calculate", {
    block,
    selected_row_ids,
    mw,
    dilution,
    excluded_dose_indices,
  });
}

export async function fitIc50(dose_points: ViabilityResult["dose_points"]): Promise<FitResult> {
  return postJson("/api/fit", { dose_points });
}

export interface PlotDataResponse {
  data: Plotly.Data[];
  layout: Partial<Plotly.Layout>;
  export_width?: number;
  export_height?: number;
}

export async function getPlotData(
  series: CompoundSeries[],
  plotSettings: PlotSettings,
): Promise<PlotDataResponse> {
  return postJson("/api/plot-data", {
    series: series.map((s) => ({
      dose_points: s.dose_points,
      fit_result: s.fit_result,
      compound_name: s.compound_name,
      style: s.style,
    })),
    ...plotSettings,
  });
}

export const DEFAULT_SERIES_STYLE: SeriesStyle = {
  color: "#E41A1C",
  marker: "triangle-up",
  marker_size: 10,
  line_width: 2,
  show_error_bars: true,
  error_bar_thickness: 1.5,
  error_bar_cap_width: 4,
  error_bar_color: null,
  show_fit_curve: true,
  legend_label: null,
};

export const DEFAULT_STYLE_PRESETS: SeriesStyle[] = [
  { ...DEFAULT_SERIES_STYLE, color: "#E41A1C", marker: "triangle-up" },
  { ...DEFAULT_SERIES_STYLE, color: "#377EB8", marker: "circle" },
  { ...DEFAULT_SERIES_STYLE, color: "#4DAF4A", marker: "diamond" },
  { ...DEFAULT_SERIES_STYLE, color: "#984EA3", marker: "square" },
];

export const DEFAULT_DILUTION: DilutionConfig = {
  start_mg_l: 50,
  dilution_factor: 2,
  n_doses: 10,
};

export const DEFAULT_PLOT_SETTINGS: PlotSettings = {
  x_axis_title: "Concentration [µM]",
  y_axis_title: "Cell Viability [%]",
  y_min: 0,
  y_max: 150,
  x_axis_title_size: 14,
  y_axis_title_size: 14,
  tick_font_size: 12,
  axis_line_width: 1.5,
  tick_length: 6,
  tick_width: 1,
  y_tick_step: null,
  legend_font_size: 12,
  plot_height: 520,
  export_width: 900,
  export_height: 600,
};

export function mergeSeriesStyle(partial: Partial<SeriesStyle>, base: SeriesStyle = DEFAULT_SERIES_STYLE): SeriesStyle {
  return { ...base, ...partial };
}
