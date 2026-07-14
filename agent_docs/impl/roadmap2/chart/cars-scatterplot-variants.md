# Cars Scatterplot Variants

## 목적

Roadmap 1에서 구현한 cars scatterplot을 하나의 canonical baseline으로 고정하고, Roadmap 2의
scale editing, point appearance, encoding reassignment, continuous color와 field-driven opacity를
독립적으로 검증한다. 모든 variant는 같은 cars dataset과 point-mark vertical slice를 재사용한다.

이 문서는 Phase 1의 완전한 chart/variant 계약이다. 실행 순서와 진행 상태는
[`../phase1/GOAL.md`](../phase1/GOAL.md)와 각 STEP 문서가 관리한다.

## Canonical baseline

```javascript
chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 30, bottom: 60, left: 70 }
  })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin" })
  .encodeRadius({ value: 3 })
  .createGuides({
    axes: {
      x: { title: { text: "Horsepower" } },
      y: { title: { text: "Miles per Gallon" } }
    }
  });
```

Phase 1 Step 1 audit에서 기존 baseline primitive/public의 point color와 grid 차이를 확인했다.
Canonical primitive는 horizontal grid와 first-appearance Origin color order를 포함하도록 다시 작성해
Gate 0 승인을 받았으며, public program의 concrete `graphicSpec`, rendering order와 Canvas calls는
그 primitive와 정확히 같다.

## Variant 목록

| Variant | 목표 user-facing distinctive call | 핵심 의미 |
|---|---|---|
| `baseline` | 없음 | canonical equivalence |
| `scale-reverse` | `.editScale({ id: "x", reverse: true })` | 기존 x scale의 방향 편집 |
| `point-shape-diamond` | `.editPointMark({ target: "points", shape: "diamond" })` | constant mark appearance 편집 |
| `shape-vocabulary` | 최초 `.encodeShape({ field: "Name", scale: { range: pointShapes } })` | 12종 shape geometry와 legend recipe |
| `categorical-palette` | 최초 `.encodeColor({ field: "Origin", scale: { palette: "set2" } })` | named categorical palette |
| `encoding-reassignment` | X/Y/color/size/shape encoding 재호출 | 기존 channel binding의 atomic 교체 |
| `continuous-color-gradient` | `.encodeColor({ field: "Acceleration", fieldType: "quantitative" })` | sequential color와 gradient legend |
| `field-opacity-legend` | `.encodeOpacity({ field: "Acceleration" })` | quantitative opacity와 sample legend |

Gallery metadata에는 helper 이름이 아니라 각 variant가 실제로 실행할 expanded user-facing chain을
저장한다. 표의 distinctive call은 중복을 줄이기 위한 문서 표기다. Shape와 palette variant는
reassignment를 선행 구현하지 않도록 해당 encoding option을 최초 호출에 넣는다.

## Variant 데이터와 시각 계약

### Shape vocabulary

유효한 첫 12개 cars row를 사용하고 unique `Name`을 shape domain으로 사용한다. Automatic range는
다음 canonical 순서를 사용한다.

```text
circle, square, diamond,
triangle-up, triangle-down, triangle-left, triangle-right,
plus, cross, star, hexagon, wye
```

12개 shape가 모두 한 번 이상 보여야 한다. Size가 동일하면 recipe 종류와 관계없이 동일한 logical
target area를 나타낸다. 13번째 category는 자동 반복하지 않고 오류다.

Shape legend는 explicit `channels: ["shape"]`를 사용한다. 긴 Name labels와 12개 symbol이 plot과
겹치지 않도록 variant Canvas는 충분한 right margin을 명시하며 library가 Canvas를 자동 확장하지 않는다.

### Categorical palette

Origin color encoding을 만들 때 `scale.palette: "set2"`를 최초부터 전달한다. Color-only categorical
legend는 explicit `channels: ["color"]`로 생성한다. Legend가 있는 variant는 baseline보다 넓은 Canvas와
충분한 right margin을 명시하며 resolved palette colors가 points와 legend swatches에서 같아야 한다.

### Encoding reassignment

Baseline을 만든 뒤 같은 action을 다시 호출한다.

```javascript
program
  .encodeX({ field: "Displacement" })
  .encodeY({ field: "Acceleration" })
  .encodeColor({ field: "Cylinders", fieldType: "nominal" })
  .encodeSize({ field: "Weight_in_lbs" })
  .encodeShape({ field: "Origin" });
```

Omitted scale ID는 해당 channel의 현재 scale ID를 재사용한다. 새 field에서 domain과 concrete mark를
다시 계산하고 inferred guide title은 갱신한다. Explicit custom guide title과 appearance config는
보존한다. 이전 named scale은 자동 삭제하지 않는다.

### Continuous color

`Acceleration`의 quantitative extent를 sequential color domain으로 사용한다. Default palette는
`viridis`, default interpolation은 `rgb`다. Point child는 이미 계산된 concrete CSS fill을 저장하고
right-position gradient legend는 기본 5개 label을 표시한다.

Phase 1은 sequential mapping을 shared internal scale grammar로 구현하지만 public entry는
`encodeColor`와 color legend로 제한한다. General `createScale`/`editScale` sequential support와
다른 appearance channel의 transformed scale vocabulary는 Phase 10에서 완성한다.

### Field-driven opacity

`Acceleration`의 quantitative extent를 auto domain으로, `[0.2, 1]`을 auto range로 사용한다.
각 point child는 concrete opacity를 저장한다. Opacity legend는 기본 5개 representative values를
ascending domain order로 표시한다. Constant opacity는 scale/legend를 만들지 않으며 field mode와
atomic하게 전환할 수 있다.

## Action hierarchy

```text
editScale
├─ editSemantic(scale patch)
└─ run scale materialization plan
   ├─ rematerializePointMark
   ├─ rematerializeAxes / rematerializeGrid?
   └─ rematerializeLegend?

editPointMark
├─ update point materialization config
├─ rematerializePointMark
└─ rematerializeLegend?

encodeX / encodeY reassignment
├─ edit or create scale
├─ replace semantic channel binding
├─ rematerializePointMark
└─ rematerialize position guides

encodeColor / encodeSize / encodeShape reassignment
├─ edit or create scale
├─ replace semantic channel binding
├─ rematerializePointMark
└─ rematerializeLegend?

encodeOpacity(field)
├─ create or edit opacity scale
├─ replace semantic opacity binding
├─ rematerializePointMark
└─ rematerializeLegend?
```

`?`는 해당 consumer가 이미 존재하거나 `createGuides`가 applicable channel을 선택했을 때만 호출한다.
Materialization plan은 동일 consumer를 중복 실행하지 않고 deterministic order를 유지한다.

## Contract 정합성 결정

- `editPointMark.shape`는 `"circle" | "square"`가 아니라 shared `PointShape` 12종을 받는다.
- Phase 1의 `editScale`은 accepted current vocabulary인 `linear | time | ordinal`만 편집한다.
- Sequential color의 scale option 변경은 Phase 1에서 owning `encodeColor` reassignment가 담당한다.
  General sequential `editScale`은 Phase 10까지 public contract가 아니다.
- Named palette 68종은 frozen internal registry에서 해결한다. Gallery는 대표 family만 시각화하고
  전체 이름과 boundary는 기계적 테스트로 검증한다.

## 완료 조건

- 모든 gallery variant가 primitive 승인 뒤 user-facing pair를 가진다.
- 각 pair의 concrete `graphicSpec`, order와 Canvas calls가 정확히 같다.
- 12개 shape와 68개 palette name은 exhaustive machine coverage를 가진다.
- Reassignment는 current scale reuse, explicit new scale, inferred/custom guide title과 failure atomicity를
  검증한다.
- Canvas resize와 scale/mark/legend edit가 모든 graphical consumer를 rematerialize한다.
- 이전 program과 caller-owned rows는 변경되거나 retain되지 않는다.
- Public declarations, action reference, examples, tutorials와 contract catalog가 구현과 일치한다.
