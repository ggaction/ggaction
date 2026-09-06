export function assertGuideCollisionBlocks(blocks) {
  for (let index = 0; index < blocks.length; index += 1) {
    const a = blocks[index];
    for (const b of blocks.slice(index + 1)) {
      if (a.position !== b.position || a.kind === "axis" && b.kind === "axis") continue;
      if (a.bounds.left < b.bounds.right && a.bounds.right > b.bounds.left &&
        a.bounds.top < b.bounds.bottom && a.bounds.bottom > b.bounds.top) {
        throw new Error(`The ${a.position} ${a.id} and ${b.id} overlap; guides require more margin space or different offsets.`);
      }
    }
  }
}
