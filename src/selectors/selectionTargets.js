import { ownedChildren } from './markOwners.js';
import { findLayer } from './layers.js';

export function highlightTargets(program, target) {
  const owners = Object.entries(program.markConfigs).filter(([, config]) => config.raincloudPlot?.id === target);
  const root = findLayer(program, target)?.id ?? (owners.length === 1 ? owners[0][0] : undefined);
  if (!root) return [target];
  const result = new Set([root]);
  const visit = id => {
    for (const child of ownedChildren(program, id)) {
      // Independent overlays and statistical additions keep their own scope.
      const layer = findLayer(program, child);
      if (layer.derivedBindings?.overlay || program.markConfigs[child]?.statisticalReference || layer.mark.type === 'text') continue;
      if (!result.has(child)) { result.add(child); visit(child); }
    }
  };
  visit(root);
  return [...result];
}
