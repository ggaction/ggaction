import { resolveContinuousBounds } from "../../../../materialization/guides/legendLayout.js";
import { CATEGORICAL_LEGEND_KINDS } from "../../../../grammar/legendBlocks.js";
import { themePatternForValues } from "../../../theme/palettes.js";
import { validateLegendOverflow, categoricalLegendView } from "../../../../grammar/legendOverflow.js";
import{validateLegendClip}from"../../../../grammar/legendClip.js";
import {categoricalLegendSymbolId as symbolGraphic}from"../../../../grammar/legendBlocks.js";
export {symbolGraphic};
export { categoricalLegendView } from "../../../../grammar/legendOverflow.js";
import { findLegendLayer as findLayer } from "../../../../materialization/legendEncodings.js";
import { intrinsicLegendConfig } from "../../../../materialization/legendGroups.js";
import { validateOptionObject } from "../../../../core/validation.js";
import { resolveCategoricalLegendAppearance } from "../../../../materialization/legends.js";

import { resolveCategoricalLegendLayoutValues } from "../../../../materialization/guides/categoricalLegend.js";
export { symbolWidth } from "../../../../materialization/guides/categoricalLegend.js";

function prefix(config) {
  return `${config.kind}Legend`;
}


export function graphic(config, component) {
  return `${prefix(config)}${component}`;
}


export function resolveLayout(program, config) {
  validateLegendOverflow(config.kind, config);
  validateLegendClip(config.kind,config);
  config = intrinsicLegendConfig(program, config);
  config = categoricalLegendView(config);
  const { plot, canvas } = resolveContinuousBounds(program,
    "Legend layout requires Canvas bounds, width, and height.");
  return resolveCategoricalLegendLayoutValues({ config, appearance: resolveAppearance(program, config),
    plot, canvas, profile: program.materializationConfigs.textMetrics });
}

export function resolveAppearance(program, config) {
  const color = config.channels.indexOf("color");
  const patternFills = color < 0 ? undefined
    : themePatternForValues(program, findLayer(program, config.target), config.domain, config.scales[color]);
  return resolveCategoricalLegendAppearance(program, config, patternFills);
}

export function noOptions(args, operation) {
  validateOptionObject(args, ["kind"], operation);
  if (args.kind !== undefined && !CATEGORICAL_LEGEND_KINDS.includes(args.kind)) {
    throw new Error(`Unknown categorical legend kind "${args.kind}".`);
  }
}

export function layerFor(config, type) {
  const layer = config.symbol.layers.find(item => item.type === type);
  if (layer === undefined) {
    throw new Error(`Legend recipe does not contain a ${type} layer.`);
  }
  return layer;
}


export function resolveSymbolLayout(program, config) {
  const view = categoricalLegendView(config);
  const layout = resolveLayout(program, view);
  return { ...layout, symbolX: layout.symbolX.slice(0, view.domain.length),
    itemY: layout.itemY.slice(0, view.domain.length) };
}
