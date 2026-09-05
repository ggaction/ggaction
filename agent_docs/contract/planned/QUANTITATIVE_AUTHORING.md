# Quantitative authoring — 승인된 미래 계약

상태: Planned, readiness accepted. 사용자가 2026-09-05 “그렇게하자. 그것까지 포함해서 승인한다”라고 답해
[Phase 4 계약](../../impl/roadmap6/phase4/CONTRACT_REVIEW.md)의 P4-C01–C09와 이름 `layoutSeries`를 승인했다.
`encodeLayout` alias는 만들지 않는다. Public runtime/declaration은 아직 없으며 시각 V 승인 뒤 구현한다.
완성 차트의 입력 union·전체 hierarchy·저장 결과는 아래 chart owner에 함께 보존한다.
Current 177개는 그대로이며 새 direct 4개와 기존 method의 capability 5개가 이 Planned 범위다.

## `createAreaPlot`

- Lifecycle: Aggregate create-only. Entry: ggaction full만. Shape: 필수 x/y, valueChannel 기본 y,
  id/data/coordinate?, baseline?, groupBy?, layout?, missing?, color?, area?, guides?.
- 독립 위치는 quantitative/temporal field. 측정 위치는 field 또는 `{lower,upper,scale?}`.
  Bound는 field string 또는 `{datum:number}`이고 최소 하나는 field다. Simple baseline 기본 0,
  명시적 range와 baseline 동시 입력은 오류다. Missing 기본 error, break는 명시적 선택이다.
- Child owners: createAreaMark, coordinate, encodeGroup, position/range, layoutSeries, color, scoped guides.
- Field와 datum은 encoding, missing은 mark, mode는 layer.layout, appearance는 mark config가 소유한다.
  Source에 zero field를 추가하지 않는다. Graphics는 concrete closed path commands다.
- 오류: 잘못된 role/option, 빈 입력/유효 segment 없음, invalid log baseline, incompatible group/stack/grain/guide.
  실패에서 이전 program/trace/caller 입력을 유지한다. 아래층 편집은 range/group/layoutSeries/editAreaMark/editScale.
- [전체 Area 계약](../../impl/roadmap6/chart/area.md), [수치·소비자 acceptance](../../impl/roadmap6/phase4/VALIDATION.md).
- Coverage: missing. 승인된 public/primitive pair와 strict declarations가 생겨야 구현 완료다.

## `layoutSeries`

- Lifecycle: Assignment. Entry: full/basic; Basic은 Bar만이며 center를 타입에서 제외한다.
- Signature: `layoutSeries({target?:string, mode:"group"|"stack"|"fill"|"overlay"|"diverging"|"center"})`.
- Bar/Area의 series 배치를 소유한다. Canvas, facet, composition, path vertex, draw order는 대상이 아니다.
- Mode는 필수이고 overlay가 누적 배치 해제다. 새 edit/remove alias 없이 재호출로 배치를 바꾼다.
- Bar aggregate/histogram은 group/stack/fill/diverging/overlay. Ranged Bar는 overlay만.
  Raw simple Area는 overlay/stack/fill/diverging, vertical nonnegative일 때 center.
  Two-field ribbon은 overlay만이며 Area group은 오류다. Density는 기존 grain/방향 한도를 유지한다.
- Stack/fill/center는 nonnegative, diverging은 signed. Fill sum=0은 두께 0, domain [0,1].
  Area 누적은 aligned unique group×position과 baseline 0을 요구한다. Missing을 임의 zero로 보충하지 않는다.
- Canonical mode는 layer.layout.mode, identity는 encoding.group. Color는 appearance를 담당한다.
  Legacy color.layout/measure.stack/Bar offset 입력은 같은 owner에 위임하고 마지막 명시적 배치 요청을 적용한다.
- Group에서 떠날 때 active offset을 정리하며 shared/user-owned scale은 삭제하지 않는다.
  Color 제거는 group/layout을 유지한다. 필요한 group 제거·공유 scale 불일치는 atomic 오류다.
- [정확한 adapter·provenance·호환성 계약](../../impl/roadmap6/phase4/CONTRACT_REVIEW.md).
- Coverage: missing. 기존 series math는 존재하지만 새 public 배치와 전환은 미구현이다.

## `createRosePlot`

- Lifecycle: Aggregate create-only. Entry: full만. Category 필수. Value 없음→count, value 있음→explicit aggregate:sum.
  Optional id/data/coordinate/radiusScale/color/arc/guides. Default id rosePlot, color category.
- Equal-angle, category aggregate, zero-based domain, area mapping. `r=sqrt(r0²+t(R²-r0²))`.
  Arc/theta/encodeR/color/Polar guide를 합성한다. Facade 자체 transform/source/cache는 없다.
- Semantic scale.radialMapping이 mapper를 소유하며 radius encoding.aggregate는 category grain을 소유한다.
  Radius guide도 같은 mapper와 원래 측정 단위를 사용한다. Primitive는 concrete path commands다.
- All-zero/negative/nonfinite/unequal-angle/비호환 shared consumer/nonzero padAngle은 오류다.
  양수 category는 모두 표현하며 0 category는 domain/legend에 남고 sector는 없다.
- Lower edit: encodeR, editArcMark, editScale, orderCategories, legend editors. 모든 실패는 immutable다.
- [전체 Rose/Radial 계약](../../impl/roadmap6/chart/rose-radial-bar.md).
- Coverage: missing. Hole 0/0.5의 면적비·숫자/guide/selection/render pair를 검증해야 한다.

## `createRadialBarPlot`

- Lifecycle: Aggregate create-only. Entry: full만. Rose와 동일한 옵션·오류·child owner를 쓴다.
- Default id radialBarPlot. Mapping만 radius-length이며 `r=r0+t(R-r0)`로 측정한다.
  Generic encodeR의 기존 row grain/domain/default는 바꾸지 않는다.
- Radius.length가 아니라 outer radius minus inner radius가 value에 비례한다.
  최소 양수가 자동 domain min 때문에 사라지지 않아야 한다. Source indices는 category의 모든 행을 유지한다.
- [전체 Rose/Radial 계약](../../impl/roadmap6/chart/rose-radial-bar.md), [수치 oracle](../../impl/roadmap6/phase4/VALIDATION.md).
- Coverage: missing. Disk/hole, duplicate category, count/sum, domain/edit/shared consumers와 renderer를 검증해야 한다.

## Area datum endpoints

- Planned parameter extension: encodeX/Y/X2/Y2의 Area quantitative endpoint field|datum,
  encodeXRange/YRange의 mixed bounds와 final pair preflight. Primary/secondary는 같은 scale이다.
- Lower/upper는 primary/secondary 역할 이름으로 값의 대소를 강제하지 않는다. 기존 crossing ribbon을 유지한다.
- createAreaMark/editAreaMark missing:error|break는 semantic mark policy다. Break는 null/undefined 측정 endpoint만
  허용하고 missing independent/group, NaN/Infinity는 오류다. 연속 유효점 2개 이상 segment만 그린다.
- Current Rule datum, Bar/Rect field 계약은 유지한다. Raw endpoint/missing/range 부분은 구현되었으며 current ENCODINGS/MARKS와 area-endpoints.test.js가 소유한다. 누적 shared break와 facade는 layout 구현과 통합 검증 뒤 완료한다.

## Series layout ownership

- Planned behavior extension: encodeGroup의 Bar 지원과 color.layout/measure.stack/offset의 단일 layoutSeries owner 위임.
- Explicit group은 color 변경으로 교체하지 않는다. Legacy inferredFrom origin만 canonical group에 저장한다.
- Area 색은 series-constant, Bar는 aggregate cell의 기존 quantitative/categorical color grain을 유지한다.
- Endpoint/group/layout/scale/guide/highlight를 최종 구성으로 preflight한다. Coverage missing.

## Measured radial mapping

- Planned parameter extension: Arc encodeR/encodeRadius에 mapping:area|radius-length 및 explicit sum/count.
- Scale subset: linear, zero:true, nice:false, reverse:false; domain:auto|[0,U], range:auto|[r0,R], clamp?, id?.
  U>0이며 관측 max 이상, 0<=r0<R, padAngle=0, explicit hole/range 일치가 필요하다.
- Canonical mapping은 scale.radialMapping. Shared consumers는 같은 mapping, auto innerRadius 정책을 요구한다.
- Category group grain, sourceIndices, value radius guides, inverse mapping을 함께 검증한다. Coverage missing.

## Theta and legend order

- Planned parameter extension: orderCategories/removeCategoryOrder channel에 theta 추가.
- Categorical Arc/Polar point/line만, existing values/by/direction/tie/explicit-domain 오류 계약 재사용.
- Categorical createLegend/editLegend order는 scale 또는 `{values:[...]}` 또는 `{channel:x|y|theta}`.
  Legend item permutation만 바꾸고 value→color 대응은 유지한다. Unknown/duplicate/empty list는 오류다.
- Link는 같은 target의 same data/field/category set을 요구하며 후속 invalidation은 atomic 오류다.
  Canonical policy는 semantic guide.legend.kind.order다. Coverage missing.

## Sequential midpoint and transitions

- Planned parameter extension: quantitative sequential createScale/nested scale/editScale의 midpoint:number|auto.
  Finite midpoint는 최종 domain 내부에 엄격히 있어야 하고 auto는 기존 endpoint-linear mapping으로 복귀한다.
- Mapper는 양쪽 domain 구간을 색상 parameter [0,.5]/[.5,1]에 나눈다. 중앙 palette sample이 지정 value를 뜻한다.
  Legend는 value-linear 위치를 유지한다. [-2,8], midpoint0의 neutral 위치는 20%다.
- Sequential↔quantize/quantile/threshold의 생성/edit/reencode validator를 Point/Bar/Rect의 현재 지원 grain으로 통합한다.
  Active right/vertical legend는 보존 가능한 common style과 함께 전환한다. Family-only custom style은 오류이며 버리지 않는다.
- All shared consumers와 guide preflight 실패 시 전부 rollback. Top/bottom/left interval 확장은 별도 Phase 5다.
- Coverage missing. 비대칭 domain, reverse/clamp/interpolation, reset·family 양방향 전환·설치 소비자 검증이 필요하다.
