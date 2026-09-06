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
const LAYOUT_EDIT_OPTIONS = Object.freeze([
  "columns", "gap", "align", "padding"
]);
const REPLACEMENT_OPTIONS = Object.freeze(["target", "program"]);
const INSERTION_OPTIONS = Object.freeze(["id", "program", "before", "after"]);
const REMOVAL_OPTIONS = Object.freeze(["target"]);
const REORDER_OPTIONS = Object.freeze(["order"]);

function option(args, name, fallback) {
  return Object.hasOwn(args, name) ? args[name] : fallback;
}

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
  validateOptionObject(
    args,
    CONCAT_OPTIONS,
    direction === "horizontal" ? "hconcat" : "vconcat"
  );
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

export function applyCompositionState(program, state, tracedChildren = []) {
  let next = program._withCompositionState(state);
  for (const id of tracedChildren) next = next.useProgram({ id });
  return next.materializeComposition();
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
      return applyCompositionState(this, state, state.compositionSpec.children);
    }
  );
}

export const hconcatAction = concatAction("horizontal", "hconcat");
export const vconcatAction = concatAction("vertical", "vconcat");

const editCompositionLayout = action(
  {
    op: "editCompositionLayout",
    description: "Edit composition layout.",
    scope: "composition"
  },
  function (args = {}) {
    validateOptionObject(args, LAYOUT_EDIT_OPTIONS, "editCompositionLayout");
    if (!LAYOUT_EDIT_OPTIONS.some(option => Object.hasOwn(args, option))) {
      throw new TypeError("editCompositionLayout requires at least one layout option.");
    }
    const current = this.compositionSpec;
    if (current.type !== "facet" && Object.hasOwn(args, "columns")) {
      throw new Error(
        "editCompositionLayout columns is available only on a facet composition."
      );
    }
    const padding = Object.hasOwn(args, "padding")
      ? normalizeCompositionPadding(args.padding, current.padding)
      : current.padding;
    let layout;
    if (current.type === "facet") {
      const gridCells = new Map(
        (current.facet.grid?.cells ?? []).map(cell => [cell.id, cell])
      );
      layout = resolveFacetLayout({
        children: current.children.map((id, index) => ({
          ...childDescriptor({ id, program: this.children[id] }),
          value: current.facet.values[index],
          ...(gridCells.has(id) ? {
            row: gridCells.get(id).row,
            column: gridCells.get(id).column
          } : {})
        })),
        columns: option(args, "columns", current.columns),
        gap: option(args, "gap", current.gap),
        align: option(args, "align", current.align),
        padding,
        sharedLegend: current.facet.guides.legend === "shared"
      });
    } else {
      layout = resolveCompositionLayout({
        direction: current.direction,
        children: current.children.map(id => childDescriptor({
          id,
          program: this.children[id]
        })),
        gap: option(args, "gap", current.gap),
        align: option(args, "align", current.align),
        padding
      });
    }
    return applyCompositionState(this, {
      children: this.children,
      compositionSpec: {
        ...current,
        ...(current.type === "facet" ? { columns: layout.columns } : {}),
        gap: layout.gap,
        align: layout.align,
        padding: layout.padding
      }
    });
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
    this._assertCompositionProgram("replaceCompositionChild");
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
    return applyCompositionState(this, {
      children,
      compositionSpec: this.compositionSpec
    }, [target]);
  }
);

function requireConcat(program, operation) {
  program._assertCompositionProgram(operation);
  if (program.compositionSpec.type === "facet") {
    throw new Error(`${operation} is not available on a facet composition.`);
  }
}

const insertCompositionChild = action(
  {
    op: "insertCompositionChild",
    description: "Insert one named child into a concat composition.",
    scope: "composition"
  },
  function (args = {}) {
    validateOptionObject(args, INSERTION_OPTIONS, "insertCompositionChild");
    requireConcat(this, "insertCompositionChild");
    const id = validateUserId(args.id, "Composition child ID");
    if (Object.hasOwn(this.children, id)) {
      throw new Error(`Composition child "${id}" already exists.`);
    }
    if (!(args.program instanceof CoreChartProgram)) {
      throw new TypeError("insertCompositionChild program must be a ChartProgram.");
    }
    if (args.before !== undefined && args.after !== undefined) {
      throw new Error("insertCompositionChild before and after are mutually exclusive.");
    }
    childDescriptor({ id, program: args.program });
    const order = [...this.compositionSpec.children];
    if (args.before !== undefined || args.after !== undefined) {
      const property = args.before !== undefined ? "before" : "after";
      const anchor = validateUserId(args[property], `Composition child ${property}`);
      const index = order.indexOf(anchor);
      if (index < 0) throw new Error(`Unknown composition child "${anchor}".`);
      order.splice(index + (property === "after" ? 1 : 0), 0, id);
    } else {
      order.push(id);
    }
    return applyCompositionState(this, {
      children: freezeOwned({ ...this.children, [id]: args.program }),
      compositionSpec: { ...this.compositionSpec, children: order }
    }, [id]);
  }
);

const removeCompositionChild = action(
  {
    op: "removeCompositionChild",
    description: "Remove one named child from a concat composition.",
    scope: "composition"
  },
  function (args = {}) {
    validateOptionObject(args, REMOVAL_OPTIONS, "removeCompositionChild");
    requireConcat(this, "removeCompositionChild");
    const target = validateUserId(args.target, "Composition child target");
    if (!Object.hasOwn(this.children, target)) {
      throw new Error(`Unknown composition child "${target}".`);
    }
    if (this.compositionSpec.children.length === 1) {
      throw new Error("removeCompositionChild must leave at least one child.");
    }
    const { [target]: _removed, ...remaining } = this.children;
    void _removed;
    return applyCompositionState(this, {
      children: freezeOwned(remaining),
      compositionSpec: {
        ...this.compositionSpec,
        children: this.compositionSpec.children.filter(id => id !== target)
      }
    });
  }
);

const reorderCompositionChildren = action(
  {
    op: "reorderCompositionChildren",
    description: "Reorder every named child in a concat composition.",
    scope: "composition"
  },
  function (args = {}) {
    validateOptionObject(args, REORDER_OPTIONS, "reorderCompositionChildren");
    requireConcat(this, "reorderCompositionChildren");
    if (!Array.isArray(args.order) || args.order.length === 0 ||
        args.order.some(id => typeof id !== "string" || id.length === 0)) {
      throw new TypeError("reorderCompositionChildren order must be a non-empty child ID array.");
    }
    if (new Set(args.order).size !== args.order.length) {
      throw new Error("reorderCompositionChildren order must not contain duplicates.");
    }
    const current = this.compositionSpec.children;
    if (args.order.length !== current.length ||
        args.order.some(id => !Object.hasOwn(this.children, id))) {
      throw new Error("reorderCompositionChildren order must contain every current child exactly once.");
    }
    if (args.order.every((id, index) => id === current[index])) {
      throw new Error("reorderCompositionChildren requires an actual order change.");
    }
    return applyCompositionState(this, {
      children: this.children,
      compositionSpec: { ...this.compositionSpec, children: [...args.order] }
    });
  }
);

export function registerCompositionActions(ProgramClass) {
  ProgramClass.prototype.useProgram = useProgram;
  ProgramClass.prototype.materializeComposition = materializeComposition;
  ProgramClass.prototype.editCompositionLayout = editCompositionLayout;
  ProgramClass.prototype.replaceCompositionChild = replaceCompositionChild;
  ProgramClass.prototype.insertCompositionChild = insertCompositionChild;
  ProgramClass.prototype.removeCompositionChild = removeCompositionChild;
  ProgramClass.prototype.reorderCompositionChildren = reorderCompositionChildren;
}
