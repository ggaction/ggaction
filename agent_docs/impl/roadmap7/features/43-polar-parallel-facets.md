# R43 — Polar·Parallel facet와 repeat 지원

원래 감사 번호: **43**. Primary owner: **Phase 10**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

기존 chart family를 여러 집단·변수에 나란히 비교할 수 있게 한다. 단순 제한 해제가 아니라 provenance, nested scale, local coordinate와 guide ownership 전부를 완성하는 큰 phase다.

현재 파일(저장소 root 상대 경로):
- `src/actions/facets/derive.js`
- `src/actions/facets/replay.js`
- `src/grammar/facets/dependencies.js`
- `src/grammar/facets/scales.js`
- `src/actions/composition/actions.js`
- `src/grammar/parallelCoordinates.js`

관련 항목: R02, R20, R22, R27, R29, R32, R33, R37, R38, R39, R47, R49. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
// 기존 facet/facetGrid public shape 유지; coordinate family 제한 해제.
// 기존 repeatCharts one-dimensional replacement를 확장:
repeatCharts({target?:string, fields:readonly [string,...string[]],
  channel:"theta"|"r" | {parallelDimension:string},
  ...ExistingRepeatLayout})
// 기존 x/y repeat 호출은 그대로; 2차원 repeat와 fields edit는 추가하지 않음.
// FacetScaleResolutions에 theta/r 및 parallelDimensions policy 추가.
parallelDimensions?: "shared"|"independent" // 모든 차원에 공통 v1 policy
```

## 값·기본값·오류 계약

- 필수 facet family: Polar Point/Line/Arc, Pie/Rose/Radar facades, ParallelCoordinates. concat만 성공한 것을 facet 완료로 세지 않는다. row-preserving과 statistics provenance를 각각 source grain에서 partition → replay한다.
- Polar theta/r는 channel별 shared/independent. categorical theta shared는 모든 panels의 typed-key ordered union, 빈 category slot 유지. independent는 local observed category. quantitative theta/r shared는 합쳐진 local derived output domain. 각 panel의 pixel range와 frame은 local.
- Pie의 theta는 partition 내부 누적 share → 각 panel full requested angular span. 범주 union을 sector angle 분모로 오해하지 않는다. Rose는 angular categories와 radial aggregate를 구분. Radar는 dimension order/closed path policy를 유지한다.
- Parallel은 같은 dimension field 목록/순서/fieldType/scale type이 panel 전체에 필수. shared는 각 dimension별 domain union, independent는 각 panel/차원 local domain. 다른 단위의 dimension끼리 global min/max를 합치지 않는다. x dimension positions는 동일 순서를 유지하고 local width에 맞춘다.
- repeat theta/r는 해당 field role 교체가 가능한 Polar Point/Line/Arc/Rose source에서 지원; Pie category/measure와 Radar dimensions 같은 semantic facade role이 다르면 임의로 theta로 바꾸지 말고 명시 오류. parallelDimension field는 정확히 한 차원 role을 각 fields 값으로 교체하며 중복 dimension field/다른 type incompatibility를 사전 거부.
- non-Cartesian positional guides의 outer/shared-axis placement는 지원하지 않고 per-panel internal axes/grid만. categorical/size/stroke 등의 shared legends는 domain/style/sample compatibility가 맞는 경우 지원한다. explicit unsupported guide mode는 오류, 조용히 local로 downgrade 금지.
- empty partition은 panel/header 유지 + empty marks; explicit domain을 우선, shared domain이 있으면 그것 사용. independent 자동 domain을 결정할 값이 전무하면 기존 empty-domain 정책에 따라 clear error, 가짜0..1을 생성하지 않는다.
- R27/R29 requested frame, R32 selection/labels, R39 headers, R47 theme, R49 style는 child namespace에 재생성. 원본 source program 불변. arbitrary cell override(#42), facet category edit(#40), repeat matrix(#41)는 범위 밖.

## 저장 결과와 생명주기

기존 retained source recipe와 child provenance mapping을 확장한다. source data partition, chart-owned transform replay, scale resolution, coordinate local frame, guide/layout assembly를 분리한다. Parallel dimensions nested scale refs/Polar theta+r refs를 dependency registry에 정식 포함한다. 단순 graphic crop/clone으로 facet를 구현하지 않는다.

## 구현 순서와 action 계층

1. [chart contract](../chart/polar-parallel-facets.md)의 지원 matrix를 primitive examples와 함께 고정.
2. facet dependency collector가 polar/parallel refs를 수집하고 source grain partition/replay를 허용.
3. family별 shared/independent domain resolver와 child local coordinate 생성.
4. one-dimensional repeat role substitution를 field-aware하게 구현.
5. guides/legends/headers/labels/theme/style namespace migration.
6. create → source edit → scale edit → Canvas → theme → replay 전체와 installed consumer/renderer matrix를 완료.

## 독립 oracle와 인수 테스트

- Polar scatter A r=[1,2], B=[10,20]: shared r domain max20, independent max2/20; frame radius는 각 child bounds 기준. theta categorical union A[a, b], B[b, c]의 shared[a, b, c].
- Pie A values[1,1], B[1,3]: 각 panel360°, shares .5/.5 및 .25/.75. 전체 rows 분모를 쓰면 실패.
- Radar dimensions[a, b, c] reorder/닫힘/공유 축, Rose category empty bins와 weighted source facet.
- Parallel dims a[0,1]/b[0,1000]: shared 각각0..1/0..1000, 차원끼리 혼합 금지. repeat a → [c, d]는 b 유지·각 child a role만 교체.
- facet row-preserving computed와 summary/density/window statistical replay, selected labels local top-k, headers/custom themes.
- incompatible dim list, unsupported repeat facade role, outer axes, invalid independent empty domain은 atomic error.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
