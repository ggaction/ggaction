function intersects(a, b) {
  const tolerance = Number.EPSILON * 16 * Math.max(1,
    ...Object.values(a).map(Math.abs), ...Object.values(b).map(Math.abs));
  return Math.min(a.right, b.right) - Math.max(a.left, b.left) > tolerance &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > tolerance;
}

export function assertGuideCollisionBlocks(blocks) {
  for (let index = 0; index < blocks.length; index += 1) {
    const a = blocks[index];
    for (const b of blocks.slice(index + 1)) {
      if (a.kind === "axis" && b.kind === "axis") {
        if (!(a.namedAxis || b.namedAxis) || a.axisId === b.axisId || !a.textBounds || !b.textBounds) continue;
        if (a.textBounds.some(left => left && b.textBounds.some(right => right &&
            intersects(left, right)))) {
          throw new Error(`The ${a.id} and ${b.id} text overlap; independent axes require separate text bounds.`);
        }
        continue;
      }
      if (a.position !== b.position) continue;
      if (intersects(a.bounds, b.bounds)) {
        throw new Error(`The ${a.position} ${a.id} and ${b.id} overlap; guides require more margin space or different offsets.`);
      }
    }
  }
}
