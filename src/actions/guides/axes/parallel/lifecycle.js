import { action } from "../../../../core/action.js";
import { validateNonEmptyString, validateOptionObject } from "../../../../core/validation.js";
import { requireParallelAxisLayer, resolveParallelAxisTarget } from "./resolve.js";
import {
  defaultParallelAxis, hasParallelAxisParts, PARALLEL_AXIS_GRAPHICS,
  PARALLEL_AXIS_PARTS, patchParallelAxis, resolveParallelAxisConfigs, validateParallelAxisOptions
} from "./policy.js";

function owner(program, args, operation, existing = false) {
  const stored = program.semanticSpec.guides.axis?.parallel;
  if (existing && stored === undefined) throw new Error(`${operation} requires existing Parallel axes.`);
  const target = resolveParallelAxisTarget(program, args.target === undefined ? stored?.target : args.target);
  if (stored !== undefined && stored.target !== target) throw new Error("Parallel axes belong to another target.");
  const resolved = requireParallelAxisLayer(program, target);
  if (args.coordinate !== undefined && args.coordinate !== resolved.coordinate.id) {
    throw new Error(`Parallel layer "${target}" uses coordinate "${resolved.coordinate.id}".`);
  }
  if (Object.hasOwn(args, "field") && !resolved.dimensions.some(dimension => dimension.field === args.field)) {
    throw new Error(`${operation} requires an encoded dimension field "${args.field}".`);
  }
  return { ...resolved, target, stored };
}

function withOwner(program, resolved, config) {
  let next = program;
  if (resolved.stored === undefined) {
    next = next.editSemantic({ property: "guide.axis.parallel.target", value: resolved.target })
      .editSemantic({ property: "guide.axis.parallel.coordinate", value: resolved.coordinate.id })
      .editSemantic({ property: "guide.axis.parallel.scales", value: resolved.dimensions.map(dimension => dimension.scale) });
  }
  return next._withGuideConfig("parallel", "axes", {
    target: resolved.target, scales: resolved.dimensions.map(dimension => dimension.scale), ...config
  });
}

function withTitle(program, args, create) {
  const remove = !create && args.title === false;
  const text = args.title?.text;
  if (!remove && text === undefined) return program;
  const previous = program.semanticSpec.guides.axis?.parallel?.titles ?? [];
  const titles = previous.filter(title => title.field !== args.field);
  if (!remove) titles.push({ field: args.field, text });
  if (titles.length === 0 && previous.length === 0) return program;
  return program.editSemantic({ property: "guide.axis.parallel.titles",
    ...(titles.length === 0 ? { remove: true } : { value: titles }) });
}

const createParallelAxes = action({
  op: "createParallelAxes", description: "Create axes for every encoded Parallel dimension."
}, function (args = {}) {
  validateOptionObject(args, ["target", "coordinate"], "createParallelAxes");
  const resolved = owner(this, args, "createParallelAxes");
  if (resolved.stored !== undefined || this.guideConfigs.axis?.parallel !== undefined ||
      Object.values(PARALLEL_AXIS_GRAPHICS).some(id => this.graphicSpec.objects[id] !== undefined)) {
    throw new Error("createParallelAxes requires missing Parallel axes.");
  }
  return withOwner(this, resolved, {
    mode: "all", dimensions: resolved.dimensions.map(dimension => defaultParallelAxis(dimension.field))
  }).rematerializeParallelAxes({ target: resolved.target });
});

function makeAxisAction(create) {
  const operation = create ? "createParallelAxis" : "editParallelAxis";
  return action({ op: operation, description: `${create ? "Create" : "Edit"} selected components of a Parallel field axis.` }, function (args = {}) {
    validateParallelAxisOptions(args, operation, create);
    const resolved = owner(this, args, operation, !create);
    const config = resolved.stored === undefined
      ? { mode: "selected", dimensions: resolved.dimensions.map(dimension => ({ field: dimension.field })) }
      : resolveParallelAxisConfigs(this, resolved.dimensions);
    const previous = config.dimensions.find(dimension => dimension.field === args.field);
    const updated = patchParallelAxis(previous, args, create, operation);
    const next = withTitle(withOwner(this, resolved, {
      ...config, dimensions: config.dimensions.map(dimension => dimension.field === args.field ? updated : dimension)
    }), args, create);
    return next.rematerializeParallelAxes({ target: resolved.target });
  });
}

const createParallelAxis = makeAxisAction(true);
const editParallelAxis = makeAxisAction(false);

const removeParallelAxis = action({
  op: "removeParallelAxis", description: "Remove every component of one Parallel field axis."
}, function (args = {}) {
  validateOptionObject(args, ["field", "target"], "removeParallelAxis");
  validateNonEmptyString(args.field, "Parallel axis field");
  const resolved = owner(this, args, "removeParallelAxis", true);
  const config = resolveParallelAxisConfigs(this, resolved.dimensions).dimensions.find(dimension => dimension.field === args.field);
  if (!hasParallelAxisParts(config)) throw new Error("removeParallelAxis requires an existing field axis.");
  return this.editParallelAxis({ field: args.field, target: resolved.target,
    ...Object.fromEntries(PARALLEL_AXIS_PARTS.filter(part => config[part] !== undefined).map(part => [part, false])) });
});

const removeParallelAxes = action({
  op: "removeParallelAxes", description: "Remove all Parallel axis semantics, recipes and graphics."
}, function (args = {}) {
  validateOptionObject(args, ["target", "coordinate"], "removeParallelAxes");
  const stored = this.semanticSpec.guides.axis?.parallel;
  if (stored === undefined) throw new Error("removeParallelAxes requires existing Parallel axes.");
  if (args.target !== undefined && args.target !== stored.target ||
      args.coordinate !== undefined && args.coordinate !== stored.coordinate) {
    throw new Error("removeParallelAxes selectors must match the stored owner.");
  }
  let next = this.editSemantic({ property: "guide.axis.parallel", remove: true });
  for (const id of Object.values(PARALLEL_AXIS_GRAPHICS)) {
    if (next.graphicSpec.objects[id] !== undefined) next = next.editGraphics({ target: id, remove: true });
  }
  return next._withoutMaterializationConfig(["guides", "axis", "parallel"]);
});

export function registerParallelAxisLifecycleActions(ProgramClass) {
  ProgramClass.prototype.createParallelAxes = createParallelAxes;
  ProgramClass.prototype.createParallelAxis = createParallelAxis;
  ProgramClass.prototype.editParallelAxis = editParallelAxis;
  ProgramClass.prototype.removeParallelAxis = removeParallelAxis;
  ProgramClass.prototype.removeParallelAxes = removeParallelAxes;
}
