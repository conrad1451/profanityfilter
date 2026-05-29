import { useState, useCallback } from "react";

function censorWord(word: string, profanityList: string[]) {
  const lower = word.toLowerCase();
  for (const profane of profanityList) {
    if (lower === profane) {
      return word[0] + "*".repeat(word.length - 2) + word[word.length - 1];
    }
  }
  return null;
}

function filterText(text: string, profanityList: string[]) {
  if (!text) return { output: "", count: 0 };
  let count = 0;
  const result = text.replace(/\b[\w']+\b/g, (match) => {
    const censored = censorWord(match, profanityList);
    if (censored) {
      count++;
      return censored;
    }
    return match;
  });
  return { output: result, count };
}

function getHighlightedSegments(original: string, filtered: string) {
  if (!original) return [];
  const origWords = original.split(/(\b[\w']+\b|\W+)/g);
  const filtWords = filtered.split(/(\b[\w']+\b|\W+)/g);
  return origWords.map((seg, i) => ({
    text: filtWords[i] ?? seg,
    censored: filtWords[i] !== seg && /\*/.test(filtWords[i] ?? ""),
  }));
}

export default function ProfanityFilter(props: { wordsToFilter: string[] }) {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const { wordsToFilter } = props;

  const { output, count } = filterText(input, wordsToFilter);
  const segments = getHighlightedSegments(input, output);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [output]);

  const handleClear = () => setInput("");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0d0f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "48px 20px 80px",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 44 }}>
        <div
          style={{
            fontSize: 13,
            letterSpacing: "0.35em",
            color: "#e8a020",
            textTransform: "uppercase",
            marginBottom: 14,
            fontFamily: "'Courier New', monospace",
            fontWeight: 600,
          }}
        >
          ✦ Language Sanitizer ✦
        </div>
        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 64px)",
            fontWeight: 900,
            color: "#f5f0e8",
            margin: 0,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            textShadow: "0 2px 40px rgba(232,160,32,0.18)",
          }}
        >
          Clean It Up
        </h1>
        <p
          style={{
            color: "#7a7068",
            marginTop: 12,
            fontSize: 16,
            fontStyle: "italic",
            letterSpacing: "0.01em",
          }}
        >
          Paste your text below — profanity gets starred out instantly.
        </p>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 760,
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {/* Input box */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: 11,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#e8a020",
              fontFamily: "'Courier New', monospace",
              marginBottom: 10,
            }}
          >
            Input Text
          </label>
          <div style={{ position: "relative" }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type or paste anything here..."
              rows={7}
              style={{
                width: "100%",
                background: "#16151a",
                border: "1.5px solid #2c2a35",
                borderRadius: 4,
                color: "#f0ece2",
                fontSize: 16,
                fontFamily: "'Georgia', serif",
                lineHeight: 1.7,
                padding: "18px 20px",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
                caretColor: "#e8a020",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#e8a020")}
              onBlur={(e) => (e.target.style.borderColor = "#2c2a35")}
            />
            {input && (
              <button
                onClick={handleClear}
                title="Clear"
                style={{
                  position: "absolute",
                  top: 12,
                  right: 14,
                  background: "none",
                  border: "none",
                  color: "#4a4550",
                  fontSize: 18,
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: 4,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.target.style.color = "#e8a020")}
                onMouseLeave={(e) => (e.target.style.color = "#4a4550")}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "10px 18px",
            background: "#16151a",
            border: "1.5px solid #2c2a35",
            borderRadius: 4,
            fontFamily: "'Courier New', monospace",
            fontSize: 13,
            color: "#7a7068",
          }}
        >
          <span>
            Words:{" "}
            <span style={{ color: "#f0ece2" }}>
              {input.trim() ? input.trim().split(/\s+/).length : 0}
            </span>
          </span>
          <span style={{ color: "#2c2a35" }}>|</span>
          <span>
            Censored:{" "}
            <span
              style={{
                color: count > 0 ? "#e05050" : "#5aad72",
                fontWeight: 700,
              }}
            >
              {count}
            </span>
          </span>
          {count > 0 && (
            <>
              <span style={{ color: "#2c2a35" }}>|</span>
              <span
                style={{
                  color: "#e8a020",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                ⚠ Profanity detected
              </span>
            </>
          )}
          {input && count === 0 && (
            <>
              <span style={{ color: "#2c2a35" }}>|</span>
              <span
                style={{
                  color: "#5aad72",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                ✓ All clean
              </span>
            </>
          )}
        </div>

        {/* Output box */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <label
              style={{
                fontSize: 11,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "#5aad72",
                fontFamily: "'Courier New', monospace",
              }}
            >
              Filtered Output
            </label>
            {output && (
              <button
                onClick={handleCopy}
                style={{
                  background: copied ? "#5aad72" : "transparent",
                  border: `1.5px solid ${copied ? "#5aad72" : "#3a3840"}`,
                  color: copied ? "#0d0d0f" : "#7a7068",
                  fontSize: 11,
                  fontFamily: "'Courier New', monospace",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  padding: "5px 14px",
                  borderRadius: 3,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            )}
          </div>

          <div
            style={{
              minHeight: 130,
              background: "#16151a",
              border: "1.5px solid #2c2a35",
              borderRadius: 4,
              padding: "18px 20px",
              fontSize: 16,
              fontFamily: "'Georgia', serif",
              lineHeight: 1.7,
              color: input ? "#f0ece2" : "#3a3840",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {input
              ? segments.map((seg, i) =>
                  seg.censored ? (
                    <span
                      key={i}
                      style={{
                        color: "#e8a020",
                        fontWeight: 700,
                        background: "rgba(232,160,32,0.10)",
                        borderRadius: 2,
                        padding: "0 2px",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {seg.text}
                    </span>
                  ) : (
                    <span key={i}>{seg.text}</span>
                  ),
                )
              : "Your cleaned text will appear here..."}
          </div>
        </div>
      </div>

      <p
        style={{
          marginTop: 52,
          fontSize: 12,
          color: "#3a3840",
          fontFamily: "'Courier New', monospace",
          letterSpacing: "0.1em",
        }}
      >
        All filtering happens locally — nothing is sent anywhere.
      </p>
    </div>
  );
}
