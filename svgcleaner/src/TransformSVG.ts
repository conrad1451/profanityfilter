// svgcleaner/src/TransformSVG.ts

import type { TransformLog, TransformResult } from "./types";

/** SVG presentation attributes that can be lifted out of style="..." */
const PROMOTABLE_ATTRS = new Set([
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-anchor",
  "dominant-baseline",
  "visibility",
  "clip-path",
  "mask",
  "filter",
]);

function parseStyleString(style: string): Record<string, string> {
  const result: Record<string, string> = {};
  style.split(";").forEach((part) => {
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) return;
    const key = part.slice(0, colonIdx).trim();
    const val = part.slice(colonIdx + 1).trim();
    if (key && val) result[key] = val;
  });
  return result;
}

function serializeStyleObject(obj: Record<string, string>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
}

function prettyPrint(xml: string): string {
  let indent = 0;
  const lines = xml.replace(/>\s*</g, ">\n<").split("\n");
  return lines
    .map((raw) => {
      const line = raw.trim();
      if (!line) return "";

      // Closing tag — dedent first
      if (line.startsWith("</")) {
        indent = Math.max(0, indent - 1);
        return "  ".repeat(indent) + line;
      }

      const out = "  ".repeat(indent) + line;

      // Self-closing or inline with content — don't change indent
      const isSelfClosing =
        line.endsWith("/>") || /<[^>]+>[^<]+<\/[^>]+>/.test(line);
      if (
        !isSelfClosing &&
        line.startsWith("<") &&
        !line.startsWith("</") &&
        !line.startsWith("<?") &&
        !line.startsWith("<!")
      ) {
        indent++;
      }

      return out;
    })
    .filter(Boolean)
    .join("\n");
}

export function transformSVG(input: string): TransformResult {
  const log: TransformLog[] = [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(input.trim(), "image/svg+xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    return {
      svg: "",
      log: [
        {
          status: "error",
          message: "Parse error: " + parseError.textContent?.slice(0, 200),
        },
      ],
    };
  }

  const svg = doc.querySelector("svg");
  if (!svg) {
    return {
      svg: "",
      log: [{ status: "error", message: "No <svg> element found." }],
    };
  }

  // ── 1. xmlns ──────────────────────────────────────────────────────────────
  if (!svg.getAttribute("xmlns")) {
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    log.push({
      status: "ok",
      message: 'Added xmlns="http://www.w3.org/2000/svg"',
    });
  } else {
    log.push({ status: "skip", message: "xmlns already present" });
  }

  // ── 2. viewBox (inferred from width/height in style or attrs) ─────────────
  const svgStyle = parseStyleString(svg.getAttribute("style") ?? "");

  const rawW = svg.getAttribute("width") ?? svgStyle["width"] ?? "";
  const rawH = svg.getAttribute("height") ?? svgStyle["height"] ?? "";
  const w = parseFloat(rawW) || null;
  const h = parseFloat(rawH) || null;

  if (!svg.getAttribute("viewBox")) {
    if (w && h) {
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      log.push({ status: "ok", message: `Added viewBox="0 0 ${w} ${h}"` });
    } else {
      log.push({
        status: "skip",
        message: "Could not infer viewBox — no width/height found",
      });
    }
  } else {
    log.push({ status: "skip", message: "viewBox already present" });
  }

  // Promote width/height from style to attrs if needed
  if (w && !svg.getAttribute("width")) svg.setAttribute("width", String(w));
  if (h && !svg.getAttribute("height")) svg.setAttribute("height", String(h));

  // ── 3. Promote style props → presentation attrs, strip display:none ────────
  let promotedCount = 0;
  let removedDisplay = false;

  const allElements = doc.querySelectorAll("*");
  allElements.forEach((el) => {
    const styleAttr = el.getAttribute("style");
    if (!styleAttr) return;

    const props = parseStyleString(styleAttr);
    const remaining: Record<string, string> = {};

    for (const [key, val] of Object.entries(props)) {
      if (key === "display") {
        removedDisplay = true;
        // drop it entirely
      } else if (
        (key === "width" || key === "height") &&
        el.tagName.toLowerCase() === "svg"
      ) {
        // already handled above — drop from style
      } else if (PROMOTABLE_ATTRS.has(key)) {
        if (!el.getAttribute(key)) {
          el.setAttribute(key, val);
          promotedCount++;
        }
      } else {
        remaining[key] = val;
      }
    }

    const remainingStr = serializeStyleObject(remaining);
    if (remainingStr) {
      el.setAttribute("style", remainingStr);
    } else {
      el.removeAttribute("style");
    }
  });

  if (promotedCount > 0) {
    log.push({
      status: "ok",
      message: `Moved ${promotedCount} style prop${promotedCount !== 1 ? "s" : ""} to presentation attributes`,
    });
  }
  if (removedDisplay) {
    log.push({ status: "ok", message: "Removed display: none" });
  }

  // ── 4. Serialize ──────────────────────────────────────────────────────────
  const serializer = new XMLSerializer();
  let out = serializer.serializeToString(svg);

  // Strip redundant namespaces the serializer injects
  out = out.replace(/ xmlns:xlink="[^"]*"/g, "");

  out = prettyPrint(out);

  return { svg: out, log };
}
