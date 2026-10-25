import { describeLegendBlock, legendBlockChannels } from "../grammar/legendBlocks.js";
import { allLegendGraphicIds } from "./guides/resources.js";
import { unionConcreteGraphicBounds } from "../grammar/schemas/graphicBounds.js";
import { namespaceGraphicId } from "./compositionSnapshot.js";
import { localLegendPlacement } from "../grammar/legendGroups.js";
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
        if (remove.every(root => child.graphicSpec.objects[root])) candidates.push({ ...candidate, remove,
          targets: candidate.targets.map(target => ({ ...target, childPath: [id, ...target.childPath] })) });
      }
    }
    for (const representative of compositionLegends(child, child.children)) {
      const id = representative.id;
      if (child.graphicSpec.objects[id]) candidates.push({ ...representative, source: child,
        roots: child.graphicSpec.objects[id].children ?? [id], remove: [id],
        bounds: unionConcreteGraphicBounds(child.graphicSpec, [id], child.materializationConfigs.textMetrics) });
    }
  } else {
    for (const [kind, config] of Object.entries(child.guideConfigs.legend ?? {})) {
      const channels = legendBlockChannels(kind, config);
      const roots = allLegendGraphicIds([kind]).filter(id => child.graphicSpec.objects[id]);
      const bounds = unionConcreteGraphicBounds(child.graphicSpec, roots, child.materializationConfigs.textMetrics);
      if (!bounds) continue;
      const local = localLegendPlacement(config);
      const group = child.guideConfigs.legendGroups?.[config.target];
      candidates.push({ source: child, mappingSource: child, roots, bounds, channels, config,
        targets: [{ childPath: [], ...(child.compositionSpec?.facet ? {} : { id: config.target }) }],
        block: describeLegendBlock(child, kind, config),
        placement: { ...(local ?? group?.placement ??
          { position: config.position, align: config.align, offset: config.offset }),
          inferredOffset: local?.inferredOffset ?? group?.inferredOffset ?? config.inferredOffset }, remove: roots });
    }
  }
  visibleBlocks.set(child, candidates);
  return candidates;
}

// Scale compatibility is validated before this plan. Canonical child guides
// remain intact; only the composed graphic snapshots are collected.
export function compositionLegends(program, children = program.children) {
  const candidates = program.compositionSpec.children.flatMap(id => collect(children[id]).map(candidate => ({
    ...candidate, remove: candidate.remove.map(root => namespaceGraphicId(`${program.compositionSpec.id}-${id}`, root)),
    targets: candidate.targets.map(target => ({ ...target, childPath: [id, ...target.childPath] }))
  })));
  const plans = [];
  const removed = new Set();
  if (program.compositionSpec.share?.color) {
    const colors = candidates.filter(candidate => candidate.channels.includes("color"));
    const ordered = [...colors].sort((a, b) => b.channels.length - a.channels.length);
    const representative = ordered.find(candidate => colors.every(other => coversLegend(candidate, other)))
      ?? colors.find(candidate => candidate.channels.length === 1);
    if (representative) {
      const collected = colors.filter(candidate => coversLegend(representative, candidate));
      collected.forEach(candidate => removed.add(candidate));
      plans.push({ ...representative, id: `${program.compositionSpec.id}-shared-color-legend`,
        remove: collected.flatMap(candidate => candidate.remove),
        targets: collected.flatMap(candidate => candidate.targets) });
    }
  }
  for (const candidate of candidates) if (program.compositionSpec.legends === "collect" && !removed.has(candidate)) plans.push({ ...candidate,
    // Derive identity from the canonical owner, never the current stack index.
    id: namespaceGraphicId(JSON.stringify([program.compositionSpec.id, candidate.targets, candidate.channels]), "legend") });
  return plans;
}

// New neighbours keep the existing shared guide's authored presentation. Scale
// mappings and symbol semantics still belong to each native constructor.
export function adjacentLegendPresentation(source, target, child) {
  const from = collect(source).find(candidate => candidate.config.target === target && candidate.channels.includes("color"));
  const to = collect(child).find(candidate => candidate.channels.includes("color"));
  if (!from || !to) return undefined;
  const config = from.config, options = { ...from.placement };
  if (from.placement.inferredOffset ?? config.inferredOffset) delete options.offset;
  delete options.inferredOffset;
  for (const key of ["labels", "titleStyle", "titlePosition", "border"]) if (config[key] !== undefined) options[key] = config[key];
  if (!config.inferredTitle) options.title = config.titleVisible === false ? false : config.title;
  if (from.block.family === to.block.family) {
    const presentation = from.block.family === "gradient" ? ["direction", "gradient"] : ["direction", "columns", "itemGap"];
    for (const key of presentation) if (config[key] !== undefined) options[key] = config[key];
    if (config.symbol && config.inferredSymbol === false) options.symbol = config.symbol;
  }
  return { target: to.config.target, channel: "color", ...options };
}
