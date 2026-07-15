# Jobs Bar Variants

## 목적

Roadmap 1의 jobs grouped bar를 canonical baseline으로 고정하고 Roadmap 2 Phase 3의 bar width mode,
xOffset padding과 reassignment, color layout, vertical/ horizontal bar orientation과 position field-type
compatibility를 검증한다. 실행 순서와 진행 상태는 [`../phase3/GOAL.md`](../phase3/GOAL.md)와 STEP 문서가
관리한다.

## Canonical baseline

```javascript
chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 40, right: 140, bottom: 70, left: 80 }
  })
  .createData({ id: "jobs", values: rows })
  .createBarMark({ id: "bars" })
  .encodeX({ field: "year", fieldType: "ordinal" })
  .encodeY({
    field: "perc",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "sex",
    layout: "group",
    scale: { palette: "tableau10" }
  })
  .encodeBarWidth({ band: 0.72 })
  .createGuides();
```

Baseline은 7,650개 valid row를 사용하고 final grain은 15개 year × `men → women`, y summary는 mean이다.
Observed rect 30개만 만들며 missing category cells는 합성하지 않는다. Phase 3 Step 1 audit에서 primitive와
public program의 semantic state, concrete band/rect, drawing order, 889개 Canvas calls와 decoded PNG pixel
hash가 정확히 같아 이 pair를 canonical oracle로 고정했다.

## Variant 목록

| Variant | Distinctive public call | 핵심 의미 |
| --- | --- | --- |
| `baseline` | 없음 | canonical grouped-bar equivalence |
| `width-pixels` | `encodeBarWidth({ pixels: 14 })` | Canvas logical-pixel fixed width |
| `offset-padding` | `encodeXOffset({ field: "sex", paddingInner: 0.2, paddingOuter: 0.1 })` | inner slot spacing |
| `group-reassignment` | `encodeColor({ field: "job", layout: "group" })` | color+xOffset atomic field replacement |
| `overlay-layout` | `encodeColor({ field: "sex", layout: "overlay" })` | shared baseline and deterministic draw order |
| `diverging-layout` | `encodeColor({ field: "sex", layout: "diverging" })` | separate positive/negative accumulation |
| `temporal-x` | `encodeX({ field: "year", fieldType: "temporal" })` | vertical temporal-position bar |
| `horizontal-bar` | quantitative x + ordinal y | orientation inferred from channel pair |

`group-reassignment`는 시각적으로 읽을 수 있도록 deterministic three-job subset을 사용한다. Public call은
`encodeColor` 하나이며 trace 안에서 matching `encodeXOffset` reassignment가 wrapped child로 실행되어
중간 field mismatch를 노출하지 않는다.

`diverging-layout`은 jobs row를 변경하지 않고 별도 fixture가 `signedPerc`를 deterministic하게 추가한다.
여성 series는 음수, 남성 series는 양수로 두어 positive/negative stack을 모두 보여준다.
`temporal-x`는 원본 numeric `year`를 그대로 사용한다. Temporal auto normalization은 1000–9999 범위의
정수를 UTC calendar year로 해석하며 semantic field 이름을 바꾸거나 derived dataset을 만들지 않는다.
`overlay-layout`과 `diverging-layout`은 grouped baseline을 edit하지 않고 fresh program의 첫 color
assignment에서 final layout을 선택한다.

## Bar width와 offset 계약

```typescript
encodeBarWidth({ target?, band?, pixels? });
encodeXOffset({ field, target?, paddingInner?, paddingOuter?, scale? });
```

- `band`와 `pixels`는 mutually exclusive다.
- 첫 width assignment에서 둘 다 생략하면 `band: 0.72`다.
- `band`는 resolved xOffset slot width의 fraction이며 Canvas resize에 반응한다.
- `pixels`는 logical Canvas pixel 고정값이며 output `pixelRatio`와 무관하다.
- `paddingInner`은 sibling offset step fraction `[0, 1)`, `paddingOuter`는 non-negative outer step
  fraction이며 기본값은 모두 `0`이다.
- Padding은 slot center와 bandwidth를, width action은 slot 안의 final rect width를 소유한다.
- Explicit overlap은 전역 오류가 아니다. Padding으로 zero bandwidth가 되면 오류다.
- Reassignment는 outer x band, color domain과 legend order를 유지한다.

## xOffset reassignment 계약

Grouped bar에서 color와 xOffset field는 같아야 한다. Field 변경은 public `encodeColor({ layout: "group" })`
가 atomic하게 소유하고 matching `encodeXOffset`을 wrapped child로 호출한다. Direct `encodeXOffset` 재호출은
동일 field의 scale identity/order/padding을 변경하거나 유지하는 용도다.

```text
encodeColor(group reassignment)
├─ replace color binding and scale
├─ encodeXOffset(matching field and domain)
├─ rematerialize offset scale
├─ rematerialize bars
└─ rematerialize existing legend
```

Stack/group layout 전환은 companion removal과 old scale cleanup의 별도 계약이 필요하므로 Phase 3에서
지원하지 않는다. Invalid direct mismatch는 earlier program을 바꾸지 않고 오류다.

## Color layout 계약

Phase 3은 accepted vocabulary 전체를 구현하되 gallery에는 distinct bar geometry를 가진 overlay와
diverging를 둔다. Histogram의 fill은 별도 chart contract가 소유한다.

```text
stack      absolute non-negative accumulation from zero
fill       partition total을 1로 정규화한 accumulation
group      xOffset sub-bands
overlay    같은 baseline/position에 declared series order로 겹침
diverging  positive와 negative를 zero 양쪽에 따로 누적
```

- Bar는 다섯 layout을 모두 지원한다.
- Area는 `stack | fill | overlay | diverging` compatibility를 machine coverage로 검증한다.
- Point/line은 layout을 거부한다.
- Library는 overlay opacity를 임의로 바꾸거나 overlap을 오류로 만들지 않는다.
- Diverging automatic quantitative domain은 negative/zero/positive extent를 모두 포함한다.
- Existing layout에서 다른 layout으로 재할당하는 transition은 이 Phase 범위가 아니다.

## Position field-type와 orientation 계약

- Vertical bar: `ordinal | temporal x + quantitative y`.
- Horizontal bar: `quantitative x + ordinal | temporal y`.
- Orientation은 compatible completed channel pair에서 infer하고 별도 mark option으로 중복 저장하지 않는다.
- 현재 temporal position은 `time`, ordinal position은 `ordinal`, quantitative position은 `linear` scale을
  사용한다. `utc`, `band`, `point`와 transformed continuous scale은 Phase 10의 planned vocabulary다.
- Aggregate, bin, stack, ranged channel과 mark grain은 general matrix를 더 좁힐 수 있다.
- Unsupported pair를 다른 field type으로 자동 변환하지 않는다.
- Point, line과 area의 accepted position matrix는 exhaustive unit/contract coverage를 가지며 PNG는 vertical
  temporal bar와 horizontal ordinal bar 두 geometry class만 둔다.

## Action hierarchy

```text
encodeBarWidth
├─ update graphical materialization config
└─ rematerializeBarMark

encodeXOffset(padding or scale reassignment)
├─ replace semantic offset binding/policy
├─ create/edit offset scale
└─ rematerializeBarMark

encodeX/encodeY(orientation completion)
├─ persist compatible channel semantics
├─ infer orientation from completed pair
├─ materialize position scales and bars
└─ rematerialize axes and grids
```

## 완료 조건

- 8개 gallery variant가 승인된 primitive/public pair를 가진다.
- Width/padding/reassignment의 Canvas resize, reversed range와 invalid-boundary matrix가 통과한다.
- Layout별 partition, order, domain과 missing-cell policy가 deterministic fixture로 고정된다.
- Horizontal/vertical orientation과 mark × channel × fieldType compatibility가 executable coverage를 가진다.
- Primitive/public semantic state, concrete graphics, drawing order와 Canvas calls가 정확히 같다.
- Public declarations, docs, action contracts와 executable evidence가 일치한다.
