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
  return (graphic.items ?? [graphic]).some(
    item => Object.hasOwn(item.properties, "rotation")
  );
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
  if (needsCollection && graphic.items?.length !== component.lines.length) {
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
  let next = ensureTextShape(program, id, component);
  for (const [property, value] of Object.entries({
    x: distributed(component.x, count),
    y: distributed(component.y, count),
    text: distributed(component.lines, count),
    fill: style.color,
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    textAlign: component.textAlign,
    textBaseline: "middle"
  })) {
    next = next.editGraphics({ target: id, property, value });
  }
  if (component.explicitRotation) {
    next = next.editGraphics({
      target: id,
      property: "rotation",
      value: component.rotation
    });
  }
  return next;
}

function titleTextAction(kind, create) {
  const suffix = `${kind[0].toUpperCase()}${kind.slice(1)}Text`;
  const op = `${create ? "create" : "edit"}${suffix}`;
  const id = `chart${kind[0].toUpperCase()}${kind.slice(1)}`;
  return action({
    op,
    description: `${create ? "Create" : "Rematerialize"} chart ${kind} text.`
  }, function (args = {}) {
    noOptions(args, op);
    const config = requireTitleConfig(this);
    if (create && this.graphicSpec.objects[id] !== undefined) {
      throw new Error(`${op} requires a missing chart ${kind} graphic.`);
    }
    const component = resolveTitleLayout(this, config)[kind];
    if (component === undefined) {
      throw new Error(`${op} requires semantic subtitle text.`);
    }
    if (!create) {
      return editTextGraphic(this, id, component, config[`${kind}Style`]);
    }
    return this.createGraphics({
      id,
      type: "text",
      ...(component.lines.length > 1 ? { length: component.lines.length } : {}),
      ...resolveCanvasGraphicPlacement(this)
    })[`edit${suffix}`]();
  });
}

export const editTitleText = titleTextAction("title", false);
export const createTitleText = titleTextAction("title", true);
export const editSubtitleText = titleTextAction("subtitle", false);
export const createSubtitleText = titleTextAction("subtitle", true);

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
