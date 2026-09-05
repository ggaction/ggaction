# Roadmap 6 — Density

**상태: A/V approved / Density public flow 구현.** 정확한 현재 계약은 [Current owner](../../../contract/current/COMPLETE_CHARTS.md#createdensityplot)를 따른다. Phase 3 X는 아직 승인 전이다.
[Phase 3 계약 검토](../phase3/CONTRACT_REVIEW.md)의 P3-C01·C04·C06–C07이 이 chart의 승인 제안이다.
연결 F06·D02·D04, owner [Phase 3 W2](../phase3/GOAL.md).

## 설명과 공개 계약 제안

한 quantitative variable의 Gaussian KDE를 baseline-closed area로 보여준다.
Baseline density의 기존 통계·orientation owner를 재사용한다. Violin의 category placement와 Raincloud composition은 별도다.

~~~typescript
// Full ggaction entry; existing option types keep their current meaning.
type DensityPlotLegendOptions = Omit<FilledMarkLegendOptions, "count" | "gradient" | "channels"> & {
  channels?: readonly ["color"];
};
type DensityPlotGuideOptions = Omit<CartesianCategoricalGuideOptions, "legend"> & {
  legend?: false | DensityPlotLegendOptions;
};
type CreateDensityPlotOptions = {
  id?: string;
  data?: string;
  coordinate?: string;
  field: string;
  groupBy?: string | false;
  bandwidth?: "auto" | number;
  extent?: "auto" | readonly [number, number];
  steps?: number;
  kernel?: DensityKernel;
  normalization?: DensityNormalization;
  as?: readonly [string, string];
  densityChannel?: "x" | "y";
  valueScale?: NonPointQuantitativePositionScaleOptions;
  densityScale?: NonPointZeroSupportingPositionScaleOptions;
  color?: string | {
    field: string;
    fieldType?: "nominal" | "ordinal";
    scale?: NonPointCategoricalColorScaleOptions;
    palette?: Palette;
    layout?: "overlay";
  };
  area?: {
    fill?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
    curve?: CurveInterpolation;
  };
  guides?: false | DensityPlotGuideOptions;
};
// createDensityPlot(options: CreateDensityPlotOptions): ChartProgram;
~~~

`DensityPlotGuideOptions`는 기존 Cartesian categorical filled-mark guide vocabulary를 사용한다.
Axes는 x/y, grid는 horizontal/vertical, legend는 group color만이며 gradient/count legend는 제외한다.
Nested target/coordinate가 아니라 facade의 id/coordinate가 layer binding을 소유한다.
`placement`, `source`, `target`, raw x/y, tuple group, stack/center color layout은 이 facade에서 거부한다.
통계 parameter를 별도 `density:{}` 객체로 다시 포장하지 않고 encodeDensity와 같은 이름을 쓴다.

## 현재 실행 가능한 lower chain과 제안 H0

~~~javascript
import { chart } from 'ggaction';
const values = [
  { value: 1, group: 'A' }, { value: 2, group: 'A' },
  { value: 3, group: 'B' }, { value: 5, group: 'B' }
];
const base = chart()
  .createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ id: 'source', values });

const lower = base
  .createAreaMark({ id: 'density', data: 'source' })
  .encodeDensity({ target: 'density', field: 'value', groupBy: 'group',
    bandwidth: 1, extent: [0, 6], steps: 61 })
  .encodeColor({ target: 'density', field: 'group' })
  .createGuides({ legend: { target: 'density' } });

// Equivalent complete facade.
const complete = base.createDensityPlot({
  id: 'density', data: 'source', field: 'value',
  groupBy: 'group', color: 'group', bandwidth: 1, extent: [0, 6], steps: 61
});
~~~

최단 호출은 `base.createDensityPlot({ field:'value' })`다. Default id densityPlot.
`densityChannel:'y'`는 x=value/y=density이며 `'x'`는 x=density/y=value다.
`horizontal:true` 같은 두 번째 orientation vocabulary는 추가하지 않는다.

## Default·지원·오류

| 항목 | 계약 |
| --- | --- |
| KDE | 현행 gaussian, normalization unit, bandwidth auto, extent auto, steps 100 유지 |
| Group | 생략/false=ungrouped, string=explicit group. Fresh mark에 resolved data를 전달하므로 다른 mark의 group을 상속하지 않음 |
| Color | 생략=field color 없음. group만 지정해도 자동 색 추론 안 함. 사용하려면 explicit groupBy와 같은 field 필요 |
| Derived fields | Group field(있을 때), value output, density output만 보존. `as` 기본은 field_value / field_density |
| Raw metadata | 원본의 series-constant region 같은 field도 자동 복사·join하지 않음. 다른 color field를 일반 Area처럼 허용한다고 문서화하지 않음 |
| Missing | Finite numeric field와 유효한 nominal group row만 사용. 일부 invalid row는 제외; 유효 row가 없으면 오류 |
| Bandwidth/extent | Auto는 pooled valid values로 계산. 전체 유효 표본이 constant/singleton이면 자동 추정 오류; explicit positive bandwidth와 increasing finite extent를 함께 주면 작성 가능 |
| Grid limits | Steps 2..10,000; output profiles×steps ≤10,000, valid rows×steps ≤10,000,000의 현행 제한 유지 |
| Normalization | unit=각 profile의 KDE, count=해당 profile의 valid sample 수를 곱함. 유한 extent의 sampled integral이 정확히 1이라고 주장하지 않음 |
| Scales | value nice:false/zero:false, density nice:true/zero:true 기본. Density magnitude domain은 zero를 포함해야 함 |
| Area | 기본 fill theme·opacity .2·linear. Explicit fill+field color는 충돌 오류. strokeWidth는 stroke와 함께; create stroke:false는 미지원 |
| Guides | Value와 Density 축; 자동 grid는 두 orientation 모두 현행 Cartesian y축 기준 horizontal. Legend는 explicit group color가 있을 때만. Chart title은 별도 action |

Color appearance를 바꿔 KDE의 partition이 바뀌어서는 안 된다. 다른 raw field의 category palette를 원하면
group domain에 대한 explicit color scale range/palette를 작성할 수 있다. Metadata join 지원을 새로 약속하지 않는다.

## 중요한 action hierarchy

~~~text
createDensityPlot
├─ createAreaMark (resolved id/data and area options)
├─ encodeDensity (baseline only; source fields and statistics)
│  ├─ createDensityData → materializeDensityData
│  ├─ explicit derived data binding
│  ├─ encodeX / encodeY / encodeGroup?
│  └─ rematerializeAreaMark
├─ encodeColor? (same retained group field; overlay)
└─ guide fulfillment → existing axes/grid/legend components
~~~

groupBy는 encodeDensity가 소유한다. Facade가 뒤에서 다시 encodeGroup을 덧붙여 partition을 바꾸지 않는다.
KDE 수식·sampling·derived names·zero baseline·path closure를 복제하지 않는다.
Current lower chain과 semantic/graphic 동등성, 실제 facade child trace, failure immutability를 별도로 증명한다.

## 저장 결과와 아래층 편집

- Raw dataset과 materialized density snapshot의 source/transform/resolved bandwidth·extent가 provenance다.
  Layer.data는 derived snapshot을 가리키고 ordinary x/y/group/color encodings를 가진다.
- Orientation은 value/density field의 channel binding과 기존 transform/area consumer 관계로 표현한다.
  별도 façade state나 원본 metadata cache는 추가하지 않는다.
- Graphic은 ordinary closed area path commands/paint와 concrete Cartesian guide objects다.
  Renderer는 KDE·grouping·orientation inference를 계산하지 않는다.
- `editDensity`는 새 revision을 만들고 현재 id/field/output/scale/coordinate 관계를 owner 규칙대로 보존한다.
  Bandwidth·extent·steps·kernel·normalization·source/group 변화 중 현재 지원되는 조합만 사용한다.
  Source/group 변경이 현재 color/selection과 충돌하면 오류이고 이전 program은 그대로다.
- `editAreaMark`의 appearance, `editScale`, guide editors, selection/highlight·resize를 현재 consumer로 검증한다.
  `editDensity({densityChannel})`는 현재 미지원이다. 신규 방향/역할 편집은 Phase 6에서 승인받는다.

## V target 계획과 수치 oracle

위 values와 1000×700, margin 150을 [단일 manifest](../../../../test/charts/density-plot/manifest.js)에 고정했다.
[실행한 primitive](../../../../test/charts/density-plot/primitive.program.js)는 기존 lower chain이며 구현한 facade의 same-run parity는 stable public/render tests가 검증한다.

| Variant | 제안 public call (base 뒤) | 의미 oracle |
| --- | --- | --- |
| vertical | `createDensityPlot({id:'density',field:'value',bandwidth:1,extent:[0,6],steps:61})` | 61 samples, one closed path, x value/y density |
| grouped | `createDensityPlot({id:'density',field:'value',groupBy:'group',color:'group',bandwidth:1,extent:[0,6],steps:61})` | 122 samples, two paths/colors, 각 group n=2 |
| horizontal | `createDensityPlot({id:'density',field:'value',groupBy:'group',color:'group',densityChannel:'x',bandwidth:1,extent:[0,6],steps:61})` | 같은 KDE 수치, x density/y value, 축 title 교환 |

V 작성 중 grid의 기존 기본값을 직접 확인했다. Density 방향이 바뀌면 grid도 자동 교환된다는 테스트 가정은
틀렸으며, 이를 y축 기준 horizontal로 고쳤다. A의 모호한 “orientation에 맞는” 표현을 구체화했고
production grid/default나 target public options를 변경하지 않았다. Explicit guide 방향 선택은 기존 계약을 따른다.

독립 Gaussian 공식과 fixture의 고정 수치, sampled grid endpoints, count/unit 비율을 확인한다.
Constant sample explicit 경로·invalid rows·all-invalid·collision·scale zero 오류, stats revision·shared scale·Canvas edit는
비시각 acceptance다. 미래 orientation edit·metadata color variant를 승인 대상처럼 만들지 않는다.
[Baseline D01–D16](../phase3/baseline-results.json)과 [consumer matrix](../phase3/VALIDATION.md)를 적용한다.
