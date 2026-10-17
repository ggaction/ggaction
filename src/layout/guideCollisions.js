export function assertGuideCollisionBlocks(blocks) {
  for (let index = 0; index < blocks.length; index += 1) {
    const a = blocks[index];
    for (const b of blocks.slice(index + 1)) {
      if (a.kind === "axis" && b.kind === "axis") {
        if (!(a.namedAxis || b.namedAxis) || a.axisId === b.axisId || !a.textBounds || !b.textBounds) continue;
        if (a.textBounds.some(left => left && b.textBounds.some(right => right &&
            left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top))) {
          throw new Error(`The ${a.id} and ${b.id} text overlap; independent axes require separate text bounds.`);
        }
        continue;
      }
      if (a.position !== b.position) continue;
      if (a.bounds.left < b.bounds.right && a.bounds.right > b.bounds.left &&
        a.bounds.top < b.bounds.bottom && a.bounds.bottom > b.bounds.top) {
        throw new Error(`The ${a.position} ${a.id} and ${b.id} overlap; guides require more margin space or different offsets.`);
      }
    }
  }
}
