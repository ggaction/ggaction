# Phase 6 Goal — Density Area Chart

## 목표

Cars dataset의 `Acceleration`을 Origin별 Gaussian KDE로 변환하고, shared value/density
scales를 사용하는 overlaid area chart를 완성한다. 이번 Phase는 density transform,
baseline-oriented area materialization, area color, top multi-column legend를 기존 action
architecture에 통합한다.

완전한 chart 계약은 다음 문서에서 관리한다.

- [`../chart/density-area.md`](../chart/density-area.md)

## 진행 상태

- [x] 목표 chart 분석과 user-facing API 방향 확정
- [x] `densityChannel: "x" | "y"`와 y default 확정
- [x] Phase 6 chart contract와 STEP 계획
- [x] Deterministic grouped KDE fixture
- [x] Primitive density-area baseline
- [x] Density grammar와 immutable derived-data actions
- [x] Baseline-oriented area materialization
- [x] Atomic `encodeDensity`
- [x] Area color grouping과 rematerialization
- [x] Top legend layout와 area swatch applicability
- [x] `createGuides`와 title/top-margin integration
- [x] Public vertical slice
- [x] Documentation, browser verification, cleanup

## 최종 public flow

```text
createCanvas
→ createData
→ createAreaMark
→ encodeDensity
→ encodeColor
→ createGuides(horizontal/vertical grids, top legend)
→ createTitle
```

`encodeDensity`는 x/y가 서로 의존하고 derived dataset binding 없이는 mark가 불완전하므로
atomic domain action이다. Default는 value→x, density→y이고 `densityChannel: "x"`가
방향을 뒤집는다.

## 실행 순서

```text
STEP1  grouped KDE statistical fixture
STEP2  primitive density-area baseline
STEP3  density grammar and derived data
STEP4  density baseline area materialization
STEP5  atomic encodeDensity
STEP6  area color encoding
STEP7  top categorical legend layout
STEP8  createGuides and title integration
STEP9  final public action program and equivalence
STEP10 browser, PNG, docs, cleanup, Phase closure
```

## 완료 조건

- Public chain이 chart contract와 일치하고 raw dataset/graphic ID를 노출하지 않는다.
- `encodeDensity({ field, groupBy, bandwidth })` shortest target call이 작동한다.
- y-density default와 explicit x-density가 모두 valid semantic/graphic 결과를 만든다.
- Grouped Gaussian KDE가 shared extent와 deterministic uniform samples를 사용한다.
- Horizontal/vertical grids가 모두 기본 density chart guide로 materialize된다.
- Source dataset, derived values와 이전 `ChartProgram`이 immutable하다.
- Origin마다 하나의 baseline-closed path가 만들어지고 color domain order를 따른다.
- Top legend의 position/direction/columns/offset/titlePosition이 일반 categorical layout으로
  동작한다.
- Title, legend와 plot이 충분한 top margin에서 겹치지 않고 부족하면 오류를 낸다.
- Primitive/public `graphicSpec`, order와 renderer calls가 정확히 같다.
- Browser Canvas, 2× PNG, unit, acceptance, docs, coverage와 full regression이 통과한다.

## 완료 결과

Phase 6의 public/primitive 결과는 동일한 semantic/graphic state와 Canvas 호출을 만든다.
최종 chart는 406개 source row에서 Origin별 100개 sample, 총 300개 derived row와 3개
baseline-closed area path를 생성한다. Browser Canvas는 `720×500`, PNG는 pixel ratio 2에서
`1440×1000`이며 title, subtitle, top legend와 plot이 겹치지 않는다.

- Unit/acceptance/docs: 403 passed
- Representative PNG regression: 6 passed
- Coverage: lines 94.46%, branches 89.62%, functions 98.56%
- Browser console warning/error와 page error: 0건

## 참고 의미

Vega-Lite density transform은 Gaussian KDE, observed extent, grouped shared resolution,
`minsteps: 25`, `maxsteps: 200`을 제공한다. Phase 6의 초기 ggaction contract는 output을
더 직접적으로 재현할 수 있도록 exact `steps`를 노출하고 default를 `100`으로 고정한다.

- <https://vega.github.io/vega-lite/docs/density.html>
- <https://vega.github.io/vega/docs/transforms/kde/>
