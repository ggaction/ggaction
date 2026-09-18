import { editGraphicProperties } from "../../../primitives/graphicProperties.js";
import { action } from "../../../../core/action.js";
import {
  activeConfig,
  categoricalLegendLabels,
  graphic,
  noOptions,
  resolveLayout
} from "./layout.js";
import { resolveCategoricalLegendPlacement } from "../lifecycle.js";

export const rematerializeLegendLabels = /* @__PURE__ */ action(
  { op: "rematerializeLegendLabels", description: "Rematerialize categorical legend labels." },
  function (args = {}) {
    noOptions(args, "rematerializeLegendLabels");
    const { config } = activeConfig(this, args.kind);
    const id = graphic(config, "Labels");
    if (this.graphicSpec.objects[id]?.type !== "text") {
      throw new Error("rematerializeLegendLabels requires existing legend labels.");
    }
    const layout = resolveLayout(this, config);
    return editGraphicProperties(editGraphicProperties(this, id, {
      length: categoricalLegendLabels(config).length,
      x: layout.labelX,
      y: layout.itemY
    })
      .editGraphics({
        target: id,
        property: "text",
        value: categoricalLegendLabels(config)
      }), id, {
      fill: config.labels.color,
      fontSize: config.labels.fontSize,
      fontFamily: config.labels.fontFamily,
      fontWeight: config.labels.fontWeight,
      textAlign: "left",
      textBaseline: "middle"
    });
  }
);

export const createLegendLabels = /* @__PURE__ */ action(
  { op: "createLegendLabels", description: "Create categorical legend labels." },
  function (args = {}) {
    noOptions(args, "createLegendLabels");
    const { config } = activeConfig(this, args.kind);
    const id = graphic(config, "Labels");
    if (this.graphicSpec.objects[id] !== undefined) {
      throw new Error("createLegendLabels requires missing legend labels.");
    }
    return this
      .createGraphics({
        id,
        type: "text",
        length: categoricalLegendLabels(config).length,
        ...resolveCategoricalLegendPlacement(this)
      })
      .rematerializeLegendLabels({ kind: config.kind });
  }
);

export const rematerializeLegendTitle = /* @__PURE__ */ action(
  { op: "rematerializeLegendTitle", description: "Rematerialize the categorical legend title." },
  function (args = {}) {
    noOptions(args, "rematerializeLegendTitle");
    const { config } = activeConfig(this, args.kind);
    const id = graphic(config, "Title");
    if (this.graphicSpec.objects[id]?.type !== "text") {
      throw new Error("rematerializeLegendTitle requires an existing legend title.");
    }
    const layout = resolveLayout(this, config);
    return editGraphicProperties(this, id, {
      x: layout.titleX,
      y: layout.titleY,
      text: config.title,
      fill: config.titleStyle.color,
      fontSize: config.titleStyle.fontSize,
      fontFamily: config.titleStyle.fontFamily,
      fontWeight: config.titleStyle.fontWeight
    })
      .editGraphics({
        target: id,
        property: "textAlign",
        value: ["top", "bottom"].includes(config.position) &&
          config.titlePosition === "top"
          ? "center"
          : "left"
      })
      .editGraphics({ target: id, property: "textBaseline", value: "middle" });
  }
);

export const createLegendTitle = /* @__PURE__ */ action(
  { op: "createLegendTitle", description: "Create the categorical legend title." },
  function (args = {}) {
    noOptions(args, "createLegendTitle");
    const { config } = activeConfig(this, args.kind);
    const id = graphic(config, "Title");
    if (this.graphicSpec.objects[id] !== undefined) {
      throw new Error("createLegendTitle requires a missing legend title.");
    }
    return this
      .createGraphics({
        id,
        type: "text",
        ...resolveCategoricalLegendPlacement(this)
      })
      .rematerializeLegendTitle({ kind: config.kind });
  }
);

export const rematerializeLegendBackground = /* @__PURE__ */ action(
  { op: "rematerializeLegendBackground", description: "Rematerialize the legend background." },
  function (args = {}) {
    noOptions(args, "rematerializeLegendBackground");
    const { config } = activeConfig(this, args.kind);
    if (config.border === false) {
      throw new Error("rematerializeLegendBackground requires border configuration.");
    }
    const id = graphic(config, "Background");
    if (this.graphicSpec.objects[id]?.type !== "rect") {
      throw new Error("rematerializeLegendBackground requires an existing background.");
    }
    const layout = resolveLayout(this, config).background;
    return editGraphicProperties(this, id, {
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height,
      fill: config.border.background,
      stroke: config.border.color,
      strokeWidth: config.border.lineWidth
    });
  }
);

export const createLegendBackground = /* @__PURE__ */ action(
  { op: "createLegendBackground", description: "Create the legend background rect." },
  function (args = {}) {
    noOptions(args, "createLegendBackground");
    const { config } = activeConfig(this, args.kind);
    const id = graphic(config, "Background");
    if (this.graphicSpec.objects[id] !== undefined) {
      throw new Error("createLegendBackground requires a missing background.");
    }
    return this
      .createGraphics({
        id,
        type: "rect",
        ...resolveCategoricalLegendPlacement(this)
      })
      .rematerializeLegendBackground({ kind: config.kind });
  }
);
