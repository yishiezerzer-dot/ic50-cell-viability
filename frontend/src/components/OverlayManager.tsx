import { useCallback, useState } from "react";
import {
  calculateViability,
  DEFAULT_DILUTION,
  DEFAULT_PLOT_SETTINGS,
  DEFAULT_STYLE_PRESETS,
  fitIc50,
} from "../api/client";
import CompoundConfig, { AddCompoundPicker, type BlockWithSource } from "./CompoundConfig";
import DataTable, { exportCsv } from "./DataTable";
import FileUpload, { BlockSummary } from "./FileUpload";
import PlotPanel from "./PlotPanel";
import type { Block, CompoundSeries, ParseResult, PlotSettings } from "../types";

let seriesCounter = 0;

function makeSeries(block: Block, fileName: string, styleIndex: number): CompoundSeries {
  seriesCounter += 1;
  return {
    id: `series_${seriesCounter}`,
    sourceFileName: fileName,
    block,
    compound_name: block.compound_name,
    mw: 500,
    selected_row_ids: block.replicates.map((r) => r.row_id),
    dilution: { ...DEFAULT_DILUTION, n_doses: block.n_doses || DEFAULT_DILUTION.n_doses },
    excluded_dose_indices: [],
    style: { ...DEFAULT_STYLE_PRESETS[styleIndex % DEFAULT_STYLE_PRESETS.length] },
    dose_points: [],
    fit_result: null,
  };
}

export default function OverlayManager() {
  const [parseResults, setParseResults] = useState<{ result: ParseResult; fileName: string }[]>([]);
  const [seriesList, setSeriesList] = useState<CompoundSeries[]>([]);
  const [plotSettings, setPlotSettings] = useState<PlotSettings>(DEFAULT_PLOT_SETTINGS);
  const [recalcError, setRecalcError] = useState<string | null>(null);
  const [fittingIds, setFittingIds] = useState<Set<string>>(new Set());

  const allBlocks: BlockWithSource[] = parseResults.flatMap((p) =>
    p.result.blocks.map((block) => ({ block, fileName: p.fileName })),
  );

  const addedKeys = new Set(seriesList.map((s) => `${s.sourceFileName}:${s.block.block_id}`));

  const runFit = useCallback(async (seriesId: string, dosePoints: CompoundSeries["dose_points"]) => {
    setFittingIds((prev) => new Set(prev).add(seriesId));
    try {
      const fit = await fitIc50(dosePoints);
      setSeriesList((list) => list.map((s) => (s.id === seriesId ? { ...s, fit_result: fit } : s)));
    } catch (e) {
      setRecalcError(e instanceof Error ? e.message : "IC50 fit failed");
      setSeriesList((list) =>
        list.map((s) =>
          s.id === seriesId
            ? {
                ...s,
                fit_result: {
                  success: false,
                  message: e instanceof Error ? e.message : "IC50 fit failed",
                  ic50: null,
                  ic50_se: null,
                  curve_points: [],
                },
              }
            : s,
        ),
      );
    } finally {
      setFittingIds((prev) => {
        const next = new Set(prev);
        next.delete(seriesId);
        return next;
      });
    }
  }, []);

  const recalcSeries = useCallback(
    async (series: CompoundSeries): Promise<CompoundSeries> => {
      const viability = await calculateViability(
        series.block,
        series.selected_row_ids,
        series.mw,
        series.dilution,
        series.excluded_dose_indices,
      );
      const withData: CompoundSeries = {
        ...series,
        dose_points: viability.dose_points,
        fit_result: null,
      };
      void runFit(series.id, viability.dose_points);
      return withData;
    },
    [runFit],
  );

  const updateSeriesStyle = useCallback((updated: CompoundSeries) => {
    setSeriesList((list) => list.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  const updateSeries = useCallback(
    async (updated: CompoundSeries) => {
      try {
        setRecalcError(null);
        const withData = await recalcSeries(updated);
        setSeriesList((list) => list.map((s) => (s.id === withData.id ? withData : s)));
      } catch (e) {
        setRecalcError(e instanceof Error ? e.message : "Recalculation failed");
      }
    },
    [recalcSeries],
  );

  const handleParsed = useCallback(
    async (result: ParseResult, fileName: string) => {
      setParseResults((prev) => [...prev, { result, fileName }]);
      if (result.blocks.length > 0) {
        const first = makeSeries(result.blocks[0], fileName, seriesList.length);
        try {
          setRecalcError(null);
          const withData = await recalcSeries(first);
          setSeriesList((prev) => [...prev, withData]);
        } catch (e) {
          setRecalcError(e instanceof Error ? e.message : "Calculation failed");
        }
      }
    },
    [recalcSeries, seriesList.length],
  );

  const addBlock = async (block: Block, fileName: string) => {
    const s = makeSeries(block, fileName, seriesList.length);
    try {
      setRecalcError(null);
      const withData = await recalcSeries(s);
      setSeriesList((prev) => [...prev, withData]);
    } catch (e) {
      setRecalcError(e instanceof Error ? e.message : "Calculation failed");
    }
  };

  const toggleExclude = (seriesId: string, doseIndex: number) => {
    const s = seriesList.find((x) => x.id === seriesId);
    if (!s) return;
    const excluded = s.excluded_dose_indices.includes(doseIndex)
      ? s.excluded_dose_indices.filter((i) => i !== doseIndex)
      : [...s.excluded_dose_indices, doseIndex];
    updateSeries({ ...s, excluded_dose_indices: excluded });
  };

  return (
    <div className="app-layout">
      <header>
        <h1>IC50 Cell Viability Platform</h1>
        <p>Upload Tecan Spark MTT exports, select replicates, exclude outliers, and overlay dose-response curves.</p>
      </header>

      <FileUpload onParsed={handleParsed} />

      {parseResults.map((p, i) => (
        <BlockSummary key={`${p.fileName}-${i}`} blocks={p.result.blocks} />
      ))}

      {recalcError && <p className="error banner">{recalcError}</p>}
      {fittingIds.size > 0 && (
        <p className="muted banner">Calculating IC50 fit curve… plot points are shown while this runs.</p>
      )}

      <section className="section">
        <h2>2. Configure compounds</h2>
        {seriesList.map((s) => (
          <CompoundConfig
            key={s.id}
            series={s}
            onChange={updateSeries}
            onStyleChange={updateSeriesStyle}
            onRemove={seriesList.length > 1 ? () => setSeriesList((prev) => prev.filter((x) => x.id !== s.id)) : undefined}
          />
        ))}

        {allBlocks.length > 0 && (
          <AddCompoundPicker
            blocks={allBlocks}
            addedKeys={addedKeys}
            onAdd={(item) => addBlock(item.block, item.fileName)}
          />
        )}

        <div className="card">
          <h3>Overlay from another file</h3>
          <p className="muted">Upload another Spark export below to overlay compounds from a different experiment.</p>
          <FileUpload
            onParsed={async (result, fileName) => {
              setParseResults((prev) => [...prev, { result, fileName }]);
              if (result.blocks.length > 0) {
                await addBlock(result.blocks[0], fileName);
              }
            }}
          />
        </div>
      </section>

      {seriesList.length > 0 && (
        <section className="section">
          <h2>3. Review data & exclude points</h2>
          {seriesList.map((s) => (
            <DataTable key={s.id} series={s} onToggleExclude={(doseIndex) => toggleExclude(s.id, doseIndex)} />
          ))}
          <button type="button" className="btn secondary" onClick={() => exportCsv(seriesList)}>
            Export CSV
          </button>
        </section>
      )}

      <PlotPanel seriesList={seriesList} plotSettings={plotSettings} onPlotSettingsChange={setPlotSettings} />
    </div>
  );
}
