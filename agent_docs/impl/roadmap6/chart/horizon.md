# Roadmap 6 — Horizon

**상태: R6-P3-A approved / Planned·미구현.** `createHorizonPlot`은 Current API가 아니다.
[Phase 3 계약 검토](../phase3/CONTRACT_REVIEW.md)의 P3-C01·C05–C07을 적용한다.
연결 F07·D04, owner [Phase 3 W3](../phase3/GOAL.md).

## 설명과 공개 계약 제안

원래 y를 baseline 기준의 signed amplitude로 나누고 bands로 접어 낮은 높이에 표시한다.
Folded y의 0..1은 원본 amplitude 축이 아니다. 여러 group은 같은 panel에 overlay하며 small multiples를 만들지 않는다.

~~~typescript
// Planned; referenced Horizon types preserve their current meaning.
type HorizonPlotGuideOptions = {
  axes?: false | (Omit<CartesianAxesOptions, "y"> & { y?: false });
  grid?: false | (Pick<CartesianGridOptions, "vertical"> & { horizontal?: false });
  legend?: false;
};
type CreateHorizonPlotOptions = {
  id?: string;
  data?: string;
  coordinate?: string;
  x: string | HorizonXEncoding;
  y: string | HorizonYEncoding;
  groupBy?: string | false;
  bands?: number;
  baseline?: number;
  extent?: "auto" | number;
  resolve?: HorizonResolution;
  missing?: HorizonMissingPolicy;
  overflow?: HorizonOverflowPolicy;
  palette?: HorizonPaletteOptions;
  area?: {
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
    curve?: CurveInterpolation;
  };
  guides?: false | HorizonPlotGuideOptions;
};
// createHorizonPlot(options: CreateHorizonPlotOptions): ChartProgram;
~~~

`HorizonPlotGuideOptions`는 axes false 또는 Cartesian x 옵션과 y:false,
grid false 또는 vertical 옵션과 horizontal:false, legend:false만 허용한다.
X axis의 line/ticks/labels/title 및 vertical grid style은 기존 owner의 vocabulary다.
Coordinate descriptor나 scale를 명시하면 facade가 만든 layer의 binding과 일치해야 한다.
원본 단위를 설명하는 전용 amplitude guide는 이 단계에 추가하지 않는다.

Top-level `source/target/color`, `area.fill`, nested x/y `target/coordinate`, tuple group은 거부한다.
Color는 transform palette가 소유하므로 일반 fill shorthand로 덮지 않는다.
`HorizonXEncoding`의 quantitative/temporal/temporalUnit과 `HorizonYEncoding`의 folded scale 제한을 그대로 재사용한다.

## 현재 실행 가능한 lower chain과 제안 H0

~~~javascript
import { chart } from 'ggaction';
const values = [
  { time: 0, value: -4 }, { time: 1, value: 4 }
];
const base = chart()
  .createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ id: 'source', values });

const lower = base
  .createAreaMark({ id: 'horizon', data: 'source' })
  .createCoordinate({ id: 'timeline', type: 'cartesian', layers: ['horizon'] })
  .encodeHorizon({ target: 'horizon', x: 'time', y: 'value' })
  .editAreaMark({ target: 'horizon', opacity: 0.8 })
  .createGuides();

// Proposed equivalent; not executable yet.
const proposed = base.createHorizonPlot({
  id: 'horizon', data: 'source', coordinate: 'timeline',
  x: 'time', y: 'value', area: { opacity: 0.8 }
});
~~~

최단 제안은 `base.createHorizonPlot({x:'time',y:'value'})`, default id horizonPlot이다.
원본 x/y inference를 지원하는 기존 `encodeHorizon()`는 유지하지만 새 H0는 두 역할을 명시해야 한다.
모든 facade가 사용하는 data/coordinate ambiguity와 immutability 규칙을 따른다.

## Default·지원·오류

| 항목 | 계약 |
| --- | --- |
| Defaults | bands 3, baseline 0, extent auto, resolve shared, missing break, overflow clip, positive blues/negative reds |
| X | Explicit quantitative/temporal 우선. Numeric shorthand는 quantitative, date-like 값은 기존 temporal inference. temporalUnit은 explicit temporal에서만 |
| Y | Quantitative 원본. Geometry의 lower/upper는 folded values. Y scale은 linear, domain [0,1]만 |
| Group | 생략/false=새 mark의 ungrouped. String=explicit source group; 하나의 coordinate에서 profiles overlay |
| Extent | 기존 shared/independent normalization 유지. Facade가 series별 scale나 panel을 새로 생성하지 않음 |
| Empty | 모든 y가 baseline이면 0 paths가 정당한 결과. Source x domain과 extent 0 provenance는 보존 |
| Invalid | 잘못된 fields/types/bands/extent/palette, duplicate/invalid x와 missing policy 위반은 기존 owner의 오류 |
| Coordinate | Explicit id는 createAreaMark 뒤 기존 createCoordinate({id,type:'cartesian',layers:[id]})로 연결. encodeHorizon 옵션 추가 없음 |
| Appearance | 기본 opacity 1. Explicit opacity는 encodeHorizon 뒤 editAreaMark로 적용. Curve·stroke·strokeWidth는 기존 Area owner, create stroke:false 미지원 |
| Guides | 생략/{}=원본 x axis와 vertical grid. axes.y/horizontal grid/legend는 false 외의 요청이면 새 facade에서 오류 |
| Lower escape | 기존 createYAxis({scale:foldedScale})·createLegend({target})의 명시적 작성은 유지. 이를 원본 y/사용자 category 설명으로 간주하지 않음 |

현재 encodeHorizon은 createAreaMark에 준 opacity를 1로 재설정한다. 이를 변경해 기존 lower 동작을 바꾸지 않고,
facade가 explicit 요청을 뒤에서 정확히 적용한다. Scalar fill과 internal field color를 충돌 없이 동시 지원한다고 약속하지 않는다.

## 중요한 action hierarchy

~~~text
createHorizonPlot
├─ createAreaMark (resolved id/data, optional curve/stroke)
├─ createCoordinate? (explicit coordinate attachment only)
├─ encodeHorizon
│  ├─ createHorizonData → materializeHorizonData
│  ├─ rebindLayerData
│  ├─ encodeX / encodeY / encodeGroup / encodeY2 / encodeColor
│  └─ editAreaMark (current opaque default)
├─ editAreaMark? (explicit facade opacity after encoding)
└─ guide fulfillment → existing x axis / vertical grid components
~~~

좌표를 고르기 위해 raw encodeX를 임시로 설정했다 지우는 경로를 추가하지 않는다.
Existing coordinate action으로 binding을 정하고 통계·position inference를 Horizon owner가 한 번 수행한다.
Default x/y scale id와 generated field/revision identity는 lower owner가 소유한다.

## 저장 결과와 아래층 편집

- Raw source와 Horizon derived snapshot에 원본 x/y/unit, groupBy, bands/baseline/extent/resolve/missing/
  overflow/palette 및 resolved extent/bandHeight를 저장한다.
- Layer는 ordinary area와 derived data binding, x/y/y2/group/color encodings를 가진다.
  X의 source title과 folded y scale [0,1]을 유지한다. 별도 `horizonChart` state는 만들지 않는다.
- Graphic은 concrete closed area paths/paint와 x guide graphics다. Renderer는 sign/band/folding을 해석하지 않는다.
- `editHorizon`은 새 snapshot/rebind/release와 affected consumer rematerialization을 소유한다.
  `editAreaMark`의 opacity/outline/curve, x `editScale`, x guide editors가 그대로 작동해야 한다.
  Target identity와 edited opacity는 revision 뒤 유지한다.
- Selection/highlight는 지원되는 현재 derived final-item 의미만 검증한다. 원본 amplitude selector나 내부 group
  key를 사용자에게 직접 요구하는 새 API를 만들지 않는다. Shared scale/Canvas 변경 뒤 이전 program은 보존한다.
- Raw source 역할 편집의 기존 지원은 유지하고, 새로운 cross-family generic bind/filter/compose는 후속 owner에 남긴다.

## V target 계획과 독립 oracle

공통 Canvas 1000×700, margin 150. [단일 manifest](../../../../test/gates/horizon-plot/manifest.js)에
[values](../../../../test/gates/horizon-plot/reference-values.js)와 call을 고정했고
[primitive](../../../../test/gates/horizon-plot/primitive.program.js)를 실행·렌더링했다. 신규 facade는 아직 미구현이다.

| Variant | Values / 제안 public chain | 의미 oracle |
| --- | --- | --- |
| signed | time [0,1,2,3,4,5,6], value [-4,-3,-1,0,1,3,4]; `createHorizonPlot({id:'horizon',x:'time',y:'value'})` | 3 bands×2 signs, 6 paths·24 derived rows, extent 4·bandHeight 4/3, folded [0,1] |
| temporal | time [1000,1100,1300,1500,1700,1900,2000], value [-4,-3,-1,0,1,3,4]; `createHorizonPlot({id:'horizon',x:{field:'time',fieldType:'temporal',temporalUnit:'timestamp',scale:{nice:false}},y:'value'})` | X domain [1000,2000], 원본 단위와 derived timestamp 관계 |
| baseline-style | time [0,1,2,3,4,5,6], value [-2,-1,1,2,3,5,6]; `createHorizonPlot({id:'horizon',x:'time',y:'value',baseline:2,bands:2,area:{opacity:.8}}).editHorizon({target:'horizon',bands:3}).editAreaMark({target:'horizon',opacity:.6})` | Baseline-relative [-4,-3,-1,0,1,3,4], 최종 3 bands·6 paths·opacity .6 |

A의 2점 ±4 예시는 현행 sample folding 뒤 선형 연결에서 band들이 같은 삼각형으로 겹쳐 가장 진한 색만
보였다. V 검토에서 세 band의 경계와 색을 확인할 수 있도록 위 7개 관측값으로 fixture를 구체화했다.
API/options·folding 계산·renderer는 바꾸지 않았다. 기존 2점 baseline probe는 그대로 보존하며,
이 이미지를 연속 구간 전체의 band 경계 보간까지 새로 검증한 증거로 세지 않는다.

전부 nonzero target으로 plot ink를 확인한다. All-baseline empty는 numeric test에서 별도로 허용한다.
Group shared/independent, missing break, explicit coordinate ambiguity, y/legend 거부, revision과 guide/scale/resize는
비시각 acceptance에 포함한다. 새로운 amplitude guide와 panel layout은 후속 composition/guide 범위다.
[Baseline H01–H16](../phase3/baseline-results.json), [consumer matrix](../phase3/VALIDATION.md)를 함께 적용한다.
