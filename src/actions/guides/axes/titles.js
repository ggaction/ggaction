import { selectCartesianAxis, axisTargetArgs } from "../../../selectors/axes.js";
import { axisGraphicIds } from "../../../materialization/guides/resources.js";
import { materializeTextLines } from "../../../materialization/textLines.js";
import { axisTitleTextLines as titleLines, validateAxisTextPlacement } from "../../../grammar/axisTextPlacement.js";
import { axisThemeTypography } from "../../theme/state.js";
import { canvasOverflowError } from "../../../layout/canvas.js";
import { isSourceOwnedText } from "../../../grammar/text.js";
import { withGuideLayoutValidation } from "../../../materialization/guides/layout.js";
import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import {
  validateKeys,
  validateNonEmptyString
} from "../../../core/validation.js";
import { axisScaleBindings, resolveCartesianAxisFrameBounds } from "../../../materialization/coordinateBounds.js";
import {
  isTransformedScaleType,
  mapContinuousScaleValues,
  mapOrdinalPositionValues
} from "../../../grammar/scales/index.js";
import { AXIS_TITLE_FONT_SIZE, DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../theme/defaults.js";
import { findDataset } from "../../../selectors/datasets.js";
import { findUpstreamTransform } from "../../../materialization/dataProvenance.js";
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

function titleBounds(geometry, config, text, profile) {
  return resolveTextBounds({
    ...geometry,
    text,
    lines: titleLines(text, config),
    fontSize: config.fontSize,
    fontFamily: config.fontFamily,
    fontWeight: config.fontWeight,
    textAlign: config.align ?? "center",
    textBaseline: config.baseline ?? "middle",
    rotation: config.rotation
  }, profile);
}

function resolveTitleAlong(scale, config) {
  const discrete = ["ordinal", "band", "point"].includes(scale?.type);
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
  return along + (config.alongOffset ?? 0);
}

function axisLabelBounds(program, channel, axisId = channel) {
  const id = axisGraphicIds(channel, axisId)[2], labels = program.graphicSpec.objects[id];
  const bounds = target => resolveConcreteGraphicBounds(
    program.graphicSpec, target, program.materializationConfigs.textMetrics
  );
  return labels?.items?.map(item => bounds(item.id)) ?? (labels ? [bounds(id)] : []);
}

function inferredTitleOffset(program, channel, config, axisId = channel) {
  const plot = resolveCartesianAxisFrameBounds(program, channel, config.position, config.scale, axisId);
  const canvas = findCanvasGraphic(program)?.properties;
  const labels = program.graphicSpec.objects[axisGraphicIds(channel, axisId)[2]]
    ? resolveConcreteGraphicBounds(program.graphicSpec, axisGraphicIds(channel, axisId)[2], program.materializationConfigs.textMetrics)
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
  }), config, program.semanticSpec.guides.axis?.[axisId]?.title ?? "", program.materializationConfigs.textMetrics);
  const needed = positive
    ? labels[far] + 4 - bounds[near]
    : bounds[far] - labels[near] + 4;
  const available = positive
    ? canvas[horizontal ? "height" : "width"] - bounds[far]
    : bounds[near];
  // Font ink can extend beyond the one-em layout box, especially after
  // rotating a middle-baseline title. Keep inferred edge-clamped placement
  // inside the Canvas; explicit offsets retain their exact geometry.
  const inkClearance = channel === "y" &&
    Math.abs(Math.cos(config.rotation)) < 1e-10
    ? config.fontSize / 4 : 0;
  if (program.materializationConfigs.canvas?.plot !== undefined) {
    return preferred + Math.max(0, needed);
  }
  const legacyAdjustment = Math.min(available, Math.max(0, needed));
  if (inkClearance === 0) return preferred + legacyAdjustment;
  const adjustment = Math.min(available - inkClearance, Math.max(0, needed));
  const candidateBounds = titleBounds(resolveAxisTitleGeometry({
    bounds: plot, channel, position: config.position,
    along: resolveTitleAlong(program.resolvedScales[config.scale], config),
    offset: preferred + adjustment
  }), config, program.semanticSpec.guides.axis?.[axisId]?.title ?? "", program.materializationConfigs.textMetrics);
  // Optional ink reserve must not introduce a label collision.
  return preferred + (axisLabelBounds(program, channel, axisId).some(label => label && textBoundsIntersect(candidateBounds, label))
    ? legacyAdjustment : adjustment);
}

const CREATE_OPTIONS = ["target",
  "text", "scale", "position", "at", "offset", "rotation", "color",
  "fontSize", "fontFamily", "fontWeight", "alongOffset", "align", "baseline"
];
const EDIT_OPTIONS = CREATE_OPTIONS.filter(key => key !== "scale");
const DEFAULTS = {
  color: DEFAULT_COLORS.text,
  fontSize: AXIS_TITLE_FONT_SIZE,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontWeight: 600
};

function validateText(text) {
  return validateNonEmptyString(text, "Axis title text");
}

function validateConfig(channel, config) {
  validateAxisPosition(channel, config.position);
  if (!["start", "center", "end"].includes(config.at) && !Number.isFinite(config.at)) throw new TypeError("Axis title at must be start, center, end, or a finite number.");
  validateAxisTextPlacement(config, { title: true });
  if (!Number.isFinite(config.rotation)) throw new TypeError("Axis title rotation must be finite radians.");
  validateAxisTextStyle(config, "Axis title");
}

export function inferAxisTitleText(program, channel, scaleId) {
  const titles = new Set();
  const primaryTitles = new Set();
  for (const layer of program.semanticSpec.layers) {
    if (isSourceOwnedText(layer)) continue;
    // Reference statistics reuse the source axis title.
    if (program.markConfigs[layer.id]?.statisticalReference !== undefined) continue;
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
      const transform = findUpstreamTransform(program, dataset,
        ["density", "ecdf", "interval", "boxSummary", "gradientProfile", "summary"]);
      let derivedTitle;
      if (transform?.type === "density") {
        derivedTitle = encoding.field === transform.as?.[0]
          ? transform.field
          : encoding.field === transform.as?.[1]
            ? "Density"
            : undefined;
      } else if (transform?.type === "ecdf") {
        derivedTitle = encoding.field === transform.as.value ? transform.field
          : encoding.field === transform.as.probability ? "Cumulative probability"
            : encoding.field === transform.as.cumulative ? "Cumulative count" : undefined;
      } else if (transform?.type === "interval" &&
        Object.values(transform.as).includes(encoding.field)) {
        derivedTitle = `${transform.center}(${transform.field})`;
      } else if (transform?.type === "boxSummary" &&
        Object.values(transform.as).includes(encoding.field)) {
        derivedTitle = transform.field;
      } else if (transform?.type === "gradientProfile" &&
        [transform.as.lower, transform.as.upper, transform.as.center].includes(encoding.field)) {
        // Profile bounds and the optional center share one source measure.
        derivedTitle = transform.field;
      } else if (transform?.type === "summary") {
        const aggregate = transform.aggregates.find(value => value.as === encoding.field);
        if (aggregate) derivedTitle = formatAggregateTitle(aggregate.op, aggregate.field);
      }
      const title = encoding.title ?? derivedTitle ?? (encoding.aggregate === undefined
        ? encoding.field
        : formatAggregateTitle(encoding.aggregate, encoding.field));
      titles.add(title);
      if (layer.mark?.type === "point") primaryTitles.add(title);
    }
  }
  if (primaryTitles.size === 1) return [...primaryTitles][0];
  if (titles.size === 0 && axisScaleBindings(program, scaleId).some(binding => binding.channel === channel)) return scaleId;
  if (titles.size !== 1) throw new Error(`Axis title text cannot be inferred for scale "${scaleId}".`);
  return [...titles][0];
}

function resolveGeometry(program, channel, config, axisId = channel) {
  const scale = program.resolvedScales[config.scale];
  const bounds = resolveCartesianAxisFrameBounds(program, channel, config.position, config.scale, axisId);
  if ((
    !["linear", "time", "ordinal", "band", "point"].includes(scale?.type) &&
    !isTransformedScaleType(scale?.type)
  ) || !bounds) throw new Error("Axis title requires a supported resolved scale and Canvas bounds.");
  const along = resolveTitleAlong(scale, config);
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
    program.semanticSpec.guides.axis?.[axisId]?.title ?? ""
  , program.materializationConfigs.textMetrics);
  const canvas = findCanvasGraphic(program)?.properties;
  if (!canvas || !textBoundsFitCanvas(resolvedBounds, canvas)) {
    throw canvasOverflowError(`The ${channel}-axis title does not fit the Canvas margin.`, [resolvedBounds], canvas);
  }
  const labelBounds = axisLabelBounds(program, channel, axisId);
  if (labelBounds.some(bounds => bounds && textBoundsIntersect(resolvedBounds, bounds))) {
    throw new Error(`The ${channel}-axis title overlaps the axis labels.`);
  }
  return geometry;
}

function names(channel) {
  const prefix = channel === "x" ? "X" : "Y";
  return { create: `create${prefix}AxisTitle`, edit: `edit${prefix}AxisTitle` };
}

function makeEdit(channel) {
  const operation = names(channel);
  return action({ op: operation.edit, description: `Edit the ${channel}-axis title.` }, withGuideLayoutValidation(function (args = {}) {
      validateKeys(args, EDIT_OPTIONS, operation.edit);
    const selected = selectCartesianAxis(this, channel, args, { create: false });
    const axisId = selected.id; args = selected.options;
    const graphic = axisGraphicIds(channel, axisId)[3];
    validateAxisTextPlacement(args, { title: true });
    if (this.graphicSpec.objects[graphic]?.type !== "text") throw new Error(`${operation.edit} requires an existing axis title.`);
    const previous = this.guideConfigs.axis?.[axisId]?.title;
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
        : this.semanticSpec.guides.axis?.[axisId]?.title;
    if (resolvedTitle !== this.semanticSpec.guides.axis?.[axisId]?.title) {
      next = next.editSemantic({
        property: `guide.axis.${axisId}.title`,
        value: validateText(resolvedTitle)
      });
    }
    const resolvedText = validateText(next.semanticSpec.guides.axis?.[axisId]?.title);
    if (config.inferredOffset) {
      config.offset = inferredTitleOffset(next, channel, config, axisId);
    }
    const geometry = resolveGeometry(next, channel, config, axisId);
    next = next._withGuideConfig(axisId, "title", config);
    const properties = {
      x: geometry.x, y: geometry.y, text: resolvedText, fill: config.color,
      fontSize: config.fontSize, fontFamily: config.fontFamily,
      fontWeight: config.fontWeight, textAlign: config.align ?? "center", textBaseline: config.baseline ?? "middle",
      rotation: config.rotation
    };
    for (const [property, value] of Object.entries(properties)) next = next.editGraphics({ target: graphic, property, value });
    return materializeTextLines(next, graphic, titleLines(resolvedText, config));
  }));
}

const editXAxisTitle = /* @__PURE__ */ makeEdit("x");
const editYAxisTitle = /* @__PURE__ */ makeEdit("y");

function makeCreate(channel) {
  const operation = names(channel);
  return action({ op: operation.create, description: `Create the ${channel}-axis title.` }, withGuideLayoutValidation(function (args = {}) {
      validateKeys(args, CREATE_OPTIONS, operation.create);
    const selected = selectCartesianAxis(this, channel, args, { create: true });
    const axisId = selected.id; args = selected.options;
    const graphic = axisGraphicIds(channel, axisId)[3];
    validateAxisTextPlacement(args, { title: true });
    const {
      text: requestedText,
      scale: requestedScale,
      position: requestedPosition,
      rotation: requestedRotation,
      ...appearance
    } = args;
    const scale = validateUserId(requestedScale ?? channel, "Scale id");
    const guideScale = this.semanticSpec.guides.axis?.[axisId]?.scale;
    if (guideScale && guideScale !== scale) throw new Error(`${operation.create} conflicts with the existing axis scale.`);
    if (this.graphicSpec.objects[graphic]) throw new Error(`${operation.create} requires a missing axis title.`);
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
      ...axisThemeTypography(this.materializationConfigs.theme, "title"),
      ...appearance
    };
    let next = this
      .editSemantic({ property: `guide.axis.${axisId}.scale`, value: scale })
      .editSemantic({ property: `guide.axis.${axisId}.title`, value: text });
    if (inferredOffset) config.offset = inferredTitleOffset(next, channel, config, axisId);
    validateConfig(channel, config);
    resolveGeometry(next, channel, config, axisId);
    return next
      .createGraphics({
        id: graphic,
        type: "text",
        ...resolvePlotGraphicPlacement(this)
      })
      ._withGuideConfig(axisId, "title", config)[operation.edit](axisId === channel ? undefined : axisTargetArgs(axisId, channel));
  }));
}

const createXAxisTitle = /* @__PURE__ */ makeCreate("x");
const createYAxisTitle = /* @__PURE__ */ makeCreate("y");

export function registerAxisTitleActions(Class) {
  Class.prototype.createXAxisTitle = createXAxisTitle;
  Class.prototype.createYAxisTitle = createYAxisTitle;
  Class.prototype.editXAxisTitle = editXAxisTitle;
  Class.prototype.editYAxisTitle = editYAxisTitle;
}
