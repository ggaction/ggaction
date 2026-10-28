// Integer-weight oracle: allocate exact subtree widths in a global weight
// coordinate, then divide once by the root weight. No production imports.
export function integerHierarchyPartition(model) {
  const nodes = new Map(model.nodes.map(node => [node.key, node]));
  const result = new Map();
  const denominator = BigInt(model.totalValue);
  let cursor = 0n;
  const fraction = value => denominator === 0n ? 0 : Number(value) / Number(denominator);
  function visit(key) {
    const node = nodes.get(key), start = cursor;
    for (const child of node.childrenKeys) visit(child);
    const residualStart = cursor;
    cursor += BigInt(node.ownValue);
    result.set(key, { key, u0: fraction(start), u1: fraction(cursor), residualStart: fraction(residualStart) });
  }
  if (model.rootKey !== null) visit(model.rootKey);
  return model.nodes.map(node => result.get(node.key));
}
