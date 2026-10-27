import { cartesianAxisOwners, axisGraphicIds, PARALLEL_AXIS_GRAPHICS } from "../selectors/axes.js";
import { gridNames } from "../selectors/grids.js";
import { resolvePlotDrawOrder } from "../layout/plotDrawOrder.js";

export function hasPlotUnderlays(program) {
  return program.compositionSpec === undefined && (
    program.materializationConfigs.canvas?.plotBorder?.underlay === true ||
    cartesianAxisOwners(program).some(owner => owner.config?.frame?.underlay === true)
  );
}

export function plotDrawOrderResources(program) {
  const axes = cartesianAxisOwners(program).map(owner => ({
    ids: axisGraphicIds(owner.channel, owner.id), underlay: owner.config?.frame?.underlay === true
  }));
  for (const channel of ["theta", "radius"]) if (program.semanticSpec.guides.axis?.[channel] !== undefined) {
    axes.push({ ids: axisGraphicIds(channel), underlay: false });
  }
  if (program.semanticSpec.guides.axis?.parallel !== undefined) axes.push({ ids: Object.values(PARALLEL_AXIS_GRAPHICS), underlay: false });
  return {
    children: program.graphicSpec.objects["plot-main"]?.children ?? [],
    grids: ["horizontal", "vertical"].flatMap((direction, index) => {
      const config = program.guideConfigs.grid?.[direction];
      return config === undefined ? [] : [{ id: gridNames(direction).graphic, zIndex: config.zIndex, index }];
    }),
    border: program.materializationConfigs.canvas?.plotBorder === undefined ? undefined : {
      id: "plotBorder", underlay: program.materializationConfigs.canvas.plotBorder.underlay === true
    }, axes
  };
}

export function resolveProgramPlotDrawOrder(program) {
  return resolvePlotDrawOrder(plotDrawOrderResources(program));
}

export function firstOverlayGuide(program) {
  const { children, grids, border, axes } = plotDrawOrderResources(program);
  const overlay = new Set([
    ...grids.filter(grid => grid.zIndex > 0).map(grid => grid.id),
    ...(border?.underlay === false ? [border.id] : []),
    ...axes.filter(axis => !axis.underlay).flatMap(axis => axis.ids)
  ]);
  return children.find(id => overlay.has(id));
}
