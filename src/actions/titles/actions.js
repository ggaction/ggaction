import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { noOptions, validateKeys } from "../../core/validation.js";

const OPTIONS = Object.freeze([
  "text",
  "subtitle",
  "position",
  "align",
  "offset",
  "gap",
  "titleStyle",
  "subtitleStyle"
]);
const STYLE_OPTIONS = Object.freeze([
  "color",
  "fontSize",
  "fontFamily",
  "fontWeight"
]);
const DEFAULTS = Object.freeze({
  position: "top",
  align: "left",
  offset: 0,
  gap: 8,
  titleStyle: Object.freeze({
    color: "#0f172a",
    fontSize: 22,
    fontFamily: "sans-serif",
    fontWeight: 600
  }),
  subtitleStyle: Object.freeze({
    color: "#64748b",
    fontSize: 14,
    fontFamily: "sans-serif",
    fontWeight: "normal"
  })
});

function validateString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function normalizeStyle(value, defaults, label) {
  if (value !== undefined && !isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  const style = { ...defaults, ...(value ?? {}) };
  validateKeys(style, STYLE_OPTIONS, label);
  validateString(style.color, `${label} color`);
  validateString(style.fontFamily, `${label} fontFamily`);
  if (!Number.isFinite(style.fontSize) || style.fontSize <= 0) {
    throw new RangeError(`${label} fontSize must be a positive finite number.`);
  }
  if (
    !(
      (typeof style.fontWeight === "string" && style.fontWeight.length > 0) ||
      Number.isFinite(style.fontWeight)
    )
  ) {
    throw new TypeError(`${label} fontWeight must be a non-empty string or number.`);
  }
  return style;
}

function normalizeOptions(args) {
  if (!isPlainObject(args)) {
    throw new TypeError("createTitle options must be a plain object.");
  }
  validateKeys(args, OPTIONS, "createTitle");
  const text = validateString(args.text, "Chart title text");
  const subtitle = args.subtitle === undefined
    ? undefined
    : validateString(args.subtitle, "Chart subtitle");
  const position = args.position ?? DEFAULTS.position;
  const align = args.align ?? DEFAULTS.align;
  const offset = args.offset ?? DEFAULTS.offset;
  const gap = args.gap ?? DEFAULTS.gap;

  if (position !== "top") {
    throw new Error(`Unsupported title position "${position}".`);
  }
  if (!["left", "center", "right"].includes(align)) {
    throw new Error(`Unsupported title align "${align}".`);
  }
  if (!Number.isFinite(offset)) {
    throw new TypeError("Chart title offset must be a finite number.");
  }
  if (!Number.isFinite(gap) || gap < 0) {
    throw new RangeError("Chart title gap must be a non-negative finite number.");
  }

  return {
    text,
    subtitle,
    position,
    align,
    offset,
    gap,
    titleStyle: normalizeStyle(
      args.titleStyle,
      DEFAULTS.titleStyle,
      "createTitle.titleStyle"
    ),
    subtitleStyle: normalizeStyle(
      args.subtitleStyle,
      DEFAULTS.subtitleStyle,
      "createTitle.subtitleStyle"
    )
  };
}

function requireConfig(program) {
  if (program.titleConfig === undefined) {
    throw new Error("Title component requires chart title configuration.");
  }
  return program.titleConfig;
}

function resolveLayout(program, config) {
  const bounds = program.context.currentGraphicBounds;
  const canvas = program.graphicSpec.objects.canvas;
  if (
    bounds === undefined ||
    ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) ||
    canvas?.type !== "canvas" ||
    !Number.isFinite(canvas.properties.width) ||
    !Number.isFinite(canvas.properties.height)
  ) {
    throw new Error("Chart title layout requires Canvas bounds and dimensions.");
  }

  const blockTop = 16 + config.offset;
  const titleY = blockTop + config.titleStyle.fontSize / 2;
  const hasSubtitle = program.semanticSpec.title.subtitle !== undefined;
  const subtitleY = hasSubtitle
    ? titleY +
      config.titleStyle.fontSize / 2 +
      config.gap +
      config.subtitleStyle.fontSize / 2
    : undefined;
  const blockBottom = hasSubtitle
    ? subtitleY + config.subtitleStyle.fontSize / 2
    : titleY + config.titleStyle.fontSize / 2;

  if (blockTop < 0 || blockBottom >= bounds.y) {
    throw new Error("Chart title requires more top-margin space.");
  }

  const x = config.align === "left"
    ? bounds.x
    : config.align === "center"
      ? bounds.x + bounds.width / 2
      : bounds.x + bounds.width;

  if (x < 0 || x > canvas.properties.width) {
    throw new Error("Chart title alignment falls outside the Canvas.");
  }

  return { x, titleY, subtitleY, textAlign: config.align };
}

function editText(program, id, text, style, x, y, textAlign) {
  return program
    .editGraphics({ target: id, property: "x", value: x })
    .editGraphics({ target: id, property: "y", value: y })
    .editGraphics({ target: id, property: "text", value: text })
    .editGraphics({ target: id, property: "fill", value: style.color })
    .editGraphics({ target: id, property: "fontSize", value: style.fontSize })
    .editGraphics({ target: id, property: "fontFamily", value: style.fontFamily })
    .editGraphics({ target: id, property: "fontWeight", value: style.fontWeight })
    .editGraphics({ target: id, property: "textAlign", value: textAlign })
    .editGraphics({ target: id, property: "textBaseline", value: "middle" });
}

export const editTitleText = action(
  { op: "editTitleText", description: "Rematerialize chart title text." },
  function (args = {}) {
    noOptions(args, "editTitleText");
    const config = requireConfig(this);
    if (this.graphicSpec.objects.chartTitle?.type !== "text") {
      throw new Error("editTitleText requires an existing chart title graphic.");
    }
    const text = validateString(
      this.semanticSpec.title.text,
      "Chart title text"
    );
    const layout = resolveLayout(this, config);
    return editText(
      this,
      "chartTitle",
      text,
      config.titleStyle,
      layout.x,
      layout.titleY,
      layout.textAlign
    );
  }
);

export const createTitleText = action(
  { op: "createTitleText", description: "Create chart title text." },
  function (args = {}) {
    noOptions(args, "createTitleText");
    requireConfig(this);
    if (this.graphicSpec.objects.chartTitle !== undefined) {
      throw new Error("createTitleText requires a missing chart title graphic.");
    }
    return this
      .createGraphics({ id: "chartTitle", type: "text" })
      .editTitleText();
  }
);

export const editSubtitleText = action(
  { op: "editSubtitleText", description: "Rematerialize chart subtitle text." },
  function (args = {}) {
    noOptions(args, "editSubtitleText");
    const config = requireConfig(this);
    if (this.graphicSpec.objects.chartSubtitle?.type !== "text") {
      throw new Error(
        "editSubtitleText requires an existing chart subtitle graphic."
      );
    }
    const text = validateString(
      this.semanticSpec.title.subtitle,
      "Chart subtitle"
    );
    const layout = resolveLayout(this, config);
    return editText(
      this,
      "chartSubtitle",
      text,
      config.subtitleStyle,
      layout.x,
      layout.subtitleY,
      layout.textAlign
    );
  }
);

export const createSubtitleText = action(
  { op: "createSubtitleText", description: "Create chart subtitle text." },
  function (args = {}) {
    noOptions(args, "createSubtitleText");
    requireConfig(this);
    validateString(this.semanticSpec.title.subtitle, "Chart subtitle");
    if (this.graphicSpec.objects.chartSubtitle !== undefined) {
      throw new Error(
        "createSubtitleText requires a missing chart subtitle graphic."
      );
    }
    return this
      .createGraphics({ id: "chartSubtitle", type: "text" })
      .editSubtitleText();
  }
);

export const rematerializeTitle = action(
  { op: "rematerializeTitle", description: "Rematerialize chart title graphics." },
  function (args = {}) {
    noOptions(args, "rematerializeTitle");
    requireConfig(this);
    let next = this.editTitleText();
    if (this.semanticSpec.title.subtitle !== undefined) {
      next = next.editSubtitleText();
    }
    return next;
  }
);

export const createTitle = action(
  { op: "createTitle", description: "Create a chart title and optional subtitle." },
  function (args = {}) {
    const options = normalizeOptions(args);
    if (Object.keys(this.semanticSpec.title).length > 0) {
      throw new Error("createTitle requires missing semantic title state.");
    }
    if (
      this.graphicSpec.objects.chartTitle !== undefined ||
      this.graphicSpec.objects.chartSubtitle !== undefined
    ) {
      throw new Error("createTitle requires missing chart title graphics.");
    }

    const config = {
      position: options.position,
      align: options.align,
      offset: options.offset,
      gap: options.gap,
      titleStyle: options.titleStyle,
      subtitleStyle: options.subtitleStyle
    };
    let next = this
      .editSemantic({ property: "title.text", value: options.text });
    if (options.subtitle !== undefined) {
      next = next.editSemantic({
        property: "title.subtitle",
        value: options.subtitle
      });
    }
    next = next._withTitleConfig(config);
    resolveLayout(next, config);
    next = next.createTitleText();
    if (options.subtitle !== undefined) next = next.createSubtitleText();
    return next;
  }
);
