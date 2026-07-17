# Roadmap 3 Phase 5 — Arc, Donut, Rose and Radial Bar

## 진행 상태

- [x] STEP 1 — Phase 계약, 세 target chart와 Gate boundary 확정
- [x] STEP 2 — Independent annular-sector geometry와 reference invariants
- [x] STEP 3 — Cars Origin donut primitive
- [x] STEP 4 — Nightingale rose primitive
- [x] STEP 5 — Gapminder radial bar primitive
- [x] STEP 6 — Gate F visual evidence와 사용자 승인
- [x] STEP 7 — Arc semantic mark, materialization policy와 action hierarchy
- [x] STEP 8 — Theta/radius/color grain, edit와 rematerialization lifecycle
- [x] STEP 9 — Public examples, types, contracts와 docs
- [x] STEP 10 — Parameter coverage, selection/highlight와 Phase closeout

## 목표

Phase 5는 backend-neutral closed path로 materialize되는 별도 semantic `arc` mark를 도입한다. 하나의
annular-sector geometry를 재사용하되 아래 세 semantic grain을 구분한다.

- [Cars Origin Donut](../chart/cars-origin-donut.md): color group별 count가 한 바퀴의 각도 비율을 나눔
- [Nightingale Rose Chart](../chart/nightingale-rose-chart.md): month별 equal theta band 안에서 cause별 radius를 overlay
- [Gapminder Radial Bars](../chart/gapminder-radial-bars.md): country별 equal theta band와 life expectancy radius

`graphicSpec`에는 final `M/L/C/Z` command, fill, stroke와 opacity만 저장한다. Renderer는 angle, radius,
aggregate, overlay 또는 arc라는 semantic concept를 해석하지 않는다.

## Public API target

새 direct action은 다음 두 개다.

```typescript
createArcMark(options?: {
  id?: string;
  data?: string;
  innerRadius?: number;
  padAngle?: number;
  fill?: string;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
}): ChartProgram;

editArcMark(options?: {
  target?: string;
  innerRadius?: number;
  padAngle?: number;
  fill?: string;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
}): ChartProgram;
```

- `innerRadius`는 available Polar radius에 대한 `[0, 1)` 비율이며 default는 `0`이다.
- `padAngle`은 public theta와 같은 degree 단위이며 default는 `0`이다.
- Omitted `id`는 첫 arc mark의 stable role ID `"arc"`를 사용한다.
- Appearance와 geometry intent는 mark materialization config가 소유한다.
- Existing `encodeTheta`, `encodeR`, `encodeColor`를 확장하며 chart-specific action은 만들지 않는다.
- Polar radial-axis title은 `position: "inside" | "outside"`를 받는다. Default는 기존 승인 baseline인
  `"inside"`이며 radial baseline midpoint 아래에 놓인다. `"outside"`는 axis endpoint 바깥 방향에
  title을 두고 `offset`을 endpoint와의 간격으로 해석한다.

## Gate F boundary

STEP 6 승인 전에는 semantic `arc` vocabulary, public `createArcMark`/`editArcMark`, arc materializer,
TypeScript surface와 public docs를 구현하지 않는다. STEP 2~5는 source materializer와 독립된 reference
calculation, extension primitive chain, browser Canvas와 high-DPI PNG만 작성한다. Gate F에서는 세 exact target
call chain, primitive source, reference assertions와 PNG를 함께 제시한다.

Gate F는 2026-07-17 승인되었다. 승인 baseline은 Cars count donut, larger-first Nightingale cause overlay,
Gapminder life-expectancy radial bars다. Polar radial-axis title은 baseline midpoint의 `position: "inside"`를
default로 유지하고 endpoint 바깥 배치는 explicit `position: "outside"`로만 선택한다.
