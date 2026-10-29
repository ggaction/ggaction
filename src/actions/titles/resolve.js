import { validateTextAlignment } from "../../core/validation.js";
import { textBoundsFitCanvas } from "../../core/textMetrics.js";
import { resolveGuideCollisionBlocks } from "../../materialization/guides/resources.js";
import { canvasOverflowError } from "../../layout/canvas.js";
import { validateFontStyle } from "../../core/font.js";
import { isPlainObject } from "../../core/immutable.js";
import {
  validateKeys,
  validateOptionObject,
  validateNonEmptyString,
  validateNonNegativeFinite,
  validatePositiveFinite
} from "../../core/validation.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import {
  alignedTextAnchor,
  alignedTitleAnchor,
  buildTitleReadingBlock,
  resolveTitleComponentBounds,
  unionTitleBounds
} from "../../layout/title.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from "../../theme/defaults.js";
import { findCanvasGraphic } from
  "../../materialization/graphicHierarchy.js";

const OPTIONS = Object.freeze([
  "text", "subtitle", "position", "align", "offset", "alongOffset", "gap", "titleStyle",
  "subtitleStyle", "maxWidth", "wrap", "lineHeight", "subtitleLineHeight"
]);
const STYLE_OPTIONS = Object.freeze([
  "color", "fontSize", "fontFamily", "fontWeight", "fontStyle", "align"
]);
const POSITIONS = Object.freeze(["top", "bottom", "left", "right"]);
const ALIGNS = Object.freeze(["left", "center", "right"]);
const WRAPS = Object.freeze(["word", "character"]);
export const TITLE_DEFAULTS = Object.freeze({
  position: "top",
  align: "left",
  offset: 0,
  alongOffset: 0,
  gap: 8,
  titleStyle: Object.freeze({
    color: DEFAULT_COLORS.strongText,
    fontSize: 22,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontWeight: 600
  }),
  subtitleStyle: Object.freeze({
    color: DEFAULT_COLORS.mutedText,
    fontSize: 14,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontWeight: "normal"
  })
});
const DEFAULTS = TITLE_DEFAULTS;

export function validateTitleString(value, label, multiline = false) {
  validateNonEmptyString(value, label);
  if (multiline && value.split(/\r\n|\r|\n/u).every(line => line === "")) {
    throw new Error(`${label} requires at least one non-empty line.`);
  }
  if (!multiline && /\r|\n/u.test(value)) {
    throw new Error(`${label} does not accept explicit newlines.`);
  }
  return value;
}

function normalizeStyle(value, defaults, label) {
  if (value !== undefined && !isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  const style = { ...defaults, ...(value ?? {}) };
  validateKeys(style, STYLE_OPTIONS, label);
  validateTextAlignment(style, label);
  validateTitleString(style.color, `${label} color`);
  validateTitleString(style.fontFamily, `${label} fontFamily`);
  validatePositiveFinite(style.fontSize, `${label} fontSize`);
  if (!(
    (typeof style.fontWeight === "string" && style.fontWeight.length > 0) ||
    Number.isFinite(style.fontWeight)
  )) {
    throw new TypeError(`${label} fontWeight must be a non-empty string or number.`);
  }
  if (style.fontStyle !== undefined) validateFontStyle(style.fontStyle, label);
  return style;
}

function normalizeConfig(args, defaults, { hasSubtitle }) {
  const position = args.position ?? defaults.position;
  const align = args.align ?? defaults.align;
  const offset = args.offset ?? defaults.offset;
  const gap = args.gap ?? defaults.gap;
  const alongOffset = args.alongOffset ?? defaults.alongOffset ?? 0;
  const titleStyle = normalizeStyle(
    args.titleStyle,
    defaults.titleStyle,
    "createTitle.titleStyle"
  );
  const subtitleStyle = normalizeStyle(
    args.subtitleStyle,
    defaults.subtitleStyle,
    "createTitle.subtitleStyle"
  );
  const maxWidth = args.maxWidth ?? defaults.maxWidth;
  const wrap = args.wrap ?? defaults.wrap ?? (maxWidth === undefined ? undefined : "word");
  const lineHeight = args.lineHeight ?? defaults.lineHeight;
  const subtitleLineHeight = args.subtitleLineHeight === undefined
    ? defaults.subtitleLineHeight
    : args.subtitleLineHeight;
  if (!POSITIONS.includes(position)) {
    throw new Error(`Unsupported title position "${position}".`);
  }
  if (!ALIGNS.includes(align)) {
    throw new Error(`Unsupported title align "${align}".`);
  }
  if (!Number.isFinite(offset)) {
    throw new TypeError("Chart title offset must be a finite number.");
  }
  if (!Number.isFinite(alongOffset)) throw new TypeError("Chart title alongOffset must be a finite number.");
  validateNonNegativeFinite(gap, "Chart title gap");
  if (maxWidth !== undefined) {
    validatePositiveFinite(maxWidth, "Chart title maxWidth");
  }
  if (wrap !== undefined && !WRAPS.includes(wrap)) {
    throw new Error(`Unsupported title wrap "${wrap}".`);
  }
  if (maxWidth === undefined && (wrap !== undefined || lineHeight !== undefined)) {
    throw new Error("Chart title wrap and lineHeight require maxWidth.");
  }
  if (lineHeight !== undefined && (
    !Number.isFinite(lineHeight) ||
    lineHeight < titleStyle.fontSize ||
    (hasSubtitle && lineHeight < subtitleStyle.fontSize)
  )) {
    throw new RangeError("Chart title lineHeight must cover every visible fontSize.");
  }
  if (subtitleLineHeight !== undefined && (
    !Number.isFinite(subtitleLineHeight) ||
    subtitleLineHeight < subtitleStyle.fontSize
  )) {
    throw new RangeError("Chart subtitleLineHeight must cover subtitleStyle.fontSize.");
  }
  return {
    position,
    align,
    offset,
    alongOffset,
    gap,
    titleStyle,
    subtitleStyle,
    ...(subtitleLineHeight === undefined ? {} : { subtitleLineHeight }),
    ...(maxWidth === undefined ? {} : { maxWidth, wrap, ...(lineHeight === undefined
      ? {}
      : { lineHeight }) })
  };
}

export function normalizeTitleOptions(args) {
  validateOptionObject(args, OPTIONS, "createTitle");
  const text = validateTitleString(args.text, "Chart title text", true);
  const subtitle = args.subtitle === undefined
    ? undefined
    : validateTitleString(args.subtitle, "Chart subtitle", true);
  return {
    text,
    subtitle,
    ...normalizeConfig(args, DEFAULTS, { hasSubtitle: subtitle !== undefined })
  };
}

export function normalizeTitleEditOptions(args, previous, semanticTitle) {
  validateOptionObject(args, OPTIONS, "editTitle", {
    allowEmpty: false,
    emptyMessage: "editTitle requires at least one change.",
    emptyError: Error
  });
  const text = args.text === undefined
    ? semanticTitle.text
    : validateTitleString(args.text, "Chart title text", true);
  const subtitle = args.subtitle === false
    ? undefined
    : args.subtitle === undefined
      ? semanticTitle.subtitle
      : validateTitleString(args.subtitle, "Chart subtitle", true);
  if (args.subtitle !== undefined && args.subtitle !== false && typeof args.subtitle !== "string") {
    throw new TypeError("Chart subtitle must be a non-empty string or false.");
  }
  return {
    text,
    subtitle,
    config: normalizeConfig(args, previous, { hasSubtitle: subtitle !== undefined })
  };
}

export function requireTitleConfig(program) {
  if (program.titleConfig === undefined) {
    throw new Error("Title component requires chart title configuration.");
  }
  return program.titleConfig;
}

function validateLayout(position, titleBounds, plot, canvas) {
  if (!textBoundsFitCanvas(titleBounds, canvas)) {
    throw canvasOverflowError(`Chart title requires more ${position}-margin space.`, [titleBounds], canvas);
  }
  const outsidePlot = {
    top: titleBounds.bottom <= plot.y,
    bottom: titleBounds.top >= plot.y + plot.height,
    left: titleBounds.right <= plot.x,
    right: titleBounds.left >= plot.x + plot.width
  }[position];
  if (!outsidePlot) {
    throw new Error(`Chart title requires more ${position}-margin space.`);
  }
}

export function resolveTitleLayout(program, config) {
  const plot = resolveGraphicBounds(program);
  const canvas = findCanvasGraphic(program);
  if (
    plot === undefined ||
    ![plot.x, plot.y, plot.width, plot.height].every(Number.isFinite) ||
    canvas?.type !== "canvas" ||
    !Number.isFinite(canvas.properties.width) ||
    !Number.isFinite(canvas.properties.height)
  ) {
    throw new Error("Chart title layout requires Canvas bounds and dimensions.");
  }
  const block = buildTitleReadingBlock({
    text: validateTitleString(program.semanticSpec.title.text, "Chart title text", true),
    subtitle: program.semanticSpec.title.subtitle === undefined
      ? undefined
      : validateTitleString(
          program.semanticSpec.title.subtitle,
          "Chart subtitle", true
        )
  }, config, program.materializationConfigs.textMetrics);
  const automatic = program.materializationConfigs.canvas?.plot !== undefined;
  const near = ["top", "left"].includes(config.position);
  const horizontal = ["top", "bottom"].includes(config.position);
  let titleEdge = horizontal ? plot.y + (near ? 0 : plot.height)
    : plot.x + (near ? 0 : plot.width);
  if (automatic) {
    const occupied = resolveGuideCollisionBlocks(program.graphicSpec, program.guideConfigs,
      undefined, program.materializationConfigs.textMetrics).filter(item => item.position === config.position);
    const key = horizontal ? (near ? "top" : "bottom") : (near ? "left" : "right");
    for (const item of occupied) titleEdge = near ? Math.min(titleEdge, item.bounds[key]) : Math.max(titleEdge, item.bounds[key]);
    titleEdge += (near ? -1 : 1) * (16 + config.offset);
  }
  let component;
  if (horizontal) {
    const x = alignedTextAnchor(plot.x, plot.width, config.align) + (config.alongOffset ?? 0);
    const blockTop = automatic ? titleEdge - (near ? block.height : 0)
      : config.position === "top"
      ? 16 + config.offset
      : plot.y + plot.height + config.offset;
    const left = x - (config.align === "right" ? block.width : config.align === "center" ? block.width / 2 : 0);
    component = (lines, centers, style) => ({
      lines,
      x: style.align === undefined ? x : alignedTextAnchor(left, block.width, style.align),
      y: centers.map(value => blockTop + value),
      textAlign: style.align ?? config.align,
      rotation: 0,
      explicitRotation: config.position !== "top" || lines.length > 1
    });
  } else {
    const rotation = config.position === "left" ? -Math.PI / 2 : Math.PI / 2;
    const y = alignedTitleAnchor(plot.y, plot.height, block.width, config.align) + (config.alongOffset ?? 0);
    const edge = automatic ? titleEdge + (near ? -block.height : block.height)
      : config.position === "left"
      ? 16 + config.offset
      : canvas.properties.width - 16 + config.offset;
    const mapX = value => config.position === "left" ? edge + value : edge - value;
    component = (lines, centers, style) => ({
      lines,
      x: centers.map(mapX),
      y: y + Math.sin(rotation) * (style.align === "left" ? -block.width / 2 : style.align === "right" ? block.width / 2 : 0),
      textAlign: style.align ?? "center",
      rotation,
      explicitRotation: true
    });
  }
  const title = component(block.titleLines, block.titleCenters, config.titleStyle);
  const subtitle = block.subtitleLines.length === 0
    ? undefined
    : component(block.subtitleLines, block.subtitleCenters, config.subtitleStyle);
  const titleBounds = unionTitleBounds([
    resolveTitleComponentBounds(title, config.titleStyle, program.materializationConfigs.textMetrics),
    ...(subtitle === undefined
      ? []
      : [resolveTitleComponentBounds(subtitle, config.subtitleStyle, program.materializationConfigs.textMetrics)])
  ]);
  validateLayout(
    config.position,
    titleBounds,
    plot,
    canvas.properties
  );
  return { title, subtitle, bounds: titleBounds };
}
