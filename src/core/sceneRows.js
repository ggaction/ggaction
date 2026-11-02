// Logical rows are concrete records. Iteration never resolves semantics, mutates
// columns, or grants provenance; the same row order is used by every consumer.
export function animationSceneLength(scene) {
  return scene.version === 3 ? scene.entries.reduce((count, entry) => count + (entry.kind === 'single' ? 1 : entry.keys.length), 0) : scene.nodes.length;
}
export function circleRunNode(entry, row) {
  return { key: entry.keys[row], type: 'circle', topology: entry.topology,
    properties: { ...entry.properties.appearance, x: entry.properties.x[row], y: entry.properties.y[row], radius: entry.properties.radius[row] },
    offset: entry.offset, clip: entry.clip, clips: entry.clips };
}
export function circleRunDecision(entry, row) {
  const table = entry.decisions;
  return table === null ? null : { sourceIndex: table.sourceIndices[row], targetIndex: table.targetIndices[row],
    itemKey: table.itemKeys[row], role: table.role, ownerKey: table.ownerKey, kind: table.kind, kernel: table.kernel };
}
export function* animationSceneRows(scene, options = {}) {
  if (scene.version !== 3) { for (let index = 0; index < scene.nodes.length; index++) yield { node: scene.nodes[index], index, entryIndex: index, rowIndex: undefined }; return; }
  let index = 0;
  for (let entryIndex = 0; entryIndex < scene.entries.length; entryIndex++) {
    const entry = scene.entries[entryIndex];
    if (entry.kind === 'single') yield { node: entry.node, decision: options.decisions === false ? undefined : entry.decision, index: index++, entryIndex, rowIndex: undefined };
    else for (let rowIndex = 0; rowIndex < entry.keys.length; rowIndex++) yield { node: circleRunNode(entry, rowIndex), decision: options.decisions === false ? undefined : circleRunDecision(entry, rowIndex), index: index++, entryIndex, rowIndex };
  }
}

