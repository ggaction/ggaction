import { describeLegendBlock, legendBlockChannels } from "../grammar/legendBlocks.js";
import { allLegendGraphicIds } from "./guides/resources.js";
import { unionConcreteGraphicBounds } from "../grammar/schemas/graphicBounds.js";
import { namespaceGraphicId } from "./compositionSnapshot.js";
import { mapScaleConsumerValues } from "./scales/map.js";

// A categorical color/shape block can explain a color-only view too. Compare
// encoded mappings, not labels or resource IDs. Constant glyphs in another
// view do not establish a conflicting shape encoding.
function coversLegend(candidate, other) {
  if (candidate.channels.length === 1 && other.channels.length === 1) return true;
  if (candidate.block.family !== "categorical" || other.block.family !== "categorical" ||
      candidate.config.field !== other.config.field ||
      other.channels.some(channel => !candidate.channels.includes(channel))) return false;
  const values = other.config.domain;
  if (!Array.isArray(values) || values.some(value => !candidate.config.domain.includes(value))) return false;
  return other.channels.every(channel => {
    const scaleFor = item => item.mappingSource.resolvedScales[item.config.scales[item.config.channels.indexOf(channel)]];
    const a = scaleFor(candidate), b = scaleFor(other);
    if (!a || !b || values.some(value => !a.domain.includes(value) || !b.domain.includes(value))) return false;
    return JSON.stringify(mapScaleConsumerValues(values, a, channel)) ===
      JSON.stringify(mapScaleConsumerValues(values, b, channel));
  });
}

const visibleBlocks = new WeakMap();
function collect(child) {
  if (visibleBlocks.has(child)) return visibleBlocks.get(child);
  const candidates = [];
  if (child.compositionSpec && !child.compositionSpec.facet) {
    for (const id of child.compositionSpec.children) {
      for (const candidate of collect(child.children[id])) {
        const remove = candidate.remove.map(root => namespaceGraphicId(`${child.compositionSpec.id}-${id}`, root));
        // A nested composition may already have promoted this block. Its
        // canonical leaves still contain it, but its rendered snapshot does not.
        if (remove.every(root => child.graphicSpec.objects[root])) candidates.push({ ...candidate, remove });
      }
    }
    const id = `${child.compositionSpec.id}-shared-color-legend`;
    if (child.graphicSpec.objects[id]) {
      const representative = sharedCompositionColorLegend(child, child.children);
      if (representative) candidates.push({ ...representative, source: child, roots: [id], remove: [id],
        bounds: unionConcreteGraphicBounds(child.graphicSpec, [id], child.materializationConfigs.textMetrics) });
    }
  } else {
    for (const [kind, config] of Object.entries(child.guideConfigs.legend ?? {})) {
      const channels = legendBlockChannels(kind, config);
      if (!channels.includes("color")) continue;
      const roots = allLegendGraphicIds([kind]).filter(id => child.graphicSpec.objects[id]);
      const bounds = unionConcreteGraphicBounds(child.graphicSpec, roots, child.materializationConfigs.textMetrics);
      if (!bounds) continue;
      candidates.push({ source: child, mappingSource: child, roots, bounds, channels, config,
        block: describeLegendBlock(child, kind, config), remove: roots });
    }
  }
  visibleBlocks.set(child, candidates);
  return candidates;
}

// Scale compatibility is validated before this plan. Canonical child guides
// remain intact; only the composed graphic snapshots are collected.
export function sharedCompositionColorLegend(program, children) {
  if (!program.compositionSpec.share?.color) return undefined;
  const candidates = program.compositionSpec.children.flatMap(id => collect(children[id]).map(candidate => ({
    ...candidate, remove: candidate.remove.map(root => namespaceGraphicId(`${program.compositionSpec.id}-${id}`, root))
  })));
  if (!candidates.length) return undefined;
  const ordered = [...candidates].sort((a, b) => b.channels.length - a.channels.length);
  // Prefer one complete explanation. Incompatible extra mappings stay local;
  // a color-only representative can still collect the genuinely shared block.
  const representative = ordered.find(candidate => candidates.every(other => coversLegend(candidate, other)))
    ?? candidates.find(candidate => candidate.channels.length === 1);
  if (!representative) return undefined;
  return { ...representative, remove: candidates.filter(candidate => coversLegend(representative, candidate))
    .flatMap(candidate => candidate.remove) };
}
