# P8-A — Categorical density contract와 primitive visual 검토

## 상태

- Gate: `P8-A`
- 상태: `approved`
- 승인: 2026-07-20 사용자 명시 승인
- Review source checkpoint: `563186c` (`fix violin axis title rotation`)
- Remote: `origin/main`
- 승인 전 차단: production density grammar/provenance, public placement branch와 `createViolinPlot`

이 Gate는 기존 baseline density를 깨지 않고 category-centered full/half/split density를 표현할 exact API와 두
primitive visual target을 검토한다. 현재 runtime에는 후보 public API를 추가하지 않았다.

## 후보 API 결정

```typescript
type DensityPlacement =
  | { type: "baseline" }
  | {
      type: "category";
      side?: "both" | "left" | "right" | "top" | "bottom";
      width?: {
        band?: number;
        resolve?: "shared" | "independent";
      };
      split?: {
        field: string;
        domain?: readonly [unknown, unknown];
      };
      scale?: ScaleOptions;
    };

encodeDensity({ ...existingOptions, placement?: DensityPlacement }): ChartProgram;
editDensity({ ...existingEditOptions, placement?: DensityPlacement }): ChartProgram;

createViolinPlot({
  id?, data?, coordinate?, x, y,
  split?, color?, density?, area?, guides?
}): ChartProgram;
```

### Default와 error boundary

- `placement` 생략은 기존 baseline density output을 그대로 유지한다.
- `{ type: "baseline" }`은 edit에서 category placement를 제거한다.
- Category field는 `groupBy`에서 읽고, 생략하면 plot center에 single violin을 만든다.
- Category placement의 `densityChannel` 생략은 `"x"`: category→x/value→y vertical violin이다.
- `side` 기본은 `"both"`; x width는 left/right, y width는 top/bottom만 허용한다.
- `width.band` 기본 `0.8`, `(0, 1]`; `width.resolve` 기본 `"shared"`다.
- `shared`는 전체 profile의 하나의 density maximum, `independent`는 category별 maximum을 사용한다. Split의 두
  half는 independent에서도 같은 category maximum을 공유한다.
- Split domain 생략은 observed value가 정확히 두 개일 때만 first appearance로 추론한다. 첫 값은 left/top,
  둘째 값은 right/bottom이다.
- `side`와 `split`은 mutually exclusive다. Explicit split domain은 observed 값을 빠짐없이 포함한 서로 다른 두
  값이어야 한다.
- `valueScale`은 quantitative axis, `placement.scale`은 category band를 소유한다. Category branch에서 기존
  `densityScale`은 같은 channel에 두 scale 의미를 만들므로 오류다.

## Facade contract

`createViolinPlot`은 BoxPlot/GradientPlot과 같은 positional family다.

- x/y를 모두 받고 exactly one categorical + one quantitative role을 요구한다.
- Categorical role에서 group/category band를, quantitative role에서 density input/value scale을 만든다.
- `density`는 statistic과 width policy, `area`는 graphical appearance만 소유한다.
- `split`과 `color`는 독립이다. 같은 visual grouping이 필요하면 사용자가 같은 field를 명시한다.
- Aggregate trace는 `createAreaMark → encodeDensity → optional encodeColor → optional createGuides` wrapped child를
  그대로 노출한다.

## 목표 full chain

```javascript
chart()
  .createCanvas({
    width: 720,
    height: 520,
    margin: { top: 90, right: 45, bottom: 80, left: 80 }
  })
  .createData({ values: cars })
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
    area: { opacity: 0.8, strokeWidth: 1.2 }
  })
  .createTitle({
    text: "Acceleration Distribution by Origin",
    subtitle: "Kernel-density profiles for the Cars dataset"
  });
```

## 목표 split 차이

```javascript
.createData({ values: carsWithEra })
.createViolinPlot({
  id: "violins",
  x: { field: "Origin", fieldType: "nominal" },
  y: { field: "Acceleration", fieldType: "quantitative" },
  split: {
    field: "era",
    domain: ["1970–1976", "1977–1982"]
  },
  color: {
    field: "era",
    fieldType: "nominal",
    scale: {
      domain: ["1970–1976", "1977–1982"],
      range: ["#4c78a8", "#e45756"]
    }
  },
  density: {
    bandwidth: 0.65,
    extent: [8, 25],
    steps: 80,
    width: { band: 0.8, resolve: "shared" }
  },
  area: { opacity: 0.8, strokeWidth: 1.2 }
})
```

## 독립 oracle과 geometry

- Production density source를 import하지 않는 Gaussian/other-kernel oracle을 사용한다.
- Finite Acceleration source row `406`개를 보존한다.
- Full profile counts: USA `254`, Europe `73`, Japan `79`.
- Split counts: `151/103`, `43/30`, `29/50`의 early/late pair다.
- 모든 profile은 inclusive `[8, 25]` sample grid `80`개, non-negative density를 가진다.
- Full은 center-symmetric closed path 3개, split은 center 한쪽에만 존재하는 closed half-path 6개다.
- Shared/independent width maximum, unit/count relation, band containment, physical left/right와 invalid split/domain/band
  cases를 독립적으로 검증한다.
- Category마다 child chart를 만들지 않고 하나의 plot bounds와 category centers를 사용한다.

## Rendered evidence

Full:

- `.artifacts/test/png/review/cars-acceleration-violins/full/primitive.png`
- logical/physical `720×520` / `1440×1040`
- SHA-256 `faa8fc38543a408c47ce636cce79ed17d398b29f5a2adf6ec10a1933e1a97b60`

Split:

- `.artifacts/test/png/review/cars-acceleration-violins/split-era/primitive.png`
- logical/physical `760×520` / `1520×1040`
- SHA-256 `51988afdec8702116559b696b1b1a38bfc63573fcaf32361c402afbe5f4032bc`

Title은 Canvas가 아니라 actual plot bounds 중앙에 정렬한다. Grid는 path 아래, axes/title/legend는 위에 그린다.
Y축 title의 concrete rotation은 degree가 아닌 renderer 계약 단위인 `-Math.PI / 2` radians로 고정하며 focused
regression assertion으로 보호한다.

## 검증 증거

| 검증 | 결과 |
| --- | --- |
| Gate contract/oracle tests | `7/7` pass |
| Full normal suite | `1,715/1,715` pass |
| Full render suite | `121/121` pass |
| Approved artifact gallery | `118` variants verified |
| Active-review gallery | `2` variants verified |
| Renderer boundary | semantic state getter가 오류여도 primitive `graphicSpec`만으로 render pass |
| Immutability | caller Cars rows와 stored dataset ownership pass |

Source/runtime/types/Current contracts/public docs는 아직 변경하지 않았다. Package publish와 docs deploy도 수행하지
않았다.

## 승인 요청 범위

1. Existing `encodeDensity`/`editDensity`의 `placement` branch
2. `createViolinPlot({ x, y })` thin facade 추가
3. category default orientation, side/split와 shared/independent width semantics
4. scale ownership과 compatibility/error boundary
5. 표시된 full/split primitive visual

승인 전에는 production source, declarations, Current action inventory와 public docs를 변경하지 않는다.
