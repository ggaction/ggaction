# Roadmap 6 — Pie / Donut

**상태: A/V approved / Pie public flow 구현.** 현재 API의 canonical owner는 [Current 계약](../../../contract/current/COMPLETE_CHARTS.md#createpieplot)이다. Phase 3 X는 아직 승인 전이다.
[Phase 3 계약 검토](../phase3/CONTRACT_REVIEW.md)의 P3-C01–C03·C06–C07을 적용한다.
연결 항목 F01·D05·D13·D14, owner [Phase 3 W1](../phase3/GOAL.md).

## 설명과 공개 계약 제안

Category별 count 또는 nonnegative weighted sum의 부분-전체 관계다. Donut은 동일한 partition의 inner radius를 바꾼다.
독립 `createDonutPlot` alias는 추가하지 않고 검색의 donut/doughnut 동의어를 같은 facade로 연결한다.

~~~typescript
// Full ggaction entry; not included in ggaction/basic.
type PieCategory = string | {
  field: string;
  fieldType?: "nominal" | "ordinal";
  scale?: Pick<ThetaScaleOptions, "id" | "domain" | "range" | "reverse"> & {
    type?: "band";
  };
};
type PieColor = string | {
  field: string;
  fieldType?: "nominal" | "ordinal";
  scale?: NonPointCategoricalColorScaleOptions;
  palette?: Palette;
};
type PieLegendOptions = Omit<FilledMarkLegendOptions, "count" | "gradient" | "channels"> & {
  channels?: readonly ["color"];
};
type CreatePiePlotOptions = {
  id?: string;
  data?: string;
  coordinate?: string;
  category: PieCategory;
  color?: false | PieColor;
  arc?: {
    innerRadius?: number;
    padAngle?: number;
    fill?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
  };
  guides?: false | {
    axes?: false;
    grid?: false;
    legend?: false | PieLegendOptions;
  };
} & (
  | { value?: never; aggregate?: "count" }
  | { value: string; aggregate: "sum" }
);
// createPiePlot(options: CreatePiePlotOptions): ChartProgram;
~~~

`PieLegendOptions`는 기존 filled-mark categorical legend의 content/layout을 재사용한다.
`gradient/count`는 제외하고 channel은 color만 허용한다. Target/scale를 명시할 때도 이 facade의
layer/color scale와 일치해야 한다. Four-edge layout, title, symbol swatch/layers, labels는 기존 legend owner가 검증한다.
Category scale의 padding/align/continuous type, color layout/quantitative type는 facade에 노출하지 않는다.
Category 순서를 바꾸는 기존 explicit domain은 허용하지만 새 theta order action은 Phase 4에서 다룬다.

## 실제 기존 lower chain과 제안하는 H0

아래 lower 부분은 현재 실행 가능하다. 같은 base에서 branches는 독립된 immutable program이다.

~~~javascript
import { chart } from 'ggaction';
const values = [
  { category: 'A', value: 2 },
  { category: 'A', value: 3 },
  { category: 'B', value: 5 }
];
const base = chart()
  .createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ id: 'source', values });

const lower = base
  .createArcMark({ id: 'pie', data: 'source', innerRadius: 0.55 })
  .encodeTheta({ target: 'pie', field: 'category', fieldType: 'nominal',
    aggregate: 'sum', weight: 'value' })
  .encodeColor({ target: 'pie', field: 'category' })
  .createGuides({ axes: false, grid: false, legend: { target: 'pie' } });

// Proposed equivalent; do not execute before implementation.
const proposed = base.createPiePlot({
  id: 'pie', data: 'source', category: 'category',
  value: 'value', aggregate: 'sum', arc: { innerRadius: 0.55 }
});
~~~

Count의 최단 제안은 `base.createPiePlot({ category:'category' })`다.
Default id는 piePlot, data/coordinate 선택과 duplicate 오류는 [공통 계약](../phase3/CONTRACT_REVIEW.md)을 따른다.
순수 scalar fill 제안은 `{ category:'category', color:false, arc:{ fill:'#4c78a8' } }`다.

## Default·지원·오류

| 항목 | 계약과 rationale |
| --- | --- |
| Grain | Category는 항상 필요. 숫자 shorthand도 nominal. value 없음=count, value 있음은 aggregate sum 필수 |
| Weight | Finite nonnegative numeric만. Missing/nonfinite/negative와 all-zero는 오류. 0은 분모에 기여하지 않고 zero-total sector는 생략 |
| Category | 기존 nominal reader의 scalar 값; stable first appearance. Explicit domain은 모든 source category를 포함해야 함 |
| Sweep | 기본 0..360 degrees, 위에서 시작해 양의 방향 clockwise. 명시한 nonzero sweep은 절댓값 360 이하; 비율은 요청한 sweep에 적용 |
| Geometry | innerRadius 기본 0, 범위 [0,1), availableRadius의 비율. padAngle 기본 0, nonnegative degrees |
| Color | 생략=category, false=field color 없음. 다른 field는 각 양수 final slice 안에서 유일해야 함; 여러 slice가 한 color를 공유할 수 있음 |
| Fill | Field color와 명시적 arc.fill을 함께 쓰면 오류. 자동 color도 포함하므로 scalar fill을 원하면 color:false |
| Style | Opacity 기본 1·[0,1], stroke 기본 #ffffff·width 1. Width는 nonnegative pixels. Create-side stroke:false는 lower 지원 범위 밖 |
| Guides | 생략/{}=axes/grid 없이 color legend 확보; guides:false=확보 안 함. axes/grid는 false만. Color가 없는데 legend를 명시하면 오류 |
| Zero legend | Legend는 color scale domain을 설명하므로 zero-total category도 남을 수 있음. 보이는 sector만의 목록으로 설명하지 않음 |

새 facade가 value만 보고 sum으로 추정하거나 category 없이 raw-row weight chart로 바뀌면 안 된다.
기존 quantitative theta의 per-row slice, radial/rose encodings, explicit lower Polar guides는 계속 사용할 수 있다.
Pie facade의 count/sum 역할과 혼합하지 않는다. 같은 arc가 이미 있는 경우 재생성은 새 id를 요구한다.

## 중요한 action hierarchy

~~~text
createPiePlot
├─ createArcMark (resolved id/data and arc options)
├─ encodeTheta (explicit categorical type, count or sum+weight, coordinate)
├─ encodeColor? (omitted color means category; false skips)
└─ guide fulfillment
   ├─ createGuides? (legend-only on a fresh program)
   └─ compatible categorical legend reuse / missing component actions
~~~

Data/role/option normalization은 작은 내부 helper이며 별도 public action이 아니다.
Geometry·partition·scale·legend 제작은 기존 wrapped owner를 호출한다.
Public top-level trace는 createPiePlot 한 번이며 실제 child args와 하위 trace가 보존돼야 한다.
원래 lower chain과 최종 semanticSpec/graphicSpec이 같아야 한다.

## 저장 결과와 아래층 편집

- Semantic layer는 ordinary arc와 raw source binding, theta의 field/type/aggregate/weight/scale,
  color/coordinate 관계를 가진다. Source dataset을 facade 전용 aggregate dataset으로 복사하지 않는다.
- AggregateValue/count/sourceIndices와 start/end theta·radii는 기존 sector derivation의 결과다.
  Share를 계산할 수 있지만 semantic layer에 `slice.share` 같은 새 canonical cache를 만들지 않는다.
- Graphic은 ordinary path collection의 concrete commands/fill/stroke/opacity다. 별도 slice graphic schema나
  start/end theta scalar property를 신설하지 않는다. Inner radius·padAngle은 markConfigs가 소유한다.
- `editArcMark`의 radius/padding/appearance, `encodeTheta` mode 재할당, `encodeColor`,
  `editScale`·legend editor를 사용한다. Sum→count는 stale weight를 제거한다.
  Constant fill 전환은 기존 color removal과 관련 guide lifecycle을 먼저 처리한다.
- Canvas/scale edit, final-sector selection/highlight와 supported filter/remove lifecycle을 기존 consumer로 검증한다.
  Generic source rebinding, labels, 새로운 theta order API는 이 단계 완료 조건에 넣지 않는다.

## V target 계획과 수치 oracle

같은 values와 Canvas 1000×700, margin 150을 [단일 manifest](../../../../test/charts/pie-plot/manifest.js)에 고정했다.
[실행한 primitive](../../../../test/charts/pie-plot/primitive.program.js)는 기존 Arc/theta/color/guide 액션을 명시적으로 조합한다.
구현한 facade와 같은 실행의 graphics·Canvas calls·decoded pixels가 일치한다. 독립 sector oracle로 각도·비율·concrete path commands도 검증한다.

| Variant | 제안 public call (base 뒤) | 독립 의미 oracle |
| --- | --- | --- |
| count | `createPiePlot({id:'pie', category:'category'})` | A 2 / B 1, 두 sectors, 240° / 120° |
| weighted | `createPiePlot({id:'pie', category:'category', value:'value', aggregate:'sum'})` | A 5 / B 5, 180°씩 |
| donut | `createPiePlot({id:'pie', category:'category', value:'value', aggregate:'sum', arc:{innerRadius:.55,padAngle:2}})` | 같은 partition, radius ratio .55, padding은 share를 바꾸지 않음 |

One-category full ring, zero/negative/all-zero, missing category, typed numeric category, same-category color conflict,
reversed sweep·explicit domain, guide conflict/reuse는 비시각 acceptance에 포함한다.
승인된 세 public/primitive 쌍의 같은 실행 graphics/Canvas calls/decoded pixels를 비교했다.
이 단계에서 label on·new theta order까지 실행했다는 완료 주장은 금지한다.
[52건 baseline](../phase3/baseline-results.json)의 P01–P19와 [consumer matrix](../phase3/VALIDATION.md)를 함께 적용한다.
