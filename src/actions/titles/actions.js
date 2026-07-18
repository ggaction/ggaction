import { action } from "../../core/action.js";
import { noOptions } from "../../core/validation.js";
import {
  normalizeTitleEditOptions,
  normalizeTitleOptions,
  requireTitleConfig,
  resolveTitleLayout
} from "./resolve.js";
import {
  preserveGraphicPlacement,
  resolveCanvasGraphicPlacement
} from "../../materialization/graphicHierarchy.js";

function assertTitleScope(program, operation) {
  if (
    program.compositionSpec !== undefined &&
    program.compositionSpec.type !== "facet"
  ) {
    throw new Error(`${operation} is not available on this composition ChartProgram.`);
  }
}

function hasRotation(graphic) {
  const properties = graphic.items?.map(child => child.properties) ??
    [graphic.properties];
  return properties.some(item => Object.hasOwn(item, "rotation"));
}

function ensureTextShape(program, id, component) {
  const graphic = program.graphicSpec.objects[id];
  if (graphic?.type !== "text") {
    throw new Error(`${id} requires an existing text graphic.`);
  }
  const collection = graphic.items !== undefined;
  const needsCollection = component.lines.length > 1;
  const rotationMismatch = hasRotation(graphic) !== component.explicitRotation;
  if ((collection && !needsCollection) || rotationMismatch) {
    const placement = preserveGraphicPlacement(program, id);
    return program
      .editGraphics({ target: id, remove: true })
      .createGraphics({
        id,
        type: "text",
        ...(needsCollection ? { length: component.lines.length } : {}),
        ...placement
      });
  }
  if (!collection && needsCollection) {
    return program.editGraphics({
      target: id,
      property: "length",
      value: component.lines.length
    });
  }
  if (collection && graphic.items.length !== component.lines.length) {
    return program.editGraphics({
      target: id,
      property: "length",
      value: component.lines.length
    });
  }
  return program;
}

function distributed(value, count) {
  return count === 1 && Array.isArray(value) ? value[0] : value;
}

function editTextGraphic(program, id, component, style) {
  const count = component.lines.length;
  let next = ensureTextShape(program, id, component)
    .editGraphics({ target: id, property: "x", value: distributed(component.x, count) })
    .editGraphics({ target: id, property: "y", value: distributed(component.y, count) })
    .editGraphics({
      target: id,
      property: "text",
      value: distributed(component.lines, count)
    })
    .editGraphics({ target: id, property: "fill", value: style.color })
    .editGraphics({ target: id, property: "fontSize", value: style.fontSize })
    .editGraphics({ target: id, property: "fontFamily", value: style.fontFamily })
    .editGraphics({ target: id, property: "fontWeight", value: style.fontWeight })
    .editGraphics({ target: id, property: "textAlign", value: component.textAlign })
    .editGraphics({ target: id, property: "textBaseline", value: "middle" });
  if (component.explicitRotation) {
    next = next.editGraphics({
      target: id,
      property: "rotation",
      value: component.rotation
    });
  }
  return next;
}

function createTextGraphic(program, id, component) {
  return program.createGraphics({
    id,
    type: "text",
    ...(component.lines.length > 1 ? { length: component.lines.length } : {}),
    ...resolveCanvasGraphicPlacement(program)
  });
}

export const editTitleText = action(
  { op: "editTitleText", description: "Rematerialize chart title text." },
  function (args = {}) {
    noOptions(args, "editTitleText");
    const config = requireTitleConfig(this);
    const layout = resolveTitleLayout(this, config);
    return editTextGraphic(
      this,
      "chartTitle",
      layout.title,
      config.titleStyle
    );
  }
);

export const createTitleText = action(
  { op: "createTitleText", description: "Create chart title text." },
  function (args = {}) {
    noOptions(args, "createTitleText");
    const config = requireTitleConfig(this);
    if (this.graphicSpec.objects.chartTitle !== undefined) {
      throw new Error("createTitleText requires a missing chart title graphic.");
    }
    const layout = resolveTitleLayout(this, config);
    return createTextGraphic(this, "chartTitle", layout.title)
      .editTitleText();
  }
);

export const editSubtitleText = action(
  { op: "editSubtitleText", description: "Rematerialize chart subtitle text." },
  function (args = {}) {
    noOptions(args, "editSubtitleText");
    const config = requireTitleConfig(this);
    const layout = resolveTitleLayout(this, config);
    if (layout.subtitle === undefined) {
      throw new Error("editSubtitleText requires semantic subtitle text.");
    }
    return editTextGraphic(
      this,
      "chartSubtitle",
      layout.subtitle,
      config.subtitleStyle
    );
  }
);

export const createSubtitleText = action(
  { op: "createSubtitleText", description: "Create chart subtitle text." },
  function (args = {}) {
    noOptions(args, "createSubtitleText");
    const config = requireTitleConfig(this);
    if (this.graphicSpec.objects.chartSubtitle !== undefined) {
      throw new Error("createSubtitleText requires a missing chart subtitle graphic.");
    }
    const layout = resolveTitleLayout(this, config);
    if (layout.subtitle === undefined) {
      throw new Error("createSubtitleText requires semantic subtitle text.");
    }
    return createTextGraphic(this, "chartSubtitle", layout.subtitle)
      .editSubtitleText();
  }
);

export const rematerializeTitle = action(
  { op: "rematerializeTitle", description: "Rematerialize chart title graphics." },
  function (args = {}) {
    noOptions(args, "rematerializeTitle");
    requireTitleConfig(this);
    if (this.graphicSpec.objects.chartTitle?.type !== "text") {
      throw new Error("rematerializeTitle requires an existing chart title graphic.");
    }
    let next = this.editTitleText();
    const hasSubtitle = next.semanticSpec.title.subtitle !== undefined;
    const graphic = next.graphicSpec.objects.chartSubtitle;
    if (hasSubtitle && graphic === undefined) {
      next = next.createSubtitleText();
    } else if (hasSubtitle) {
      next = next.editSubtitleText();
    } else if (graphic !== undefined) {
      next = next.editGraphics({ target: "chartSubtitle", remove: true });
    }
    return next;
  }
);

export const createTitle = action(
  {
    op: "createTitle",
    description: "Create a chart title and optional subtitle.",
    scope: "any"
  },
  function (args = {}) {
    assertTitleScope(this, "createTitle");
    const options = normalizeTitleOptions(args);
    if (Object.keys(this.semanticSpec.title).length > 0) {
      throw new Error("createTitle requires missing semantic title state.");
    }
    if (
      this.graphicSpec.objects.chartTitle !== undefined ||
      this.graphicSpec.objects.chartSubtitle !== undefined
    ) {
      throw new Error("createTitle requires missing chart title graphics.");
    }
    const { text, subtitle, ...config } = options;
    let next = this.editSemantic({ property: "title.text", value: text });
    if (subtitle !== undefined) {
      next = next.editSemantic({ property: "title.subtitle", value: subtitle });
    }
    next = next._withTitleConfig(config);
    if (next.compositionSpec?.type === "facet") {
      return next.materializeComposition();
    }
    resolveTitleLayout(next, config);
    next = next.createTitleText();
    if (subtitle !== undefined) next = next.createSubtitleText();
    return next;
  }
);

export const editTitle = action(
  {
    op: "editTitle",
    description: "Edit one stable chart title resource.",
    scope: "any"
  },
  function (args = {}) {
    assertTitleScope(this, "editTitle");
    if (this.semanticSpec.title.text === undefined) {
      throw new Error("editTitle requires an existing chart title.");
    }
    const previous = requireTitleConfig(this);
    const normalized = normalizeTitleEditOptions(
      args,
      previous,
      this.semanticSpec.title
    );
    let next = this;
    if (args.text !== undefined) {
      next = next.editSemantic({ property: "title.text", value: normalized.text });
    }
    if (args.subtitle === false) {
      next = next.editSemantic({ property: "title.subtitle", remove: true });
    } else if (args.subtitle !== undefined) {
      next = next.editSemantic({
        property: "title.subtitle",
        value: normalized.subtitle
      });
    }
    next = next._withTitleConfig(normalized.config);
    if (next.compositionSpec?.type === "facet") {
      return next.materializeComposition();
    }
    resolveTitleLayout(next, normalized.config);
    return next.rematerializeTitle();
  }
);

export const removeTitle = action(
  {
    op: "removeTitle",
    description: "Remove the complete chart title resource.",
    scope: "any"
  },
  function (args = {}) {
    assertTitleScope(this, "removeTitle");
    noOptions(args, "removeTitle");
    if (
      this.semanticSpec.title.text === undefined &&
      this.titleConfig === undefined &&
      this.graphicSpec.objects.chartTitle === undefined &&
      this.graphicSpec.objects.chartSubtitle === undefined
    ) {
      throw new Error("removeTitle requires an existing chart title.");
    }
    let next = this;
    if (next.semanticSpec.title.subtitle !== undefined) {
      next = next.editSemantic({ property: "title.subtitle", remove: true });
    }
    if (next.semanticSpec.title.text !== undefined) {
      next = next.editSemantic({ property: "title.text", remove: true });
    }
    for (const id of ["chartTitle", "chartSubtitle"]) {
      if (next.graphicSpec.objects[id] !== undefined) {
        next = next.editGraphics({ target: id, remove: true });
      }
    }
    next = next._withoutMaterializationConfig(["title"]);
    return next.compositionSpec?.type === "facet"
      ? next.materializeComposition()
      : next;
  }
);
