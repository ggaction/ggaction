import { isSourceOwnedText } from "../../../grammar/text.js";
import { withGuideLayoutValidation } from "../../../materialization/guides/layout.js";
import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import {
  validateKeys,
  validateNonEmptyString,
  validateNonNegativeFinite
} from "../../../core/validation.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import {
  isTransformedScaleType,
  mapContinuousScaleValues,
  mapOrdinalPositionValues
} from "../../../grammar/scales/index.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../theme/defaults.js";
import { findDataset } from "../../../selectors/datasets.js";
import { formatAggregateTitle } from "../../../grammar/aggregate.js";
import { finiteMidpoint } from "../../../grammar/numeric.js";
import {
  defaultAxisPosition,
  defaultAxisTitleRotation,
  resolveAxisTitleGeometry,
  validateAxisPosition
} from "./policy.js";
import { findCanvasGraphic, resolvePlotGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import {
  resolveTextBounds,
  textBoundsFitCanvas,
  textBoundsIntersect
} from "../../../core/textMetrics.js";
import { resolveConcreteGraphicBounds } from
  "../../../grammar/schemas/graphicBounds.js";
import { validateAxisTextStyle } from "./labels.js";
import { resolveRotation } from "../../../grammar/rotation.js";

function titleBounds(geometry, config, text) {
  return resolveTextBounds({
    ...geometry,
    text,
    fontSize: config.fontSize,
    fontFamily: config.fontFamily,
    fontWeight: config.fontWeight,
    textAlign: "center",
    textBaseline: "middle",
    rotation: config.rotation
  });
}

function inferredTitleOffset(program, channel, config) {
  const plot = resolveGraphicBounds(program);
  const canvas = findCanvasGraphic(program)?.properties;
  const labels = program.graphicSpec.objects[`${channel}AxisLabels`]
    ? resolveConcreteGraphicBounds(program.graphicSpec, `${channel}AxisLabels`)
    : undefined;
  const preferred = channel === "x" ? 42 : 52;
  if (!plot || !canvas || !labels) return preferred;
  const horizontal = channel === "x";
  const positive = config.position === (horizontal ? "bottom" : "right");
  const near = horizontal ? "top" : "left";
  const far = horizontal ? "bottom" : "right";
  const bounds = titleBounds(resolveAxisTitleGeometry({
    bounds: plot,
    channel,
    position: config.position,
    along: 0,
    offset: preferred
  }), config, program.semanticSpec.guides.axis?.[channel]?.title ?? "");
  const needed = positive
    ? labels[far] + 4 - bounds[near]
    : bounds[far] - labels[near] + 4;
  const available = positive
    ? canvas[horizontal ? "height" : "width"] - bounds[far]
    : bounds[near];
  return preferred + Math.min(available, Math.max(0, needed));
}

const CREATE_OPTIONS = [
  "text", "scale", "position", "at", "offset", "rotation", "color",
  "fontSize", "fontFamily", "fontWeight"
];
const EDIT_OPTIONS = CREATE_OPTIONS.filter(key => key !== "scale");
const DEFAULTS = {
  color: DEFAULT_COLORS.text,
  fontSize: 13,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontWeight: 600
};

function validateText(text) {
  return validateNonEmptyString(text, "Axis title text");
}

function validateConfig(channel, config) {
  validateAxisPosition(channel, config.position);
  if (!["start", "center", "end"].includes(config.at) && !Number.isFinite(config.at)) throw new TypeError("Axis title at must be start, center, end, or a finite number.");
  validateNonNegativeFinite(config.offset, "Axis title offset");
  if (!Number.isFinite(config.rotation)) throw new TypeError("Axis title rotation must be finite radians.");
  validateAxisTextStyle(config, "Axis title");
}

export function inferAxisTitleText(program, channel, scaleId) {
  const titles = new Set();
  const primaryTitles = new Set();
  for (const layer of program.semanticSpec.layers) {
    if (isSourceOwnedText(layer)) continue;
    const primary = layer.encoding?.[channel];
    const encoding = layer.mark?.type === "area" && Object.hasOwn(primary ?? {}, "datum")
      ? layer.encoding?.[`${channel}2`] : primary;
    if (channel === "radius" && layer.mark?.type === "arc" &&
      encoding?.scale === scaleId && encoding.aggregate === "count" && encoding.field === undefined) {
      titles.add(encoding.title ?? "count");
      continue;
    }
    if (
      encoding?.scale === scaleId &&
      typeof encoding.field === "string" &&
      encoding.field.length
    ) {
      const dataset = findDataset(program, layer.data);
      const transform = dataset?.transform?.length === 1
        ? dataset.transform[0]
        : undefined;
      let derivedTitle;
      if (transform?.type === "density") {
        derivedTitle = encoding.field === transform.as?.[0]
          ? transform.field
          : encoding.field === transform.as?.[1]
            ? "Density"
            : undefined;
      } else if (transform?.type === "interval" &&
        Object.values(transform.as).includes(encoding.field)) {
        derivedTitle = `${transform.center}(${transform.field})`;
      } else if (transform?.type === "boxSummary" &&
        Object.values(transform.as).includes(encoding.field)) {
        derivedTitle = transform.field;
      }
      const title = encoding.title ?? derivedTitle ?? (encoding.aggregate === undefined
        ? encoding.field
        : formatAggregateTitle(encoding.aggregate, encoding.field));
      titles.add(title);
      if (layer.mark?.type === "point") primaryTitles.add(title);
    }
  }
  if (primaryTitles.size === 1) return [...primaryTitles][0];
  if (titles.size !== 1) throw new Error(`Axis title text cannot be inferred for scale "${scaleId}".`);
  return [...titles][0];
}

function resolveGeometry(program, channel, config) {
  const scale = program.resolvedScales[config.scale];
  const bounds = resolveGraphicBounds(program);
  const discrete = ["ordinal", "band", "point"].includes(scale?.type);
  if ((
    !["linear", "time", "ordinal", "band", "point"].includes(scale?.type) &&
    !isTransformedScaleType(scale?.type)
  ) || !bounds) throw new Error("Axis title requires a supported resolved scale and Canvas bounds.");
  let along;
  if (config.at === "center") {
    along = finiteMidpoint(scale.range[0], scale.range[1]);
  } else if (config.at === "start" || config.at === "end") {
    along = scale.range[config.at === "start" ? 0 : 1];
  } else {
    if (discrete) {
      if (!scale.domain.includes(config.at)) throw new RangeError("Axis title at value must be inside the scale domain.");
      along = mapOrdinalPositionValues([config.at], scale)[0];
    } else {
      const low = Math.min(...scale.domain), high = Math.max(...scale.domain);
      if (config.at < low || config.at > high) throw new RangeError("Axis title at value must be inside the scale domain.");
      along = mapContinuousScaleValues([config.at], scale)[0];
    }
  }
  const geometry = resolveAxisTitleGeometry({
    bounds,
    channel,
    position: config.position,
    along,
    offset: config.offset
  });
  const resolvedBounds = titleBounds(
    geometry,
    config,
    program.semanticSpec.guides.axis?.[channel]?.title ?? ""
  );
  const canvas = findCanvasGraphic(program)?.properties;
  if (!canvas || !textBoundsFitCanvas(resolvedBounds, canvas)) {
    throw new Error(`The ${channel}-axis title does not fit the Canvas margin.`);
  }
  const labelsBounds = program.graphicSpec.objects[`${channel}AxisLabels`]
    ? resolveConcreteGraphicBounds(program.graphicSpec, `${channel}AxisLabels`)
    : undefined;
  if (labelsBounds && textBoundsIntersect(resolvedBounds, labelsBounds)) {
    throw new Error(`The ${channel}-axis title overlaps the axis labels.`);
  }
  return geometry;
}

function names(channel) {
  const prefix = channel === "x" ? "X" : "Y";
  return { create: `create${prefix}AxisTitle`, edit: `edit${prefix}AxisTitle`, graphic: `${channel}AxisTitle` };
}

function makeEdit(channel) {
  const operation = names(channel);
  return action({ op: operation.edit, description: `Edit the ${channel}-axis title.` }, withGuideLayoutValidation(function (args = {}) {
      validateKeys(args, EDIT_OPTIONS, operation.edit);
    if (this.graphicSpec.objects[operation.graphic]?.type !== "text") throw new Error(`${operation.edit} requires an existing axis title.`);
    const previous = this.guideConfigs.axis?.[channel]?.title;
    if (!previous) throw new Error(`${operation.edit} requires title configuration.`);
    const { text, rotation: requestedRotation, ...appearance } = args;
    const explicitText = Object.hasOwn(args, "text");
    const explicitRotation = Object.hasOwn(args, "rotation");
    const position = appearance.position ?? previous.position;
    const inferredRotation = explicitRotation
      ? false
      : previous.inferredRotation === true;
    const config = {
      ...previous,
      ...appearance,
      position,
      rotation: inferredRotation
        ? defaultAxisTitleRotation(channel, position)
        : explicitRotation
          ? resolveRotation(requestedRotation, "Axis title rotation")
          : previous.rotation,
      inferredRotation,
      inferredOffset: Object.hasOwn(args, "offset")
        ? false
        : previous.inferredOffset === true,
      ...(explicitText ? { inferredText: false } : {})
    };
    validateConfig(channel, config);
    let next = this;
    const resolvedTitle = explicitText
      ? validateText(text)
      : config.inferredText === true
        ? inferAxisTitleText(this, channel, config.scale)
        : this.semanticSpec.guides.axis?.[channel]?.title;
    if (resolvedTitle !== this.semanticSpec.guides.axis?.[channel]?.title) {
      next = next.editSemantic({
        property: `guide.axis.${channel}.title`,
        value: validateText(resolvedTitle)
      });
    }
    const resolvedText = validateText(next.semanticSpec.guides.axis?.[channel]?.title);
    if (config.inferredOffset) {
      config.offset = inferredTitleOffset(next, channel, config);
    }
    const geometry = resolveGeometry(next, channel, config);
    next = next._withGuideConfig(channel, "title", config);
    const properties = {
      x: geometry.x, y: geometry.y, text: resolvedText, fill: config.color,
      fontSize: config.fontSize, fontFamily: config.fontFamily,
      fontWeight: config.fontWeight, textAlign: "center", textBaseline: "middle",
      rotation: config.rotation
    };
    for (const [property, value] of Object.entries(properties)) next = next.editGraphics({ target: operation.graphic, property, value });
    return next;
  }));
}

const editXAxisTitle = makeEdit("x");
const editYAxisTitle = makeEdit("y");

function makeCreate(channel) {
  const operation = names(channel);
  return action({ op: operation.create, description: `Create the ${channel}-axis title.` }, withGuideLayoutValidation(function (args = {}) {
      validateKeys(args, CREATE_OPTIONS, operation.create);
    const {
      text: requestedText,
      scale: requestedScale,
      position: requestedPosition,
      rotation: requestedRotation,
      ...appearance
    } = args;
    const scale = validateUserId(requestedScale ?? channel, "Scale id");
    const guideScale = this.semanticSpec.guides.axis?.[channel]?.scale;
    if (guideScale && guideScale !== scale) throw new Error(`${operation.create} conflicts with the existing axis scale.`);
    if (this.graphicSpec.objects[operation.graphic]) throw new Error(`${operation.create} requires a missing axis title.`);
    const inferredText = !Object.hasOwn(args, "text");
    const text = validateText(
      requestedText ?? inferAxisTitleText(this, channel, scale)
    );
    const position = requestedPosition ?? defaultAxisPosition(channel);
    const inferredRotation = !Object.hasOwn(args, "rotation");
    const inferredOffset = !Object.hasOwn(args, "offset");
    const config = {
      scale,
      inferredText,
      position,
      at: "center",
      offset: channel === "x" ? 42 : 52,
      rotation: inferredRotation
        ? defaultAxisTitleRotation(channel, position)
        : resolveRotation(requestedRotation, "Axis title rotation"),
      inferredRotation,
      inferredOffset,
      color: DEFAULTS.color,
      fontSize: DEFAULTS.fontSize,
      fontFamily: DEFAULTS.fontFamily,
      fontWeight: DEFAULTS.fontWeight,
      ...appearance
    };
    let next = this
      .editSemantic({ property: `guide.axis.${channel}.scale`, value: scale })
      .editSemantic({ property: `guide.axis.${channel}.title`, value: text });
    if (inferredOffset) config.offset = inferredTitleOffset(next, channel, config);
    validateConfig(channel, config);
    resolveGeometry(next, channel, config);
    return next
      .createGraphics({
        id: operation.graphic,
        type: "text",
        ...resolvePlotGraphicPlacement(this)
      })
      ._withGuideConfig(channel, "title", config)[operation.edit]();
  }));
}

const createXAxisTitle = makeCreate("x");
const createYAxisTitle = makeCreate("y");

export function registerAxisTitleActions(Class) {
  Class.prototype.createXAxisTitle = createXAxisTitle;
  Class.prototype.createYAxisTitle = createYAxisTitle;
  Class.prototype.editXAxisTitle = editXAxisTitle;
  Class.prototype.editYAxisTitle = editYAxisTitle;
}
