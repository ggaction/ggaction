import { findLayer } from "../../selectors/layers.js";
import { isAuthoredFacetLegend } from "../../grammar/facets/legendIntent.js";
export { isAuthoredFacetLegend };
import { freezeOwned } from "../../core/immutable.js";
import { unionConcreteGraphicBounds } from "../../grammar/schemas/graphicBounds.js";
import { describeLegendBlock } from "../../grammar/legendBlocks.js";
import { legendResourcePolicy, allLegendGraphicIds } from "../guides/resources.js";
import { resolveSharedFacetLegends, sameFacetGuideValue } from "../../grammar/facets/guides.js";

export function facetLegendIntent(source) {
  return freezeOwned({ type: "authored-legend", blocks: Object.fromEntries(
    Object.entries(source.guideConfigs.legend ?? {}).map(([kind, config]) => [kind, {
      config,
      ...(source.semanticSpec.guides.legend?.[legendResourcePolicy(kind).semanticKind] === undefined ? {} : {
        guide: source.semanticSpec.guides.legend[legendResourcePolicy(kind).semanticKind]
      })
    }])
  ), groups: source.guideConfigs.legendGroups ?? {} });
}

export function intrinsicFacetLegendSource(program) {
  const first = program.children[program.compositionSpec.children[0]];
  let source = new program.constructor({
    semanticSpec: first.semanticSpec, graphicSpec: first.graphicSpec,
    resolvedScales: first.resolvedScales, materializationConfigs: first.materializationConfigs,
    context: { ...first.context, deferGuideLayoutValidation: true, facetLegendIntrinsic: true },
    trace: program.trace, actionStack: program.actionStack, actionSequence: program._actionSequence
  });
  for (const id of allLegendGraphicIds(Object.keys(source.guideConfigs.legend ?? {}))) {
    if (source.graphicSpec.objects[id] !== undefined) source = source.editGraphics({ target: id, remove: true });
  }
  for (const key of Object.keys(source.semanticSpec.guides.legend ?? {})) {
    source = source.editSemantic({ property: `guide.legend.${key}`, remove: true });
  }
  return source._withoutMaterializationConfig(["guides", "legend"])
    ._withoutMaterializationConfig(["guides", "legendGroups"]);
}

export function restoreFacetLegendIntent(source, intent) {
  const scaffolds = [];
  for (const [kind, { config }] of Object.entries(intent.blocks)) {
    const descriptor = describeLegendBlock(source, kind, config);
    const entry = { target: config.target, channels: [...descriptor.channels] };
    if (descriptor.channels.includes("shape") && descriptor.channels.includes("size")) entry.combine = "size-shape";
    if (kind === "colorSize") entry.combine = "color-size";
    if (descriptor.family === "categorical" && config.inferredSymbol === false && entry.combine === undefined) entry.symbol = config.symbol;
    if (kind === "gradient" && config.representation === "symbols") entry.representation = "symbols";
    scaffolds.push(entry);
  }
  // Build unclipped resources first; each authored block restores its own window below.
  // A global scaffold option would also reach gradient strips or overwrite sibling windows.
  for (const args of scaffolds) source = source.createLegend(args);
  for (const [kind, { config, guide }] of Object.entries(intent.blocks)) {
    source = source._withLegendConfig(kind, config);
    const background = legendResourcePolicy(kind).graphicIds.find(id => id.endsWith("Background"));
    if (config.border === false && source.graphicSpec.objects[background] !== undefined) {
      source = source.editGraphics({ target: background, remove: true });
    } else if (config.border !== false && background !== undefined && source.graphicSpec.objects[background] === undefined) {
      const roots = new Set(legendResourcePolicy(kind).graphicIds);
      const before = source.graphicSpec.objects.canvas.children.find(id => roots.has(id));
      source = source.createGraphics({ id: background, type: "rect", parent: "canvas", ...(before === undefined ? {} : { before }) });
    }
    if (guide !== undefined) {
      for (const [property, value] of Object.entries(guide)) {
        source = source.editSemantic({ property: `guide.legend.${legendResourcePolicy(kind).semanticKind}.${property}`, value });
      }
    }
  }
  source = source._withMaterializationConfig(["guides", "legendGroups"], intent.groups);
  return source.rematerializeLegend().rematerializeSideLegendLane();
}

export function prepareAuthoredFacetLegend(program, intent = program.compositionSpec.facet.guides.legend) {
  let source = intrinsicFacetLegendSource(program);
  source = isAuthoredFacetLegend(intent) ? restoreFacetLegendIntent(source, intent)
    : source.createLegend(intent).rematerializeSideLegendLane();
  const kinds = Object.keys(source.guideConfigs.legend ?? {});
  for (const [kind, config] of Object.entries(source.guideConfigs.legend)) {
    const descriptor = describeLegendBlock(source, kind, config);
    const owner = findLayer(source, config.target);
    for (const channel of descriptor.channels) {
      if (program.compositionSpec.facet.scales[channel] === "independent") {
        throw new Error("Facet parent legend requires shared encoded scales.");
      }
    }
    for (const child of Object.values(program.children)) {
      const candidate = findLayer(child, config.target);
      if (candidate === undefined || candidate.mark.type !== owner.mark.type ||
          descriptor.channels.some(channel => !sameFacetGuideValue(candidate.encoding?.[channel], owner.encoding?.[channel])) ||
          !sameFacetGuideValue(child.markConfigs[config.target], source.markConfigs[config.target])) {
        throw new Error("Facet parent legend requires compatible source mark bindings and recipes in every child.");
      }
    }
  }
  const compatibility = resolveSharedFacetLegends(program.compositionSpec.children.map(id => ({
    id, guideConfigs: source.guideConfigs, resolvedScales: program.children[id].resolvedScales
  })));
  const blocks = kinds.map(kind => {
    const ids = new Set(allLegendGraphicIds([kind]));
    const roots = source.graphicSpec.objects.canvas.children.filter(id => ids.has(id));
    const bounds = unionConcreteGraphicBounds(source.graphicSpec, roots, source.materializationConfigs.textMetrics);
    if (bounds === undefined) throw new Error("Facet parent legend requires measurable block bounds.");
    return { kind, roots, bounds, config: source.guideConfigs.legend[kind] };
  });
  return { mode: "authored", source, kinds, blocks, compatibility,
    intent: facetLegendIntent(source),
    roots: blocks.flatMap(block => block.roots),
    bounds: unionConcreteGraphicBounds(source.graphicSpec, blocks.flatMap(block => block.roots), source.materializationConfigs.textMetrics),
    reservation: { position: "right", align: "center", gap: 0, width: 0, height: 0 } };
}

// Theme reconciliation changes the derived native appearance in one transaction.
// Adopt only that transaction's configs; ordinary layout/data replay reads intent.
export function synchronizeFacetLegendAppearance(program) {
  const intent = program.compositionSpec?.type === "facet" ? program.compositionSpec.facet.guides.legend : undefined;
  if (!isAuthoredFacetLegend(intent)) return program;
  const blocks = Object.fromEntries(Object.entries(intent.blocks).map(([kind, block]) => {
    const config = program.guideConfigs.legend?.[kind];
    if (config === undefined || config.target !== block.config.target) throw new Error("Parent theme reconciliation lost its legend owner.");
    return [kind, { ...block, config }];
  }));
  const spec = program.compositionSpec;
  return program._withCompositionState({ children: program.children,
    compositionSpec: { ...spec, facet: { ...spec.facet,
      guides: { ...spec.facet.guides, legend: { ...intent, blocks, groups: program.guideConfigs.legendGroups ?? {} } } } } });
}
