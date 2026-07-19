import { action } from "../../../core/action.js";
import { validateKeys } from "../../../core/validation.js";
import { mapLinearValues } from "../../../grammar/scales/index.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../theme/defaults.js";
import { resolveLayout as resolveCategoricalLayout } from
  "./categorical/layout.js";
import { findLayer } from "../../../selectors/layers.js";
import { findCanvasGraphic, resolveLegendGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";

const SIZE_OPTIONS = Object.freeze(["target", "count"]);

export function isSizeLegendPoint(layer) {
  return layer?.mark?.type === "point" &&
    layer.encoding?.size?.scale !== undefined;
}

export function resolveSizeLegendPoint(program, requested) {
  const candidates = program.semanticSpec.layers.filter(isSizeLegendPoint);
  const layer = requested === undefined
    ? candidates.length === 1 ? candidates[0] : undefined
    : (() => {
        const candidate = findLayer(program, requested);
        return candidates.includes(candidate) ? candidate : undefined;
      })();
  if (layer === undefined) {
    throw new Error(
      requested === undefined
        ? "Size legend requires one eligible point mark or an explicit target."
        : `Unknown size legend target "${requested}".`
    );
  }
  return layer;
}

function requireScale(program, id, type) {
  const scale = program.resolvedScales[id];
  if (scale?.type !== type) {
    throw new Error(`Legend requires resolved ${type} scale "${id}".`);
  }
  return scale;
}

function bounds(program) {
  const value = resolveGraphicBounds(program);
  const canvas = findCanvasGraphic(program);
  if (
    value === undefined ||
    ![value.x, value.y, value.width, value.height].every(Number.isFinite) ||
    !Number.isFinite(canvas?.properties.width)
  ) {
    throw new Error("Legend layout requires Canvas bounds and width.");
  }
  return value;
}

function styleText(program, id, { title = false, style } = {}) {
  const resolved = style ?? {
    color: title ? DEFAULT_COLORS.strongText : DEFAULT_COLORS.text,
    fontSize: title ? 13 : 12,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontWeight: title ? 600 : "normal"
  };
  return program
    .editGraphics({
      target: id,
      property: "fill",
      value: resolved.color
    })
    .editGraphics({ target: id, property: "fontSize", value: resolved.fontSize })
    .editGraphics({ target: id, property: "fontFamily", value: resolved.fontFamily })
    .editGraphics({ target: id, property: "fontWeight", value: resolved.fontWeight })
    .editGraphics({ target: id, property: "textAlign", value: "left" })
    .editGraphics({ target: id, property: "textBaseline", value: "middle" });
}

export const rematerializeSizeLegend = action(
  {
    op: "rematerializeSizeLegend",
    description: "Rematerialize a quantitative point-size legend."
  },
  function (args = {}) {
    validateKeys(args, [], "rematerializeSizeLegend");
    const config = this.guideConfigs.legend?.size;
    if (config === undefined) throw new Error("Size legend requires stored configuration.");
    const layer = findLayer(this, config.target);
    const encoding = layer?.encoding?.size;
    if (encoding?.scale === undefined) {
      throw new Error("Size legend target requires a size encoding.");
    }
    const scale = requireScale(this, encoding.scale, "linear");
    const title = config.inferredTitle === true ? encoding.field : config.title;
    const currentConfig = {
      ...config,
      scale: encoding.scale,
      title,
      domain: scale.domain
    };
    const plot = bounds(this);
    const categorical = this.guideConfigs.legend?.series ??
      this.guideConfigs.legend?.color;
    const leftLayout = categorical?.position === "left"
      ? resolveCategoricalLayout(this, categorical).size
      : undefined;
    const originX = leftLayout?.titleX ?? plot.x + plot.width + 30;
    const seriesCount = categorical?.domain.length ?? 0;
    const titleY = leftLayout?.titleY ?? plot.y + 56 + seriesCount * 34 + 22;
    const values = Array.from(
      { length: currentConfig.count },
      (_, index) => scale.domain[0] +
        index / (currentConfig.count - 1) * (scale.domain[1] - scale.domain[0])
    );
    const areas = mapLinearValues(values, scale.domain, scale.range, {
      clamp: scale.clamp ?? false
    });
    const itemY = leftLayout?.itemY ??
      values.map((_, index) => titleY + 34 + index * 40);
    const symbolX = leftLayout?.symbolX ?? values.map(() => originX + 16);
    const labelX = leftLayout?.labelX ?? values.map(() => originX + 44);
    let next = this
      .editSemantic({ property: "guide.legend.size.scale", value: encoding.scale })
      .editSemantic({ property: "guide.legend.size.title", value: title })
      ._withLegendConfig("size", currentConfig)
      .editGraphics({ target: "sizeLegendSymbols", property: "length", value: values.length })
      .editGraphics({ target: "sizeLegendSymbols", property: "x", value: symbolX })
      .editGraphics({ target: "sizeLegendSymbols", property: "y", value: itemY })
      .editGraphics({
        target: "sizeLegendSymbols",
        property: "radius",
        value: areas.map(area => Math.sqrt(area / Math.PI))
      })
      .editGraphics({
        target: "sizeLegendSymbols",
        property: "fill",
        value: DEFAULT_COLORS.sizeSymbol
      })
      .editGraphics({ target: "sizeLegendSymbols", property: "opacity", value: 0.7 })
      .editGraphics({ target: "sizeLegendLabels", property: "length", value: values.length })
      .editGraphics({ target: "sizeLegendLabels", property: "x", value: labelX })
      .editGraphics({ target: "sizeLegendLabels", property: "y", value: itemY })
      .editGraphics({
        target: "sizeLegendLabels",
        property: "text",
        value: values.map(value => String(+value.toPrecision(3)))
      })
      .editGraphics({ target: "sizeLegendTitle", property: "x", value: originX })
      .editGraphics({ target: "sizeLegendTitle", property: "y", value: titleY })
      .editGraphics({ target: "sizeLegendTitle", property: "text", value: title });
    next = styleText(next, "sizeLegendLabels", {
      style: currentConfig.inheritAppearance === true
        ? categorical.labels
        : undefined
    });
    return styleText(next, "sizeLegendTitle", {
      title: true,
      style: currentConfig.inheritAppearance === true
        ? categorical.titleStyle
        : undefined
    });
  }
);

export const createSizeLegend = action(
  {
    op: "createSizeLegend",
    description: "Create a quantitative equal-area point-size legend."
  },
  function (args = {}) {
    validateKeys(args, [...SIZE_OPTIONS, "inheritAppearance"], "createSizeLegend");
    const layer = resolveSizeLegendPoint(this, args.target);
    const encoding = layer.encoding?.size;
    if (encoding?.scale === undefined) {
      throw new Error(`Point mark "${layer.id}" requires a size encoding.`);
    }
    const scale = requireScale(this, encoding.scale, "linear");
    const count = args.count ?? 5;
    if (!Number.isInteger(count) || count < 2) {
      throw new RangeError("Size legend count must be an integer of at least 2.");
    }
    return this
      .editSemantic({ property: "guide.legend.size.scale", value: encoding.scale })
      .editSemantic({ property: "guide.legend.size.title", value: encoding.field })
      ._withLegendConfig("size", {
        target: layer.id,
        scale: encoding.scale,
        title: encoding.field,
        inferredTitle: true,
        domain: scale.domain,
        count,
        inheritAppearance: args.inheritAppearance === true
      })
      .createGraphics({
        id: "sizeLegendSymbols",
        type: "circle",
        length: count,
        ...resolveLegendGraphicPlacement(this)
      })
      .createGraphics({
        id: "sizeLegendLabels",
        type: "text",
        length: count,
        ...resolveLegendGraphicPlacement(this)
      })
      .createGraphics({
        id: "sizeLegendTitle",
        type: "text",
        ...resolveLegendGraphicPlacement(this)
      })
      .rematerializeSizeLegend();
  }
);

export function registerSizeLegendActions(ProgramClass) {
  ProgramClass.prototype.createSizeLegend = createSizeLegend;
  ProgramClass.prototype.rematerializeSizeLegend = rematerializeSizeLegend;
}
