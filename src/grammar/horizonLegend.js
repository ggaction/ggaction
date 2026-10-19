// Internal color category identities stay stable; guides explain their source
// value intervals without exposing the generated Horizon field names.
export function horizonLegendPresentation(transform) {
  if (transform?.type !== "horizon") return undefined;
  const heights = [...new Set((transform.resolved?.extents ?? []).map(item => item.bandHeight))];
  const height = heights.length === 1 ? heights[0] : undefined;
  const format = value => String(Number(value.toPrecision(3)));
  const labelMap = [];
  for (const sign of ["negative", "positive"]) {
    for (let band = 0; band < transform.bands; band += 1) {
      const lower = sign === "negative"
        ? transform.baseline - (band + 1) * height : transform.baseline + band * height;
      const upper = sign === "negative"
        ? transform.baseline - band * height : transform.baseline + (band + 1) * height;
      labelMap.push({ value: `${sign}:${band}`, label: height === undefined
        ? `${sign === "negative" ? "Below" : "Above"} baseline · band ${band + 1}/${transform.bands}`
        : `${format(lower)} – ${format(upper)}` });
    }
  }
  return { title: transform.y.field, labelMap };
}
