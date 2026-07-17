import { action } from "../../../core/action.js";
import { validateOptionObject } from "../../../core/validation.js";

function makeFocusedLegendEdit({ name, options, map }) {
  return action(
    {
      op: name,
      description: `Edit one focused legend component through editLegend.`
    },
    function (args = {}) {
      validateOptionObject(args, ["target", ...options], name);
      if (!options.some(option => Object.hasOwn(args, option))) {
        throw new Error(`${name} requires at least one component change.`);
      }
      return this.editLegend(map(args));
    }
  );
}

const editLegendLayout = makeFocusedLegendEdit({
  name: "editLegendLayout",
  options: [
    "position", "align", "direction", "columns", "offset",
    "titlePosition", "itemGap"
  ],
  map: args => args
});

const editLegendLabels = makeFocusedLegendEdit({
  name: "editLegendLabels",
  options: ["color", "fontSize", "fontFamily", "fontWeight"],
  map: ({ target, ...labels }) => ({ target, labels })
});

const editLegendTitle = makeFocusedLegendEdit({
  name: "editLegendTitle",
  options: ["title", "color", "fontSize", "fontFamily", "fontWeight"],
  map: ({ target, title, ...titleStyle }) => ({
    target,
    ...(title === undefined ? {} : { title }),
    ...(Object.keys(titleStyle).length === 0 ? {} : { titleStyle })
  })
});

const editLegendSymbols = makeFocusedLegendEdit({
  name: "editLegendSymbols",
  options: ["symbol", "count", "gradient"],
  map: args => args
});

const editLegendBorder = makeFocusedLegendEdit({
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
