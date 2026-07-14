import { action } from "../../../core/action.js";
import { validateKeys } from "../../../core/validation.js";
import { mapLinearValues } from "../../../grammar/scales.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../theme/defaults.js";

const SIZE_OPTIONS = Object.freeze(["target", "count"]);

function resolvePoint(program, requested) {
  const candidates = program.semanticSpec.layers.filter(layer =>
    layer.mark?.type === "point" &&
    layer.encoding?.color?.scale !== undefined &&
    layer.encoding?.shape?.scale !== undefined
  );
  const layer = requested === undefined
    ? candidates.length === 1 ? candidates[0] : undefined
    : candidates.find(item => item.id === requested);
  if (layer === undefined) {
    throw new Error(
      requested === undefined
        ? "Point series legend requires one eligible point mark."
        : `Unknown point series legend target "${requested}".`
    );
  }
  if (layer.encoding.color.field !== layer.encoding.shape.field) {
    throw new Error("Point color and shape legends require the same field.");
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
  const canvas = program.graphicSpec.objects.canvas;
  if (
    value === undefined ||
    ![value.x, value.y, value.width, value.height].every(Number.isFinite) ||
    !Number.isFinite(canvas?.properties.width)
  ) {
    throw new Error("Legend layout requires Canvas bounds and width.");
  }
  return value;
}

function styleText(program, id, { title = false } = {}) {
  return program
    .editGraphics({
      target: id,
      property: "fill",
      value: title ? DEFAULT_COLORS.strongText : DEFAULT_COLORS.text
    })
    .editGraphics({ target: id, property: "fontSize", value: title ? 13 : 12 })
    .editGraphics({ target: id, property: "fontFamily", value: DEFAULT_FONT_FAMILY })
    .editGraphics({ target: id, property: "fontWeight", value: title ? 600 : "normal" })
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
    const layer = this.semanticSpec.layers.find(item => item.id === config.target);
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
    const originX = plot.x + plot.width + 30;
    const seriesCount = this.guideConfigs.legend?.series?.domain.length ?? 0;
    const titleY = plot.y + 56 + seriesCount * 34 + 22;
    const values = Array.from(
      { length: currentConfig.count },
      (_, index) => scale.domain[0] +
        index / (currentConfig.count - 1) * (scale.domain[1] - scale.domain[0])
    );
    const areas = mapLinearValues(values, scale.domain, scale.range, {
      clamp: scale.clamp ?? false
    });
    const itemY = values.map((_, index) => titleY + 34 + index * 40);
    let next = this
      .editSemantic({ property: "guide.legend.size.scale", value: encoding.scale })
      .editSemantic({ property: "guide.legend.size.title", value: title })
      ._withLegendConfig("size", currentConfig)
      .editGraphics({ target: "sizeLegendSymbols", property: "length", value: values.length })
      .editGraphics({ target: "sizeLegendSymbols", property: "x", value: originX + 16 })
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
      .editGraphics({ target: "sizeLegendLabels", property: "x", value: originX + 44 })
      .editGraphics({ target: "sizeLegendLabels", property: "y", value: itemY })
      .editGraphics({
        target: "sizeLegendLabels",
        property: "text",
        value: values.map(value => String(+value.toPrecision(3)))
      })
      .editGraphics({ target: "sizeLegendTitle", property: "x", value: originX })
      .editGraphics({ target: "sizeLegendTitle", property: "y", value: titleY })
      .editGraphics({ target: "sizeLegendTitle", property: "text", value: title });
    next = styleText(next, "sizeLegendLabels");
    return styleText(next, "sizeLegendTitle", { title: true });
  }
);

export const createSizeLegend = action(
  {
    op: "createSizeLegend",
    description: "Create a quantitative equal-area point-size legend."
  },
  function (args = {}) {
    validateKeys(args, SIZE_OPTIONS, "createSizeLegend");
    const layer = resolvePoint(this, args.target);
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
        count
      })
      .createGraphics({ id: "sizeLegendSymbols", type: "circle", length: count })
      .createGraphics({ id: "sizeLegendLabels", type: "text", length: count })
      .createGraphics({ id: "sizeLegendTitle", type: "text" })
      .rematerializeSizeLegend();
  }
);

export function registerPointLegendActions(ProgramClass) {
  ProgramClass.prototype.createSizeLegend = createSizeLegend;
  ProgramClass.prototype.rematerializeSizeLegend = rematerializeSizeLegend;
}
