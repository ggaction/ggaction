function replaceAlternateBinding(program, target, channel, previous, usesField) {
  if (previous === undefined) return program;
  const alternate = usesField ? "datum" : "field";
  return Object.hasOwn(previous, alternate)
    ? program.editSemantic({
        property: `layer[${target}].encoding.${channel}.${alternate}`,
        remove: true
      })
    : program;
}

function reconcileInheritedRulePosition(program, {
  target,
  channel,
  layer,
  hasField
}) {
  const config = program.markConfigs[target] ?? {};
  const inherited = config.inheritedPosition;
  if (layer.mark.type !== "rule" || inherited === undefined) return program;

  let channels = inherited.channels.filter(candidate => candidate !== channel);
  let next = program;
  if (
    !hasField &&
    ["x", "y"].includes(channel) &&
    layer.encoding?.x2 === undefined &&
    layer.encoding?.y2 === undefined
  ) {
    const opposite = channel === "x" ? "y" : "x";
    if (channels.includes(opposite) && layer.encoding?.[opposite] !== undefined) {
      next = next.editSemantic({
        property: `layer[${target}].encoding.${opposite}`,
        remove: true
      });
      channels = channels.filter(candidate => candidate !== opposite);
    }
  }

  const { inheritedPosition, ...rest } = config;
  void inheritedPosition;
  return next._withMarkConfig(target, channels.length === 0
    ? rest
    : {
        ...rest,
        inheritedPosition: { ...inherited, channels }
      });
}

function applyBin(program, target, channel, previous, bin) {
  if (bin === undefined) return program;
  const [mode] = Object.keys(bin);
  let next = program;
  for (const previousMode of Object.keys(previous?.bin ?? {})) {
    if (previousMode === mode) continue;
    next = next.editSemantic({
      property: `layer[${target}].encoding.${channel}.bin.${previousMode}`,
      remove: true
    });
  }
  return next.editSemantic({
    property: `layer[${target}].encoding.${channel}.bin.${mode}`,
    value: bin[mode]
  });
}

function applyArcThetaWeight(program, target, channel, previous, aggregate, weight) {
  if (channel !== "theta") return program;
  if (aggregate !== "sum") {
    return previous?.weight === undefined
      ? program
      : program.editSemantic({
          property: `layer[${target}].encoding.theta.weight`,
          remove: true
        });
  }
  return program.editSemantic({
    property: `layer[${target}].encoding.theta.weight`,
    value: weight
  });
}

export function applyPositionSemantics(program, {
  target,
  channel,
  layer,
  previous,
  field,
  datum,
  hasField,
  fieldType,
  bin,
  aggregate,
  stack,
  weight
}) {
  let next = reconcileInheritedRulePosition(program, {
    target,
    channel,
    layer,
    hasField
  });
  next = replaceAlternateBinding(
    next,
    target,
    channel,
    previous,
    hasField
  )
    .editSemantic({
      property: `layer[${target}].encoding.${channel}.${hasField ? "field" : "datum"}`,
      value: hasField ? field : datum
    })
    .editSemantic({
      property: `layer[${target}].encoding.${channel}.fieldType`,
      value: fieldType
    });

  next = applyBin(next, target, channel, previous, bin);
  for (const [property, value] of Object.entries({ aggregate, stack })) {
    if (value === undefined) continue;
    next = next.editSemantic({
      property: `layer[${target}].encoding.${channel}.${property}`,
      value
    });
  }
  return applyArcThetaWeight(
    next,
    target,
    channel,
    previous,
    aggregate,
    weight
  );
}
