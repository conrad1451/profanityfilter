// svgcleaner/src/SVGCleaner.tsx

import { useState, useCallback } from "react";
import type { TransformLog } from "./types";
import { transformSVG } from "./TransformSVG";
import "./App.css";

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

export default function SVGCleaner() {
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
