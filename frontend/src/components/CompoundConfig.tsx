import { useEffect, useRef, useState } from "react";
import type { Block, CompoundSeries, DilutionConfig, SeriesStyle } from "../types";

interface Props {
  series: CompoundSeries;
  onChange: (updated: CompoundSeries) => void;
  onStyleChange: (updated: CompoundSeries) => void;
  onRemove?: () => void;
}

const MARKERS = [
  "circle",
  "square",
  "diamond",
  "triangle-up",
  "triangle-down",
  "cross",
  "x",
] as const;

export default function CompoundConfig({ series, onChange, onStyleChange, onRemove }: Props) {
  const [draft, setDraft] = useState(series);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(series);
  }, [series]);

  const scheduleChange = (next: CompoundSeries) => {
    setDraft(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(next), 400);
  };

  const update = (patch: Partial<CompoundSeries>) => scheduleChange({ ...draft, ...patch });
  const updateDilution = (patch: Partial<DilutionConfig>) =>
    update({ dilution: { ...draft.dilution, ...patch } });
  const updateStyle = (patch: Partial<SeriesStyle>) => {
    const next = { ...draft, style: { ...draft.style, ...patch } };
    setDraft(next);
    onStyleChange(next);
  };

  const updateName = (compound_name: string) => {
    const next = { ...draft, compound_name };
    setDraft(next);
    onStyleChange(next);
  };

  const toggleRow = (rowId: string) => {
    const selected = draft.selected_row_ids.includes(rowId)
      ? draft.selected_row_ids.filter((id) => id !== rowId)
      : [...draft.selected_row_ids, rowId];
    onChange({ ...draft, selected_row_ids: selected });
  };

  return (
    <div className="compound-config card">
      <div className="config-header">
        <h3>{draft.compound_name}</h3>
        {onRemove && (
          <button type="button" className="btn danger small" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>
      <p className="muted">Source: {draft.sourceFileName}</p>

      <div className="form-grid">
        <label>
          Compound name
          <input
            type="text"
            value={draft.compound_name}
            onChange={(e) => updateName(e.target.value)}
          />
        </label>
        <label>
          Mw (g/mol)
          <input
            type="number"
            min={1}
            step={0.01}
            value={draft.mw}
            onChange={(e) => update({ mw: parseFloat(e.target.value) || 500 })}
          />
        </label>
        <label>
          Start concentration (mg/L)
          <input
            type="number"
            min={0.001}
            step={0.1}
            value={draft.dilution.start_mg_l}
            onChange={(e) => updateDilution({ start_mg_l: parseFloat(e.target.value) || 50 })}
          />
        </label>
        <label>
          Dilution factor
          <input
            type="number"
            min={1.1}
            step={0.1}
            value={draft.dilution.dilution_factor}
            onChange={(e) => updateDilution({ dilution_factor: parseFloat(e.target.value) || 2 })}
          />
        </label>
        <label>
          Number of doses
          <input
            type="number"
            min={3}
            max={20}
            value={draft.dilution.n_doses}
            onChange={(e) => updateDilution({ n_doses: parseInt(e.target.value, 10) || 10 })}
          />
        </label>
        <label>
          Color
          <input
            type="color"
            value={draft.style.color}
            onChange={(e) => updateStyle({ color: e.target.value })}
          />
        </label>
        <label>
          Marker
          <select
            value={draft.style.marker}
            onChange={(e) => updateStyle({ marker: e.target.value as SeriesStyle["marker"] })}
          >
            {MARKERS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label>
          Marker size
          <input
            type="number"
            min={2}
            max={30}
            value={draft.style.marker_size}
            onChange={(e) => updateStyle({ marker_size: parseFloat(e.target.value) || 10 })}
          />
        </label>
        <label>
          Fit line width
          <input
            type="number"
            min={0.5}
            max={10}
            step={0.5}
            value={draft.style.line_width}
            onChange={(e) => updateStyle({ line_width: parseFloat(e.target.value) || 2 })}
          />
        </label>
        <label>
          Error bar thickness
          <input
            type="number"
            min={0.5}
            max={10}
            step={0.5}
            value={draft.style.error_bar_thickness}
            onChange={(e) => updateStyle({ error_bar_thickness: parseFloat(e.target.value) || 1.5 })}
          />
        </label>
        <label>
          Error bar cap width
          <input
            type="number"
            min={0}
            max={20}
            step={0.5}
            value={draft.style.error_bar_cap_width}
            onChange={(e) => updateStyle({ error_bar_cap_width: parseFloat(e.target.value) || 4 })}
          />
        </label>
        <label>
          Error bar color <span className="hint">blank = match series</span>
          <input
            type="color"
            value={draft.style.error_bar_color ?? draft.style.color}
            onChange={(e) => updateStyle({ error_bar_color: e.target.value })}
          />
        </label>
        <label className="checkbox-inline">
          <input
            type="checkbox"
            checked={draft.style.error_bar_color === null}
            onChange={(e) =>
              updateStyle({ error_bar_color: e.target.checked ? null : draft.style.color })
            }
          />
          Match error bar color to series
        </label>
      </div>

      <fieldset className="checkbox-row">
        <label>
          <input
            type="checkbox"
            checked={draft.style.show_error_bars}
            onChange={(e) => updateStyle({ show_error_bars: e.target.checked })}
          />
          Error bars (SD)
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.style.show_fit_curve}
            onChange={(e) => updateStyle({ show_fit_curve: e.target.checked })}
          />
          Fit curve
        </label>
      </fieldset>

      <label>
        Custom legend suffix (optional)
        <input
          type="text"
          placeholder="Auto: IC50 ± SE µM"
          value={draft.style.legend_label ?? ""}
          onChange={(e) => updateStyle({ legend_label: e.target.value || null })}
        />
      </label>

      <div className="row-select">
        <h4>Replicate rows</h4>
        {draft.block.replicates.map((rep) => (
          <label key={rep.row_id} className="row-checkbox">
            <input
              type="checkbox"
              checked={draft.selected_row_ids.includes(rep.row_id)}
              onChange={() => toggleRow(rep.row_id)}
            />
            Row {rep.plate_row} (control {rep.control_absorbance.toFixed(3)}, blank{" "}
            {rep.blank_absorbance.toFixed(3)})
          </label>
        ))}
      </div>
    </div>
  );
}

export interface BlockWithSource {
  block: Block;
  fileName: string;
}

export function AddCompoundPicker({
  blocks,
  onAdd,
  addedKeys,
}: {
  blocks: BlockWithSource[];
  onAdd: (item: BlockWithSource) => void;
  addedKeys: Set<string>;
}) {
  const available = blocks.filter((b) => !addedKeys.has(`${b.fileName}:${b.block.block_id}`));
  if (!available.length) return null;

  return (
    <div className="add-compound card">
      <h3>Add compound to plot</h3>
      <div className="btn-row">
        {available.map((b) => (
          <button
            key={`${b.fileName}:${b.block.block_id}`}
            type="button"
            className="btn secondary"
            onClick={() => onAdd(b)}
          >
            + {b.block.compound_name} (rows {b.block.plate_rows.join("-")})
          </button>
        ))}
      </div>
    </div>
  );
}
