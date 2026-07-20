# Gapminder Horizon chart contract

## Chart 목표

Gapminder의 Kenya life expectancy를 55년 baseline 위·아래의 세 Horizon band로 접어 한 compact area chart에
표현한다. Positive band는 blues, negative band는 reds를 쓰고 x축만 노출한다.

## 최종 user-facing API

```javascript
chart()
  .createCanvas({
    width: 760,
    height: 300,
    margin: { top: 78, right: 30, bottom: 58, left: 50 }
  })
  .createData({ values: gapminder })
  .filterData({
    id: "kenya",
    field: "country",
    oneOf: ["Kenya"]
  })
  .createAreaMark({ curve: "monotone" })
  .encodeHorizon({
    x: "year",
    y: "life_expect",
    bands: 3,
    baseline: 55,
    palette: {
      positive: "blues",
      negative: "reds"
    }
  })
  .createGuides()
  .createTitle({
    text: "Kenya Life Expectancy",
    subtitle: "Blue above, red below · three folded bands around 55 years"
  });
```

Gate primitive는 같은 11개 Kenya rows를 명시적으로 보존한다.

## 최소 호출과 inference

```javascript
chart()
  .createData({ values: kenyaRows })
  .createAreaMark()
  .encodeHorizon({ x: "year", y: "life_expect" });
```

- `target`은 current area, 없으면 unique area에서 추론한다.
- `source`는 target data, current data, unique data 순으로 추론한다.
- `x`와 `y`는 explicit option, target의 compatible stored encoding, unique compatible source layer 순으로
  추론한다.
- `groupBy`는 explicit option, stored group encoding 순으로 추론하며 없으면 single series다.
- Explicit 값은 언제나 inference보다 우선하고 ambiguous candidate는 오류다.
- x는 Phase 9에서 temporal 또는 quantitative, y는 quantitative다.

## Public action 계약

```typescript
encodeHorizon({
  target?, source?, x?, y?, groupBy?,
  bands?, baseline?, extent?, resolve?, missing?, overflow?, palette?
}): ChartProgram;

editHorizon({
  target?, source?, x?, y?, groupBy?,
  bands?, baseline?, extent?, resolve?, missing?, overflow?, palette?
}): ChartProgram;
```

- Defaults: `bands: 3`, `baseline: 0`, `extent: "auto"`, `resolve: "shared"`,
  `missing: "break"`, `overflow: "clip"`.
- Default palette는 positive `blues`, negative `reds`다.
- `editHorizon`은 partial edit이고 omitted option은 보존한다. `groupBy: false`는 grouping을 제거한다.
- Empty edit은 오류다. Source/x/y/group/options 변경은 original source에서 새 derived revision을 만든다.
- Horizon은 target area의 기존 `curve` appearance를 그대로 존중한다. 곡선은 `createAreaMark`/`editAreaMark`가
  소유하며 `encodeHorizon`에 중복 옵션을 만들지 않는다.
- Phase 9는 `createHorizonPlot` facade와 automatic Horizon legend를 추가하지 않는다.

## Action hierarchy

```text
encodeHorizon
├─ createDerivedData
├─ materializeHorizonData
├─ editSemantic(layer data)
├─ encodeX
├─ encodeY
├─ encodeY2
├─ encodeGroup
├─ encodeColor
└─ rematerializeAreaMark
```

Pure sorting, crossing, band calculation helper는 trace node가 아니다.

## Stored result

- Source dataset은 immutable하고 Horizon derived dataset이 transform provenance를 소유한다.
- Transform은 source, x/y input binding, optional group, requested/resolved extent, bands, baseline, missing,
  overflow, palette와 generated output names를 저장한다.
- Generated layer encoding은 ordinary x/y/y2/group/color channel만 사용한다.
- Concrete band center, closed path commands와 sampled colors는 `graphicSpec`에만 저장한다.
- Renderer는 Horizon semantic state를 읽지 않고 ordinary path commands만 그린다.

## Guide와 composition

- `createGuides()`는 raw x axis만 만들고 folded amplitude y axis/grid와 automatic legend를 만들지 않는다.
- Facet `shared`는 parent source에서 one extent, `independent`는 child filter 뒤의 per-cell extent를 사용한다.
- 같은 coordinate의 multiple groups overlay는 허용하되 group order와 sign/band z-order는 deterministic하다.

## Non-goals

- Temporal aggregation, resampling 또는 data smoothing
- Horizon 전용 curve alias; 기존 area `curve`를 사용한다.
- Ordinal x baseline-cross interpolation
- Renderer-side clipping 또는 semantic inference
- One-shot `createHorizonPlot` facade
- Interactive legend나 animation
