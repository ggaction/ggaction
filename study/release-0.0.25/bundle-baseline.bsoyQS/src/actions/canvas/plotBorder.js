import { action } from "../../core/action.js";
import { noOptions } from "../../core/validation.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import { resolvePlotGraphicPlacement } from "../../materialization/graphicHierarchy.js";
import { hasPlotUnderlays } from "../../materialization/plotDrawOrder.js";

export const rematerializePlotBorder = /* @__PURE__ */ action(
  { op: "rematerializePlotBorder", description: "Materialize the optional inset plot border." },
  function (args = {}) {
    noOptions(args, "rematerializePlotBorder");
    const border = this.materializationConfigs.canvas?.plotBorder;
    if (border === undefined) return this;
    const plot = resolveGraphicBounds(this);
    const half = border.lineWidth / 2;
    const axis = this.graphicSpec.objects["plot-main"].children?.find(id =>
      /^(?:(?:x|y|theta|radial)Axis(?:Line|Ticks|Labels|Title)|parallelAxis(?:Lines|Ticks|Labels|Titles))$/.test(id));
    let next = this.graphicSpec.objects.plotBorder === undefined
      ? this.createGraphics({ id: "plotBorder", type: "rect",
        ...resolvePlotGraphicPlacement(this, axis === undefined ? {} : { before: axis }) })
      : this;
    const properties = { x: plot.x + half, y: plot.y + half,
      width: plot.width - border.lineWidth, height: plot.height - border.lineWidth,
      fill: "transparent", stroke: border.color, strokeWidth: border.lineWidth };
    for (const [property, value] of Object.entries(properties)) {
      next = next.editGraphics({ target: "plotBorder", property, value });
    }
    return hasPlotUnderlays(next) ? next.rematerializePlotDrawOrder() : next;
  }
);
