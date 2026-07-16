# Planned scale contracts

These contracts are accepted future API work; they are not current public behavior.

## Current edit baseline

`editScale` for `linear | log | pow | sqrt | symlog | time | band | point | ordinal` scales, including domain/range reset,
type parameters, atomic quantitative point-position type transitions, `nice`, `zero`, `clamp`, `reverse` and deterministic consumer rematerialization, is implemented and documented in
[`../current/CORE.md`](../current/CORE.md#editscale). This file retains only scale types and mapping policies
that are still planned.

## Scale type vocabulary

```typescript
type CurrentScaleType =
  | "linear" | "log" | "pow" | "sqrt" | "symlog"
  | "time" | "band" | "point" | "ordinal";
type PositiveFiniteExceptOne = number; // finite && value > 0 && value !== 1

type PlannedScaleType =
  | CurrentScaleType
  | "sequential"
  | "quantize"
  | "quantile"
  | "threshold";

type PlannedScaleOptions = {
  type?: PlannedScaleType;
  base?: PositiveFiniteExceptOne;
  exponent?: PositiveFinite;
  constant?: PositiveFinite;
};
```

- `log`, `pow`, `sqrt` and `symlog` are Implemented for point position, including the parameters and
  atomic edit policy below. Additional transformed mark consumers remain Planned.
- `log` maps one strictly positive or one strictly negative quantitative domain. The domain may not
  contain or cross zero. `base` defaults to `10`, affects ticks and nice boundaries, and is valid
  only for `log`.
- `pow` uses a sign-preserving power transform. `exponent` defaults to `1` and is valid only for
  `pow`.
- `sqrt` is the named `pow` specialization with exponent `0.5`; it does not accept an explicit
  `exponent`.
- `symlog` accepts negative, zero and positive quantitative values. `constant` defaults to `1`,
  controls the approximately linear region around zero, and is valid only for `symlog`.
- `time` is the only temporal scale token and always resolves input normalization, domain boundaries,
  ticks and labels in UTC. There is no separate `utc` token and no environment-local calendar mode.
- `band` and `point` position scales, including padding, alignment, shared centers, guides and edit
  rematerialization, are Implemented in the current scale and encoding contracts.
- `sequential` maps a quantitative or temporal domain to concrete colors. Its range, palette,
  interpolation and gradient-guide behavior are owned by the accepted continuous-color vertical contract.
- `quantize` divides one finite continuous domain pair into equal intervals for a discrete range.
  A range of length `n` creates `n` intervals.
- `quantile` infers thresholds from a non-empty finite sample domain for a discrete range. A range of
  length `n` creates `n` quantile classes.
- `threshold` takes strictly increasing explicit thresholds. `n` thresholds require exactly
  `n + 1` discrete range values.
- Position channels accept `linear | log | pow | sqrt | symlog | time | band | point`
  when their field and mark grain are compatible. Appearance channels may use the discretizing types
  only when every resolved range value is valid for that channel.
- `ordinal` owns discrete appearance lookup. Category position uses `band` when the consumer needs a
  non-zero slot width and `point` when it needs only a center. Existing position uses of `ordinal`
  migrate to one of those explicit types.
- `nice` is valid for transformed quantitative and `time` auto domains. `zero` remains
  valid only where zero is representable and is rejected for `log`, temporal and discrete scales.
- Automatic domains, explicit-domain precedence, shared-consumer compatibility and deterministic
  rematerialization follow the existing scale contract.
- `identity` and `bin-ordinal` remain Proposed. Identity bypasses normal mapping, while bin-ordinal
  overlaps the current histogram bin owner.
- Status: Mixed. Transformed point position and band/point position are Implemented; `sequential | quantize |
  quantile | threshold`, transformed non-point consumers and `unknown` remain Planned.

### Scale type editing

`editScale` implements `type`, `base`, `exponent` and `constant` for quantitative point-position consumers. A type edit validates
the complete resulting scale and every connected consumer before changing state. Existing domain and range
are preserved only when valid for the new type; otherwise the same call must provide valid replacements.
Properties that belong only to the old type are structurally removed and the new type's documented defaults
are persisted. A successful edit rematerializes all marks and guides; a failed edit leaves the earlier program
unchanged. This is the approved mutable-scale exception to the general structural-resource rule.

## Scale mapping policies

```typescript
type PlannedScalePolicies = {
  clamp?: boolean;
  reverse?: boolean;
  unknown?: unknown;
};
```

- `clamp` defaults to `false`. For continuous numeric and temporal scales it constrains mapped
  values outside the resolved domain to the nearest range endpoint. It does not mutate the domain and
  is rejected for ordinal, band, point, quantile and threshold scales.
- `reverse` defaults to `false` and reverses the final resolved range after auto or explicit range
  resolution. Therefore an already reversed explicit range plus `reverse: true` is intentionally
  reversed a second time.
- `unknown` is absent by default, preserving each action's current missing/invalid-row behavior.
  When present, it supplies the mapped value for a missing or invalid input and must pass the target
  channel's concrete value validation. It does not add a domain member.
- Policies are stored in semantic scale state. Any change must rematerialize every registered consumer
  of the shared scale in deterministic plan order and must leave the previous program unchanged when
  validation fails.
- Status: Planned, NOT IMPLEMENTED. Coverage must include omitted/true/false policies, reversed explicit
  ranges, out-of-domain values, shared consumers, channel-valid and invalid unknown values, Canvas
  rematerialization and renderer parity.
