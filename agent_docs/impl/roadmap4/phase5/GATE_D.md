# Gate P5-D — Binned `createHeatmap`

## 상태

- Gate: `P5-D`
- 상태: `ready-for-review`
- 검토 대상 remote checkpoint: `3e77356` (`origin/main`)
- 승인 전 차단: Phase 5 lifecycle/facet closeout와 P5-Exit

## 승인 대상 public chain

```javascript
chart()
  .createCanvas({
    width: 700,
    height: 500,
    margin: { top: 70, right: 140, bottom: 75, left: 85 }
  })
  .createData({ values: cars })
  .createHeatmap({
    x: { field: "Weight_in_lbs", fieldType: "quantitative" },
    y: { field: "Miles_per_Gallon", fieldType: "quantitative" },
    bin: {
      bins: { x: 10, y: 8 },
      extent: { x: [1500, 5200], y: [8, 48] },
      includeEmpty: true
    },
    color: { scale: { palette: "blues", domain: [0, 33] } },
    rect: { stroke: "#ffffff", strokeWidth: 1 },
    guides: {
      axes: {
        x: { title: { text: "Vehicle weight (lb)" } },
        y: { title: { text: "Miles per gallon" } }
      },
      legend: { title: "Cars per bin", position: "right" }
    }
  })
  .createTitle({
    text: "Fuel Economy by Vehicle Weight",
    subtitle: "398 cars binned into a 10 × 8 grid",
    align: "center"
  });
```

Canonical executable source는
[examples/cars-binned-heatmap/program.js](../../../../examples/cars-binned-heatmap/program.js)다.

## mode와 inference contract

- `bin`이 없으면 기존 pre-gridded mode가 그대로 실행된다. x/y/color가 required이고 observed row만 cell이 되며
  missing combination을 합성하지 않는다.
- `bin`이 있으면 x/y는 raw quantitative field다. String shorthand는 quantitative로 해석한다.
- Binned `bins` default는 `{ x: 10, y: 10 }`, `includeEmpty` default는 `true`다.
- Omitted extent는 finite eligible x/y에서 각각 resolve된다. Explicit extent 밖의 row는 조용히 버리지 않고 오류다.
- Position domain은 resolved bin extent가 default다. 따라서 마지막 x1/y1 endpoint도 plot boundary에 정확히 매핑된다.
- `color`는 binned mode에서 optional이며 generated count field를 바꿀 수 없다. Scale/palette만 설정한다.
- Default guide title은 source x field, source y field와 `Count`다. Generated field name은 사용자 text에 노출하지 않는다.
- Ranged cell 자체가 grid이므로 binned mode의 automatic grid는 `false`다. Explicit `guides.grid`는 그대로 적용한다.
- `rect.fill`은 두 mode 모두 color encoding과 충돌하므로 허용하지 않는다.

## state와 action hierarchy

```text
createHeatmap(bin)
├─ createBin2DData
│  ├─ createDerivedData
│  └─ materializeBin2DData
├─ createRectMark
├─ encodeX
├─ encodeX2
├─ encodeY
├─ encodeY2
├─ encodeColor
└─ createGuides (unless disabled)
```

- Raw dataset `data`는 그대로 보존된다.
- Generated dataset ID는 `heatmapBin2DData`이고 normalized transform, resolved extent/edges와 80개 cell row를
  소유한다.
- Rect layer `heatmap`은 generated dataset을 참조하고 x/x2/y/y2를 같은 x/y scale에 연결한다.
- Color는 generated count를 quantitative sequential scale에 연결한다.
- Facade는 bin 계산을 복제하지 않고 wrapped `createBin2DData`를 호출한다.
- Canvas와 color scale edit는 rect와 guide를 rematerialize한다.
- 같은 generated logical data owner의 revision은 새 immutable dataset을 만들고 rect layer를 명시적으로 rebind한 뒤
  새 cell 수와 geometry를 rematerialize한다. 이전 program은 원래 dataset과 80-cell graphic을 유지한다.
- Renderer는 완성된 ranged rect와 guide `graphicSpec`만 읽으며 bin 의미를 알지 못한다.

## primitive/public parity

Primitive는 production `createBin2DData`를 호출하지 않는다. Independent oracle이 계산한 rows와 provenance를
`createDerivedData`, `editSemantic`, rect/encoding/guide primitives로 author한다.

- `semanticSpec`: exact parity
- `graphicSpec`과 depth-first graphic tree/order: exact parity
- Mock Canvas renderer calls: exact parity
- Node PNG decoded pixels: exact parity
- Primitive/public PNG SHA-256:
  `a2f7a9c223296044e6882e53bbeea93cc4568f1195119e315f4fc2f25be4b81c`

## Browser와 PNG 결과

- Logical Canvas: `700×500`
- Node PNG physical size: `1400×1000` at pixel ratio `2`
- Browser backing store: `1400×1000`
- Rendered rect cell: `80`
- Eligible/count sum: `398/398`
- Browser status: `80 binned cells rendered`
- Browser console errors: `0`
- Browser page errors: `0`
- Artifacts:
  - `.artifacts/test/png/review/cars-binned-heatmap/weight-mpg-counts/primitive.png`
  - `.artifacts/test/png/review/cars-binned-heatmap/weight-mpg-counts/user-facing.png`
  - `.artifacts/test/png/review/cars-binned-heatmap/weight-mpg-counts/browser.png`

## 호환성, declarations와 docs

- `CreateHeatmapOptions`는 pre-gridded/binned discriminated union이다. Existing pre-gridded source와 TypeScript 호출은
  변경 없이 compile된다.
- New exact types는 bin policy, binned position과 generated-count color options를 분리한다.
- Runtime package consumer는 pre-gridded와 binned mode를 모두 실행한다.
- Canonical Basic Charts API, heatmap recipe, supported-feature matrix, action reference와 LLM docs를 동기화했다.
- Public docs source만 갱신했으며 release-scoped documentation deployment는 수행하지 않았다.

## 검증 증거

- Heatmap facade focused tests: `11/11` pass.
- Unit suite: `1118/1118` pass.
- Contract suite: `121/121` pass.
- Active Gate suite: `11/11` pass.
- Documentation source/generator suite: `32/32` pass.
- Gate render suite: `2/2` pass.
- Full cumulative suite: `1646/1646` pass.
- Installed-package Node/TypeScript consumer: pass.
- Package artifact: `ggaction@0.0.4`, SHA-256
  `292987faced700e137389b4b3b8ef38968644a528e16642ab528611b50e2f6f6`.
- Generated signatures, action reference, metadata, search, LLM docs와 contract catalog freshness: pass.

## 승인 후 작업

P5-D가 승인되면 Step 6에서 active Gate slice를 stable chart/example/browser lifecycle로 승격하고 facet replay,
declaration, Current inventory와 generated documentation parity를 누적 검증한다. P5-Exit 전에는 Phase 6으로
진행하지 않는다.
