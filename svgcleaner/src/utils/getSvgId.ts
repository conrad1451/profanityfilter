export function getSvgId(svgString: string): string | null {
  const match = svgString.match(/<svg[^>]+id="([^"]+)"/);
  return match ? match[1] : null;
}
