import { action } from "../../../core/action.js";
import { validateOptionObject } from "../../../core/validation.js";
import { resolvePlotGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../theme/defaults.js";
import {
  requireParallelAxisLayer,
  resolveParallelAxisTarget,
  resolveParallelAxisValues
} from "./parallel/resolve.js";

const CREATE_OPTIONS = Object.freeze(["target", "coordinate"]);
const REMATERIALIZE_OPTIONS = Object.freeze(["target"]);

export const rematerializeParallelAxes = action(
  {
    op: "rematerializeParallelAxes",
    description: "Recompute concrete Parallel dimension axes."
  },
  function (args = {}) {
    validateOptionObject(
      args,
      REMATERIALIZE_OPTIONS,
      "rematerializeParallelAxes"
    );
    const target = resolveParallelAxisTarget(
      this,
      args.target ?? this.guideConfigs.axis?.parallel?.axes?.target
    );
    const { dimensions } = requireParallelAxisLayer(this, target);
    const { axes, bounds } = resolveParallelAxisValues(this, dimensions);
    const ticks = axes.flatMap(axis => axis.values.map((value, index) => ({
      x: axis.x,
      y: axis.y[index],
      value,
      text: axis.labels[index]
    })));
    let next = this
      .editGraphics({
        target: "parallelAxisLines",
        property: "length",
        value: axes.length
      })
      .editGraphics({
        target: "parallelAxisLines",
        property: "x1",
        value: axes.map(axis => axis.x)
      })
      .editGraphics({ target: "parallelAxisLines", property: "y1", value: bounds.y })
      .editGraphics({
        target: "parallelAxisLines",
        property: "x2",
        value: axes.map(axis => axis.x)
      })
      .editGraphics({
        target: "parallelAxisLines",
        property: "y2",
        value: bounds.y + bounds.height
      })
      .editGraphics({
        target: "parallelAxisLines",
        property: "stroke",
        value: DEFAULT_COLORS.axis
      })
      .editGraphics({
        target: "parallelAxisLines",
        property: "strokeWidth",
        value: 1.25
      })
      .editGraphics({
        target: "parallelAxisTicks",
        property: "length",
        value: ticks.length
      })
      .editGraphics({
        target: "parallelAxisTicks",
        property: "x1",
        value: ticks.map(tick => tick.x - 4)
      })
      .editGraphics({
        target: "parallelAxisTicks",
        property: "y1",
        value: ticks.map(tick => tick.y)
      })
      .editGraphics({
        target: "parallelAxisTicks",
        property: "x2",
        value: ticks.map(tick => tick.x + 4)
      })
      .editGraphics({
        target: "parallelAxisTicks",
        property: "y2",
        value: ticks.map(tick => tick.y)
      })
      .editGraphics({
        target: "parallelAxisTicks",
        property: "stroke",
        value: DEFAULT_COLORS.mutedText
      })
      .editGraphics({
        target: "parallelAxisTicks",
        property: "strokeWidth",
        value: 1
      })
      .editGraphics({
        target: "parallelAxisLabels",
        property: "length",
        value: ticks.length
      })
      .editGraphics({
        target: "parallelAxisLabels",
        property: "x",
        value: ticks.map(tick => tick.x - 9)
      })
      .editGraphics({
        target: "parallelAxisLabels",
        property: "y",
        value: ticks.map(tick => tick.y)
      })
      .editGraphics({
        target: "parallelAxisLabels",
        property: "text",
        value: ticks.map(tick => tick.text)
      })
      .editGraphics({ target: "parallelAxisLabels", property: "fill", value: DEFAULT_COLORS.axis })
      .editGraphics({ target: "parallelAxisLabels", property: "fontSize", value: 11 })
      .editGraphics({ target: "parallelAxisLabels", property: "fontFamily", value: DEFAULT_FONT_FAMILY })
      .editGraphics({ target: "parallelAxisLabels", property: "fontWeight", value: "normal" })
      .editGraphics({ target: "parallelAxisLabels", property: "textAlign", value: "right" })
      .editGraphics({ target: "parallelAxisLabels", property: "textBaseline", value: "middle" })
      .editGraphics({
        target: "parallelAxisTitles",
        property: "length",
        value: axes.length
      })
      .editGraphics({
        target: "parallelAxisTitles",
        property: "x",
        value: axes.map(axis => axis.x)
      })
      .editGraphics({
        target: "parallelAxisTitles",
        property: "y",
        value: bounds.y - 20
      })
      .editGraphics({
        target: "parallelAxisTitles",
        property: "text",
        value: axes.map(axis => axis.title)
      })
      .editGraphics({ target: "parallelAxisTitles", property: "fill", value: DEFAULT_COLORS.axisTitle })
      .editGraphics({ target: "parallelAxisTitles", property: "fontSize", value: 13 })
      .editGraphics({ target: "parallelAxisTitles", property: "fontFamily", value: DEFAULT_FONT_FAMILY })
      .editGraphics({ target: "parallelAxisTitles", property: "fontWeight", value: 600 })
      .editGraphics({ target: "parallelAxisTitles", property: "textAlign", value: "center" })
      .editGraphics({ target: "parallelAxisTitles", property: "textBaseline", value: "middle" });
    const scales = dimensions.map(dimension => dimension.scale);
    const storedScales = next.semanticSpec.guides.axis?.parallel?.scales;
    if (storedScales?.length !== scales.length ||
        scales.some((scale, index) => scale !== storedScales[index])) {
      next = next.editSemantic({ property: "guide.axis.parallel.scales", value: scales });
    }
    return next._withGuideConfig("parallel", "axes", { target, scales });
  }
);

export const createParallelAxes = action(
  {
    op: "createParallelAxes",
    description: "Create ordinary line and text graphics for Parallel dimensions."
  },
  function (args = {}) {
    validateOptionObject(args, CREATE_OPTIONS, "createParallelAxes");
    const target = resolveParallelAxisTarget(this, args.target);
    const { coordinate, dimensions } = requireParallelAxisLayer(this, target);
    if (args.coordinate !== undefined && args.coordinate !== coordinate.id) {
      throw new Error(
        `Parallel layer "${target}" uses coordinate "${coordinate.id}".`
      );
    }
    for (const id of [
      "parallelAxisLines", "parallelAxisTicks", "parallelAxisLabels",
      "parallelAxisTitles"
    ]) {
      if (this.graphicSpec.objects[id] !== undefined) {
        throw new Error("createParallelAxes requires missing Parallel axes.");
      }
    }
    const placement = resolvePlotGraphicPlacement(this);
    let next = this
      .editSemantic({
        property: "guide.axis.parallel.target",
        value: target
      })
      .editSemantic({
        property: "guide.axis.parallel.coordinate",
        value: coordinate.id
      })
      .editSemantic({
        property: "guide.axis.parallel.scales",
        value: dimensions.map(dimension => dimension.scale)
      })
      .createGraphics({ id: "parallelAxisLines", type: "line", length: 0, ...placement })
      .editGraphics({ target: "parallelAxisLines", property: "stroke", value: DEFAULT_COLORS.axis })
      .editGraphics({ target: "parallelAxisLines", property: "strokeWidth", value: 1.25 })
      .createGraphics({ id: "parallelAxisTicks", type: "line", length: 0, ...placement })
      .editGraphics({ target: "parallelAxisTicks", property: "stroke", value: DEFAULT_COLORS.mutedText })
      .editGraphics({ target: "parallelAxisTicks", property: "strokeWidth", value: 1 })
      .createGraphics({ id: "parallelAxisLabels", type: "text", length: 0, ...placement })
      .editGraphics({ target: "parallelAxisLabels", property: "fill", value: DEFAULT_COLORS.axis })
      .editGraphics({ target: "parallelAxisLabels", property: "fontSize", value: 11 })
      .editGraphics({ target: "parallelAxisLabels", property: "fontFamily", value: DEFAULT_FONT_FAMILY })
      .editGraphics({ target: "parallelAxisLabels", property: "fontWeight", value: "normal" })
      .editGraphics({ target: "parallelAxisLabels", property: "textAlign", value: "right" })
      .editGraphics({ target: "parallelAxisLabels", property: "textBaseline", value: "middle" })
      .createGraphics({ id: "parallelAxisTitles", type: "text", length: 0, ...placement })
      .editGraphics({ target: "parallelAxisTitles", property: "fill", value: DEFAULT_COLORS.axisTitle })
      .editGraphics({ target: "parallelAxisTitles", property: "fontSize", value: 13 })
      .editGraphics({ target: "parallelAxisTitles", property: "fontFamily", value: DEFAULT_FONT_FAMILY })
      .editGraphics({ target: "parallelAxisTitles", property: "fontWeight", value: 600 })
      .editGraphics({ target: "parallelAxisTitles", property: "textAlign", value: "center" })
      .editGraphics({ target: "parallelAxisTitles", property: "textBaseline", value: "middle" });
    return next.rematerializeParallelAxes({ target });
  }
);

export function registerParallelAxisActions(ProgramClass) {
  ProgramClass.prototype.createParallelAxes = createParallelAxes;
  ProgramClass.prototype.rematerializeParallelAxes = rematerializeParallelAxes;
}
