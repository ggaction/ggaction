import { action } from "../../../../core/action.js";
import {
  buildPolarCircleCommands,
  resolveRadialAxisLine
} from "../../../../grammar/polarGuides.js";
import { resolvePlotGraphicPlacement } from
  "../../../../materialization/graphicHierarchy.js";
import {
  POLAR_AXIS_DEFAULTS,
  polarGuideNames,
  resolvePolarFrameForProgram,
  validatePolarLineStyle
} from "../resolve.js";
import {
  componentResources,
  LINE_CREATE_OPTIONS,
  LINE_EDIT_OPTIONS,
  operations,
  prefix,
  resolveAngle,
  validateObject,
  withAxisSemantics
} from "./shared.js";

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

export const createThetaAxisLine = makeCreateLine("theta");
export const createRadialAxisLine = makeCreateLine("radius");
export const editThetaAxisLine = makeEditLine("theta");
export const editRadialAxisLine = makeEditLine("radius");
