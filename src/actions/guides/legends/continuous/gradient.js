import { action } from "../../../../core/action.js";
import { isPlainObject } from "../../../../core/immutable.js";
import { validateKeys } from "../../../../core/validation.js";
import { mapScaleConsumerValues } from "../../../../materialization/scales/map.js";
import { inverseLerp, interpolateNumber } from "../../../../grammar/numeric.js";
import { DEFAULT_COLORS } from "../../../../theme/defaults.js";
import {
  assertLegendBoundsInsideCanvas,
  editLegendBackground,
  formatContinuousValues,
  normalizeContinuousLegend,
  requireResolvedLegendScale,
  resolveContinuousBounds,
  resolveContinuousColorLayer,
  resolveLegendBackgroundFromBounds,
  resolveLegendTextBounds,
  sampleContinuousValues,
  styleContinuousText,
  validatePositive
} from "./common.js";
import { resolveLegendGraphicPlacement } from
  "../../../../materialization/graphicHierarchy.js";

export const DEFAULT_GRADIENT_SIZE = Object.freeze({ length: 120, thickness: 12 });

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
      ? plot.y - config.offset - thickness - config.labels.offset -
        config.labels.fontSize
      : plot.y + plot.height + config.offset +
        (config.titleVisible === false ? 0 : config.titleStyle.fontSize + 12);
  }
  const title = vertical
    ? { x, y: plot.y + 20, align: "left" }
    : {
        x: x + length / 2,
        y: y - 12 - config.titleStyle.fontSize / 2,
        align: "center"
      };
  const values = [...sampleContinuousValues(scale.domain, config.count)];
  if (scale.midpoint !== undefined && !values.includes(scale.midpoint)) {
    values.push(scale.midpoint);
    values.sort((a, b) => scale.domain[1] > scale.domain[0] ? a - b : b - a);
  }
  const texts = formatContinuousValues(values, scale.domain, config.fieldType);
  const fractions = values.map((value, index) => scale.midpoint === undefined
    ? index / (values.length - 1)
    : inverseLerp(value, ...scale.domain));
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
        y: y + thickness + labelOffset + config.labels.fontSize / 2,
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
        y1: y + thickness,
        x2: label.x,
        y2: y + thickness + 6
      }));
  const stripBounds = {
    left: x,
    right: x + (vertical ? thickness : length),
    top: y,
    bottom: y + (vertical ? length : thickness)
  };
  const tickBounds = ticks.map(tick => ({
    left: Math.min(tick.x1, tick.x2) - 0.5,
    right: Math.max(tick.x1, tick.x2) + 0.5,
    top: Math.min(tick.y1, tick.y2) - 0.5,
    bottom: Math.max(tick.y1, tick.y2) + 0.5
  }));
  const labelBounds = labels.map((label, index) =>
    resolveLegendTextBounds(label, texts[index], config.labels)
  );
  const titleBounds = config.titleVisible === false ? undefined : resolveLegendTextBounds(
    title,
    config.title,
    config.titleStyle
  );
  const occupiedBounds = [stripBounds, ...tickBounds, ...labelBounds,
    ...(config.titleVisible === false ? [] : [titleBounds])];
  assertLegendBoundsInsideCanvas(
    occupiedBounds,
    canvas,
    "Gradient legend layout"
  );
  const background = resolveLegendBackgroundFromBounds(
    occupiedBounds,
    config.border,
    canvas,
    "Gradient legend"
  );
  return {
    vertical, x, y, length, thickness, values, texts, labels, ticks, title,
    background
  };
}

function resolveGradientConfig(program, config) {
  const layer = resolveContinuousColorLayer(program, config.target);
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
      const position = layout.vertical ? 1 - fraction : fraction;
      // Keep legacy uniform samples exact without a value/domain round trip.
      const samplingScale = scale.midpoint === undefined ? { ...scale, domain: [0, 1] } : scale;
      const value = scale.midpoint === undefined ? position : interpolateNumber(...scale.domain, position);
      const [color] = mapScaleConsumerValues([value], samplingScale, "color");
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
        value: layout.texts
      });
    next = styleContinuousText(
      next,
      "colorGradientLabels",
      config.labels,
      { align: layout.labels[0].align }
    );
    if (config.titleVisible === false) return next;
    next = next
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


export function resolveGradientLegendCreation(program, args = {}) {
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
    length: args.gradient?.length ?? DEFAULT_GRADIENT_SIZE.length,
    thickness: args.gradient?.thickness ?? DEFAULT_GRADIENT_SIZE.thickness
  };
  config.titleVisible = true;
  validatePositive(config.gradient.length, "Gradient length");
  validatePositive(config.gradient.thickness, "Gradient thickness");
  const resolved = resolveGradientConfig(program, config);
  return resolved;
}

export function createGradientLegendFromConfig(program, config) {
  const resolved = resolveGradientConfig(program, config);
  resolveGradientLayout(program, resolved.config, resolved.scale);
  let next = program
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
      ...resolveLegendGraphicPlacement(next)
    });
  }
  next = next
    .createGraphics({
      id: "colorGradientStrips",
      type: "rect",
      length: 0,
      ...resolveLegendGraphicPlacement(next),
      ...(resolved.config.border === false
        ? {}
        : { after: "colorGradientBackground" })
    })
    .createGraphics({
      id: "colorGradientTicks",
      type: "line",
      length: 0,
      ...resolveLegendGraphicPlacement(next)
    })
    .createGraphics({
      id: "colorGradientLabels",
      type: "text",
      length: 0,
      ...resolveLegendGraphicPlacement(next)
    });
  if (resolved.config.titleVisible !== false) {
    next = next.createGraphics({
      id: "colorGradientTitle",
      type: "text",
      ...resolveLegendGraphicPlacement(next)
    });
  }
  return next.rematerializeGradientLegend();
}

export const createGradientLegend = action(
  {
    op: "createGradientLegend",
    description: "Create a continuous color gradient legend."
  },
  function (args = {}) {
    const resolved = resolveGradientLegendCreation(this, args);
    resolveGradientLayout(this, resolved.config, resolved.scale);
    if (this.graphicSpec.objects.colorGradientStrips !== undefined) {
      throw new Error(
        "createGradientLegend requires a missing gradient legend."
      );
    }
    return createGradientLegendFromConfig(this, resolved.config);
  }
);
