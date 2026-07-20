# Cars acceleration gradient plot

## 상태

`planned` — Roadmap 4 Phase 6의 primitive-first visual contract다. Exact paint schema와 defaults는 P6-A에서 승인한다.

## 차트 목표

Cars의 `Origin`별 `Acceleration` 분포를 category당 하나의 vertical gradient strip으로 표현한다. Value 구간의
색 농도는 deterministic kernel density를 나타내고 median rule은 중심을 표시한다. 이 차트는 BoxPlot의
categorical/quantitative positional contract를 공유하지만 quartile box, whisker와 outlier 대신 연속적인 분포
profile을 보여준다.

관측 Cars row를 입력하면 관측 분포를 나타낸다. Bootstrap/posterior draw를 같은 API에 입력하면 그때는
inferential uncertainty를 나타낸다. Example과 public docs는 두 의미를 혼동하지 않는다.

## 목표 user-facing API

```javascript
const program = chart()
  .createCanvas({
    width: 520,
    height: 460,
    margin: { top: 90, right: 105, bottom: 70, left: 75 }
  })
  .createData({ values: cars })
  .createGradientPlot({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Acceleration" },
    density: {
      bandwidth: "auto",
      steps: 64,
      kernel: "gaussian",
      normalization: "unit"
    },
    width: { band: 0.7 },
    gradient: {
      palette: "blues",
      opacity: [0, 1]
    },
    center: {
      type: "median",
      stroke: "#111827",
      strokeWidth: 1.5
    },
    guides: {
      axes: {
        x: { title: { text: "Origin" } },
        y: { title: { text: "Acceleration" } }
      },
      legend: { title: "Relative density", position: "right" }
    }
  })
  .createTitle({
    text: "Acceleration Distributions by Origin",
    subtitle: "Gradient intensity shows estimated density",
    align: "center"
  });
```

Shortest direct call은 x/y만 필요하다. Compatible encoded owner가 하나 있으면 `createGradientPlot()`으로 추론할
수 있고, owner를 먼저 만든 뒤 `encodeX`/`encodeY`로 완성하는 흐름도 같은 final state를 만든다.

## 의미와 concrete 구조

- x는 categorical, y는 quantitative이므로 vertical strip이다. 반대 역할이면 horizontal strip이다.
- Category order는 first eligible source appearance다.
- Shared value extent에서 category별 density를 계산하고 one global density range로 intensity를 비교한다.
- Generated profile dataset은 category당 한 row를 가지며 value/intensity samples, lower/upper와 center를 저장한다.
  Palette color와 normalized paint endpoints는 저장하지 않는다.
- Concrete gradient body는 category당 rect 하나다. Median은 optional rule child이며 `center: false`이면 관련
  semantic, config, graphic과 trace child가 모두 없다.
- Grid는 mark 뒤가 아니라 gradient body 뒤쪽 plot sibling으로 explicit placement되고 axes/legend/title은 위에 온다.

## 목표 action hierarchy

```text
createGradientPlot
├─ createGradientProfileData (internal wrapped component)
│  ├─ createDerivedData
│  └─ materializeGradientProfileData
├─ createRectMark
├─ encode category position
├─ encode quantitative lower/upper range
├─ materializeGradientPlotFill
├─ createRuleMark + position encodings (center enabled)
└─ createGuides (unless disabled)
```

```text
editGradientPlot
├─ createGradientProfileData(new revision, statistical edits only)
├─ rebindLayerData
├─ releaseDerivedData(old revision when orphaned)
├─ reconcile optional center rule
└─ rematerialize gradient body, center, scales and guides
```

## 검증 계약

- Independent density/profile oracle와 literal Cars category vectors
- Category당 한 profile row/rect, count/area/non-negativity/order invariants
- Primitive/public semantic, graphic tree, draw order, Canvas-call과 decoded-pixel exact parity
- String fill regression과 vertical/horizontal/reversed/hard-stop/multi-stop paint fixtures
- create-before-encode/encode-before-create, explicit/target-inferred calls와 ambiguity errors
- Density edit revision/rebind/release, appearance-only revision retention, center disable/restore
- Canvas/scale/data rematerialization, selection grain, Browser Canvas, Node PNG, package and docs parity
