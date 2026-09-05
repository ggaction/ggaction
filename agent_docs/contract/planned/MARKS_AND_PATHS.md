# Planned Mark And Path contracts

These contracts are accepted future API work; they are not current public behavior.

## rule mark geometry — implemented compatibility note

아래는 이전 구현의 compatibility 기록이다. 새로 승인된 Rule 생성 style과 얇은 `editRuleMark`는
[Shared authoring](SHARED_AUTHORING.md#editrulemark)의 Planned 계약이며, 아래의 과거 제외 결정을 대체한다.

```typescript
createRuleMark({
  id?: UserId;
  data?: UserId;
}): ChartProgram;
```

- `createRuleMark`는 semantic `rule` layer와 빈 backend-neutral `line` collection만 만든다.
  `data`를 생략하면 current dataset을 사용하며 안전하게 추론할 수 없으면 오류다.
- 첫 ordinary rule의 `id`를 생략하면 persisted ID는 `"rule"`이다. 같은 role이 이미 있거나
  `"rule"` identity가 사용 중이면 numbered suffix를 만들지 않고 explicit ID를 요구한다. Composite
  action은 항상 owner에서 namespaced한 explicit child ID를 전달한다.
- Rule의 위치와 appearance는 create parameter나 별도 `encodeRule`/`editRuleMark`가 아니라
  independent assignment actions가 소유한다. `encodeX`, `encodeX2`, `encodeY`, `encodeY2`가
  endpoints를, `encodeStroke`, `encodeStrokeWidth`, `encodeStrokeDash`, `encodeOpacity`가 appearance를
  할당하거나 다시 할당한다.
- x만 있으면 plot bounds 전체 높이를 지나는 vertical rule, y만 있으면 전체 너비를 지나는
  horizontal rule이다. `x + y + y2`는 vertical interval, `y + x + x2`는 horizontal interval,
  네 endpoint가 모두 있으면 `(x, y)`에서 `(x2, y2)`까지의 diagonal rule이다. Fluent authoring 중
  아직 지원 조합을 이루지 못한 transient endpoint state는 잘못된 선을 만들지 않고 empty collection을
  유지하며, 다음 endpoint assignment가 조합을 완성하면 rematerialize한다.
- `x2`는 x와, `y2`는 y와 같은 scale 및 coordinate를 공유한다. Field/datum assignment의 모든
  유효 row마다 하나의 concrete `line` child를 만들고, field가 없는 datum-only rule은 하나만 만든다.
  x-only/y-only span은 current plot bounds에서 concrete endpoints를 계산한다.
- Rule에는 curve가 없다. Scale, coordinate, Canvas bounds, dataset 또는 assignment 변경은 wrapped
  rule rematerialization을 호출해 concrete endpoints를 다시 만든다. Renderer는 semantic channel이나
  full-span intent를 해석하지 않는다.
- Status: Implemented. The canonical current contract moved to
  [`../current/MARKS.md`](../current/MARKS.md#createrulemark) and
  [`../current/ENCODINGS.md`](../current/ENCODINGS.md#encodex2).

## curve interpolation and concrete path commands

```typescript
type CurveInterpolation =
  | "linear"
  | "step"
  | "step-before"
  | "step-after"
  | "basis"
  | "cardinal"
  | "monotone"
  | "natural";

type ConcretePathCommand =
  | { op: "M" | "L"; x: Finite; y: Finite }
  | { op: "C"; x1: Finite; y1: Finite; x2: Finite; y2: Finite; x: Finite; y: Finite }
  | { op: "Z" };
```

- `createLineMark.curve`, `editLineMark.curve`, `createAreaMark.curve`, `editAreaMark.curve`는 구현되어
  current mark contract가 소유한다. Default는 `"linear"`다. Curve is graphical mark materialization config: it does not change fields, grouping,
  coordinates or scale semantics.
- `"linear"` emits `M` followed by `L` commands. For each pair `(x0, y0)`→`(x1, y1)`, `"step"` emits
  horizontal/vertical segments at midpoint `(x0 + x1) / 2`; `"step-before"` changes y at `x0`, and
  `"step-after"` changes y at `x1`.
- `"basis"` uses a uniform cubic B-spline, `"cardinal"` a cardinal spline with fixed tension `0`,
  `"monotone"` a monotone-x cubic Hermite interpolation, and `"natural"` a natural cubic spline with
  zero second derivative at both endpoints. They emit only concrete cubic `C` commands after `M`.
- Curves that require three or more distinct ordered points fall back to linear for shorter input.
  `monotone` requires strictly increasing finite x after existing series ordering and grain resolution;
  duplicate or decreasing x is a materialization error rather than silently reordered curve input.
- Area materialization starts the lower boundary with `M`, interpolates it in forward order, connects to the
  upper endpoint with `L`, reverses the independently interpolated upper boundary without a new `M`, then emits
  `Z`. It never smooths across the upper-to-lower connector. Line paths never emit `Z`.
- Path materialization resolves curve tokens into `ConcretePathCommand[]` before writing `graphicSpec`.
  Renderers execute commands only and do not know curve names or calculate control points. Implementation
  migrates existing path `points` to commands atomically rather than storing two canonical geometries.
- Canvas/scale/data/group changes and Planned mark edits regenerate commands through one pure shared curve
  grammar. Browser and Node use the same command list, and invalid input leaves the previous program unchanged.
- Regression line/band actions forward their curve options to the corresponding line/area mark actions.
  Density and ranged-area charts reuse `createAreaMark.curve` without a density-specific interpolation API.
- Status: Implemented for line and area marks. Both own every token, exact fixtures, short-series fallback,
  monotone validation, edit/rematerialization, renderer parity and declarations. Regression line and band
  forwarding are also Current through their ordinary line/area child actions.
