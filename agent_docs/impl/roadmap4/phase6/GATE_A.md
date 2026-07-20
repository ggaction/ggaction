# P6-A — `FillPaint`, density profile과 Cars primitive GradientPlot 검토

## 상태

- Gate: `P6-A`
- 상태: `ready-for-review`
- Review source checkpoint: `924db18` (`prepare gradient plot review gate`)
- Remote: `origin/main`
- 이후 차단: public `createGradientPlot`/`editGradientPlot`, stable owner lifecycle와 materializer

이 Gate는 범용 paint value 경계와 GradientPlot의 통계·시각 기본값만 승인한다. Public facade는 아직 runtime,
TypeScript declaration과 Current action inventory에 존재하지 않는다.

## 승인 대상

### 1. Exact `FillPaint` contract

```typescript
type FillPaint = string | LinearGradientPaint;

type LinearGradientPaint = {
  type: "linear-gradient";
  from: { x: number; y: number };
  to: { x: number; y: number };
  stops: readonly { offset: number; color: string }[];
};
```

- `from`/`to`는 item-local bounds의 `[0, 1]` normalized 좌표이고 서로 달라야 한다.
- Stop은 최소 2개이고 offset은 `[0, 1]` 안에서 nondecreasing이다. 같은 인접 offset은 hard stop이다.
- Stop은 `{ offset, color }`만 저장한다. GradientPlot opacity intent는 alpha-bearing concrete color로 materialize한다.
- Paint object 전체는 하나의 `fill` scalar다. Collection broadcast가 내부 `stops`를 item별 값으로 분배하지 않는다.
- 첫 지원 owner는 rect와 closed path다. Stroke, circle/text fill, open path, radial/conic/pattern과 user-space 좌표는 제외한다.
- Renderer는 final item bounds에서 backend gradient를 일시적으로 생성하며 backend object를 program state에 저장하지 않는다.

### 2. Density/profile contract와 defaults

- Gaussian kernel, `bandwidth: "auto"`, shared auto extent, `steps: 64`, `normalization: "unit"`
- Category order는 first eligible source appearance다.
- 모든 category가 하나의 value extent와 global maximum intensity를 공유한다.
- Category당 one immutable profile row:
  `{ category, values[64], intensities[64], lower, upper, center, count }`
- Profile dataset에는 palette, concrete color, paint 또는 backend object가 없다.
- 기본 width는 `{ band: 0.7 }`, palette는 `blues`, opacity range는 `[0, 1]`, body outline은 없음이다.
- Origin categorical color encoding이 있으면 각 category hue가 달라지고 density가 hue별 lightness/opacity를
  조절한다. Density legend는 특정 Origin으로 오해되지 않도록 neutral ramp를 사용한다.
- 기본 center는 median dark rule, `1.5` logical pixels다.

Cars independent oracle은 production source를 import하지 않으며 다음 literal anchor를 고정한다.

| 값 | 결과 |
| --- | --- |
| category order | `USA`, `Europe`, `Japan` |
| eligible counts | `254`, `73`, `79` |
| resolved bandwidth | `0.8268955773467528` |
| shared extent | `[8, 24.8]` |
| global max density | `0.1894893456244104` |
| medians | `15`, `15.7`, `16.4` |

### 3. 목표 public chain

아래 exact chain은 P6-A 승인 후 구현할 목표다. 현재 executable primitive는 이 facade를 호출하지 않는다.

```javascript
chart()
  .createCanvas({
    width: 620,
    height: 460,
    margin: { top: 85, right: 170, bottom: 95, left: 80 }
  })
  .createData({ values: cars })
  .createGradientPlot({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Acceleration" },
    density: { bandwidth: "auto", steps: 64 },
    width: { band: 0.7 },
    gradient: { opacity: [0, 1] },
    center: { type: "median" },
    guides: {
      axes: {
        x: { title: { text: "Origin" } },
        y: { title: { text: "Acceleration" } }
      },
      legend: { title: "Relative density", position: "right" }
    }
  })
  .encodeColor({
    target: "gradientPlot",
    field: "Origin",
    fieldType: "nominal",
    scale: { palette: "tableau10" }
  })
  .createTitle({
    text: "Acceleration Distribution by Origin",
    subtitle: "Gradient intensity shows the within-origin density",
    align: "center"
  });
```

Shortest direct call은 x/y만 필요하다. Compatible encoded owner가 하나이면 `createGradientPlot()`이 이를 추론하고,
create-before-encode도 incomplete owner를 만든 뒤 같은 final state로 수렴하는 것이 승인 후 구현 범위다.

## Primitive와 stored result

- Exact primitive: [`test/gates/cars-gradient-plot/primitive.program.js`](../../../../test/gates/cars-gradient-plot/primitive.program.js)
- Independent oracle: [`test/oracles/gradient.js`](../../../../test/oracles/gradient.js)
- Canonical fixture/target chain: [`test/gates/cars-gradient-plot/manifest.js`](../../../../test/gates/cars-gradient-plot/manifest.js)

Compact state:

```text
semantic datasets
└─ carsAccelerationProfiles: 3 rows × 64 samples

semantic layers
├─ gradientPlot: rect, x=origin, y=lower, y2=upper
└─ gradientPlotCenter: rule, x=origin, y=center

graphic tree
canvas
├─ plot
│  ├─ grid
│  ├─ gradientPlot: 3 rects × 64 concrete stops
│  ├─ gradientPlotCenter: 3 rules, 1.5px
│  └─ axes and labels
├─ densityLegend
├─ densityLegendLabels
├─ densityLegendTitle
├─ chartTitle
└─ chartSubtitle
```

Primitive trace는 168개의 explicit `editSemantic`/`createGraphics`/`editGraphics` root action으로 구성된다. Public
GradientPlot operation은 trace에 없으며 runtime method와 `types/program.d.ts`에도 없다.

## Rendered evidence

- Node PNG: `.artifacts/test/png/review/cars-gradient-plot/acceleration-by-origin/primitive.png`
- Metadata: `.artifacts/test/png/review/cars-gradient-plot/acceleration-by-origin/variant.json`
- Browser page: `test/gates/cars-gradient-plot/browser.html`
- Browser state: logical `620 × 460`, physical Canvas `1240 × 920`, 3 density strips, console/page error 없음

PNG와 Browser Canvas는 같은 primitive program과 `graphicSpec`을 사용한다. Artifact는 active-review scope이므로
gitignored이며 승인 후 public facade와 exact parity가 완성될 때 approved chart scope로 이동한다.

## 검증 증거

| 검증 | 결과 |
| --- | --- |
| `npm run test:gates` | 8/8 pass |
| `npm test` | 1,663/1,663 pass |
| render suite | 117/117 pass; review PNG 생성 |
| artifact gallery browser | approved/review gallery pass |
| full Browser suite | 33/33 pass |
| Gate Browser page | headless Chromium pass |
| `npm run test:docs` | 32/32 pass |
| `npm run package:check` | 339 entries, pass |
| `npm run test:package` | Node/extension/PNG/TypeScript/private-export checks pass |
| `npm run docs:verify` | local Ruby preflight에서만 차단: Ruby 2.6.10, required 3.2+ |

Docs generator, links, signatures, search, image manifest와 LLM output은 갱신·검증했다. Jekyll built-site 검증은 코드
실패가 아니라 repository가 요구하는 Ruby 3.2+가 이 workstation에 없어 실행되지 않았다. Docs는 배포하지 않았다.

## 호환성과 승인 후 작업

- 기존 string fill은 동일한 property와 renderer path를 유지한다.
- `FillPaint`와 관련 type은 root/extension entry에서 additive export다.
- Public chart authoring action은 추가되지 않아 기존 chart API와 action inventory는 변하지 않는다.
- P6-A 승인 후에만 generated profile revision, stable owner, `createGradientPlot`/`editGradientPlot`, rematerialization,
  selection/highlight와 primitive/public exact parity를 구현한다.

## 승인 질문

다음을 하나의 P6-A 계약으로 승인하는가?

1. Exact item-local `LinearGradientPaint` schema와 rect/closed-path 범위
2. Shared/global grouped-density policy와 위 defaults
3. Cars primitive의 strip 폭, Origin별 hue와 density opacity mapping, outline 없는 body, 기본 median rule,
   neutral right density legend와 목표 public chain
