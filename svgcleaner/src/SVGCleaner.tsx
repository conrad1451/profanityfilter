// svgcleaner/src/SVGCleaner.tsx

import { useState, useCallback, useRef } from "react";

import type { TransformLog, LogStatus, FileResult } from "./types";
import { transformSVG } from "./TransformSVG";
import "./App.css";

import { downloadBlob } from "./utils/downloadBlob";
import { getSvgId } from "./utils/getSvgId";

// ── Types ─────────────────────────────────────────────────────────────────────

const EXAMPLE = `<svg id="sunflowerFieldWinds" style="width: 30px; height: 30px; display: none">
  <rect width="30" height="30" fill="rgb(230,230,255)"></rect>
  <rect id="sunflowerFieldWinds_cooldown" width="30" height="0" style="fill: rgb(0, 0, 0)" opacity="0.45"></rect>
  <g transform="translate(5,5)scale(0.7,0.7)">
    <path d="M-2 0C -10 -18 10 -18 2 0M-2 0C -10 18 10 18 2 0" fill="rgb(255,255,0)" stroke="#57b5b1" stroke-width="2" transform="translate(15,15)"></path>
    <path d="M-2 0C -10 -18 10 -18 2 0M-2 0C -10 18 10 18 2 0" fill="rgb(255,255,0)" stroke="#57b5b1" stroke-width="2" transform="translate(15,15) rotate(45)"></path>
    <path d="M-2 0C -10 -18 10 -18 2 0M-2 0C -10 18 10 18 2 0" fill="rgb(255,255,0)" stroke="#57b5b1" stroke-width="2" transform="translate(15,15) rotate(90)"></path>
    <path d="M-2 0C -10 -18 10 -18 2 0M-2 0C -10 18 10 18 2 0" fill="rgb(255,255,0)" stroke="#57b5b1" stroke-width="2" transform="translate(15,15) rotate(135)"></path>
    <circle cx="15" cy="15" r="5" fill="rgb(145, 101, 29)"></circle>
  </g>
  <text id="sunflowerFieldWinds_amount" x="28" y="28" style="font-family: calibri; font-size: 11px" text-anchor="end"></text>
</svg>`;

function LogLine({ entry }: { entry: TransformLog }) {
  return (
    <div className={`log-line log-${entry.status}`}>
      <span className="log-icon">
        {entry.status === "ok" ? "✓" : entry.status === "error" ? "✗" : "·"}
      </span>
      {entry.message}
    </div>
  );
}

export function SVGCleaner() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [log, setLog] = useState<TransformLog[]>([]);
  const [copied, setCopied] = useState(false);

  const run = useCallback(() => {
    if (!input.trim()) return;
    const result = transformSVG(input);
    setOutput(result.svg);
    setLog(result.log);
  }, [input]);

  const copy = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [output]);

  const download = useCallback(() => {
    if (!output) return;
    const blob = new Blob([output], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "output.svg";
    a.click();
    URL.revokeObjectURL(url);
  }, [output]);

  return (
    <div className="app">
      <header className="header">
        <h1>SVG Sanitizer</h1>
        <p className="subtitle">
          Cleans inline SVG for use as standalone <code>.svg</code> files
        </p>
      </header>

      <main className="panels">
        {/* ── Input ── */}
        <section className="panel">
          <div className="panel-header">
            <span className="panel-label">Input</span>
            <button className="btn-ghost" onClick={() => setInput(EXAMPLE)}>
              Load example
            </button>
          </div>
          <textarea
            className="editor"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your SVG code here…"
            spellCheck={false}
          />
          <div className="panel-actions">
            <button
              className="btn-primary"
              onClick={run}
              disabled={!input.trim()}
            >
              Transform →
            </button>
          </div>
        </section>

        {/* ── Output ── */}
        <section className="panel">
          <div className="panel-header">
            <span className="panel-label">Output</span>
            <div className="btn-group">
              <button className="btn-ghost" onClick={copy} disabled={!output}>
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                className="btn-ghost"
                onClick={download}
                disabled={!output}
              >
                Download .svg
              </button>
            </div>
          </div>
          <textarea
            className="editor"
            value={output}
            readOnly
            placeholder="Cleaned SVG will appear here…"
            spellCheck={false}
          />

          {/* Preview */}
          {output && (
            <div className="preview">
              <span className="panel-label" style={{ marginBottom: 8 }}>
                Preview
              </span>
              <div
                className="preview-canvas"
                dangerouslySetInnerHTML={{ __html: output }}
              />
            </div>
          )}

          {/* Log */}
          {log.length > 0 && (
            <div className="log">
              {log.map((entry, i) => (
                <LogLine key={i} entry={entry} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: LogStatus }) {
  const icons: Record<LogStatus, string> = {
    ok: "ti-circle-check",
    error: "ti-circle-x",
    skip: "ti-minus",
  };
  const colors: Record<LogStatus, string> = {
    ok: "var(--color-text-success)",
    error: "var(--color-text-danger)",
    skip: "var(--color-text-secondary)",
  };
  return (
    <i
      className={`ti ${icons[status]}`}
      style={{
        color: colors[status],
        fontSize: 14,
        marginRight: 6,
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  );
}

function TheHeader(props: { hasError: boolean; result: FileResult }) {
  const { hasError, result } = props;
  return (
    <div
      style={{
        padding: "12px 16px",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <i
        className={`ti ${hasError ? "ti-file-x" : "ti-file-check"}`}
        style={{
          fontSize: 18,
          color: hasError
            ? "var(--color-text-danger)"
            : "var(--color-text-success)",
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontWeight: 500,
            fontSize: 14,
            color: "var(--color-text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {result.uploadedName}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "var(--color-text-secondary)",
          }}
        >
          {hasError ? "Failed" : `id: ${result.svgId ?? "no id found"}`}
        </p>
      </div>
    </div>
  );
}

function DownloadColumns(props: { baseName: string; result: FileResult }) {
  const { baseName, result } = props;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
      <div
        style={{
          padding: "12px 16px",
          borderRight: "0.5px solid var(--color-border-tertiary)",
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 11,
            fontWeight: 500,
            color: "var(--color-text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Text file
        </p>
        <button
          onClick={() =>
            downloadBlob(result.svg, `${baseName}.txt`, "text/plain")
          }
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "8px 12px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <i
            className="ti ti-download"
            style={{ fontSize: 15 }}
            aria-hidden="true"
          />
          {baseName}.txt
        </button>
      </div>
      <div style={{ padding: "12px 16px" }}>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 11,
            fontWeight: 500,
            color: "var(--color-text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          SVG file
        </p>
        <button
          onClick={() =>
            downloadBlob(result.svg, `${baseName}.svg`, "image/svg+xml")
          }
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "8px 12px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <i
            className="ti ti-download"
            style={{ fontSize: 15 }}
            aria-hidden="true"
          />
          {baseName}.svg
        </button>
      </div>
    </div>
  );
}

function LogToggle(props: {
  result: FileResult;
  logOpen: boolean;
  setLogOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { result, logOpen, setLogOpen } = props;

  return (
    <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)" }}>
      <button
        onClick={() => setLogOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "var(--color-text-secondary)",
          cursor: "pointer",
          background: "transparent",
          border: "none",
          textAlign: "left",
        }}
      >
        <i
          className={`ti ${logOpen ? "ti-chevron-up" : "ti-chevron-down"}`}
          style={{ fontSize: 13 }}
          aria-hidden="true"
        />
        {result.log.length} log {result.log.length === 1 ? "entry" : "entries"}
      </button>
      {logOpen && (
        <div
          style={{
            padding: "0 16px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {result.log.map((entry, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                fontSize: 12,
                color: "var(--color-text-secondary)",
              }}
            >
              <StatusIcon status={entry.status} />
              <span>{entry.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FileResultCard({ result }: { result: FileResult }) {
  const [logOpen, setLogOpen] = useState(false);
  const hasError = result.log.some((l) => l.status === "error");
  const baseName = result.svgId ?? result.uploadedName;

  return (
    <div
      style={{
        background: "var(--color-background-primary)",
        border: `0.5px solid ${hasError ? "var(--color-border-danger)" : "var(--color-border-tertiary)"}`,
        borderRadius: "var(--border-radius-lg)",
        overflow: "hidden",
      }}
    >
      <TheHeader hasError={hasError} result={result} />

      {!hasError && <DownloadColumns baseName={baseName} result={result} />}

      <LogToggle result={result} logOpen={logOpen} setLogOpen={setLogOpen} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SVGBatchCleaner() {
  // export default function SVGBatchCleaner() {
  const [results, setResults] = useState<FileResult[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const processed = await Promise.all(
      fileArray.map(async (file): Promise<FileResult> => {
        const text = await file.text();
        const trimmed = text.trim();
        if (!trimmed.includes("<svg")) {
          return {
            uploadedName: file.name,
            svgId: null,
            svg: "",
            log: [
              {
                status: "error",
                message: "File does not appear to contain an <svg> tag.",
              },
            ],
          };
        }
        const result = transformSVG(trimmed);
        const svgId = result.svg ? getSvgId(result.svg) : null;
        return {
          uploadedName: file.name.replace(/\.[^.]+$/, ""),
          svgId,
          svg: result.svg,
          log: result.log,
        };
      }),
    );
    setResults((prev) => [...prev, ...processed]);
  }, []);

  const onFiles = useCallback(
    (files: FileList | File[]) => {
      const accepted = Array.from(files).filter(
        (f) =>
          f.name.endsWith(".txt") ||
          f.name.endsWith(".svg") ||
          f.type === "text/plain" ||
          f.type === "image/svg+xml",
      );
      if (accepted.length === 0) {
        alert("Please upload .txt or .svg files containing SVG markup.");
        return;
      }
      processFiles(accepted);
    },
    [processFiles],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      onFiles(e.dataTransfer.files);
    },
    [onFiles],
  );

  const successResults = results.filter(
    (r) => r.svg && !r.log.some((l) => l.status === "error"),
  );
  const downloadAll = useCallback(() => {
    successResults.forEach((r) => {
      const baseName = r.svgId ?? r.uploadedName;
      downloadBlob(r.svg, `${baseName}.txt`, "text/plain");
      downloadBlob(r.svg, `${baseName}.svg`, "image/svg+xml");
    });
  }, [successResults]);

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            margin: "0 0 4px",
            fontSize: 22,
            fontWeight: 500,
            color: "var(--color-text-primary)",
          }}
        >
          SVG batch cleaner
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: "var(--color-text-secondary)",
          }}
        >
          Upload multiple .txt or .svg files — each is validated, transformed,
          and available to download.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragOver ? "var(--color-border-info)" : "var(--color-border-secondary)"}`,
          borderRadius: "var(--border-radius-lg)",
          padding: "2.5rem 1.5rem",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver
            ? "var(--color-background-info)"
            : "var(--color-background-secondary)",
          transition: "background 0.15s, border-color 0.15s",
          marginBottom: "1.5rem",
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload SVG files"
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
      >
        <i
          className="ti ti-upload"
          style={{
            fontSize: 28,
            color: "var(--color-text-secondary)",
            display: "block",
            marginBottom: 8,
          }}
          aria-hidden="true"
        />
        <p
          style={{
            margin: "0 0 4px",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--color-text-primary)",
          }}
        >
          Drop files here or click to browse
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "var(--color-text-secondary)",
          }}
        >
          .txt or .svg files containing SVG markup · multiple files supported
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.svg,text/plain,image/svg+xml"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files?.length) onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Results */}
      {results.length > 0 && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--color-text-secondary)",
              }}
            >
              {results.length} file{results.length !== 1 ? "s" : ""} processed
              {successResults.length > 0 &&
                ` · ${successResults.length} succeeded`}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {successResults.length > 0 && (
                <button
                  onClick={downloadAll}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  <i
                    className="ti ti-download"
                    style={{ fontSize: 15 }}
                    aria-hidden="true"
                  />
                  Download all ({successResults.length * 2} files)
                </button>
              )}
              <button
                onClick={() => setResults([])}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  fontSize: 13,
                  cursor: "pointer",
                  color: "var(--color-text-secondary)",
                }}
              >
                <i
                  className="ti ti-trash"
                  style={{ fontSize: 15 }}
                  aria-hidden="true"
                />
                Clear
              </button>
            </div>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {results.map((result, i) => (
              <FileResultCard key={i} result={result} />
            ))}
          </div>

          {successResults.length > 0 && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "12px 16px",
                background: "var(--color-background-secondary)",
                borderRadius: "var(--border-radius-md)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              <div style={{ textAlign: "center", padding: "0 1rem" }}>
                <p
                  style={{
                    margin: "0 0 2px",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Text files
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 500,
                    color: "var(--color-text-primary)",
                  }}
                >
                  {successResults.length}
                </p>
              </div>
              <div
                style={{
                  textAlign: "center",
                  padding: "0 1rem",
                  borderLeft: "0.5px solid var(--color-border-tertiary)",
                }}
              >
                <p
                  style={{
                    margin: "0 0 2px",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  SVG files
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 500,
                    color: "var(--color-text-primary)",
                  }}
                >
                  {successResults.length}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
