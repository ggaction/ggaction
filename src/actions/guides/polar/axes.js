import { action } from "../../../core/action.js";
import { isPlainObject } from "../../../core/immutable.js";
import {
  validateKeys,
  validateNonEmptyString,
  validateNonNegativeFinite
} from "../../../core/validation.js";
import {
  buildPolarCircleCommands,
  resolveRadialAxisLabels,
  resolveRadialAxisLine,
  resolveRadialAxisTicks,
  resolveRadialAxisTitle,
  resolveThetaAxisLabels,
  resolveThetaAxisTicks,
  resolveThetaAxisTitle
} from "../../../grammar/polarGuides.js";
import { resolvePlotGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { inferAxisTitleText } from "../axes/titles.js";
import {
  POLAR_AXIS_DEFAULTS,
  formatPolarGuideValues,
  mapPolarGuideValues,
  normalizePolarTickMode,
  polarGuideNames,
  resolvePolarFrameForProgram,
  resolvePolarGuideResources,
  validatePolarLabelFormat,
  validatePolarLineStyle,
  validatePolarTextStyle,
  validatePolarTickConfig
} from "./resolve.js";

const LINE_CREATE_OPTIONS = Object.freeze([
  "scale", "coordinate", "angle", "color", "lineWidth"
]);
const LINE_EDIT_OPTIONS = Object.freeze(["color", "lineWidth"]);
const TICK_CREATE_OPTIONS = Object.freeze([
  "scale", "coordinate", "angle", "count", "values", "length", "color",
  "lineWidth"
]);
const TICK_EDIT_OPTIONS = Object.freeze([
  "count", "values", "length", "color", "lineWidth"
]);
const LABEL_CREATE_OPTIONS = Object.freeze([
  "scale", "coordinate", "angle", "count", "values", "offset", "format",
  "color", "fontSize", "fontFamily", "fontWeight"
]);
const LABEL_EDIT_OPTIONS = Object.freeze([
  "count", "values", "offset", "format", "color", "fontSize",
  "fontFamily", "fontWeight"
]);
const TITLE_CREATE_OPTIONS = Object.freeze([
  "scale", "coordinate", "angle", "text", "offset", "color", "fontSize",
  "fontFamily", "fontWeight"
]);
const TITLE_EDIT_OPTIONS = Object.freeze([
  "text", "offset", "color", "fontSize", "fontFamily", "fontWeight"
]);
const AXIS_OPTIONS = Object.freeze([
  "scale", "coordinate", "angle", "line", "ticksAndLabels", "title"
]);
const TICK_GROUP_OPTIONS = Object.freeze([
  "count", "values", "ticks", "labels"
]);

function prefix(kind) {
  return kind === "theta" ? "Theta" : "Radial";
}

function operations(kind, component) {
  const name = `${prefix(kind)}Axis${component}`;
  return { create: `create${name}`, edit: `edit${name}` };
}

function validateObject(args, supported, operation) {
  if (!isPlainObject(args)) {
    throw new TypeError(`${operation} options must be a plain object.`);
  }
  validateKeys(args, supported, operation);
}

function validateModeOptions(args, operation) {
  if (Object.hasOwn(args, "count") && Object.hasOwn(args, "values")) {
    throw new Error(`${operation} cannot use count and values together.`);
  }
}

function validateAngle(value) {
  if (!Number.isFinite(value)) {
    throw new TypeError("Radial-axis angle must be finite degrees.");
  }
  return value;
}

function resolveAngle(program, kind, args) {
  if (kind === "theta") return undefined;
  const previous = program.guideConfigs.axis?.radius?.layout?.angle;
  const angle = validateAngle(
    args.angle ?? previous ?? POLAR_AXIS_DEFAULTS.angle
  );
  if (previous !== undefined && Object.hasOwn(args, "angle") &&
      previous !== angle) {
    throw new Error(
      "Polar radial-axis components must share one aggregate angle."
    );
  }
  return angle;
}

function withAxisSemantics(program, kind, resources) {
  const existing = program.semanticSpec.guides.axis?.[kind];
  if (existing?.scale !== undefined && existing.scale !== resources.scale) {
    throw new Error(`${prefix(kind)} axis conflicts with its existing scale.`);
  }
  if (existing?.coordinate !== undefined &&
      existing.coordinate !== resources.coordinate) {
    throw new Error(`${prefix(kind)} axis conflicts with its coordinate.`);
  }
  let next = program;
  if (existing?.scale === undefined) {
    next = next.editSemantic({
      property: `guide.axis.${kind}.scale`,
      value: resources.scale
    });
  }
  if (existing?.coordinate === undefined) {
    next = next.editSemantic({
      property: `guide.axis.${kind}.coordinate`,
      value: resources.coordinate
    });
  }
  return next;
}

function componentResources(program, kind, args, operation) {
  const stored = program.semanticSpec.guides.axis?.[kind];
  return resolvePolarGuideResources(program, kind, {
    ...args,
    ...(args.scale === undefined && stored?.scale !== undefined
      ? { scale: stored.scale }
      : {}),
    ...(args.coordinate === undefined && stored?.coordinate !== undefined
      ? { coordinate: stored.coordinate }
      : {})
  }, operation);
}

function lineGeometry(program, kind, angle) {
  const frame = resolvePolarFrameForProgram(program);
  return kind === "theta"
    ? { commands: buildPolarCircleCommands(frame, frame.availableRadius) }
    : resolveRadialAxisLine({ frame, angle });
}

function makeEditLine(kind) {
  const operation = operations(kind, "Line");
  return action({
    op: operation.edit,
    description: `Edit the Polar ${kind}-axis baseline.`
  }, function (args = {}) {
    validateObject(args, LINE_EDIT_OPTIONS, operation.edit);
    const names = polarGuideNames(kind);
    const expected = kind === "theta" ? "path" : "line";
    const graphic = this.graphicSpec.objects[names.line];
    const previous = this.guideConfigs.axis?.[kind]?.line;
    if (graphic?.type !== expected || previous === undefined) {
      throw new Error(`${operation.edit} requires an existing axis line.`);
    }
    const config = { ...previous, ...args };
    validatePolarLineStyle(config, `${prefix(kind)} axis line`);
    const angle = resolveAngle(this, kind, {});
    const geometry = lineGeometry(this, kind, angle);
    let next = this._withGuideConfig(kind, "line", config);
    for (const [property, value] of Object.entries(geometry)) {
      next = next.editGraphics({ target: names.line, property, value });
    }
    return next
      .editGraphics({
        target: names.line,
        property: "stroke",
        value: config.color
      })
      .editGraphics({
        target: names.line,
        property: "strokeWidth",
        value: config.lineWidth
      });
  });
}

function makeCreateLine(kind) {
  const operation = operations(kind, "Line");
  return action({
    op: operation.create,
    description: `Create the Polar ${kind}-axis baseline.`
  }, function (args = {}) {
    validateObject(args, LINE_CREATE_OPTIONS, operation.create);
    const names = polarGuideNames(kind);
    if (this.graphicSpec.objects[names.line] !== undefined) {
      throw new Error(`${operation.create} requires a missing axis line.`);
    }
    const resources = componentResources(this, kind, args, operation.create);
    const angle = resolveAngle(this, kind, args);
    const config = {
      scale: resources.scale,
      coordinate: resources.coordinate,
      color: args.color ?? POLAR_AXIS_DEFAULTS.line.color,
      lineWidth: args.lineWidth ?? POLAR_AXIS_DEFAULTS.line.lineWidth
    };
    validatePolarLineStyle(config, `${prefix(kind)} axis line`);
    lineGeometry(this, kind, angle);
    let next = withAxisSemantics(this, kind, resources);
    if (kind === "radius" &&
        next.guideConfigs.axis?.radius?.layout === undefined) {
      next = next._withGuideConfig("radius", "layout", { angle });
    }
    return next
      .createGraphics({
        id: names.line,
        type: kind === "theta" ? "path" : "line",
        ...resolvePlotGraphicPlacement(next)
      })
      ._withGuideConfig(kind, "line", config)
      [operation.edit]();
  });
}

function tickGeometry(program, kind, config) {
  const frame = resolvePolarFrameForProgram(program);
  const mapped = mapPolarGuideValues(program, config);
  return {
    values: mapped.values,
    ...(kind === "theta"
      ? resolveThetaAxisTicks({
          frame,
          angles: mapped.positions,
          length: config.length
        })
      : resolveRadialAxisTicks({
          frame,
          angle: resolveAngle(program, kind, {}),
          radii: mapped.positions,
          length: config.length
        }))
  };
}

function resolveTickConfig(program, kind, args, resources, previous) {
  const count = kind === "theta"
    ? POLAR_AXIS_DEFAULTS.ticks.thetaCount
    : POLAR_AXIS_DEFAULTS.ticks.radiusCount;
  const explicitMode = Object.hasOwn(args, "count") ||
    Object.hasOwn(args, "values");
  const mode = explicitMode
    ? normalizePolarTickMode(program, resources.scale, args, count)
    : previous?.inferredValues === false
      ? previous.mode === "values"
        ? { mode: "values", values: previous.values, inferredValues: false }
        : { mode: "count", count: previous.count, inferredValues: false }
      : normalizePolarTickMode(program, resources.scale, {}, count);
  const config = {
    ...(previous ?? {}),
    scale: resources.scale,
    coordinate: resources.coordinate,
    ...mode,
    length: args.length ?? previous?.length ?? (kind === "theta"
      ? POLAR_AXIS_DEFAULTS.ticks.length
      : POLAR_AXIS_DEFAULTS.ticks.radialLength),
    color: args.color ?? previous?.color ?? POLAR_AXIS_DEFAULTS.ticks.color,
    lineWidth: args.lineWidth ?? previous?.lineWidth ??
      POLAR_AXIS_DEFAULTS.ticks.lineWidth
  };
  validatePolarTickConfig(config, `${kind}-axis ticks`);
  validateNonNegativeFinite(config.length, "Polar axis tick length");
  validatePolarLineStyle(config, `${prefix(kind)} axis ticks`);
  return config;
}

function makeEditTicks(kind) {
  const operation = operations(kind, "Ticks");
  return action({
    op: operation.edit,
    description: `Edit the Polar ${kind}-axis ticks.`
  }, function (args = {}) {
    validateObject(args, TICK_EDIT_OPTIONS, operation.edit);
    validateModeOptions(args, operation.edit);
    const names = polarGuideNames(kind);
    const previous = this.guideConfigs.axis?.[kind]?.ticks;
    if (this.graphicSpec.objects[names.ticks]?.type !== "line" ||
        previous === undefined) {
      throw new Error(`${operation.edit} requires existing axis ticks.`);
    }
    const resources = {
      scale: previous.scale,
      coordinate: previous.coordinate
    };
    const config = resolveTickConfig(this, kind, args, resources, previous);
    const geometry = tickGeometry(this, kind, config);
    let next = this._withGuideConfig(kind, "ticks", config)
      .editGraphics({
        target: names.ticks,
        property: "length",
        value: geometry.values.length
      });
    for (const property of ["x1", "y1", "x2", "y2"]) {
      next = next.editGraphics({
        target: names.ticks,
        property,
        value: geometry[property]
      });
    }
    return next
      .editGraphics({
        target: names.ticks,
        property: "stroke",
        value: config.color
      })
      .editGraphics({
        target: names.ticks,
        property: "strokeWidth",
        value: config.lineWidth
      });
  });
}

function makeCreateTicks(kind) {
  const operation = operations(kind, "Ticks");
  return action({
    op: operation.create,
    description: `Create the Polar ${kind}-axis ticks.`
  }, function (args = {}) {
    validateObject(args, TICK_CREATE_OPTIONS, operation.create);
    validateModeOptions(args, operation.create);
    const names = polarGuideNames(kind);
    if (this.graphicSpec.objects[names.ticks] !== undefined) {
      throw new Error(`${operation.create} requires missing axis ticks.`);
    }
    const resources = componentResources(this, kind, args, operation.create);
    const angle = resolveAngle(this, kind, args);
    const config = resolveTickConfig(this, kind, args, resources);
    tickGeometry(this, kind, config);
    let next = withAxisSemantics(this, kind, resources);
    if (kind === "radius" &&
        next.guideConfigs.axis?.radius?.layout === undefined) {
      next = next._withGuideConfig("radius", "layout", { angle });
    }
    return next
      .createGraphics({
        id: names.ticks,
        type: "line",
        length: 0,
        ...resolvePlotGraphicPlacement(next)
      })
      ._withGuideConfig(kind, "ticks", config)
      [operation.edit]();
  });
}

function labelGeometry(program, kind, config) {
  const frame = resolvePolarFrameForProgram(program);
  const mapped = mapPolarGuideValues(program, config);
  const text = formatPolarGuideValues(program, config, mapped.values);
  return {
    values: mapped.values,
    text,
    ...(kind === "theta"
      ? resolveThetaAxisLabels({
          frame,
          angles: mapped.positions,
          offset: config.offset
        })
      : resolveRadialAxisLabels({
          frame,
          angle: resolveAngle(program, kind, {}),
          radii: mapped.positions,
          offset: config.offset
        }))
  };
}

function resolveLabelConfig(program, kind, args, resources, previous) {
  const ticks = program.guideConfigs.axis?.[kind]?.ticks;
  const count = kind === "theta"
    ? POLAR_AXIS_DEFAULTS.ticks.thetaCount
    : POLAR_AXIS_DEFAULTS.ticks.radiusCount;
  const explicitMode = Object.hasOwn(args, "count") ||
    Object.hasOwn(args, "values");
  let mode;
  if (explicitMode) {
    mode = normalizePolarTickMode(program, resources.scale, args, count);
  } else if (ticks !== undefined) {
    mode = ticks.mode === "values"
      ? {
          mode: "values",
          values: ticks.values,
          inferredValues: ticks.inferredValues
        }
      : {
          mode: "count",
          count: ticks.count,
          inferredValues: ticks.inferredValues
        };
  } else if (previous?.inferredValues === false) {
    mode = previous.mode === "values"
      ? { mode: "values", values: previous.values, inferredValues: false }
      : { mode: "count", count: previous.count, inferredValues: false };
  } else {
    mode = normalizePolarTickMode(program, resources.scale, {}, count);
  }
  const config = {
    ...(previous ?? {}),
    scale: resources.scale,
    coordinate: resources.coordinate,
    ...mode,
    offset: args.offset ?? previous?.offset ?? (kind === "theta"
      ? POLAR_AXIS_DEFAULTS.labels.thetaOffset
      : POLAR_AXIS_DEFAULTS.labels.radiusOffset),
    format: args.format ?? previous?.format ??
      POLAR_AXIS_DEFAULTS.labels.format,
    color: args.color ?? previous?.color ?? POLAR_AXIS_DEFAULTS.labels.color,
    fontSize: args.fontSize ?? previous?.fontSize ??
      POLAR_AXIS_DEFAULTS.labels.fontSize,
    fontFamily: args.fontFamily ?? previous?.fontFamily ??
      POLAR_AXIS_DEFAULTS.labels.fontFamily,
    fontWeight: args.fontWeight ?? previous?.fontWeight ??
      POLAR_AXIS_DEFAULTS.labels.fontWeight
  };
  validatePolarTickConfig(config, `${kind}-axis labels`);
  validateNonNegativeFinite(config.offset, "Polar axis label offset");
  validatePolarLabelFormat(config.format);
  validatePolarTextStyle(config, `${prefix(kind)} axis labels`);
  return config;
}

function makeEditLabels(kind) {
  const operation = operations(kind, "Labels");
  return action({
    op: operation.edit,
    description: `Edit the Polar ${kind}-axis labels.`
  }, function (args = {}) {
    validateObject(args, LABEL_EDIT_OPTIONS, operation.edit);
    validateModeOptions(args, operation.edit);
    const names = polarGuideNames(kind);
    const previous = this.guideConfigs.axis?.[kind]?.labels;
    if (this.graphicSpec.objects[names.labels]?.type !== "text" ||
        previous === undefined) {
      throw new Error(`${operation.edit} requires existing axis labels.`);
    }
    const resources = {
      scale: previous.scale,
      coordinate: previous.coordinate
    };
    const config = resolveLabelConfig(this, kind, args, resources, previous);
    const geometry = labelGeometry(this, kind, config);
    let next = this._withGuideConfig(kind, "labels", config)
      .editGraphics({
        target: names.labels,
        property: "length",
        value: geometry.values.length
      });
    const properties = {
      x: geometry.x,
      y: geometry.y,
      text: geometry.text,
      textAlign: geometry.textAlign,
      textBaseline: geometry.textBaseline,
      fill: config.color,
      fontSize: config.fontSize,
      fontFamily: config.fontFamily,
      fontWeight: config.fontWeight
    };
    for (const [property, value] of Object.entries(properties)) {
      next = next.editGraphics({ target: names.labels, property, value });
    }
    return next;
  });
}

function makeCreateLabels(kind) {
  const operation = operations(kind, "Labels");
  return action({
    op: operation.create,
    description: `Create the Polar ${kind}-axis labels.`
  }, function (args = {}) {
    validateObject(args, LABEL_CREATE_OPTIONS, operation.create);
    validateModeOptions(args, operation.create);
    const names = polarGuideNames(kind);
    if (this.graphicSpec.objects[names.labels] !== undefined) {
      throw new Error(`${operation.create} requires missing axis labels.`);
    }
    const resources = componentResources(this, kind, args, operation.create);
    const angle = resolveAngle(this, kind, args);
    const config = resolveLabelConfig(this, kind, args, resources);
    labelGeometry(this, kind, config);
    let next = withAxisSemantics(this, kind, resources);
    if (kind === "radius" &&
        next.guideConfigs.axis?.radius?.layout === undefined) {
      next = next._withGuideConfig("radius", "layout", { angle });
    }
    return next
      .createGraphics({
        id: names.labels,
        type: "text",
        length: 0,
        ...resolvePlotGraphicPlacement(next)
      })
      ._withGuideConfig(kind, "labels", config)
      [operation.edit]();
  });
}

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
      fontWeight: config.fontWeight,
      rotation: 0
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

function validateAxisArgs(args, operation) {
  validateObject(args, AXIS_OPTIONS, operation);
  if (Object.hasOwn(args, "line")) {
    validateObject(args.line, LINE_EDIT_OPTIONS, `${operation}.line`);
  }
  if (Object.hasOwn(args, "ticksAndLabels")) {
    validateObject(
      args.ticksAndLabels,
      TICK_GROUP_OPTIONS,
      `${operation}.ticksAndLabels`
    );
    validateModeOptions(args.ticksAndLabels, `${operation}.ticksAndLabels`);
    if (Object.hasOwn(args.ticksAndLabels, "ticks")) {
      validateObject(
        args.ticksAndLabels.ticks,
        ["length", "color", "lineWidth"],
        `${operation}.ticksAndLabels.ticks`
      );
    }
    if (Object.hasOwn(args.ticksAndLabels, "labels")) {
      validateObject(
        args.ticksAndLabels.labels,
        LABEL_EDIT_OPTIONS.filter(key => !["count", "values"].includes(key)),
        `${operation}.ticksAndLabels.labels`
      );
    }
  }
  if (Object.hasOwn(args, "title")) {
    validateObject(args.title, TITLE_EDIT_OPTIONS, `${operation}.title`);
  }
}

function makeCreateAxis(kind) {
  const operation = `create${prefix(kind)}Axis`;
  return action({
    op: operation,
    description: `Create the complete Polar ${kind} axis.`
  }, function (args = {}) {
    validateAxisArgs(args, operation);
    const resources = resolvePolarGuideResources(this, kind, args, operation);
    const angle = resolveAngle(this, kind, args);
    const shared = {
      scale: resources.scale,
      coordinate: resources.coordinate,
      ...(kind === "radius" ? { angle } : {})
    };
    const group = args.ticksAndLabels ?? {};
    const mode = {
      ...(Object.hasOwn(group, "count") ? { count: group.count } : {}),
      ...(Object.hasOwn(group, "values") ? { values: group.values } : {})
    };
    let next = this;
    if (kind === "radius") {
      next = next._withGuideConfig("radius", "layout", { angle });
    }
    return next
      [`create${prefix(kind)}AxisLine`]({ ...shared, ...(args.line ?? {}) })
      [`create${prefix(kind)}AxisTicks`]({
        ...shared,
        ...mode,
        ...(group.ticks ?? {})
      })
      [`create${prefix(kind)}AxisLabels`]({
        ...shared,
        ...mode,
        ...(group.labels ?? {})
      })
      [`create${prefix(kind)}AxisTitle`]({
        ...shared,
        ...(args.title ?? {})
      });
  });
}

const AXIS_EDIT_OPTIONS = Object.freeze([
  "angle", "line", "ticks", "labels", "ticksAndLabels", "title"
]);

function validateAxisEditArgs(kind, args, operation) {
  validateObject(
    args,
    kind === "theta"
      ? AXIS_EDIT_OPTIONS.filter(option => option !== "angle")
      : AXIS_EDIT_OPTIONS,
    operation
  );
  if (Object.keys(args).length === 0) {
    throw new Error(`${operation} requires at least one axis change.`);
  }
  if (Object.hasOwn(args, "angle")) validateAngle(args.angle);
  if (Object.hasOwn(args, "line")) {
    validateObject(args.line, LINE_EDIT_OPTIONS, `${operation}.line`);
  }
  if (Object.hasOwn(args, "ticks")) {
    validateObject(args.ticks, TICK_EDIT_OPTIONS, `${operation}.ticks`);
    validateModeOptions(args.ticks, `${operation}.ticks`);
  }
  if (Object.hasOwn(args, "labels")) {
    validateObject(args.labels, LABEL_EDIT_OPTIONS, `${operation}.labels`);
    validateModeOptions(args.labels, `${operation}.labels`);
  }
  if (Object.hasOwn(args, "ticksAndLabels")) {
    validateObject(
      args.ticksAndLabels,
      TICK_GROUP_OPTIONS,
      `${operation}.ticksAndLabels`
    );
    validateModeOptions(args.ticksAndLabels, `${operation}.ticksAndLabels`);
    if (args.ticks !== undefined || args.labels !== undefined) {
      throw new Error(
        `${operation} cannot combine ticksAndLabels with ticks or labels.`
      );
    }
    if (args.ticksAndLabels.ticks !== undefined) {
      validateObject(
        args.ticksAndLabels.ticks,
        ["length", "color", "lineWidth"],
        `${operation}.ticksAndLabels.ticks`
      );
    }
    if (args.ticksAndLabels.labels !== undefined) {
      validateObject(
        args.ticksAndLabels.labels,
        LABEL_EDIT_OPTIONS.filter(key => !["count", "values"].includes(key)),
        `${operation}.ticksAndLabels.labels`
      );
    }
  }
  if (Object.hasOwn(args, "title")) {
    validateObject(args.title, TITLE_EDIT_OPTIONS, `${operation}.title`);
  }
}

function makeEditAxis(kind) {
  const operation = `edit${prefix(kind)}Axis`;
  return action({
    op: operation,
    description: `Edit selected Polar ${kind}-axis components.`
  }, function (args = {}) {
    validateAxisEditArgs(kind, args, operation);
    const names = polarGuideNames(kind);
    const angleChanged = Object.hasOwn(args, "angle");
    let next = angleChanged
      ? this._withGuideConfig("radius", "layout", { angle: args.angle })
      : this;
    const has = component =>
      next.graphicSpec.objects[names[component]] !== undefined;
    if (args.line !== undefined || (angleChanged && has("line"))) {
      next = next[`edit${prefix(kind)}AxisLine`](args.line ?? {});
    }
    if (args.ticksAndLabels !== undefined) {
      const group = args.ticksAndLabels;
      const mode = {
        ...(Object.hasOwn(group, "count") ? { count: group.count } : {}),
        ...(Object.hasOwn(group, "values") ? { values: group.values } : {})
      };
      next = next[`edit${prefix(kind)}AxisTicks`]({
        ...mode,
        ...(group.ticks ?? {})
      });
      next = next[`edit${prefix(kind)}AxisLabels`]({
        ...mode,
        ...(group.labels ?? {})
      });
    } else {
      if (args.ticks !== undefined || (angleChanged && has("ticks"))) {
        next = next[`edit${prefix(kind)}AxisTicks`](args.ticks ?? {});
      }
      if (args.labels !== undefined || (angleChanged && has("labels"))) {
        next = next[`edit${prefix(kind)}AxisLabels`](args.labels ?? {});
      }
    }
    if (args.title !== undefined || (angleChanged && has("title"))) {
      next = next[`edit${prefix(kind)}AxisTitle`](args.title ?? {});
    }
    return next;
  });
}

const createThetaAxisLine = makeCreateLine("theta");
const createRadialAxisLine = makeCreateLine("radius");
const editThetaAxisLine = makeEditLine("theta");
const editRadialAxisLine = makeEditLine("radius");
const createThetaAxisTicks = makeCreateTicks("theta");
const createRadialAxisTicks = makeCreateTicks("radius");
const editThetaAxisTicks = makeEditTicks("theta");
const editRadialAxisTicks = makeEditTicks("radius");
const createThetaAxisLabels = makeCreateLabels("theta");
const createRadialAxisLabels = makeCreateLabels("radius");
const editThetaAxisLabels = makeEditLabels("theta");
const editRadialAxisLabels = makeEditLabels("radius");
const createThetaAxisTitle = makeCreateTitle("theta");
const createRadialAxisTitle = makeCreateTitle("radius");
const editThetaAxisTitle = makeEditTitle("theta");
const editRadialAxisTitle = makeEditTitle("radius");
const createThetaAxis = makeCreateAxis("theta");
const createRadialAxis = makeCreateAxis("radius");
const editThetaAxis = makeEditAxis("theta");
const editRadialAxis = makeEditAxis("radius");

export function registerPolarAxisActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, {
    createThetaAxisLine,
    createRadialAxisLine,
    editThetaAxisLine,
    editRadialAxisLine,
    createThetaAxisTicks,
    createRadialAxisTicks,
    editThetaAxisTicks,
    editRadialAxisTicks,
    createThetaAxisLabels,
    createRadialAxisLabels,
    editThetaAxisLabels,
    editRadialAxisLabels,
    createThetaAxisTitle,
    createRadialAxisTitle,
    editThetaAxisTitle,
    editRadialAxisTitle,
    createThetaAxis,
    createRadialAxis,
    editThetaAxis,
    editRadialAxis
  });
}
