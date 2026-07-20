# P8-B — Categorical density lifecycle와 Violin facade 검토

## 상태

- Gate: `P8-B`
- 상태: `ready-for-review`
- Review source checkpoint: `764ac90` (`implement categorical density placement`)
- Remote: `origin/main`
- 승인 전 차단: public TypeScript declaration, wiki/example/generated reference, package inventory, Phase 8 closeout

이 Gate는 P8-A에서 승인한 full/split primitive를 production category-placement grammar과
`createViolinPlot({ x, y })` public runtime action으로 재현한 vertical slice를 검토한다.

## 구현된 public runtime contract

`encodeDensity`/`editDensity`는 기존 baseline contract를 유지하며 optional `placement` branch를 받는다.

```javascript
.encodeDensity({
  field: "Acceleration",
  groupBy: "Origin",
  placement: {
    type: "category",
    width: { band: 0.8, resolve: "shared" }
  }
})
```

Ordinary authoring은 positional-family facade를 사용한다.

```javascript
.createViolinPlot({
  id: "violins",
  x: { field: "Origin", fieldType: "nominal" },
  y: { field: "Acceleration", fieldType: "quantitative" },
  color: {
    field: "Origin",
    fieldType: "nominal",
    scale: {
      domain: ["USA", "Europe", "Japan"],
      range: ["#4c78a8", "#f58518", "#54a24b"]
    }
  },
  density: {
    bandwidth: 0.65,
    extent: [8, 25],
    steps: 80,
    width: { band: 0.8, resolve: "shared" }
  },
  area: { opacity: 0.8, strokeWidth: 1.2 },
  guides: { axes: {}, legend: false }
})
```

Split variant는 `split: { field, domain? }`을 추가하며 domain의 첫 값은 left/top, 둘째 값은
right/bottom을 소유한다. Exact executable chain은
`test/gates/cars-acceleration-violins/manifest.js`, 실제 user program은
`test/gates/cars-acceleration-violins/action.program.js`가 소유한다.

## State와 action hierarchy

- Full semantic layer: category `x=Origin`, quantitative `y=Acceleration_value`, `group=Origin`.
- Split semantic layer: 같은 position에 `split=era` provenance과 color grouping을 추가한다.
- Derived data는 source/statistic/resolved bandwidth/extent, category, optional split, side와 width policy를 보존한다.
- Full은 3개 closed path, split은 6개 deterministic half path를 하나의 Cartesian coordinate에 저장한다.
- Renderer는 semantic density를 추론하지 않고 materialized path command만 그린다.

```text
createViolinPlot
├─ createAreaMark
├─ configureAreaStrokeFromFill (applicable)
├─ encodeDensity
│  ├─ createCategoricalDensityData
│  ├─ editSemantic (derived-data rebind)
│  ├─ encodeX
│  ├─ encodeY
│  ├─ encodeGroup
│  └─ rematerializeAreaMark
├─ encodeColor (optional)
└─ createGuides (optional/applicable)
```

## Lifecycle와 compatibility

- `editDensity`는 bandwidth/kernel/normalization/placement/split/width revision을 immutable derived-data replacement로
  수행한다.
- Baseline↔category 전환은 stale position encoding과 scale definition을 정리한 뒤 연결된 mark/guide를
  deterministic하게 rematerialize한다.
- Canvas resize, scale edit, filter, selection/highlight, facet replay와 overlay scale sharing을 검증했다.
- `placement` 생략은 기존 baseline density output과 exact compatible하다.
- Category placement에서 `densityScale`을 겹치게 지정하거나 split domain이 2개가 아니면 silent output 대신
  validation error를 낸다.
- Full variant의 `color=category` legend는 정보가 중복되므로 facade default에서 생략하며, explicit
  legend request는 존중한다.

## Rendered evidence

Full primitive/public:

- logical/physical: `720×520` / `1440×1040`
- 공통 RGBA SHA-256: `faa8fc38543a408c47ce636cce79ed17d398b29f5a2adf6ec10a1933e1a97b60`
- `.artifacts/test/png/review/cars-acceleration-violins/full/{primitive,user-facing}.png`

Split primitive/public:

- logical/physical: `760×520` / `1520×1040`
- 공통 RGBA SHA-256: `4884cd58e8727e4209f8acdd8a87c68a4a7c8109fb3a9ca74a84a3ba592fcc8b`
- `.artifacts/test/png/review/cars-acceleration-violins/split-era/{primitive,user-facing}.png`

## 검증 증거

| 검증 | 결과 |
| --- | --- |
| Full normal suite | `1,730/1,730` pass |
| Full render suite | `121/121` pass |
| Browser capability/package suite | `35/35` pass |
| Gallery browser check | approved `118`, active-review `2` variants verified |
| Focused categorical density grammar | `3/3` pass |
| Focused encode/edit density | `16/16` pass |
| Focused violin facade | `7/7` pass |
| Gate primitive/oracle | `7/7` pass |
| Primitive/public render | full/split pixel hash exact match |

Chromium을 실행하는 두 browser 검증은 macOS sandbox의 loopback/IPC 제한 때문에 권한 확장 환경에서
동일 command를 재실행했고 통과했다.

## 문서·패키지 영향

- Runtime JavaScript action과 regression target은 이 Gate에 포함된다.
- TypeScript declaration, public wiki/example, generated action reference, action inventory와 package-boundary closeout은
  P8-B 승인 후 Step 6에서 한 vertical slice로 완결한다.
- Package unpacked-size guard는 실제 새 source를 포함하도록 `1,550,000` bytes로 최소 조정했다.
- Package publish와 docs deploy는 수행하지 않았다.

## 승인 요청 범위

1. Existing density API의 optional category-placement lifecycle
2. Full/half/split, vertical/horizontal, shared/independent width semantics
3. `createViolinPlot({ x, y })` facade의 inference/default/error boundary
4. Wrapped action hierarchy와 one-coordinate materialization
5. Full/split public output이 승인된 primitive target과 exact parity인 것

승인 전에는 Step 6와 Phase 9 production source를 시작하지 않는다.
