# Planned Mark And Path contracts

These contracts are accepted future API work; they are not current public behavior.

## rule mark geometry

```typescript
createRuleMark({
  id: UserId;
  data?: UserId;
}): ChartProgram;
```

- `createRuleMark`는 semantic `rule` layer와 빈 backend-neutral `line` collection만 만든다.
  `data`를 생략하면 current dataset을 사용하며 안전하게 추론할 수 없으면 오류다.
- Rule의 위치와 appearance는 create parameter나 별도 `encodeRule`/`editRuleMark`가 아니라
  independent assignment actions가 소유한다. `encodeX`, `encodeX2`, `encodeY`, `encodeY2`가
  endpoints를, `encodeStroke`, `encodeStrokeWidth`, `encodeStrokeDash`, `encodeOpacity`가 appearance를
  할당하거나 다시 할당한다.
- x만 있으면 plot bounds 전체 높이를 지나는 vertical rule, y만 있으면 전체 너비를 지나는
  horizontal rule이다. `x + y + y2`는 vertical interval, `y + x + x2`는 horizontal interval,
  네 endpoint가 모두 있으면 `(x, y)`에서 `(x2, y2)`까지의 diagonal rule이다. 그 외 incomplete
  endpoint 조합은 materialization error다.
- `x2`는 x와, `y2`는 y와 같은 scale 및 coordinate를 공유한다. Field/datum assignment의 모든
  유효 row마다 하나의 concrete `line` child를 만들고, field가 없는 datum-only rule은 하나만 만든다.
  x-only/y-only span은 current plot bounds에서 concrete endpoints를 계산한다.
- Rule에는 curve가 없다. Scale, coordinate, Canvas bounds, dataset 또는 assignment 변경은 wrapped
  rule rematerialization을 호출해 concrete endpoints를 다시 만든다. Renderer는 semantic channel이나
  full-span intent를 해석하지 않는다.
- Status: Planned, NOT IMPLEMENTED. full-span/vertical/horizontal/diagonal geometry, field/datum mode,
  endpoint compatibility, reassignment, Canvas resize, trace, browser/PNG renderer parity coverage가 필요하다.

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

- `createLineMark.curve`와 `createAreaMark.curve`는 shared closed vocabulary를 사용하며 default는
  `"linear"`다. Curve is graphical mark materialization config: it does not change fields, grouping,
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
- Area materialization starts the upper boundary with `M`, interpolates it in forward order, connects to the
  lower/baseline endpoint with `L`, interpolates that boundary in reverse order without a new `M`, then emits
  `Z`. It never smooths across the upper-to-lower connector. Line paths never emit `Z`.
- Path materialization resolves curve tokens into `ConcretePathCommand[]` before writing `graphicSpec`.
  Renderers execute commands only and do not know curve names or calculate control points. Implementation
  migrates existing path `points` to commands atomically rather than storing two canonical geometries.
- Canvas/scale/data/group changes and Planned mark edits regenerate commands through one pure shared curve
  grammar. Browser and Node use the same command list, and invalid input leaves the previous program unchanged.
- Regression line/band actions forward their curve options to the corresponding line/area mark actions.
  Density and ranged-area charts reuse `createAreaMark.curve` without a density-specific interpolation API.
- Status: Planned, NOT IMPLEMENTED. Every token needs exact command fixtures, two/three/many-point and
  reversed-area cases, monotone validation, edit/rematerialization trace, renderer parity, declaration and
  primitive-schema coverage.
