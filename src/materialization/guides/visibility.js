import { cloneAndFreeze, isPlainObject } from "../../core/immutable.js";
import { axisGraphicIds } from "../../selectors/axes.js";
import { legendResourcePolicies } from "./resources.js";

// Visibility is retained guide intent. Paint is derived, not a deletion of the
// guide or its typography. Keeping geometry also preserves relative anchors.
export function splitGuideVisibility(args, parts = ["line", "ticks", "labels", "title"]) {
  if (!isPlainObject(args)) return { args, visibility: {} };
  if (args.ticksAndLabels !== undefined && (args.ticks !== undefined || args.labels !== undefined)) throw new Error("Axis edit cannot combine ticksAndLabels with ticks or labels.");
  const out = { ...args }, visibility = {};
  const take = (object, key) => {
    if (!Object.hasOwn(object, "visible")) return;
    if (typeof object.visible !== "boolean") throw new TypeError(`${key}.visible must be a boolean.`);
    visibility[key] = object.visible; delete object.visible;
  };
  take(out, "all");
  for (const part of parts) if (isPlainObject(out[part])) {
    out[part] = { ...out[part] }; take(out[part], part);
    if (Object.hasOwn(visibility, part) && !Object.keys(out[part]).length) delete out[part];
  }
  if (isPlainObject(out.ticksAndLabels)) {
    out.ticksAndLabels = { ...out.ticksAndLabels };
    for (const part of ["ticks", "labels"]) if (isPlainObject(out.ticksAndLabels[part])) {
      out.ticksAndLabels[part] = { ...out.ticksAndLabels[part] };
      take(out.ticksAndLabels[part], part);
      if (Object.hasOwn(visibility, part) && !Object.keys(out.ticksAndLabels[part]).length) delete out.ticksAndLabels[part];
    }
    if ((Object.hasOwn(visibility, "ticks") || Object.hasOwn(visibility, "labels")) && !Object.keys(out.ticksAndLabels).length) delete out.ticksAndLabels;
  }
  return { args: out, visibility };
}

export function patchGuideVisibility(program, family, id, patch) {
  if (!Object.keys(patch).length) return program;
  const config = program.guideConfigs[family]?.[id];
  if (!config) throw new Error(`Visibility requires an existing ${family} guide.`);
  return program._withMaterializationConfig(["guides", family, id], {
    ...config, visibility: { ...config.visibility, ...patch }
  });
}

function paint(program, restore) {
  const retained = program.materializationConfigs.guideVisibilityPaint ?? {};
  const backups = {}, objects = { ...program.graphicSpec.objects };
  let changed = false; const visited = new Set();
  function visit(id, hide = false) {
    const object = objects[id]; if (!object || visited.has(id)) return; visited.add(id);
    const patch = (item, key) => {
      const previous = retained[id]?.[key];
      if (restore && previous === undefined || !restore && !hide) return item;
      const properties = { ...item.properties };
      if (restore) {
        if (previous.opacity === null) delete properties.opacity;
        else properties.opacity = previous.opacity;
      } else {
        (backups[id] ??= {})[key] = { opacity: properties.opacity ?? null };
        properties.opacity = 0;
      }
      changed = true; return { ...item, properties };
    };
    let next = object;
    if (object.items) next = { ...next, items: object.items.map(item => patch(item, item.id)) };
    else if (object.type !== "canvas" && object.properties) next = patch(next, id);
    objects[id] = next;
    for (const child of object.children ?? []) visit(child, hide);
  }
  if (restore) {
    if (!Object.keys(retained).length) return program;
    for (const id of Object.keys(retained)) visit(id);
  } else {
    const parts = ["line", "ticks", "labels", "title"];
    for (const [id, config] of Object.entries(program.guideConfigs.axis ?? {})) {
      const channel = program.semanticSpec.guides.axis?.[id]?.channel ?? id;
      if (channel === "parallel") continue;
      const visibility = config.visibility ?? {};
      axisGraphicIds(channel, id).forEach((graphic, index) => {
        if (visibility.all === false || visibility[parts[index]] === false) visit(graphic, true);
      });
    }
    for (const policy of legendResourcePolicies()) {
      const visibility = program.guideConfigs.legend?.[policy.kind]?.visibility ?? {};
      for (const id of policy.graphicIds) if (visibility.all === false ||
        id.endsWith("Labels") && visibility.labels === false ||
        id.endsWith("Title") && visibility.titleStyle === false) visit(id, true);
    }
    for (const [direction, config] of Object.entries(program.guideConfigs.grid ?? {})) {
      if (config.visible === false) visit({horizontal:"horizontalGridLines",vertical:"verticalGridLines",theta:"thetaGridLines",radius:"radialGridCircles",radial:"radialGridCircles"}[direction], true);
    }
  }
  let next = changed ? program._clone({ graphicSpec: cloneAndFreeze({ ...program.graphicSpec, objects }) }) : program;
  return restore || !Object.keys(backups).length
    ? next._withoutMaterializationConfig(["guideVisibilityPaint"])
    : next._withMaterializationConfig(["guideVisibilityPaint"], backups);
}
export function restoreGuideVisibilityPaint(program) { return paint(program, true); }
export function applyGuideVisibilityPaint(program) { return paint(restoreGuideVisibilityPaint(program), false); }


// Grids change paint/geometry inside the plot and do not need cross-guide reflow.
export function withGuideVisibilityPaint(implementation) {
  return function (args) {
    if (this.context.deferGuideLayoutValidation === true) return implementation.call(this, args);
    return applyGuideVisibilityPaint(implementation.call(restoreGuideVisibilityPaint(this), args));
  };
}
