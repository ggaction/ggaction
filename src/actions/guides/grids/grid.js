import { action } from "../../../core/action.js";
import { isPlainObject } from "../../../core/immutable.js";
import { validateKeys } from "../../../core/validation.js";
import {
  gridNames,
  editGridConfig,
  refreshGridConfig,
  resolveGridConfig,
  resolveGridGeometry,
  resolveGridResources,
  validateGridCreateArgs,
  validateGridEditArgs
} from "./resolve.js";

const AGGREGATE_OPTIONS = Object.freeze(["horizontal", "vertical"]);

function makeRematerialize(direction) {
  const operation = gridNames(direction);
  return action(
    {
      op: operation.rematerialize,
      description: `Recompute concrete ${direction} grid lines.`
    },
    function (args = {}) {
      if (!isPlainObject(args) || Object.keys(args).length !== 0) {
        throw new TypeError(`${operation.rematerialize} does not accept options.`);
      }
      const storedConfig = this.guideConfigs.grid?.[direction];
      const semantic = this.semanticSpec.guides.grid?.[direction];
      if (
        storedConfig === undefined ||
        semantic?.scale !== storedConfig.scale ||
        semantic.coordinate !== storedConfig.coordinate ||
        this.graphicSpec.objects[operation.graphic]?.type !== "line"
      ) {
        throw new Error(
          `${operation.rematerialize} requires an existing ${direction} grid.`
        );
      }

      const config = refreshGridConfig(this, storedConfig);
      const geometry = resolveGridGeometry(this, config);
      let next = this._withGridConfig(direction, config).editGraphics({
        target: operation.graphic,
        property: "length",
        value: geometry.values.length
      });
      for (const property of ["x1", "y1", "x2", "y2"]) {
        next = next.editGraphics({
          target: operation.graphic,
          property,
          value: geometry[property]
        });
      }
      return next
        .editGraphics({
          target: operation.graphic,
          property: "stroke",
          value: config.color
        })
        .editGraphics({
          target: operation.graphic,
          property: "strokeWidth",
          value: config.lineWidth
        })
        .editGraphics({
          target: operation.graphic,
          property: "strokeDash",
          value: geometry.values.map(() => config.strokeDash)
        });
    }
  );
}

function makeCreate(direction) {
  const operation = gridNames(direction);
  return action(
    {
      op: operation.create,
      description: `Create a semantic and concrete ${direction} grid.`
    },
    function (args = {}) {
      validateGridCreateArgs(args, operation.create);
      if (
        this.semanticSpec.guides.grid?.[direction] !== undefined ||
        this.graphicSpec.objects[operation.graphic] !== undefined
      ) {
        throw new Error(`${operation.create} requires a missing grid.`);
      }
      const resources = resolveGridResources(this, direction, args);
      const config = resolveGridConfig(this, direction, args, resources);
      resolveGridGeometry(this, config);

      return this
        .editSemantic({
          property: `guide.grid.${direction}.scale`,
          value: resources.scale
        })
        .editSemantic({
          property: `guide.grid.${direction}.coordinate`,
          value: resources.coordinate
        })
        .createGraphics({
          id: operation.graphic,
          type: "line",
          length: 0,
          ...(resources.parent === undefined
            ? {}
            : { parent: resources.parent }),
          before: resources.before
        })
        ._withGridConfig(direction, config)[operation.rematerialize]();
    }
  );
}

function makeEdit(direction) {
  const operation = gridNames(direction);
  const editOperation = `edit${direction === "horizontal" ? "Horizontal" : "Vertical"}Grid`;
  return action(
    {
      op: editOperation,
      description: `Edit the existing ${direction} grid.`
    },
    function (args = {}) {
      validateGridEditArgs(args, editOperation);
      const storedConfig = this.guideConfigs.grid?.[direction];
      const semantic = this.semanticSpec.guides.grid?.[direction];
      if (
        storedConfig === undefined ||
        semantic?.scale !== storedConfig.scale ||
        semantic.coordinate !== storedConfig.coordinate ||
        this.graphicSpec.objects[operation.graphic]?.type !== "line"
      ) {
        throw new Error(`${editOperation} requires an existing ${direction} grid.`);
      }
      const config = editGridConfig(storedConfig, args);
      return this
        ._withGridConfig(direction, config)
        [operation.rematerialize]();
    }
  );
}

function normalizeDirection(value, direction) {
  if (value === false) return undefined;
  if (value === true || value === undefined) return {};
  if (!isPlainObject(value)) {
    throw new TypeError(
      `createGrid ${direction} must be a boolean or plain object.`
    );
  }
  return value;
}

const rematerializeHorizontalGrid = makeRematerialize("horizontal");
const rematerializeVerticalGrid = makeRematerialize("vertical");
const createHorizontalGrid = makeCreate("horizontal");
const createVerticalGrid = makeCreate("vertical");
const editHorizontalGrid = makeEdit("horizontal");
const editVerticalGrid = makeEdit("vertical");

const editGrid = action(
  {
    op: "editGrid",
    description: "Edit selected existing Cartesian grid directions."
  },
  function (args = {}) {
    if (!isPlainObject(args)) {
      throw new TypeError("editGrid options must be a plain object.");
    }
    validateKeys(args, AGGREGATE_OPTIONS, "editGrid");
    if (Object.keys(args).length === 0) {
      throw new Error("editGrid requires horizontal or vertical changes.");
    }
    for (const direction of AGGREGATE_OPTIONS) {
      if (!Object.hasOwn(args, direction)) continue;
      if (!isPlainObject(args[direction])) {
        throw new TypeError(`editGrid ${direction} must be a plain object.`);
      }
      validateGridEditArgs(
        args[direction],
        `edit${direction === "horizontal" ? "Horizontal" : "Vertical"}Grid`
      );
    }
    let next = this;
    if (args.horizontal !== undefined) {
      next = next.editHorizontalGrid(args.horizontal);
    }
    if (args.vertical !== undefined) {
      next = next.editVerticalGrid(args.vertical);
    }
    return next;
  }
);

const createGrid = action(
  {
    op: "createGrid",
    description: "Create selected Cartesian grid directions."
  },
  function (args = {}) {
    if (!isPlainObject(args)) {
      throw new TypeError("createGrid options must be a plain object.");
    }
    validateKeys(args, AGGREGATE_OPTIONS, "createGrid");
    const horizontal = normalizeDirection(args.horizontal, "horizontal");
    const vertical = args.vertical === undefined
      ? undefined
      : normalizeDirection(args.vertical, "vertical");
    if (horizontal === undefined && vertical === undefined) {
      throw new Error("createGrid requires at least one selected direction.");
    }

    let next = this;
    if (horizontal !== undefined) {
      next = next.createHorizontalGrid(horizontal);
    }
    if (vertical !== undefined) {
      next = next.createVerticalGrid(vertical);
    }
    return next;
  }
);

const rematerializeGrid = action(
  {
    op: "rematerializeGrid",
    description: "Recompute every existing grid direction."
  },
  function (args = {}) {
    if (!isPlainObject(args) || Object.keys(args).length !== 0) {
      throw new TypeError("rematerializeGrid does not accept options.");
    }
    let next = this;
    let count = 0;
    if (this.guideConfigs.grid?.horizontal !== undefined) {
      next = next.rematerializeHorizontalGrid();
      count += 1;
    }
    if (this.guideConfigs.grid?.vertical !== undefined) {
      next = next.rematerializeVerticalGrid();
      count += 1;
    }
    if (count === 0) {
      throw new Error("rematerializeGrid requires an existing grid.");
    }
    return next;
  }
);

export function registerGridActions(ProgramClass) {
  ProgramClass.prototype.createGrid = createGrid;
  ProgramClass.prototype.createHorizontalGrid = createHorizontalGrid;
  ProgramClass.prototype.createVerticalGrid = createVerticalGrid;
  ProgramClass.prototype.editHorizontalGrid = editHorizontalGrid;
  ProgramClass.prototype.editVerticalGrid = editVerticalGrid;
  ProgramClass.prototype.editGrid = editGrid;
  ProgramClass.prototype.rematerializeGrid = rematerializeGrid;
  ProgramClass.prototype.rematerializeHorizontalGrid =
    rematerializeHorizontalGrid;
  ProgramClass.prototype.rematerializeVerticalGrid = rematerializeVerticalGrid;
}
