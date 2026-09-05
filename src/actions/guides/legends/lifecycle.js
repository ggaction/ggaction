import {
  legendGraphicIds, legendResourcePolicy, legendResourcePolicies
} from "../../../materialization/guides/resources.js";
import { findLayer } from "../../../selectors/layers.js";
import { resolveDefinition } from "./categorical/resolve.js";
import { normalizeRecipe, resolveLegendSymbol } from "./categorical/recipes.js";
import { resolveLayout } from "./categorical/layout.js";
import { resolveLegendGraphicPlacement } from "../../../materialization/graphicHierarchy.js";

export function removeLegendKinds(program, kinds) {
  const removed = new Set(kinds);
  const retainedSemanticKinds = new Set(
    Object.entries(program.guideConfigs.legend ?? {})
      .filter(([kind]) => !removed.has(kind))
      .map(([kind]) => legendResourcePolicy(kind).semanticKind)
  );
  const semanticKinds = new Set(
    kinds.map(kind => legendResourcePolicy(kind).semanticKind)
  );
  let next = program;
  for (const kind of semanticKinds) {
    if (
      !retainedSemanticKinds.has(kind) &&
      next.semanticSpec.guides.legend?.[kind] !== undefined
    ) {
      next = next.editSemantic({
        property: `guide.legend.${kind}`,
        remove: true
      });
    }
  }
  for (const id of new Set(kinds.flatMap(legendGraphicIds))) {
    if (next.graphicSpec.objects[id] !== undefined) {
      next = next.editGraphics({ target: id, remove: true });
    }
  }
  for (const kind of kinds) {
    next = next._withoutMaterializationConfig(["guides", "legend", kind]);
  }
  return next;
}

export function resolveCategoricalLegendRevision(program, kind, previous, channels) {
  const layer = findLayer(program, previous.target);
  const order = program.semanticSpec.guides.legend?.[kind]?.order;
  const definition = resolveDefinition(program, layer, channels,
    previous.inferredTitle ? undefined : previous.title, order);
  const config = {
    ...previous,
    ...definition,
    symbol: normalizeRecipe(resolveLegendSymbol(program, layer, channels,
      previous.inferredSymbol ? undefined : previous.symbol), definition.kind)
  };
  resolveLayout(program, config);
  return { kind, config, order };
}

export function createCategoricalLegendFromConfig(program, config, order) {
  const { kind } = config;
  let next = program;
  if (kind === "series") {
    next = next
      .editSemantic({
        property: "guide.legend.series.channels",
        value: config.channels
      })
      .editSemantic({
        property: "guide.legend.series.scales",
        value: config.scales
      })
      .editSemantic({
        property: "guide.legend.series.title",
        value: config.title
      });
  } else {
    next = next
      .editSemantic({
        property: "guide.legend.color.scale",
        value: config.scales[0]
      })
      .editSemantic({
        property: "guide.legend.color.title",
        value: config.title
      });
  }
  if (order !== undefined && order !== "scale") {
    next = next.editSemantic({
      property: `guide.legend.${kind}.order`,
      value: order
    });
  }
  next = next._withLegendConfig(kind, config);
  if (config.border !== false) next = next.createLegendBackground();
  next = next.createLegendSymbols().createLegendLabels();
  return config.titleVisible === false ? next : next.createLegendTitle();
}

// Categorical content precedes its sampled companions in both creation and revision.
export function resolveCategoricalLegendPlacement(program) {
  const companions = new Set(legendResourcePolicies()
    .filter(policy => policy.family !== "categorical" && program.guideConfigs.legend?.[policy.kind] !== undefined)
    .flatMap(policy => legendGraphicIds(policy.kind)));
  const before = program.graphicSpec.objects.canvas?.children?.find(id => companions.has(id));
  return resolveLegendGraphicPlacement(program, before === undefined ? {} : { before });
}
