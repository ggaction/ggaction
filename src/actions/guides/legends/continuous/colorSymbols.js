
import { resolveColorSymbolsLayout } from "../../../../materialization/guides/legendSamples.js";
import { nativeLegendItemGap } from "../../../../theme/defaults.js";
import { legendThemeGap } from "../../../theme/state.js";

import{applyLegendClipGraphics}from"../../../../materialization/legendClip.js";
import { validateOptionObject, validatePositiveFinite, validateNonNegativeFinite, validateNonEmptyString } from "../../../../core/validation.js";

import { mapScaleConsumerValues } from "../../../../materialization/scales/map.js";


import { editGraphicProperties } from "../../../primitives/graphicProperties.js";
import { normalizeLegendSampling } from "../../../../grammar/legendSampling.js";
import { normalizeContinuousLegend, normalizeItemLegendLayout, editLegendBackground, styleContinuousText } from "./common.js";

export function normalizeColorSymbol(value) {
  if (value === undefined || value === "auto") return { type: "point", radius: 7, strokeWidth: 1 };
  validateOptionObject(value, ["type", "radius", "stroke", "strokeWidth"], "Sampled color symbol");
  if (value.type !== undefined && value.type !== "point") throw new Error("Sampled color symbol requires type point.");
  const symbol = { type: "point", radius: 7, strokeWidth: 1, ...value };
  validatePositiveFinite(symbol.radius, "Sampled color symbol radius");
  validateNonNegativeFinite(symbol.strokeWidth, "Sampled color symbol strokeWidth");
  if (symbol.stroke !== undefined) validateNonEmptyString(symbol.stroke, "Sampled color symbol stroke");
  return symbol;
}

export function normalizeColorSymbols(args, previous, operation = "create", theme) {
  if (args.gradient !== undefined) throw new Error("Symbol color legends do not accept gradient dimensions.");
  const { representation: _representation, values: _values, count: _count, symbol: _symbol,
    columns: _columns, direction: _direction, itemGap: _itemGap, layout: _layout,
    titlePosition: _titlePosition, ...common } = args;
  const base = normalizeContinuousLegend(common, "gradient");
  const item = normalizeItemLegendLayout({ ...args, itemGap: args.itemGap ?? legendThemeGap(theme) ?? nativeLegendItemGap("sampled", { position: args.position }) }, { multiColumnSide: true });
  const { count: _legacyCount, ...normalized } = base;
  return { ...normalized, ...item, representation: "symbols",
    sampling: normalizeLegendSampling(args, { previous, operation, label: "Sampled color legend" }),
    symbol: normalizeColorSymbol(args.symbol) };
}

export function materializeColorSymbols(program, resolved, currentConfig) {
  const config = currentConfig, { scale, encoding } = resolved;
  const layout = resolveColorSymbolsLayout(program, config, scale);
  const colors = mapScaleConsumerValues(layout.values, scale, "color");
  let next = program.editSemantic({ property: "guide.legend.color.scale", value: encoding.scale })
    .editSemantic({ property: "guide.legend.color.title", value: config.title })
    ._withLegendConfig("gradient", resolved.config);
  next = editGraphicProperties(next, "colorGradientSymbols", {
    length: layout.values.length, x: layout.symbolX.map(x => x + layout.extent), y: layout.itemY,
    radius: config.symbol.radius, fill: colors, stroke: config.symbol.stroke ?? colors,
    strokeWidth: config.symbol.strokeWidth, opacity: config.blockSymbol?.opacity ?? 1
  });
  next = editGraphicProperties(next, "colorGradientLabels", {
    length: layout.values.length, x: layout.labelX, y: layout.itemY, text: layout.texts
  });
  next = editLegendBackground(next, "colorGradientBackground", layout.background, config.border);
  next = styleContinuousText(next, "colorGradientLabels", config.labels);
  if (config.titleVisible === false) return applyLegendClipGraphics(next);
  next = editGraphicProperties(next, "colorGradientTitle", { x: layout.title.x, y: layout.title.y, text: config.title });
  return applyLegendClipGraphics(styleContinuousText(next, "colorGradientTitle", config.titleStyle, { align: layout.title.align }));
}
