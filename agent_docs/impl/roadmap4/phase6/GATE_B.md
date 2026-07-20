# P6-B — GradientPlot public facade와 exact parity 검토

## 상태

- Gate: `P6-B`
- 상태: `ready-for-review`
- Review source checkpoint: `c7fd4c4` (`verify gradient plot facade parity`)
- Remote: `origin/main`
- 이후 차단: Step 5 consumer matrix, facet/filter replay, Phase 6 closeout와 P6-Exit

이 Gate는 승인된 P6-A 통계·시각 계약을 public `createGradientPlot`/`editGradientPlot` resource로 완성한 결과를
검토한다. P6-B 승인 전에는 Phase closeout이나 다음 Phase로 진행하지 않는다.

## 검토할 public chain

실행 소스는 [`test/gates/cars-gradient-plot/action.program.js`](../../../../test/gates/cars-gradient-plot/action.program.js)다.

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

Top-level trace는 표시된 호출과 정확히 같은
`createCanvas → createData → createGradientPlot → encodeColor → createTitle`이다.

## Stored state와 action hierarchy

```text
semantic datasets
├─ data: immutable Cars raw rows
└─ gradientPlotProfileData
   ├─ source: data
   ├─ requested: auto bandwidth/extent, 64 Gaussian unit samples
   ├─ resolved: bandwidth, shared extent, global intensity domain
   └─ 3 category profile rows

semantic layers
├─ gradientPlot: rect owner, x=Origin, y=lower, y2=upper, color=Origin
└─ gradientPlotCenter: rule child, x=Origin, y=median

graphic tree under canvas
├─ grid
├─ gradientPlot: 3 rects × 64 concrete gradient stops
├─ gradientPlotCenter: 3 rules × 1.5px
├─ axes
├─ neutral density legend
└─ title/subtitle
```

`createGradientPlot` trace 아래에는 `createRectMark`, x/y encoding, `createGradientProfileData`,
`materializeGradientProfileData`, `materializeGradientPlotFill`, optional `createGradientPlotCenter`, `createGuides`,
`createGradientPlotLegend`가 wrapped children으로 남는다. 별도의 semantic→graphic compiler는 없다.

`editGradientPlot`은 다음 lifecycle을 소유한다.

- width, palette, opacity와 center style만 바꾸면 기존 profile ID를 유지한다.
- density 또는 center statistic을 바꾸면 raw source에서 새 immutable profile revision 하나를 만들고 owner/center를
  재연결한 뒤 orphan인 이전 revision만 제거한다.
- `center: false`는 semantic layer, graphic과 materialization config를 모두 제거한다.
- 이후 `center: {}`는 같은 stable role 아래 기본 median resource를 다시 만든다.

## 독립 oracle과 exact parity

두 증거를 분리해 검증했다.

1. P6-A의 독립 primitive는 production source를 import하지 않고 Cars grouped-density literal anchor와 approved visual
   target을 계속 소유한다.
2. Public facade를 하위 component action으로 완전히 펼친
   [`expanded.program.js`](../../../../test/gates/cars-gradient-plot/expanded.program.js)는 facade와 `semanticSpec`,
   `graphicSpec`, attachment tree, draw order와 mock Canvas calls가 모두 exact deep equality다.

공개 profile은 독립 oracle과 category order, 64개 sample values/intensities, shared lower/upper, median과 count까지
정확히 같다. Reverse value scale에서는 stop color/offset 배열은 유지되고 item-local `from`/`to` 방향만 뒤집힌다.

## Rendered evidence

- Approved independent primitive:
  `.artifacts/test/png/review/cars-gradient-plot/acceleration-by-origin/primitive.png`
- Expanded/public exact pair:
  `.artifacts/test/png/review/cars-gradient-plot/action-parity/primitive.png`
  `.artifacts/test/png/review/cars-gradient-plot/action-parity/user-facing.png`
- Browser page: `test/gates/cars-gradient-plot/browser.html`
- Browser result: logical `620 × 460`, physical `1240 × 920`, strip count `3`, console/page error 없음

두 action-parity PNG는 같은 run에서 pixel hash까지 정확히 같다. Independent primitive는 통계·visual oracle의
독립성을 지키기 위해 별도 variant로 유지한다.

## Runtime, types, package와 docs

- `createGradientPlot`/`editGradientPlot`은 runtime prototype, `types/program.d.ts`, root type exports와 Current action
  inventory에 동기화되어 있다.
- `GradientPlotOptions`, edit/position/density/appearance/center option types는 설치된 root package에서 import된다.
- 실제 packed tarball consumer가 create/edit, structured fill, Node PNG, TypeScript와 private-export rejection을 검증한다.
- Public action reference와 generated metadata/search/LLM/types output은 현재 API를 설명한다. Docs는 배포하지 않았다.

## 검증 증거

| 검증 | 결과 |
| --- | --- |
| `NPM_CONFIG_CACHE=/tmp/podo-npm-cache npm test` | 1,680/1,680 pass |
| `npm run test:render` | 118/118 PNG pass; approved/review gallery Browser pass |
| `npm run test:browser` | 33/33 pass |
| Gate Browser page | headless Chromium pass; `1240 × 920`, 3 strips, errors 없음 |
| `npm run test:contracts` | 122/122 pass |
| `npm run test:docs` | 32/32 pass |
| `npm run package:check` | 349 entries, pass |
| `npm run test:package` | Node/extension/PNG/TypeScript/tutorial/private-export checks pass |

첫 `npm test`는 user npm cache의 root-owned file 때문에 package-artifact 한 항목만 환경 실패했으며, repository-local
검증 cache를 사용한 동일 전체 suite는 1,680개 모두 통과했다. 코드 failure로 처리하지 않았다.

## 호환성

- 기존 solid fill과 모든 기존 mark/renderer 동작은 유지된다.
- `FillPaint` structured variant와 GradientPlot actions/types는 additive다.
- Mock Canvas gradient method를 non-enumerable backend method로 기록해 서로 다른 render run의 Canvas-call equality가
  함수 identity가 아니라 backend-neutral gradient 값으로 비교되게 했다.
- 특수 Cars 스타일이나 데이터별 조건 분기는 추가하지 않았다.

## 승인 질문

다음을 하나의 P6-B 결과로 승인하는가?

1. 위 `createGradientPlot` public chain과 stable owner/resource hierarchy
2. `editGradientPlot`의 appearance retention, statistical revision과 center remove/restore lifecycle
3. 독립 density oracle 및 expanded/public exact state·Canvas·pixel parity
4. 표시된 Browser/PNG 결과와 additive runtime/type/package/docs surface
