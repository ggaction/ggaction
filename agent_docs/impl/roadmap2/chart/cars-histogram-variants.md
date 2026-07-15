# Cars Histogram Variants

## 목적

Roadmap 1의 cars histogram을 canonical baseline으로 고정하고 Roadmap 2 Phase 3의 bin mode,
histogram reassignment, normalized stack과 histogram color layout을 독립적으로 검증한다. 실행 순서와
진행 상태는 [`../phase3/GOAL.md`](../phase3/GOAL.md)와 STEP 문서가 관리한다.

## Canonical baseline

```javascript
chart()
  .createCanvas({
    width: 432,
    height: 460,
    margin: { top: 80, right: 60, bottom: 130, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createBarMark({ id: "bars" })
  .encodeHistogram({
    field: "Displacement",
    maxBins: 10,
    xScale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "Origin",
    scale: { palette: "tableau10" }
  })
  .createGuides({ legend: { position: "bottom" } })
  .createTitle({
    text: "Displacement distribution",
    subtitle: "by country",
    align: "center"
  });
```

Baseline은 finite `Displacement`와 non-empty `Origin`만 사용한다. x는 최대 10개의 nice bin, y는
Origin별 zero stack count다. Primitive와 public program의 complete semantic state, concrete rect,
drawing order와 Canvas calls는 Phase 3 Step 1에서 다시 감사해 하나의 canonical oracle로 고정한다.

## Variant 목록

| Variant | Distinctive public call | 핵심 의미 |
| --- | --- | --- |
| `baseline` | 없음 | canonical equivalence |
| `bin-step` | `encodeHistogram({ field: "Displacement", binStep: 50 })` | zero-anchored exact-width bins |
| `bin-boundaries` | `binBoundaries: [50, 100, 150, 225, 300, 400, 500]` | irregular explicit intervals |
| `field-reassignment` | `encodeHistogram({ field: "Horsepower", maxBins: 8 })` | complete histogram replacement |
| `normalized-stack` | `encodeColor({ field: "Origin", layout: "fill" })` | partition-normalized `[0, 1]` stack |

`field-reassignment`는 guides, legend와 title까지 완성된 baseline에 두 번째 `encodeHistogram`을 호출한다.
따라서 새 bin/count만이 아니라 axes, grids, bars와 existing color stack의 complete rematerialization을
검증한다. Metadata에는 helper 이름이 아니라 expanded final public chain을 저장한다.
`normalized-stack`은 기존 stack layout을 edit하지 않고 fresh program의 첫 color assignment에서
`layout: "fill"`을 선택한다.

## Bin 계약

세 bin mode는 mutually exclusive다.

```text
maxBins       → data와 scale policy에서 최대 개수에 가까운 nice boundaries
binStep       → zero를 anchor로 하는 exact positive-width boundaries
binBoundaries → author가 제공한 strictly increasing finite boundaries
```

- 셋을 모두 생략하면 `maxBins: 10`이다.
- `binStep`과 auto domain은 data extent를 포함하는 step 배수로 양 끝을 확장한다.
- Explicit x domain과 `binStep`을 함께 쓰면 endpoint와 span이 step grid에 맞아야 한다.
- `binBoundaries`는 최소 두 값이며 first/last가 전체 finite data extent를 포함해야 한다.
- Interval은 `[lower, upper)`이고 마지막 interval만 upper endpoint를 포함한다.
- Empty interval은 semantic bin에는 남지만 default graphic은 zero-height rect를 합성하지 않는다.
- Resolved mode와 concrete boundaries는 semantic state에 저장한다. Renderer는 bin policy를 해석하지 않는다.

Gallery는 exact step과 irregular boundaries만 대표로 사용한다. Negative data, constant data, single bin,
very large `maxBins`, exclusivity, explicit-domain conflict와 invalid boundaries는 machine coverage로 검증한다.

## Histogram reassignment 계약

같은 bar target에 `encodeHistogram`을 다시 호출하면 binned x와 count y를 하나의 atomic action으로
교체한다. Omitted stack은 기존 mode를, omitted compatible scale option은 기존 scale identity와 policy를
유지한다. 새 field에 맞춰 다음 consumer를 deterministic order로 rematerialize한다.

```text
encodeHistogram(reassignment)
├─ encodeX(new field and bin mode)
├─ encodeY(count and retained stack mode)
├─ rematerialize x/y scales
├─ rematerialize bars
├─ rematerialize axes and grids
└─ rematerialize existing color legend when required
```

새 field, bin mode 또는 downstream consumer가 invalid이면 이전 `ChartProgram`의 semantic, graphic, private
materialization config와 trace는 모두 유지된다. 이전 named scale resource는 자동 삭제하지 않는다.

## Normalized stack 계약

`encodeColor({ layout: "fill" })`은 wrapped y assignment로 `stack: "normalize"`를 저장한다. 각 x/bin
partition의 non-negative count를 합계 1로 정규화하고 zero baseline부터 누적한다.

- Automatic y domain은 `[0, 1]`이다.
- Partition 합계가 0이거나 valid value가 없으면 rect를 합성하지 않는다.
- Negative input은 normalized-stack grammar에서 오류다.
- Color domain order와 legend order는 stack order와 동일하다.
- `fill`은 high-level color layout, `normalize`는 low-level y stack vocabulary다.
- Existing layout을 다른 layout으로 전환하는 broader cleanup contract는 이 Phase 범위가 아니다.

## Action hierarchy

```text
encodeColor(layout: "fill")
├─ create/edit color scale
├─ encodeY(stack: "normalize")
├─ rematerialize y scale
├─ rematerialize bars
├─ rematerialize horizontal grid and y axis
└─ rematerialize legend
```

## 완료 조건

- 5개 gallery variant가 승인된 primitive/public pair를 가진다.
- Bin mode와 reassignment가 scale, mark, axes, grids와 legend를 빠짐없이 갱신한다.
- Numeric bin/count reference는 production histogram grammar와 독립적이다.
- Normalized partition의 합과 y domain을 numeric invariant로 검증한다.
- Earlier program과 caller-owned data/options는 변경되거나 retain되지 않는다.
- Public declarations, docs, action contracts와 executable evidence가 일치한다.
