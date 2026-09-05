# Quantitative authoring — 승인된 미래 계약

상태: Planned, readiness accepted. 사용자가 2026-09-05 “그렇게하자. 그것까지 포함해서 승인한다”라고 답해
[Phase 4 계약](../../impl/roadmap6/phase4/CONTRACT_REVIEW.md)의 P4-C01–C09와 이름 `layoutSeries`를 승인했다.
`encodeLayout` alias는 만들지 않는다. Area/layout의 승인된 V1 구현은 Current COMPLETE_CHARTS/ENCODINGS/MARKS로 이동했다.
완성 차트의 입력 union·전체 hierarchy·저장 결과는 아래 chart owner에 함께 보존한다.
남은 새 direct 2개와 capability 2개는 Planned 상태다. 로드맵 전체 실행은 승인되었으며 구현·검증 후 Current로 이동한다.
Theta/legend order는 Current ENCODINGS/LEGEND_AND_TITLE로 이동했다.



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



## Measured radial mapping

- Planned parameter extension: Arc encodeR에 mapping:area|radius-length 및 explicit sum/count.
- Scale subset: linear, zero:true, nice:false, reverse:false; domain:auto|[0,U], range:auto|[r0,R], clamp?, id?.
  U>0이며 관측 max 이상, 0<=r0<R, padAngle=0, explicit hole/range 일치가 필요하다.
- Canonical mapping은 scale.radialMapping. Shared consumers는 같은 mapping, auto innerRadius 정책을 요구한다.
- Category group grain, sourceIndices, value radius guides, inverse mapping을 함께 검증한다. Coverage missing.

## Sequential midpoint and transitions

- Planned parameter extension: quantitative sequential createScale/nested scale/editScale의 midpoint:number|auto.
  Finite midpoint는 최종 domain 내부에 엄격히 있어야 하고 auto는 기존 endpoint-linear mapping으로 복귀한다.
- Mapper는 양쪽 domain 구간을 색상 parameter [0,.5]/[.5,1]에 나눈다. 중앙 palette sample이 지정 value를 뜻한다.
  Legend는 value-linear 위치를 유지한다. [-2,8], midpoint0의 neutral 위치는 20%다.
- Sequential↔quantize/quantile/threshold의 생성/edit/reencode validator를 Point/Bar/Rect의 현재 지원 grain으로 통합한다.
  Active right/vertical legend는 보존 가능한 common style과 함께 전환한다. Family-only custom style은 오류이며 버리지 않는다.
- All shared consumers와 guide preflight 실패 시 전부 rollback. Top/bottom/left interval 확장은 별도 Phase 5다.
- Coverage missing. 비대칭 domain, reverse/clamp/interpolation, reset·family 양방향 전환·설치 소비자 검증이 필요하다.
