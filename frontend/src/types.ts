export interface Well {
  well_label: string;
  column: number;
  absorbance: number;
  role: string;
  dose_index: number | null;
}

export interface Replicate {
  row_id: string;
  plate_row: string;
  wells: Well[];
  control_absorbance: number;
  blank_absorbance: number;
}

export interface Block {
  block_id: string;
  compound_name: string;
  plate_rows: string[];
  sm_range: [number, number];
  n_doses: number;
  replicates: Replicate[];
}

export interface ParseResult {
  sheet_name: string;
  layout_start_row: number;
  absorbance_start_row: number;
  replicates: Replicate[];
  blocks: Block[];
}

export interface DilutionConfig {
  start_mg_l: number;
  dilution_factor: number;
  n_doses: number;
}

export interface ReplicateDetail {
  row_id: string;
  plate_row: string;
  absorbance: number;
  viability: number;
}

export interface DosePoint {
  dose_index: number;
  mg_l: number;
  um: number;
  mean_viability: number | null;
  sd: number | null;
  n_replicates: number;
  replicates: ReplicateDetail[];
  excluded: boolean;
}

export interface ViabilityResult {
  block_id: string;
  compound_name: string;
  mw: number;
  dose_points: DosePoint[];
}

export interface FitResult {
  success: boolean;
  message: string;
  ic50: number | null;
  ic50_se: number | null;
  top?: number;
  bottom?: number;
  hill?: number;
  curve_points: { um: number; viability: number }[];
  legend_label?: string;
}

export type MarkerSymbol =
  | "circle"
  | "square"
  | "diamond"
  | "triangle-up"
  | "triangle-down"
  | "cross"
  | "x";

export interface SeriesStyle {
  color: string;
  marker: MarkerSymbol;
  marker_size: number;
  line_width: number;
  show_error_bars: boolean;
  error_bar_thickness: number;
  error_bar_cap_width: number;
  error_bar_color: string | null;
  show_fit_curve: boolean;
  legend_label: string | null;
}

export interface CompoundSeries {
  id: string;
  sourceFileName: string;
  block: Block;
  compound_name: string;
  mw: number;
  selected_row_ids: string[];
  dilution: DilutionConfig;
  excluded_dose_indices: number[];
  style: SeriesStyle;
  dose_points: DosePoint[];
  fit_result: FitResult | null;
}

export interface PlotSettings {
  x_axis_title: string;
  y_axis_title: string;
  y_min: number;
  y_max: number;
  x_axis_title_size: number;
  y_axis_title_size: number;
  tick_font_size: number;
  axis_line_width: number;
  tick_length: number;
  tick_width: number;
  y_tick_step: number | null;
  legend_font_size: number;
  plot_height: number;
  export_width: number;
  export_height: number;
}
