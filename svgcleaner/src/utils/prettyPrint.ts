export function prettyPrint(xml: string): string {
  let indent = 0;
  const lines = xml.replace(/>\s*</g, ">\n<").split("\n");
  return lines
    .map((raw) => {
      const line = raw.trim();
      if (!line) return "";
      if (line.startsWith("</")) {
        indent = Math.max(0, indent - 1);
        return "  ".repeat(indent) + line;
      }
      const out = "  ".repeat(indent) + line;
      const isSelfClosing =
        line.endsWith("/>") || /<[^>]+>[^<]+<\/[^>]+>/.test(line);
      if (
        !isSelfClosing &&
        line.startsWith("<") &&
        !line.startsWith("</") &&
        !line.startsWith("<?") &&
        !line.startsWith("<!")
      )
        indent++;
      return out;
    })
    .filter(Boolean)
    .join("\n");
}
