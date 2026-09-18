import { action } from "../../core/action.js";
import { TEXT_MARK_STYLE_OPTIONS } from "../../grammar/text.js";
import {
  applyFacadeGuides, normalizeAppearance, normalizeEncoding, normalizeFieldEncoding,
  normalizeGuides, positionArgs, resolveFacadeData, resolveFacadeId, targetArgs,
  validateFacadeOptions
} from "./shared.js";

const OPTIONS = Object.freeze(["id", "data", "coordinate", "x", "y", "text", "color", "style", "guides"]);
const STYLE_OPTIONS = Object.freeze(["missing", ...TEXT_MARK_STYLE_OPTIONS.filter(key => key !== "inheritColor")]);

export const createTextPlot = /* @__PURE__ */ action({
  op: "createTextPlot", description: "Create a Cartesian text plot from existing chart data."
}, function (args = {}) {
  validateFacadeOptions(args, OPTIONS, "createTextPlot");
  const id = resolveFacadeId(this, args.id, { defaultId: "textPlot", operation: "createTextPlot" });
  const data = resolveFacadeData(this, args.data, "createTextPlot");
  const x = normalizeFieldEncoding(args.x, "createTextPlot x");
  const y = normalizeFieldEncoding(args.y, "createTextPlot y");
  const text = normalizeEncoding(args.text, "createTextPlot text");
  if (text === undefined) throw new Error("createTextPlot requires text.");
  const color = normalizeEncoding(args.color, "createTextPlot color");
  const style = normalizeAppearance(args.style, STYLE_OPTIONS, "createTextPlot style");
  const guides = normalizeGuides(args.guides, "createTextPlot");
  const apply = program => {
    let next = program.createTextMark({ id, data, ...style })
      .encodeX(positionArgs(x, { target: id, coordinate: args.coordinate }))
      .encodeY(positionArgs(y, { target: id, coordinate: args.coordinate }))
      .encodeText(targetArgs(text, id));
    if (color !== undefined) next = next.encodeColor(targetArgs(color, id));
    return applyFacadeGuides(next, guides, id);
  };
  apply(this);
  return apply(this);
});
