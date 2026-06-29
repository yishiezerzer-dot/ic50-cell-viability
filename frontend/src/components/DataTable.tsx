import type { CompoundSeries } from "../types";

interface Props {
  series: CompoundSeries;
  onToggleExclude: (doseIndex: number) => void;
}

export default function DataTable({ series, onToggleExclude }: Props) {
  const { dose_points, fit_result } = series;

  return (
    <div className="data-table card">
      <h3>Data — {series.compound_name}</h3>
      {fit_result && (
        <p className="ic50-summary">
          {fit_result.success ? (
            <>
              IC50: <strong>{fit_result.ic50}</strong> µM
              {fit_result.ic50_se != null && <> ± {fit_result.ic50_se} µM</>}
            </>
          ) : (
            <span className="warning">{fit_result.message}</span>
          )}
        </p>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>µM</th>
              <th>mg/L</th>
              <th>Mean viability (%)</th>
              <th>SD</th>
              <th>Replicates</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {dose_points.map((pt) => {
              const excluded = series.excluded_dose_indices.includes(pt.dose_index);
              return (
                <tr key={pt.dose_index} className={excluded ? "excluded" : ""}>
                  <td>{pt.um.toFixed(3)}</td>
                  <td>{pt.mg_l.toFixed(4)}</td>
                  <td>{pt.mean_viability?.toFixed(1) ?? "—"}</td>
                  <td>{pt.sd != null ? pt.sd.toFixed(1) : "—"}</td>
                  <td className="reps">
                    {pt.replicates.map((r) => (
                      <span key={r.row_id} title={`Row ${r.plate_row}`}>
                        {r.viability.toFixed(1)}
                      </span>
                    ))}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`btn small ${excluded ? "secondary" : "danger"}`}
                      onClick={() => onToggleExclude(pt.dose_index)}
                      title={excluded ? "Include point" : "Exclude point from fit/plot"}
                    >
                      {excluded ? "Restore" : "Exclude"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function exportCsv(seriesList: CompoundSeries[]) {
  const rows = ["compound,um,mg_l,mean_viability,sd,n_replicates,ic50,ic50_se"];
  for (const s of seriesList) {
    for (const pt of s.dose_points) {
      if (s.excluded_dose_indices.includes(pt.dose_index)) continue;
      rows.push(
        [
          s.compound_name,
          pt.um,
          pt.mg_l,
          pt.mean_viability ?? "",
          pt.sd ?? "",
          pt.n_replicates,
          s.fit_result?.ic50 ?? "",
          s.fit_result?.ic50_se ?? "",
        ].join(","),
      );
    }
  }
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ic50_data.csv";
  a.click();
  URL.revokeObjectURL(url);
}
