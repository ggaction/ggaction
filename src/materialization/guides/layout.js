import { assertGuideCollisionBlocks } from "../../layout/guideCollisions.js";
import { unionConcreteGraphicBounds } from "../../grammar/schemas/graphicBounds.js";
import { axisGraphicIds, legendResourcePolicies } from "./resources.js";

// Only domain-owned guides participate. Extension primitives may deliberately
// overlap, and a combined categorical/size legend is one occupied group.
export function resolveGuideCollisionBlocks(graphicSpec, guideConfigs, titleConfig) {
  const blocks = [];
  const append = (id, kind, position, ids) => {
    if (position === undefined) return;
    const existing = ids.filter(id => graphicSpec.objects[id] !== undefined);
    const bounds = unionConcreteGraphicBounds(graphicSpec, existing);
    if (bounds !== undefined) blocks.push({ id, kind, position, bounds });
  };
  append("chart title", "title", titleConfig?.position, ["chartTitle", "chartSubtitle"]);
  for (const channel of ["x", "y"]) {
    for (const id of axisGraphicIds(channel)) {
      const component = id.slice(`${channel}Axis`.length).toLowerCase();
      append(`${channel}-axis ${component}`, "axis", guideConfigs.axis?.[channel]?.[component]?.position, [id]);
    }
  }
  const policies = legendResourcePolicies();
  const configs = guideConfigs.legend ?? {};
  const categorical = policies.find(policy => policy.family === "categorical" && configs[policy.kind] !== undefined);
  const combined = categorical !== undefined && configs.size !== undefined &&
    configs[categorical.kind].target === configs.size.target;
  for (const policy of policies) {
    const config = configs[policy.kind];
    if (config === undefined || combined && policy.kind === "size") continue;
    const ids = combined && policy === categorical
      ? [...policy.graphicIds, ...policies.find(item => item.kind === "size").graphicIds]
      : policy.graphicIds;
    append(`${policy.kind}${combined && policy === categorical ? "+size" : ""} legend`, "legend", config.position, ids);
  }
  return blocks;
}


// Defer cross-guide checks while sibling materializers still carry old
// coordinates. The scope is transient and never survives a returned program.
export function withGuideLayoutTransaction(program, apply) {
  if (program.context.deferGuideLayoutValidation === true) return apply(program);
  const result = apply(program._withContext({ deferGuideLayoutValidation: true }));
  const { deferGuideLayoutValidation: _deferred, ...context } = result.context;
  if (Object.hasOwn(program.context, "deferGuideLayoutValidation")) {
    context.deferGuideLayoutValidation = program.context.deferGuideLayoutValidation;
  }
  const next = result._clone({ context });
  assertGuideCollisionBlocks(resolveGuideCollisionBlocks(next.graphicSpec, next.guideConfigs, next.titleConfig));
  return next;
}

export function withGuideLayoutValidation(implementation) {
  return function (args) {
    return withGuideLayoutTransaction(this, program => implementation.call(program, args));
  };
}
