// Independent straight-alpha blend equation; all channels and alpha use 0..1.
export function differenceOver(source, backdrop) {
  return blendOver(source, backdrop, "difference");
}

export function blendOver(source, backdrop, mode) {
  if (!["source-over", "multiply", "screen", "difference"].includes(mode)) throw new TypeError("Unknown blend oracle mode.");
  const a = source[3] + backdrop[3] * (1 - source[3]);
  if (a === 0) return [0, 0, 0, 0];
  return [0, 1, 2].map(index => {
    const s=source[index],b=backdrop[index];
    const mixed=mode==="multiply"?b*s:mode==="screen"?b+s-b*s:mode==="difference"?Math.abs(b-s):s;
    return (
    (1 - source[3]) * backdrop[3] * backdrop[index] +
    (1 - backdrop[3]) * source[3] * source[index] +
    source[3] * backdrop[3] * mixed
  ) / a;
  }).concat(a);
}

export function sourceOverStraight(source,backdrop){
 const alpha=source[3]+backdrop[3]*(1-source[3]);
 if(alpha===0)return[0,0,0,0];
 return [0,1,2].map(channel=>(source[channel]*source[3]+backdrop[channel]*backdrop[3]*(1-source[3]))/alpha).concat(alpha);
}
