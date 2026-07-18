import { action } from "../../core/action.js";
import { ChartProgram as CoreChartProgram } from "../../core/ChartProgram.js";
import { freezeOwned, isPlainObject } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateOptionObject } from "../../core/validation.js";
import {
  normalizeCompositionPadding,
  resolveCompositionLayout
} from "../../layout/composition.js";
import { resolveFacetLayout } from "../../layout/facets.js";
import { namespaceGraphicSnapshot } from "../../materialization/compositionSnapshot.js";
import { materializeCompositionGraphics } from
  "../../materialization/composition.js";
import { materializeFacetGraphics } from "../../materialization/facets.js";

const CONCAT_OPTIONS = Object.freeze([
  "id", "programs", "gap", "align", "padding"
]);
const LAYOUT_EDIT_OPTIONS = Object.freeze(["gap", "align", "padding"]);
const REPLACEMENT_OPTIONS = Object.freeze(["target", "program"]);

function normalizeChildEntry(entry, index) {
  const fallbackId = `view-${index + 1}`;
  if (entry instanceof CoreChartProgram) {
    return { id: fallbackId, program: entry };
  }
  if (!isPlainObject(entry)) {
    throw new TypeError(`Composition program ${index} must be a ChartProgram or wrapper.`);
  }
  validateOptionObject(entry, ["id", "program"], `Composition program ${index}`);
  if (!(entry.program instanceof CoreChartProgram)) {
    throw new TypeError(`Composition program ${index}.program must be a ChartProgram.`);
  }
  return {
    id: entry.id === undefined
      ? fallbackId
      : validateUserId(entry.id, "Composition child ID"),
    program: entry.program
  };
}

function childDescriptor({ id, program }) {
  if (program.actionStack.length !== 0) {
    throw new Error(`Composition child "${id}" has an unfinished action stack.`);
  }
  namespaceGraphicSnapshot(program.graphicSpec, { namespace: id });
  const canvasId = program.graphicSpec.order.find(
    graphicId => program.graphicSpec.objects[graphicId]?.type === "canvas"
  );
  const canvas = program.graphicSpec.objects[canvasId];
  const size = program.materializationConfigs.canvas?.size ?? {
    width: "explicit",
    height: "explicit"
  };
  return {
    id,
    width: canvas.properties.width,
    height: canvas.properties.height,
    widthMode: size.width,
    heightMode: size.height
  };
}

function normalizeCompositionInput(args, direction) {
  validateOptionObject(args, CONCAT_OPTIONS, direction === "horizontal" ? "hconcat" : "vconcat");
  if (!Array.isArray(args.programs) || args.programs.length < 2) {
    throw new TypeError("Composition requires at least two programs.");
  }
  const entries = args.programs.map(normalizeChildEntry);
  const ids = entries.map(entry => entry.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Composition child IDs must be unique.");
  }
  const id = args.id === undefined
    ? "composition"
    : validateUserId(args.id, "Composition ID");
  const layout = resolveCompositionLayout({
    direction,
    children: entries.map(childDescriptor),
    ...(Object.hasOwn(args, "gap") ? { gap: args.gap } : {}),
    ...(Object.hasOwn(args, "align") ? { align: args.align } : {}),
    ...(Object.hasOwn(args, "padding") ? { padding: args.padding } : {})
  });
  return {
    children: freezeOwned(Object.fromEntries(
      entries.map(entry => [entry.id, entry.program])
    )),
    compositionSpec: {
      id,
      direction,
      children: ids,
      gap: layout.gap,
      align: layout.align,
      padding: layout.padding
    }
  };
}

const useProgram = action(
  {
    op: "useProgram",
    description: "Retain one named child program in a composition.",
    scope: "composition"
  },
  function ({ id } = {}) {
    validateUserId(id, "Composition child ID");
    if (!Object.hasOwn(this.children, id)) {
      throw new Error(`Unknown composition child "${id}".`);
    }
    return this;
  }
);

const materializeComposition = action(
  {
    op: "materializeComposition",
    description: "Materialize retained child programs into one graphic tree.",
    scope: "composition"
  },
  function () {
    return this.compositionSpec.type === "facet"
      ? materializeFacetGraphics(this)
      : materializeCompositionGraphics(this);
  }
);

function concatAction(direction, op) {
  return action(
    {
      op,
      description: direction === "horizontal"
        ? "Compose complete programs horizontally."
        : "Compose complete programs vertically."
    },
    function (args = {}) {
      const state = normalizeCompositionInput(args, direction);
      let next = this._withCompositionState(state);
      for (const id of state.compositionSpec.children) {
        next = next.useProgram({ id });
      }
      return next.materializeComposition();
    }
  );
}

export const hconcatAction = concatAction("horizontal", "hconcat");
export const vconcatAction = concatAction("vertical", "vconcat");

const editCompositionLayout = action(
  {
    op: "editCompositionLayout",
    description: "Edit composition spacing and alignment.",
    scope: "composition"
  },
  function (args = {}) {
    validateOptionObject(args, LAYOUT_EDIT_OPTIONS, "editCompositionLayout");
    if (!LAYOUT_EDIT_OPTIONS.some(option => Object.hasOwn(args, option))) {
      throw new TypeError("editCompositionLayout requires at least one layout option.");
    }
    const current = this.compositionSpec;
    if (current.type === "facet") {
      const layout = resolveFacetLayout({
        children: current.children.map((id, index) => ({
          ...childDescriptor({ id, program: this.children[id] }),
          value: current.facet.values[index]
        })),
        columns: current.columns,
        gap: Object.hasOwn(args, "gap") ? args.gap : current.gap,
        align: Object.hasOwn(args, "align") ? args.align : current.align,
        padding: Object.hasOwn(args, "padding")
          ? normalizeCompositionPadding(args.padding, current.padding)
          : current.padding,
        sharedLegend: current.facet.guides.legend === "shared"
      });
      return this._withCompositionState({
        children: this.children,
        compositionSpec: {
          ...current,
          gap: layout.gap,
          align: layout.align,
          padding: layout.padding
        }
      }).materializeComposition();
    }
    const padding = Object.hasOwn(args, "padding")
      ? normalizeCompositionPadding(args.padding, current.padding)
      : current.padding;
    const layout = resolveCompositionLayout({
      direction: current.direction,
      children: current.children.map(id => childDescriptor({
        id,
        program: this.children[id]
      })),
      gap: Object.hasOwn(args, "gap") ? args.gap : current.gap,
      align: Object.hasOwn(args, "align") ? args.align : current.align,
      padding
    });
    return this._withCompositionState({
      children: this.children,
      compositionSpec: {
        ...current,
        gap: layout.gap,
        align: layout.align,
        padding: layout.padding
      }
    }).materializeComposition();
  }
);

const replaceCompositionChild = action(
  {
    op: "replaceCompositionChild",
    description: "Replace one composition child without changing its slot.",
    scope: "composition"
  },
  function (args = {}) {
    validateOptionObject(args, REPLACEMENT_OPTIONS, "replaceCompositionChild");
    if (this.compositionSpec.type === "facet") {
      throw new Error("replaceCompositionChild is not available on a facet composition.");
    }
    const target = validateUserId(args.target, "Composition child target");
    if (!Object.hasOwn(this.children, target)) {
      throw new Error(`Unknown composition child "${target}".`);
    }
    if (!(args.program instanceof CoreChartProgram)) {
      throw new TypeError("replaceCompositionChild program must be a ChartProgram.");
    }
    childDescriptor({ id: target, program: args.program });
    const children = freezeOwned({
      ...this.children,
      [target]: args.program
    });
    return this._withCompositionState({
      children,
      compositionSpec: this.compositionSpec
    })
      .useProgram({ id: target })
      .materializeComposition();
  }
);

export function registerCompositionActions(ProgramClass) {
  ProgramClass.prototype.useProgram = useProgram;
  ProgramClass.prototype.materializeComposition = materializeComposition;
  ProgramClass.prototype.editCompositionLayout = editCompositionLayout;
  ProgramClass.prototype.replaceCompositionChild = replaceCompositionChild;
}
