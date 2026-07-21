# P14-B — Basic Chart facade runtime and visual review

## 상태

- Gate: `P14-B`
- 상태: `ready-for-review`
- Implementation checkpoint: `94befe8` (`align box plot facade behavior`)
- Remote: `origin/main`
- 승인 전 차단: Step 4 public closeout와 P14-Exit

## 구현 결과

### P14-R1 — data inference

`createBoxPlot`은 explicit data → inferred source data → current data → unique dataset 순서로 해석한다.
Multiple datasets가 남으면 명시적인 data를 요구하고 임의 선택하지 않는다.

### P14-R2 — opt-in guides

Compatibility decision을 그대로 구현했다.

```javascript
createBoxPlot({ x, y })                  // guide 없음
createBoxPlot({ x, y, guides: false })  // guide 없음
createBoxPlot({ x, y, guides: {} })     // applicable axes/grid/legend
```

Explicit guide intent는 incomplete Box owner에 저장되어 later `encodeX`/`encodeY` completion에서 wrapped
`createGuides` child로 replay된다.

### P14-R3 — source ambiguity

Position inference가 필요한데 compatible source가 여러 개면 첫 source를 고르거나 generic orientation error로
떨어지지 않고 `target` 또는 explicit x/y를 요구한다. Explicit x/y와 data가 있으면 source inference를 건너뛴다.

### P14-R4 — public type

`BoxPlotOptions`를 package root에서 export하고 `guides?: false | CreateGuidesOptions`를 strict declaration에 추가했다.

## 8-facade edit handoff

| Facade | Stable post-create edit owner |
| --- | --- |
| Scatter | `editPointMark` plus encoding/scale/guide actions |
| Line | `editLineMark` plus encoding/scale/guide actions |
| Bar | `editBarMark` plus encoding/scale/guide actions |
| Histogram | `editBarMark` plus histogram encoding/scale/guide actions |
| Heatmap | `editRectMark` plus encoding/scale/guide actions |
| Gradient Plot | `editGradientPlot` plus scale/guide actions |
| Box Plot | `editBoxPlot` plus scale/guide actions |
| Parallel Coordinates | `editLineMark` plus parallel encoding/scale/guide actions |

각 canonical program에서 edit 후 concrete graphics가 바뀌고 earlier program은 byte-for-byte equivalent state를
유지하며 edit action이 top-level trace owner가 되는 것을 검증했다.

## Representative public call chain

```javascript
chart()
  .createCanvas({
    width: 360,
    height: 460,
    margin: { top: 140, right: 40, bottom: 70, left: 80 }
  })
  .createData({ values: cars })
  .createBoxPlot({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Miles_per_Gallon" },
    guides: { legend: false }
  })
  .encodeColor({
    target: "boxPlot",
    field: "Origin",
    fieldType: "nominal",
    scale: { palette: "tableau10" }
  })
  .createTitle({
    text: "Fuel Economy Distribution by Origin",
    subtitle: "Tukey box plot with 1.5× IQR whiskers",
    maxWidth: 240
  });
```

Rendered evidence:
`.artifacts/test/png/charts/chart-variants/cars-box-plot/cars-vertical-tukey/user-facing.png`.
The primitive and public PNG decode to exact equal pixels; the approved visual is unchanged.

## 검증 증거

- Box action unit: 18/18 pass
- Basic facade contracts: 5/5 pass
- Unit suite: 1231/1231 pass
- Contract suite: 136/136 pass
- Chart suite: 426/426 pass
- Docs suite: 35/35 pass
- Browser Canvas: 47/47 pass
- Focused Node PNG: 4/4 pass
- Coverage: 94.64% lines, 89.96% branches, 98.72% functions; 68 critical floors
- Package artifact check and isolated package consumer: pass
- Generated signature/capability/reference/search freshness and `git diff --check`: pass

## 호환성

- Existing omission behavior and canonical pixels are preserved.
- No facade signature was mechanically unified and no aggregate edit action was added.
- The only public additions are Box `guides` and root-importable `BoxPlotOptions`.

## 승인 요청 범위

1. P14-R1~R4 runtime/type behavior
2. Opt-in Box guide compatibility decision and deferred replay
3. Two lifecycle families and the 8-facade edit handoff matrix
4. Unchanged representative Box visual and exact primitive/public parity
