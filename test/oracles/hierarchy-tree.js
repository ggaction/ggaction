// Small-fixture oracle: explicitly scan every descendant at each depth. This
// intentionally avoids production's persistent contours and deferred offsets.
export function naiveHierarchyTree(model, separation, depthStep) {
  const byKey = new Map(model.nodes.map(node => [node.key, node]));
  function visit(key) {
    const node = byKey.get(key), points = [];
    let last = 0;
    for (const childKey of node.childrenKeys) {
      const child = visit(childKey);
      let shift = 0;
      for (const old of points) for (const next of child) {
        if (old.level === next.level) shift = Math.max(shift, old.x + separation - next.x);
      }
      child.forEach(point => { point.x += shift; });
      last = child[0].x;
      points.push(...child);
    }
    const center = last / 2;
    points.forEach(point => { point.x -= center; point.level++; });
    return [{ key, x: 0, level: 0 }, ...points];
  }
  return model.rootKey === null ? [] : visit(model.rootKey).map(point => ({ key: point.key, x: point.x, y: point.level * depthStep }));
}
