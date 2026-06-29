import { useCallback, useState } from "react";
import { parseFile } from "../api/client";
import type { Block, ParseResult } from "../types";

interface Props {
  onParsed: (result: ParseResult, fileName: string) => void;
}

export default function FileUpload({ onParsed }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      try {
        const result = await parseFile(file);
        onParsed(result, file.name);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setLoading(false);
      }
    },
    [onParsed],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <section className="card">
      <h2>1. Upload Spark Export</h2>
      <div
        className={`dropzone ${dragOver ? "drag-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <p>Drag & drop a Tecan Spark .xlsx file here</p>
        <label className="btn primary">
          {loading ? "Parsing..." : "Choose file"}
          <input
            type="file"
            accept=".xlsx,.xls"
            hidden
            disabled={loading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

export function BlockSummary({ blocks }: { blocks: Block[] }) {
  if (!blocks.length) return null;
  return (
    <div className="block-summary">
      <h3>Detected compound blocks</h3>
      <ul>
        {blocks.map((b) => (
          <li key={b.block_id}>
            <strong>{b.compound_name}</strong> — rows {b.plate_rows.join(", ")}, {b.n_doses} doses,
            SM{b.sm_range[0]}–SM{b.sm_range[1]}
          </li>
        ))}
      </ul>
    </div>
  );
}
