import { action } from "../../../../core/action.js";
import {
  validateNonEmptyString,
  validateNonNegativeFinite
} from "../../../../core/validation.js";
import {
  resolveRadialAxisTitle,
  resolveThetaAxisTitle
} from "../../../../grammar/polarGuides.js";
import { resolvePlotGraphicPlacement } from
  "../../../../materialization/graphicHierarchy.js";
import { inferAxisTitleText } from "../../axes/titles.js";
import {
  POLAR_AXIS_DEFAULTS,
  polarGuideNames,
  resolvePolarFrameForProgram,
  validatePolarTextStyle
} from "../resolve.js";
import {
  componentResources,
  operations,
  prefix,
  resolveAngle,
  TITLE_CREATE_OPTIONS,
  TITLE_EDIT_OPTIONS,
  validateObject,
  withAxisSemantics
} from "./shared.js";

function titleGeometry(program, kind, config) {
  const frame = resolvePolarFrameForProgram(program);
  return kind === "theta"
    ? resolveThetaAxisTitle({ frame, offset: config.offset })
    : resolveRadialAxisTitle({
        frame,
        angle: resolveAngle(program, kind, {}),
        offset: config.offset
      });
}

function resolveTitleConfig(kind, args, resources, previous) {
  const config = {
    ...(previous ?? {}),
    scale: resources.scale,
    coordinate: resources.coordinate,
    inferredText: previous?.inferredText ?? !Object.hasOwn(args, "text"),
    offset: args.offset ?? previous?.offset ?? (kind === "theta"
      ? POLAR_AXIS_DEFAULTS.title.thetaOffset
      : POLAR_AXIS_DEFAULTS.title.radiusOffset),
    color: args.color ?? previous?.color ?? POLAR_AXIS_DEFAULTS.title.color,
    fontSize: args.fontSize ?? previous?.fontSize ??
      POLAR_AXIS_DEFAULTS.title.fontSize,
    fontFamily: args.fontFamily ?? previous?.fontFamily ??
      POLAR_AXIS_DEFAULTS.title.fontFamily,
    fontWeight: args.fontWeight ?? previous?.fontWeight ??
      POLAR_AXIS_DEFAULTS.title.fontWeight
  };
  if (Object.hasOwn(args, "text")) config.inferredText = false;
  validateNonNegativeFinite(config.offset, "Polar axis title offset");
  validatePolarTextStyle(config, `${prefix(kind)} axis title`);
  return config;
}

function makeEditTitle(kind) {
  const operation = operations(kind, "Title");
  return action({
    op: operation.edit,
    description: `Edit the Polar ${kind}-axis title.`
  }, function (args = {}) {
    validateObject(args, TITLE_EDIT_OPTIONS, operation.edit);
    const names = polarGuideNames(kind);
    const previous = this.guideConfigs.axis?.[kind]?.title;
    if (this.graphicSpec.objects[names.title]?.type !== "text" ||
        previous === undefined) {
      throw new Error(`${operation.edit} requires an existing axis title.`);
    }
    const resources = {
      scale: previous.scale,
      coordinate: previous.coordinate
    };
    const config = resolveTitleConfig(kind, args, resources, previous);
    const text = Object.hasOwn(args, "text")
      ? validateNonEmptyString(args.text, "Polar axis title text")
      : config.inferredText
        ? inferAxisTitleText(this, polarGuideNames(kind).channel, config.scale)
        : this.semanticSpec.guides.axis?.[kind]?.title;
    let next = this;
    if (text !== this.semanticSpec.guides.axis?.[kind]?.title) {
      next = next.editSemantic({
        property: `guide.axis.${kind}.title`,
        value: text
      });
    }
    const geometry = titleGeometry(next, kind, config);
    next = next._withGuideConfig(kind, "title", config);
    const properties = {
      ...geometry,
      text,
      fill: config.color,
      fontSize: config.fontSize,
      fontFamily: config.fontFamily,
      fontWeight: config.fontWeight
    };
    for (const [property, value] of Object.entries(properties)) {
      next = next.editGraphics({ target: names.title, property, value });
    }
    return next;
  });
}

function makeCreateTitle(kind) {
  const operation = operations(kind, "Title");
  return action({
    op: operation.create,
    description: `Create the Polar ${kind}-axis title.`
  }, function (args = {}) {
    validateObject(args, TITLE_CREATE_OPTIONS, operation.create);
    const names = polarGuideNames(kind);
    if (this.graphicSpec.objects[names.title] !== undefined) {
      throw new Error(`${operation.create} requires a missing axis title.`);
    }
    const resources = componentResources(this, kind, args, operation.create);
    const angle = resolveAngle(this, kind, args);
    const config = resolveTitleConfig(kind, args, resources);
    const text = validateNonEmptyString(
      args.text ?? inferAxisTitleText(this, names.channel, resources.scale),
      "Polar axis title text"
    );
    titleGeometry(this, kind, config);
    let next = withAxisSemantics(this, kind, resources);
    if (kind === "radius" &&
        next.guideConfigs.axis?.radius?.layout === undefined) {
      next = next._withGuideConfig("radius", "layout", { angle });
    }
    next = next.editSemantic({
      property: `guide.axis.${kind}.title`,
      value: text
    });
    return next
      .createGraphics({
        id: names.title,
        type: "text",
        ...resolvePlotGraphicPlacement(next)
      })
      ._withGuideConfig(kind, "title", config)
      [operation.edit]();
  });
}

export const createThetaAxisTitle = makeCreateTitle("theta");
export const createRadialAxisTitle = makeCreateTitle("radius");
export const editThetaAxisTitle = makeEditTitle("theta");
export const editRadialAxisTitle = makeEditTitle("radius");
