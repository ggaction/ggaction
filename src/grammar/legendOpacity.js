export function validateLegendLayerOpacity(value) {
  if(value!==undefined&&(!Number.isFinite(value)||value<0||value>1)) {
    throw new RangeError("Legend symbol layer opacity must be finite and between 0 and 1.");
  }
  return value;
}
