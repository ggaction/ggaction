# Roadmap 3 Phase 4 — Polar Line and Radar

## 진행 상태

- [x] STEP 1 — Phase 계약, target charts와 public option 확정
- [x] STEP 2 — Independent Polar line reference geometry
- [x] STEP 3 — Gapminder open Polar line primitive
- [x] STEP 4 — Jobs closed radar primitive
- [x] STEP 5 — Gate E visual evidence와 사용자 승인
- [ ] STEP 6 — Polar line series grammar와 command policy
- [ ] STEP 7 — Polar line materialization과 `closed` lifecycle
- [ ] STEP 8 — Encoding order, scale, guide와 rematerialization integration
- [ ] STEP 9 — Public examples, types, contracts와 docs
- [ ] STEP 10 — Parameter coverage와 Phase closeout

## 목표

Phase 4는 existing semantic `line` mark를 Polar coordinate에서도 materialize한다. 각 series를 theta domain
order로 정렬하고 resolved theta/radius pair를 final Cartesian point로 변환한 뒤 backend-neutral path commands를
만든다. Renderer는 Polar coordinate나 line closure를 추론하지 않는다.

Gate E는 다음 두 canonical chart를 함께 승인한다.

- [Gapminder Polar Trends](../chart/gapminder-polar-trends.md): continuous theta, grouped open paths
- [Jobs Radar Chart](../chart/jobs-radar-chart.md): categorical theta, grouped closed paths

## Public API change

새 direct action은 추가하지 않는다. Existing line actions에 additive option만 추가한다.

```typescript
createLineMark({ ..., curve?: CurveInterpolation, closed?: boolean }): ChartProgram;
editLineMark({ ..., curve?: CurveInterpolation, closed?: boolean }): ChartProgram;
```

- `closed` default는 `false`다.
- `closed: true`는 각 non-empty series path의 마지막에 `Z` command를 기록한다.
- 첫 Polar line slice는 `curve: "linear"`만 허용한다. Cartesian curve vocabulary는 그대로 유지한다.
- `editLineMark({ closed })`는 semantic encoding을 바꾸지 않고 owned path commands를 rematerialize한다.

## Stored result

- `semanticSpec.layers[*].mark.type`은 기존과 같이 `"line"`이다.
- theta/radius/group/color encoding과 scale/coordinate reference는 semantic state다.
- `closed`, curve와 constant appearance는 line materialization config가 소유한다.
- `graphicSpec`은 series마다 final `M/L[/Z]` command path, stroke, width, dash와 opacity만 저장한다.

## Gate E boundary

STEP 5 전에는 `closed` public option, Polar line source materializer 또는 TypeScript surface를 구현하지 않는다.
STEP 2~4는 독립 reference values와 low-level primitive graphics만 작성한다. Gate E에서 exact target call chains,
primitive source와 두 PNG를 함께 제시하고 명시적 승인을 받은 뒤 STEP 6으로 진행한다.
