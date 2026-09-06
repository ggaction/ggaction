import { findCoordinate } from "../../selectors/coordinates.js";
import { polarGuideNames } from "./polar/resolve.js";
import { polarGridOperations, validatePolarGridOptions } from "./polar/grids.js";
import { findLayer } from "../../selectors/layers.js";
import { resolveGuideOptions } from "./guides.js";
import { resolveGridOptions } from "./grids/grid.js";
import { gridNames, validateGridCreateArgs } from "./grids/resolve.js";
import { scopeFacadeAxes, planFacadeAxes } from "./facadeAxes.js";
import { assertGuideOptions, guideConflict, resolveStoredGuideCoordinate } from "./reuse.js";
import { planFacadeLegend } from "./facadeLegend.js";
import { applyLegendCreationPlan } from "./legends/categorical/actions.js";

function facadeGridNames(direction) {
  return ["theta", "radial"].includes(direction)
    ? { ...polarGridOperations(direction), channel: polarGuideNames(direction).channel }
    : gridNames(direction);
}

function scopeGrid(program, layer, args) {
  const directions = resolveGridOptions(program, args, [layer]);
  const scoped = {};
  const polar = findCoordinate(program, layer.coordinate)?.type === "polar";
  for (const [direction, option] of Object.entries(directions)) {
    if (option === undefined) continue;
    if (polar !== ["theta", "radial"].includes(direction)) {
      guideConflict("grid coordinate family does not belong to this facade");
    }
    const { channel, create } = facadeGridNames(direction);
    const scale = layer.encoding?.[channel]?.scale;
    if (scale === undefined || option.scale !== undefined && option.scale !== scale ||
      option.coordinate !== undefined && option.coordinate !== layer.coordinate) {
      guideConflict(`${direction} grid does not belong to this facade`);
    }
    scoped[direction] = { ...option, scale, coordinate: layer.coordinate };
    if (polar) validatePolarGridOptions(scoped[direction], create, true);
    else validateGridCreateArgs(scoped[direction], create);
  }
  // An explicit vertical-only request must not re-enable horizontal grid defaults.
  if (polar) {
    for (const direction of ["theta", "radial"]) if (scoped[direction] === undefined) scoped[direction] = false;
  } else if (scoped.horizontal === undefined) scoped.horizontal = false;
  return scoped;
}

function planGrid(program, args) {
  return Object.entries(args).flatMap(([direction, option]) => {
    if (option === false) return [];
    const { channel, create } = facadeGridNames(direction);
    const guide = program.semanticSpec.guides.grid?.[direction];
    const config = program.guideConfigs.grid?.[direction];
    if (guide === undefined && config === undefined) return [{ op: create, args: option }];
    if (guide?.scale !== option.scale || config === undefined || config.scale !== option.scale ||
      config.coordinate !== undefined && config.coordinate !== option.coordinate ||
      resolveStoredGuideCoordinate(program, guide, channel) !== option.coordinate) {
      guideConflict(`${direction} grid uses a different coordinate or scale`);
    }
    const { scale, coordinate, ...appearance } = option;
    assertGuideOptions(appearance, config, `${direction} grid`);
    return [];
  });
}

export function fulfillFacadeGuides(program, guides, target, explicitGuides = guides) {
  if (guides === false) return program;
  const layer = findLayer(program, target);
  if (layer === undefined) throw new Error(`Unknown facade guide target "${target}".`);
  const resolved = resolveGuideOptions(program, guides, [layer]);
  const axisDirections = Object.entries(resolved.axes ?? {}).filter(([key]) => key !== "coordinate");
  const scopedAxes = resolved.axes === undefined || axisDirections.length > 0 && axisDirections.every(
    ([, value]) => value === false
  )
    ? undefined
    : scopeFacadeAxes(program, layer, resolved.axes);
  const axes = scopedAxes;
  const scopedGrid = resolved.grid === undefined || Object.values(resolved.grid).every(
    value => value === false
  )
    ? undefined
    : scopeGrid(program, layer, resolved.grid);
  const grid = scopedGrid;
  const legend = resolved.legend === undefined ? undefined : { ...resolved.legend, target };
  if (resolved.legend?.target !== undefined && resolved.legend.target !== target) {
    guideConflict("legend target does not belong to this facade");
  }
  if (axes === undefined && grid === undefined && legend === undefined) return program;
  const legendPlan = legend === undefined ? undefined
    : planFacadeLegend(program, layer, legend, explicitGuides.legend ?? {});
  const steps = [
    ...(axes === undefined ? [] : planFacadeAxes(program, layer, axes, explicitGuides.axes)),
    ...(grid === undefined ? [] : planGrid(program, grid))
  ];
  const hasExisting = [program.guideConfigs.axis, program.guideConfigs.grid, program.guideConfigs.legend,
    program.semanticSpec.guides.axis, program.semanticSpec.guides.grid, program.semanticSpec.guides.legend]
    .some(config => Object.keys(config ?? {}).length > 0);
  const unambiguousAxes = axes?.coordinate.type !== "parallel" ||
    program.semanticSpec.layers.filter(candidate =>
      candidate.coordinate === layer.coordinate && candidate.encoding?.parallel !== undefined
    ).length === 1;
  if (!hasExisting && unambiguousAxes) {
    return program.createGuides({ axes: axes ?? false, grid: grid ?? false, legend: legendPlan?.args ?? false });
  }
  let next = program;
  for (const step of steps) next = next[step.op](step.args);
  if (legendPlan !== undefined) next = applyLegendCreationPlan(next, legendPlan);
  return next;
}
