# Roadmap 6 — Rose / Radial bar

**승인된 Phase 4 A 계약 / 미구현. 시각 V 승인은 아직 없다.**
[P4-C04 계약](../phase4/CONTRACT_REVIEW.md), [Gate](../phase4/GATES.md),
[수치·V 계획](../phase4/VALIDATION.md)에 연결한다. 범위는 F04·D01이다.

## 목적과 최종 public API

Rose는 equal-angle sector의 면적, Radial bar는 inner radius에서 바깥쪽으로 잰 길이로 값을 나타낸다.
같은 Arc/theta/radius owner를 쓰되 측정 의미를 구분한다. 두 차트 모두 2·3·4가 세 개의 sector로 보인다.

~~~javascript
// Proposed APIs. These are separate immutable branches.
import { chart } from 'ggaction';
const values = [{ category: 'A', value: 2 }, { category: 'B', value: 3 }, { category: 'C', value: 4 }];
const base = chart().createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ id: 'data', values });
const rose = base.createRosePlot({ id: 'r', category: 'category', value: 'value', aggregate: 'sum' });
const radial = base.createRadialBarPlot({ id: 'r', category: 'category', value: 'value', aggregate: 'sum' });
const hole = base.createRosePlot({
  id: 'r', category: 'category', value: 'value', aggregate: 'sum', arc: { innerRadius: 0.5 }
});
const count = base.createRosePlot({ id: 'r', category: 'category' });
~~~

두 facade는 동일한 옵션을 받으며 mapping만 area / radius-length로 고정한다.

| 옵션 | 계약 |
| --- | --- |
| id/data/coordinate | optional string, id 기본 rosePlot/radialBarPlot. 기존 data/Polar resolver |
| category | 필수, PieCategory의 field string 또는 `{field,fieldType?:nominal/ordinal,scale?}` 재사용 |
| value/aggregate | Pie처럼 배타 union. value 없음→aggregate 생략 또는 count; value field 있음→aggregate:'sum' 필수 |
| radiusScale | optional, P4-C04의 linear zero-based domain/range subset |
| color | 기본 category. false 또는 PieColor의 명시적 nominal/ordinal field/scale/palette |
| arc | `{innerRadius?,padAngle?,fill?,opacity?,stroke?,strokeWidth?}`. 아래 측정 제약 추가 |
| guides | false 또는 `{axes?,grid?,legend?}`. axes/grid는 기존 Polar guide 옵션의 적용 가능한 subset, legend는 PieLegendOptions |

Category theta는 band/equal-angle만 허용한다. Theta aggregate·weight, numeric theta position, arbitrary mapping override,
row-level aggregate 생략 sum, unknown input keys는 오류다. Value string으로 sum을 추측하지 않는다.
Categorical theta domain/range/reverse는 기존 PieCategory subset을 사용하며 order는 기존 lower order owner로 편집한다.
차트에서 자동 색을 끄고 fill을 명시하려면 color:false를 사용한다. Color는 합쳐진 category 안에서 한 값이어야 한다.

Canvas와 materialized dataset은 사전 조건이다. Data explicit→current→unique 및 coordinate resolver는 Phase 3과 동일하다.
선택한 data는 mark child에 직접 전달한다. 같은 mark id 재생성, 잘못된 family의 coordinate, 모호한 scale/guide는 오류다.
Guides 생략은 **radius의 실제 값 guide와 category theta guide, category color legend**를 기존 applicable owner로 확보한다.
Guides:false는 guide 생성 생략이다. 없는 Polar title/component를 편집으로 생성하는 기능은 Phase 5에 남긴다.
현재 facade guide scoping helper는 Cartesian/Parallel용이므로 이 단계에서 Polar resource scoping을 추가한다.
기존 createAxes/createGrid의 Polar owner를 호출하고, facade가 무관한 coordinate/scale/legend를 수정하지 않게
same-target reuse와 foreign-resource 오류를 검증한다. Generic createGuides에 target 옵션을 새로 추가하는 제안은 아니다.

## 측정값·angle·hole의 수치 계약

Category마다 count 또는 nonnegative finite value sum을 구한다. Equal-angle의 category 순서는 first appearance다.
Duplicate category의 값은 하나의 sector에 합쳐지고 sourceIndices는 모든 원본 행을 유지한다.
Category n개에서 간격 없는 sector angle은 2π/n, partial theta range면 그 range 길이/n이다.
Category set이 같으면 각 angle은 값 편집에 따라 바뀌지 않는다.

Scale 자동 domain은 [0,max(category aggregate)], nice:false다. Explicit domain도 [0,U]이고 U는 aggregate max 이상이어야 한다.
U>0, radius range는 0<=r0<R인 finite pair가 필요하다. t=value/U라 하면:

- Rose: `r = sqrt(r0*r0 + t*(R*R-r0*r0))`.
- Radial bar: `r = r0 + t*(R-r0)`.

예: R=140, r0=70, 값 2/3/4는 Rose outer radii 약 **110.679718 / 126.194295 / 140**,
Radial bar는 **105 / 122.5 / 140**이다. Rose의 annulus 면적비는 2:3:4, Radial의 radial length 비는 2:3:4다.
기존 `sqrt` scale의 [70,140] mapping은 첫 반지름 약119.497475로 이 Rose 공식을 만족하지 않는다.
Hole 없는 Rose에서만 sqrt의 일반적인 형태와 일치한다.

Auto radius range는 기존 Arc의 innerRadius ratio를 사용한다. Explicit range=[r0,R]이면 그 range가 hole을 정의하고,
facade에서 arc.innerRadius도 명시했다면 r0/R와 일치해야 한다. 불일치는 오류다.
Auto range에서 innerRadius edit는 range와 모든 outer radius를 재계산한다. Explicit range에서 ratio edit가 충돌하면
오류이며 먼저 range:auto로 바꾸거나 일치하는 조합을 명시해야 한다. Shared auto scale의 innerRadius 일치 guard는 유지한다.
InnerRadius는 0 이상 1 미만이다. 이 두 측정 facade의 padAngle은 **0만 지원**한다. Nonzero padding이 실제 ink 면적을
바꾸는 문제를 숨기지 않는다. Generic Arc/Pie의 기존 padding은 그대로 유지한다.

Zero category는 color/theta domain·legend에 남되 면적/길이 0인 sector는 그리지 않는다.
전체가 zero, 음수 input, NaN/Infinity, 빈 dataset, overflow 합계, 음수/역전 domain이나 radius range는 오류다.
양수가 하나 이상이면 모든 양수 category를 표현한다. 최소 양수가 radius 0으로 사라지는 기본값을 쓰지 않는다.
Weighted-angle·signed Rose·abs(value) 자동 보정은 지원하지 않는다.

## Hierarchy와 명시적 lower chain

~~~javascript
// Proposed lower equivalence of rose; encodeR options are not Current yet.
const lower = base.createArcMark({ id: 'r', data: 'data' })
  .encodeTheta({ target: 'r', field: 'category', fieldType: 'nominal' })
  .encodeR({ target: 'r', field: 'value', aggregate: 'sum', mapping: 'area' })
  .encodeColor({ target: 'r', field: 'category', fieldType: 'nominal' })
  .createGuides();
~~~

~~~text
createRosePlot / createRadialBarPlot
├─ createArcMark
├─ createCoordinate? (Polar, existing resolver)
├─ encodeTheta (categorical equal-angle, no theta aggregate)
├─ encodeR (count/sum category grain; area/radius-length mapping)
│  ├─ existing category aggregation / sourceIndices
│  ├─ radius scale definition / shared-consumer validation
│  └─ Arc materialization (same mapper as radial guides)
├─ encodeColor? (category default or explicit series-constant field)
└─ createGuides? (value radius, category theta, optional color legend)
~~~

`encodeR({field})`와 Polar scatter의 기존 default/type/row grain은 그대로다. New mapping은 opt-in이며
`encodeRadius`/`encodePointRadius`는 점의 glyph 크기이며 이 반지름 위치 확장에 포함하지 않는다. Facade가 source를 summarizeData로 몰래 교체하거나
renderer에 area-specific radius 보정을 넣지 않는다. 별도 Cartesian Bar layer도 만들지 않는다.

## 저장 결과와 lifecycle

Semantic layer의 categorical theta, radius aggregate count/sum, color field와 원본 data 관계를 유지한다.
Mapping은 해당 semantic scale의 radialMapping, domain/range는 기존 scale 속성에 저장한다.
Encoding에 mapping 복사본·facade recipe·final radii를 추가하지 않는다. Graphic은 concrete path commands·paint뿐이다.
Count에는 가짜 value field가 없다. Radius guide title은 count 또는 원래 value field 단위를 설명한다.
Guide 위치도 area mapper를 사용하므로 Rose의 반지름 tick을 선형 간격으로 잘못 그리지 않는다.

| 편집 | owner와 결과 |
| --- | --- |
| value/aggregate/mapping | encodeR 재할당. Category grain·domain·marks·guide를 같이 갱신 |
| legacy radius 복귀 | removeEncoding radius 후 새 scale id로 encodeR field 재작성. 기존 scale을 재사용하면 orphan scale의 radialMapping을 editScale로 명시 제거. 생략으로 mapping 해제 추측 금지 |
| innerRadius/appearance | editArcMark. Mapping/range compatibility부터 검증 |
| scale domain/range | editScale. Zero-based mapping과 모든 공유 consumer 검증 |
| theta order | orderCategories/removeCategoryOrder channel theta. 값과 source identity 유지 |
| legend 순서만 변경 | createLegend/editLegend order. 색 배정 유지, geometry와 별도 |
| Canvas/data 변경 | 기존 rematerialization planner. Source indices·selection/highlight와 guides 갱신 |

같은 radius scale을 generic Point/Arc와 measured Arc가 공유하는 혼합은 거부한다.
Area와 radius-length도 다른 mapping이므로 하나의 scale에 섞지 않는다. 공통 범위가 필요하면 별도의 scale id를 사용한다.
범위/consumer 오류는 이전 program·trace·caller inputs를 유지하며 외부에 반쪽 결과를 반환하지 않는다.
Label/selection은 category aggregate와 sourceIndices의 기존 Arc 규칙을 사용하고 row-level label을 임의 대표값으로 줄이지 않는다.

## 검증과 완료 조건

[V2 계획](../phase4/VALIDATION.md)은 disk/hole Rose, disk/hole Radial, theta와 legend link를 포함한다.
Literal radius/sector area/length oracle, category duplicate sum, 0/all-zero/negative, count, explicit range,
sourceIndices·selection, mapping/innerRadius/domain/order edit와 nonempty shortest call을 함께 검사한다.
Primitive/public semantic·graphic·Canvas·decoded PNG 동등성, SVG/PDF, browser installed consumer,
strict positive/negative declarations와 MCP generated call 실행이 완료 조건이다.

신규 negative/unequal-angle 측정 mode, gap 보정 면적 encoding, rainbow/diverging 의미 자동 추론,
새 renderer primitive나 Polar guide lifecycle 전체 재설계는 포함하지 않는다. F20은 계속 제외한다.
