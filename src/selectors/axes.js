function layerScaleIds(layer, channel) {
  const conditional = layer.conditionals?.[channel];
  return conditional === undefined ? [layer.encoding?.[channel]?.scale]
    : [...conditional.conditions.map(condition => condition.value.scale), conditional.otherwise.scale];
}

const CARTESIAN_CHANNELS = Object.freeze(["x", "y"]);
const COMPONENTS = Object.freeze(["line", "ticks", "labels", "title"]);

export const PARALLEL_AXIS_PARTS = COMPONENTS;
export const PARALLEL_AXIS_GRAPHICS = Object.freeze({
  line: "parallelAxisLines", ticks: "parallelAxisTicks",
  labels: "parallelAxisLabels", title: "parallelAxisTitles"
});

export function cartesianAxisOwners(program) {
  const semantics = program.semanticSpec?.guides?.axis ?? {};
  const configs = (program.guideConfigs ?? program.materializationConfigs?.guides)?.axis ?? {};
  return [...new Set([...Object.keys(semantics), ...Object.keys(configs)])].flatMap(id => {
    const semantic = Object.hasOwn(semantics, id) ? semantics[id] : undefined;
    const config = Object.hasOwn(configs, id) ? configs[id] : undefined;
    const channel = CARTESIAN_CHANNELS.includes(id) ? id : semantic?.channel;
    if (!CARTESIAN_CHANNELS.includes(channel)) return [];
    const coordinates = [...new Set((program.semanticSpec.layers ?? []).filter(layer =>
      layerScaleIds(layer, channel).includes(semantic?.scale)).map(layer => layer.coordinate).filter(Boolean))];
    return [{ id, channel, semantic, config, scale: semantic?.scale,
      coordinate: semantic?.coordinate ?? (coordinates.length === 1 ? coordinates[0] : undefined), named: id !== channel,
      sides: [...new Set(id !== channel ? [semantic.position] : COMPONENTS
        .map(component => config?.[component]?.position).filter(Boolean))] }];
  });
}

export function axisTargetArgs(id, channel) {
  return id === channel ? {} : { target: id };
}

export function selectCartesianAxis(program, channel, args = {}, { create = false, whole = false } = {}) {
  const owners = cartesianAxisOwners(program);
  const candidates = owners.filter(owner => owner.channel === channel);
  let owner;
  if (Object.hasOwn(args, "target")) {
    const target = args.target;
    owner = owners.find(candidate => candidate.id === target);
    if (owner === undefined || owner.channel !== channel) {
      throw new Error(`Unknown ${channel}-axis target "${target}".`);
    }
  } else {
    owner = candidates.find(candidate => candidate.id === channel);
    if (owner === undefined) {
      if (candidates.length > 1) throw new Error(`Multiple ${channel}-axes require an explicit target.`);
      owner = candidates[0];
    }
  }
  const { target: _target, ...options } = args;
  const id = owner?.id ?? channel;
  if (!owner?.named && options.position !== undefined && owners.some(candidate => candidate.named)) {
    const coordinates = [...new Set((program.semanticSpec.layers ?? []).filter(layer =>
      layerScaleIds(layer, channel).includes(options.scale ?? owner?.scale ?? channel))
      .map(layer => layer.coordinate).filter(Boolean))];
    assertCartesianAxisSideAvailable(program, { id, channel,
      coordinate: owner?.coordinate ?? (coordinates.length === 1 ? coordinates[0] : undefined), position: options.position });
  }
  if (owner?.named) {
    if (options.scale !== undefined && options.scale !== owner.scale ||
        options.coordinate !== undefined && options.coordinate !== owner.coordinate) {
      throw new Error(`Axis "${id}" resource binding does not match the requested filter.`);
    }
    if (!whole && options.position !== undefined && options.position !== owner.semantic.position) {
      throw new Error(`Named axis "${id}" components share one side; edit the complete axis position.`);
    }
    if (create) options.scale ??= owner.scale;
    if (!whole) options.position ??= owner.semantic.position;
  }
  return { id, owner, options };
}

export function assertCartesianAxisSideAvailable(program, { id, channel, coordinate, position }) {
  for (const owner of cartesianAxisOwners(program)) {
    if (owner.id !== id && owner.coordinate === coordinate && owner.sides.includes(position)) {
      throw new Error(`Axis side "${position}" is already occupied on coordinate "${coordinate}".`);
    }
  }
}

export function axisGraphicIds(channel, axisId = channel) {
  if (channel === "parallel" && axisId === channel) {
    return ["parallelAxisLines", "parallelAxisTicks", "parallelAxisLabels", "parallelAxisTitles"];
  }
  const components = ["Line", "Ticks", "Labels", "Title"];
  if (axisId !== channel) return components.map(component => `axis_${axisId}__${component}`);
  const prefix = channel === "radius" ? "radial" : channel;
  return components.map(component => `${prefix}Axis${component}`);
}
