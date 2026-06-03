export function parseStyleString(style: string): Record<string, string> {
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
