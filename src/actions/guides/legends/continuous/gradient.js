import { action } from "../../../../core/action.js";
import { isPlainObject } from "../../../../core/immutable.js";
import { validateKeys } from "../../../../core/validation.js";
import { interpolateColorStops } from "../../../../grammar/scales/color.js";
import { DEFAULT_COLORS } from "../../../../theme/defaults.js";
import {
  assertLegendInsideCanvas,
  editLegendBackground,
  formatContinuousValues,
  normalizeContinuousLegend,
  requireResolvedLegendScale,
  resolveContinuousBounds,
  resolveContinuousPoint,
  resolveLegendBackgroundBounds,
  sampleContinuousValues,
  styleContinuousText,
  validatePositive
} from "./common.js";

const GRADIENT_OPTIONS = Object.freeze(["length", "thickness"]);

function resolveGradientLayout(program, config, scale) {
  const { plot, canvas } = resolveContinuousBounds(program);
  const vertical = ["right", "left"].includes(config.position);
  const length = config.gradient.length;
  const thickness = config.gradient.thickness;
  let x;
  let y;
  if (config.position === "right") {
    x = plot.x + plot.width + config.offset;
    y = plot.y + 46;
  } else if (config.position === "left") {
    x = plot.x - config.offset - thickness;
    y = plot.y + 46;
  } else {
    x = config.align === "left" ? plot.x
      : config.align === "right" ? plot.x + plot.width - length
        : plot.x + (plot.width - length) / 2;
    y = config.position === "top"
      ? plot.y - config.offset - thickness
      : plot.y + plot.height + config.offset;
  }
  const title = vertical
    ? { x, y: plot.y + 20, align: "left" }
    : { x: x + length / 2, y: y - 20, align: "center" };
  const values = sampleContinuousValues(scale.domain, config.count);
  const fractions = values.map((_, index) => index / (values.length - 1));
  const labelOffset = config.labels.offset;
  const labels = vertical
    ? fractions.map(fraction => ({
        x: config.position === "right"
          ? x + thickness + labelOffset
          : x - labelOffset,
        y: y + length * (1 - fraction),
        align: config.position === "right" ? "left" : "right"
      }))
    : fractions.map(fraction => ({
        x: x + length * fraction,
        y: config.position === "top"
          ? y - labelOffset
          : y + thickness + labelOffset,
        align: "center"
      }));
  const ticks = vertical
    ? labels.map(label => ({
        x1: config.position === "right" ? x + thickness : x,
        y1: label.y,
        x2: config.position === "right" ? x + thickness + 6 : x - 6,
        y2: label.y
      }))
    : labels.map(label => ({
        x1: label.x,
        y1: config.position === "top" ? y : y + thickness,
        x2: label.x,
        y2: config.position === "top" ? y - 6 : y + thickness + 6
      }));
  assertLegendInsideCanvas([
    title,
    ...labels,
    ...ticks.flatMap(tick => [
      { x: tick.x1, y: tick.y1 },
      { x: tick.x2, y: tick.y2 }
    ])
  ], canvas, "Gradient legend layout");
  if (
    x < 0 ||
    y < 0 ||
    x + (vertical ? thickness : length) > canvas.width ||
    y + (vertical ? length : thickness) > canvas.height
  ) {
    throw new Error("Gradient legend layout requires more Canvas margin space.");
  }
  const background = resolveLegendBackgroundBounds([
    { x, y },
    {
      x: x + (vertical ? thickness : length),
      y: y + (vertical ? length : thickness)
    },
    title,
    ...labels.map(label => ({
      x: label.x + (
        label.align === "left" ? 42 : label.align === "right" ? -42 : 0
      ),
      y: label.y
    }))
  ], config.border, canvas, "Gradient legend");
  return {
    vertical, x, y, length, thickness, values, labels, ticks, title, background
  };
}

function resolveGradientConfig(program, config) {
  const layer = resolveContinuousPoint(program, config.target, "color");
  const encoding = layer.encoding.color;
  if (!["quantitative", "temporal"].includes(encoding.fieldType)) {
    throw new Error("Gradient legend requires quantitative or temporal color.");
  }
  const scale = requireResolvedLegendScale(
    program,
    encoding.scale,
    "sequential"
  );
  return {
    layer,
    encoding,
    scale,
    config: {
      ...config,
      target: layer.id,
      scale: encoding.scale,
      fieldType: encoding.fieldType,
      title: config.inferredTitle ? encoding.field : config.title,
      domain: scale.domain
    }
  };
}

export const rematerializeGradientLegend = action(
  {
    op: "rematerializeGradientLegend",
    description: "Rematerialize a continuous color gradient legend."
  },
  function (args = {}) {
    validateKeys(args, [], "rematerializeGradientLegend");
    const stored = this.guideConfigs.legend?.gradient;
    if (stored === undefined) {
      throw new Error("Gradient legend requires stored configuration.");
    }
    const { scale, encoding, config } = resolveGradientConfig(this, stored);
    const layout = resolveGradientLayout(this, config, scale);
    const stripCount = 60;
    const stripSize = layout.length / stripCount;
    const strips = Array.from({ length: stripCount }, (_, index) => {
      const fraction = (index + 0.5) / stripCount;
      const color = interpolateColorStops(
        scale.range,
        layout.vertical ? 1 - fraction : fraction,
        scale.interpolate
      );
      return {
        x: layout.x + (layout.vertical ? 0 : index * stripSize),
        y: layout.y + (layout.vertical ? index * stripSize : 0),
        width: layout.vertical ? layout.thickness : stripSize,
        height: layout.vertical ? stripSize : layout.thickness,
        fill: color,
        stroke: color,
        strokeWidth: 0
      };
    });
    let next = this
      .editSemantic({
        property: "guide.legend.color.scale",
        value: encoding.scale
      })
      .editSemantic({
        property: "guide.legend.color.title",
        value: config.title
      })
      ._withLegendConfig("gradient", config)
      .editGraphics({
        target: "colorGradientStrips",
        property: "length",
        value: strips.length
      });
    next = editLegendBackground(
      next,
      "colorGradientBackground",
      layout.background,
      config.border
    );
    for (const property of [
      "x", "y", "width", "height", "fill", "stroke", "strokeWidth"
    ]) {
      next = next.editGraphics({
        target: "colorGradientStrips",
        property,
        value: strips.map(strip => strip[property])
      });
    }
    next = next.editGraphics({
      target: "colorGradientTicks",
      property: "length",
      value: layout.ticks.length
    });
    for (const property of ["x1", "y1", "x2", "y2"]) {
      next = next.editGraphics({
        target: "colorGradientTicks",
        property,
        value: layout.ticks.map(tick => tick[property])
      });
    }
    next = next
      .editGraphics({
        target: "colorGradientTicks",
        property: "stroke",
        value: DEFAULT_COLORS.mutedText
      })
      .editGraphics({
        target: "colorGradientTicks",
        property: "strokeWidth",
        value: 1
      })
      .editGraphics({
        target: "colorGradientLabels",
        property: "length",
        value: layout.labels.length
      })
      .editGraphics({
        target: "colorGradientLabels",
        property: "x",
        value: layout.labels.map(label => label.x)
      })
      .editGraphics({
        target: "colorGradientLabels",
        property: "y",
        value: layout.labels.map(label => label.y)
      })
      .editGraphics({
        target: "colorGradientLabels",
        property: "text",
        value: formatContinuousValues(
          layout.values,
          scale.domain,
          config.fieldType
        )
      });
    next = styleContinuousText(
      next,
      "colorGradientLabels",
      config.labels,
      { align: layout.labels[0].align }
    )
      .editGraphics({
        target: "colorGradientTitle",
        property: "x",
        value: layout.title.x
      })
      .editGraphics({
        target: "colorGradientTitle",
        property: "y",
        value: layout.title.y
      })
      .editGraphics({
        target: "colorGradientTitle",
        property: "text",
        value: config.title
      });
    return styleContinuousText(
      next,
      "colorGradientTitle",
      config.titleStyle,
      { align: layout.title.align }
    );
  }
);

export const createGradientLegend = action(
  {
    op: "createGradientLegend",
    description: "Create a continuous color gradient legend."
  },
  function (args = {}) {
    const config = normalizeContinuousLegend(args, "gradient");
    if (args.channels !== undefined && (
      !Array.isArray(args.channels) ||
      args.channels.length !== 1 ||
      args.channels[0] !== "color"
    )) {
      throw new Error('Gradient legend requires channels: ["color"].');
    }
    if (args.gradient !== undefined && !isPlainObject(args.gradient)) {
      throw new TypeError("createLegend.gradient must be a plain object.");
    }
    validateKeys(
      args.gradient ?? {},
      GRADIENT_OPTIONS,
      "createLegend.gradient"
    );
    config.gradient = {
      length: args.gradient?.length ?? 120,
      thickness: args.gradient?.thickness ?? 12
    };
    validatePositive(config.gradient.length, "Gradient length");
    validatePositive(config.gradient.thickness, "Gradient thickness");
    const resolved = resolveGradientConfig(this, config);
    resolveGradientLayout(this, resolved.config, resolved.scale);
    if (this.graphicSpec.objects.colorGradientStrips !== undefined) {
      throw new Error(
        "createGradientLegend requires a missing gradient legend."
      );
    }
    let next = this
      .editSemantic({
        property: "guide.legend.color.scale",
        value: resolved.encoding.scale
      })
      .editSemantic({
        property: "guide.legend.color.title",
        value: resolved.config.title
      })
      ._withLegendConfig("gradient", resolved.config);
    if (resolved.config.border !== false) {
      next = next.createGraphics({
        id: "colorGradientBackground",
        type: "rect",
        after: resolved.layer.id
      });
    }
    return next
      .createGraphics({
        id: "colorGradientStrips",
        type: "rect",
        length: 0,
        after: resolved.config.border === false
          ? resolved.layer.id
          : "colorGradientBackground"
      })
      .createGraphics({ id: "colorGradientTicks", type: "line", length: 0 })
      .createGraphics({ id: "colorGradientLabels", type: "text", length: 0 })
      .createGraphics({ id: "colorGradientTitle", type: "text" })
      .rematerializeGradientLegend();
  }
);
