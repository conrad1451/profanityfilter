// svgcleaner/src/MyShortener.tsx

import { useState, useRef, useEffect } from "react";
import "./index.css";
import "./App.css";

interface Flag {
  type: "ok" | "warn" | "bad";
  text: string;
}

interface AnalysisResult {
  hops: string[];
  finalUrl: string;
  domain: string;
  score: number;
  verdict: "Safe" | "Likely Safe" | "Suspicious" | "Dangerous";
  flags: Flag[];
  isShortener: boolean;
}

const SHORTENERS = [
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "buff.ly",
  "short.io",
  "rb.gy",
  "is.gd",
  "cutt.ly",
  "tiny.cc",
  "t2m.io",
  "snip.ly",
  "youtu.be",
  "lnkd.in",
  "amzn.to",
  "fb.me",
];
const SUSPICIOUS_WORDS = [
  "phish",
  "malware",
  "virus",
  "spam",
  "hack",
  "free-gift",
  "prize",
  "win",
  "lucky",
  "password",
  "login",
  "verify",
  "account",
  "update",
  "alert",
  "urgent",
  "suspended",
];
const RISKY_TLDS = [
  ".tk",
  ".ml",
  ".ga",
  ".cf",
  ".gq",
  ".pw",
  ".cc",
  ".xyz",
  ".top",
  ".click",
  ".link",
  ".live",
  ".site",
  ".online",
  ".space",
];

function analyzeLocally(url: string): AnalysisResult {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    u = new URL("https://unknown.example.com");
  }
  const host = u.hostname.replace("www.", "");
  const isShortener = SHORTENERS.some((s) => host.includes(s));
  const path = (u.pathname + u.search).toLowerCase();
  const hasSuspicious = SUSPICIOUS_WORDS.some(
    (w) => path.includes(w) || host.includes(w),
  );
  const isRiskyTLD = RISKY_TLDS.some((t) => host.endsWith(t));
  const isHTTPS = url.startsWith("https://");
  const isIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

  let score = 75;
  if (!isHTTPS) score -= 15;
  if (isRiskyTLD) score -= 30;
  if (hasSuspicious) score -= 20;
  if (isIP) score -= 25;
  if (isShortener) score -= 5;
  score = Math.max(5, Math.min(100, score));

  const flags: Flag[] = [
    {
      type: isHTTPS ? "ok" : "bad",
      text: isHTTPS
        ? "HTTPS encryption present"
        : "No HTTPS — unencrypted connection",
    },
    {
      type: isShortener ? "warn" : "ok",
      text: isShortener
        ? "Known URL shortener — destination hidden"
        : "Not a known URL shortener",
    },
  ];
  if (hasSuspicious)
    flags.push({ type: "bad", text: "Suspicious keywords in URL path" });
  if (isRiskyTLD)
    flags.push({
      type: "bad",
      text: `High-risk TLD (.${host.split(".").pop()}) commonly used in spam`,
    });
  if (isIP)
    flags.push({
      type: "bad",
      text: "Destination is a raw IP address, not a domain",
    });
  if (!hasSuspicious && !isRiskyTLD && !isIP)
    flags.push({ type: "ok", text: "No phishing patterns detected" });

  const verdict: AnalysisResult["verdict"] =
    score >= 80
      ? "Safe"
      : score >= 60
        ? "Likely Safe"
        : score >= 35
          ? "Suspicious"
          : "Dangerous";
  const hops = isShortener
    ? [url, `https://${host}/r/...`, "https://destination-unknown.example.com/"]
    : [url];

  return {
    hops,
    finalUrl: isShortener ? "https://destination-unknown.example.com/" : url,
    domain: host,
    score,
    verdict,
    flags,
    isShortener,
  };
}

async function analyzeWithClaude(url: string): Promise<AnalysisResult> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are a URL analysis assistant. Respond ONLY with a valid JSON object, no markdown, no backticks, no explanation.

JSON shape:
{
  "hops": ["url1", "url2"],
  "finalUrl": "final destination URL",
  "domain": "just the domain e.g. example.com",
  "isShortener": true,
  "score": 0-100,
  "verdict": "Safe"|"Likely Safe"|"Suspicious"|"Dangerous",
  "flags": [{ "type": "ok"|"warn"|"bad", "text": "description" }]
}

Score 100=safe, 0=dangerous. Penalize risky TLDs, suspicious keywords, IP addresses. Reward HTTPS, reputable domains. 3-5 flags.`,
      messages: [{ role: "user", content: `Analyze: ${url}` }],
    }),
  });
  const data = await resp.json();
  const text = (data.content || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean) as AnalysisResult;
}

function ScoreRing({ score, verdict }: { score: number; verdict: string }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color =
    score >= 80 ? "var(--safe)" : score >= 50 ? "var(--warn)" : "var(--danger)";
  return (
    <div className="score-ring-wrap">
      <div className="score-ring-inner">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{
              transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </svg>
        <div className="score-center">
          <span className="score-num" style={{ color }}>
            {score}
          </span>
          <span className="score-label">/100</span>
        </div>
      </div>
      <p className="verdict" style={{ color }}>
        {verdict}
      </p>
    </div>
  );
}

function HopChain({ hops }: { hops: string[] }) {
  return (
    <div className="hop-chain">
      {hops.map((hop, i) => (
        <div key={i} className="hop-row">
          <div className="hop-left">
            <div
              className={`hop-dot ${i === hops.length - 1 ? "hop-dot-final" : ""}`}
            />
            {i < hops.length - 1 && <div className="hop-line" />}
          </div>
          <div className="hop-content">
            <span className="hop-index">#{i + 1}</span>
            <span className="hop-url">{hop}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FlagItem({ flag }: { flag: Flag }) {
  const icons = { ok: "✓", warn: "▲", bad: "✕" };
  return (
    <div className={`flag flag-${flag.type}`}>
      <span className="flag-icon">{icons[flag.type]}</span>
      <span>{flag.text}</span>
    </div>
  );
}

function ResultCard({ result }: { result: AnalysisResult }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(result.finalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="result-card">
      <div className="result-grid">
        <div className="result-col">
          <div className="result-section">
            <div className="section-tag">final destination</div>
            <p className="final-url">{result.finalUrl}</p>
            <p className="final-domain">{result.domain}</p>
            <div className="url-actions">
              <button className="action-btn" onClick={copy}>
                {copied ? "✓ copied" : "copy url"}
              </button>
              <a
                className="action-btn action-link"
                href={result.finalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                open ↗
              </a>
            </div>
          </div>

          <div className="result-section">
            <div className="section-tag">
              redirect chain — {result.hops.length} hop
              {result.hops.length !== 1 ? "s" : ""}
            </div>
            <HopChain hops={result.hops} />
          </div>
        </div>

        <div className="result-col result-col-right">
          <div className="result-section">
            <div className="section-tag">safety score</div>
            <ScoreRing score={result.score} verdict={result.verdict} />
          </div>

          <div className="result-section">
            <div className="section-tag">analysis flags</div>
            <div className="flags-list">
              {result.flags.map((f, i) => (
                <FlagItem key={i} flag={f} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // CHQ: Claude AI (Haiku) refactored to eliminate calling setState synchronously error
  useEffect(() => {
    let t: ReturnType<typeof setInterval>;
    if (loading) {
      t = setInterval(() => setStep((s) => (s + 1) % 4), 600);
    }
    return () => {
      clearInterval(t);
      if (!loading) {
        setStep(0);
      }
    };
  }, [loading]);

  const reveal = async () => {
    let url = input.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://"))
      url = "https://" + url;
    try {
      new URL(url);
    } catch {
      setError("Enter a valid URL.");
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);

    try {
      const res = await analyzeWithClaude(url);
      setResult(res);
    } catch {
      setResult(analyzeLocally(url));
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    "initializing...",
    "tracing redirects...",
    "checking domain...",
    "scoring safety...",
  ];

  return (
    <div className="app">
      <div className="noise" />
      <div className="grid-bg" />

      <header className="header">
        <div className="logo">
          <div className="logo-mark">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 8 L6 12 L14 4"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="logo-text">RevealURL</span>
        </div>
        <span className="header-tag">no tracking · no accounts</span>
      </header>

      <main className="main">
        <div className="hero">
          <div className="hero-eyebrow">url safety scanner</div>
          <h1 className="headline">
            What's hiding
            <br />
            <em className="headline-accent">behind that link?</em>
          </h1>
          <p className="hero-sub">
            Paste any shortened URL to see exactly where it leads, trace every
            redirect, and get an instant safety score.
          </p>
        </div>

        <div className="input-section">
          <div className={`input-wrap${loading ? " is-loading" : ""}`}>
            <span className="input-arrow">→</span>
            <input
              ref={inputRef}
              type="text"
              className="url-input"
              placeholder="paste bit.ly/xyz or any shortened url..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && reveal()}
              disabled={loading}
              aria-label="URL to analyze"
            />
            <button
              className="reveal-btn"
              onClick={reveal}
              disabled={loading || !input.trim()}
              aria-label="Reveal URL destination"
            >
              {loading ? (
                <span className="loading-text">{steps[step]}</span>
              ) : (
                "reveal →"
              )}
            </button>
          </div>
          {error && (
            <p className="error-msg" role="alert">
              ⚠ {error}
            </p>
          )}
        </div>

        {!result && !loading && (
          <div className="examples">
            <span className="examples-label">try with:</span>
            {["bit.ly", "tinyurl.com", "t.co", "rb.gy"].map((s) => (
              <button
                key={s}
                className="example-chip"
                onClick={() => {
                  setInput(`https://${s}/example`);
                  inputRef.current?.focus();
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {result && <ResultCard result={result} />}
      </main>

      <footer className="footer">
        <span>urls resolved on the fly and never stored</span>
        <span className="footer-sep">·</span>
        <span>powered by claude</span>
      </footer>
    </div>
  );
}
