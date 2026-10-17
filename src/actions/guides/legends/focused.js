import { action } from "../../../core/action.js";
import { validateOptionObject } from "../../../core/validation.js";

function makeFocusedLegendEdit({ name, options, map }) {
  return action(
    {
      op: name, scope: "any",
      description: `Edit one focused legend component through editLegend.`
    },
    function (args = {}) {
      validateOptionObject(args, ["target", "channel", ...options], name);
      if (!options.some(option => Object.hasOwn(args, option))) {
        throw new Error(`${name} requires at least one component change.`);
      }
      return this.editLegend(map(args));
    }
  );
}

const editLegendLayout = /* @__PURE__ */ makeFocusedLegendEdit({
  name: "editLegendLayout",
  options: [
    "position", "layout", "align", "direction", "columns", "offset", "blockLayout", "at",
    "titlePosition", "itemGap"
  ],
  map: args => args
});

const editLegendLabels = /* @__PURE__ */ makeFocusedLegendEdit({
  name: "editLegendLabels",
  options: ["offset", "color", "fontSize", "fontFamily", "fontWeight", "format"],
  map: ({ target, channel, ...labels }) => ({ target, ...(channel === undefined ? {} : { channel }), labels })
});

const editLegendTitle = /* @__PURE__ */ makeFocusedLegendEdit({
  name: "editLegendTitle",
  options: ["title", "color", "fontSize", "fontFamily", "fontWeight", "align"],
  map: ({ target, channel, title, ...titleStyle }) => ({
    target,
    ...(channel === undefined ? {} : { channel }),
    ...(title === undefined ? {} : { title }),
    ...(Object.keys(titleStyle).length === 0 ? {} : { titleStyle })
  })
});

const editLegendSymbols = /* @__PURE__ */ makeFocusedLegendEdit({
  name: "editLegendSymbols",
  options: ["symbol", "count", "gradient", "clipHeight"],
  map: args => args
});

const editLegendBorder = /* @__PURE__ */ makeFocusedLegendEdit({
  name: "editLegendBorder",
  options: ["border"],
  map: args => args
});

export function registerFocusedLegendActions(ProgramClass) {
  ProgramClass.prototype.editLegendLayout = editLegendLayout;
  ProgramClass.prototype.editLegendLabels = editLegendLabels;
  ProgramClass.prototype.editLegendTitle = editLegendTitle;
  ProgramClass.prototype.editLegendSymbols = editLegendSymbols;
  ProgramClass.prototype.editLegendBorder = editLegendBorder;
}
