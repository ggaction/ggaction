import { action } from "../../../../core/action.js";
import { activeConfig, graphic, noOptions, resolveLayout } from "./layout.js";
import { resolveLegendGraphicPlacement } from
  "../../../../materialization/graphicHierarchy.js";

export const rematerializeLegendLabels = action(
  { op: "rematerializeLegendLabels", description: "Rematerialize categorical legend labels." },
  function (args = {}) {
    noOptions(args, "rematerializeLegendLabels");
    const { config } = activeConfig(this);
    const id = graphic(config, "Labels");
    if (this.graphicSpec.objects[id]?.type !== "text") {
      throw new Error("rematerializeLegendLabels requires existing legend labels.");
    }
    const layout = resolveLayout(this, config);
    return this
      .editGraphics({ target: id, property: "length", value: config.domain.length })
      .editGraphics({ target: id, property: "x", value: layout.labelX })
      .editGraphics({ target: id, property: "y", value: layout.itemY })
      .editGraphics({ target: id, property: "text", value: config.domain.map(String) })
      .editGraphics({ target: id, property: "fill", value: config.labels.color })
      .editGraphics({ target: id, property: "fontSize", value: config.labels.fontSize })
      .editGraphics({ target: id, property: "fontFamily", value: config.labels.fontFamily })
      .editGraphics({ target: id, property: "fontWeight", value: config.labels.fontWeight })
      .editGraphics({ target: id, property: "textAlign", value: "left" })
      .editGraphics({ target: id, property: "textBaseline", value: "middle" });
  }
);

export const createLegendLabels = action(
  { op: "createLegendLabels", description: "Create categorical legend labels." },
  function (args = {}) {
    noOptions(args, "createLegendLabels");
    const { config } = activeConfig(this);
    const id = graphic(config, "Labels");
    if (this.graphicSpec.objects[id] !== undefined) {
      throw new Error("createLegendLabels requires missing legend labels.");
    }
    return this
      .createGraphics({
        id,
        type: "text",
        length: config.domain.length,
        ...resolveLegendGraphicPlacement(this)
      })
      .rematerializeLegendLabels();
  }
);

export const rematerializeLegendTitle = action(
  { op: "rematerializeLegendTitle", description: "Rematerialize the categorical legend title." },
  function (args = {}) {
    noOptions(args, "rematerializeLegendTitle");
    const { config } = activeConfig(this);
    const id = graphic(config, "Title");
    if (this.graphicSpec.objects[id]?.type !== "text") {
      throw new Error("rematerializeLegendTitle requires an existing legend title.");
    }
    const layout = resolveLayout(this, config);
    return this
      .editGraphics({ target: id, property: "x", value: layout.titleX })
      .editGraphics({ target: id, property: "y", value: layout.titleY })
      .editGraphics({ target: id, property: "text", value: config.title })
      .editGraphics({ target: id, property: "fill", value: config.titleStyle.color })
      .editGraphics({ target: id, property: "fontSize", value: config.titleStyle.fontSize })
      .editGraphics({ target: id, property: "fontFamily", value: config.titleStyle.fontFamily })
      .editGraphics({ target: id, property: "fontWeight", value: config.titleStyle.fontWeight })
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

export const createLegendTitle = action(
  { op: "createLegendTitle", description: "Create the categorical legend title." },
  function (args = {}) {
    noOptions(args, "createLegendTitle");
    const { config } = activeConfig(this);
    const id = graphic(config, "Title");
    if (this.graphicSpec.objects[id] !== undefined) {
      throw new Error("createLegendTitle requires a missing legend title.");
    }
    return this
      .createGraphics({
        id,
        type: "text",
        ...resolveLegendGraphicPlacement(this)
      })
      .rematerializeLegendTitle();
  }
);

export const rematerializeLegendBackground = action(
  { op: "rematerializeLegendBackground", description: "Rematerialize the legend background." },
  function (args = {}) {
    noOptions(args, "rematerializeLegendBackground");
    const { config } = activeConfig(this);
    if (config.border === false) {
      throw new Error("rematerializeLegendBackground requires border configuration.");
    }
    const id = graphic(config, "Background");
    if (this.graphicSpec.objects[id]?.type !== "rect") {
      throw new Error("rematerializeLegendBackground requires an existing background.");
    }
    const layout = resolveLayout(this, config).background;
    return this
      .editGraphics({ target: id, property: "x", value: layout.x })
      .editGraphics({ target: id, property: "y", value: layout.y })
      .editGraphics({ target: id, property: "width", value: layout.width })
      .editGraphics({ target: id, property: "height", value: layout.height })
      .editGraphics({ target: id, property: "fill", value: config.border.background })
      .editGraphics({ target: id, property: "stroke", value: config.border.color })
      .editGraphics({ target: id, property: "strokeWidth", value: config.border.lineWidth });
  }
);

export const createLegendBackground = action(
  { op: "createLegendBackground", description: "Create the legend background rect." },
  function (args = {}) {
    noOptions(args, "createLegendBackground");
    const { config } = activeConfig(this);
    const id = graphic(config, "Background");
    if (this.graphicSpec.objects[id] !== undefined) {
      throw new Error("createLegendBackground requires a missing background.");
    }
    return this
      .createGraphics({
        id,
        type: "rect",
        ...resolveLegendGraphicPlacement(this)
      })
      .rematerializeLegendBackground();
  }
);
