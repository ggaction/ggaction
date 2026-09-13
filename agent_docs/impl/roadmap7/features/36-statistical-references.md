# R36 — 데이터를 추적하는 통계 참조선·밴드

원래 감사 번호: **36**. Primary owner: **Phase 7**. 상태: **Implemented-primary (`d7136174`; 통합 `5832228c`)**.
아래 세부 API·수치 정책과 lifecycle은 제품 코드·공개 surface·패키지에서 구현됐고 Phase 7 통합 검증까지 완료했다. R25의 범용 resource collector 통합도 `c29f496c`에서 완료됐다.

## 목적과 현재 연결점

평균·분위수 기준선이 source 저작 변경을 따라가게 한다. 고정 datum reference와 통계 reference를 분리해 “무엇의 평균인가”를 명시한다.

현재 파일(저장소 root 상대 경로):
- `src/actions/marks/references.js`
- `src/grammar/statisticalReference.js`
- `src/actions/scales/preview.js`
- `src/actions/data/edit.js`
- `src/actions/facets/derive.js`
- `src/materialization/marks/index.js`
- `src/grammar/transformTopology.js`

관련 항목: R02, R19. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 공개 API

아래 union은 `types/program.d.ts`와 runtime validator에 동일하게 구현됐다. `ReferenceStatistic`은 공개 타입으로 export되며 기존 literal signature와 dynamic signature를 구별한다.

```ts
createReferenceLine({...ExistingStyle,
  source: string, axis:"x"|"y",
  statistic: {op:"mean"|"median"|"min"|"max"}|{op:"quantile",p:number},
  population?:"boundData"|"visibleItems", field?:string})
createReferenceBand({...ExistingStyle,source:string,axis:"x"|"y",
  statistics: readonly [Statistic, Statistic],
  population?:"boundData"|"visibleItems",field?:string})
// 기존 x/y literal signatures 그대로. 새 union과 literal 혼합 금지.
```

## 값·기본값·오류 계약

- source는 Cartesian mark ID. axis 필수, field 기본 해당 source axis field. aggregate encoding이면 기본 field는 effective bound derived data의 output role. missing/ambiguous/constant datum axis면 field를 명시하거나 오류.
- population 기본 boundData: markFilter wrapper 앞 source authoring binding의 데이터 rows(구현 고정 명세의 provenance 규칙 적용). visibleItems: mark filter 이후 final item의 선택 field 값; 집계 mark는 집계 결과 item, Line/Area/Parallel 등 series grain의 ambiguous scalar는 visibleItems 거부. source selection/highlight는 population을 바꾸지 않는다.
- line statistic은 finite quantitative field. quantile p∈[0,1], 기존 summary quantile algorithm. band lower<=upper, 같으면 zero-width 정상; 역전은 오류. empty/nonfinite/missing population은 오류이며 임의 0선 생성 금지.
- reference는 source axis scale ID를 동적으로 추적한다. source reencode가 다른 field/scale로 바뀌면 field 생략은 새 role을 따르고 field explicit은 유지·검증. reference는 자기 자신/다른 dynamic reference를 source로 삼을 수 없다.
- 동적 reference의 값은 source scale auto domain에 기여하지 않는다. source domain을 먼저 resolve하고 통계를 표현해 feedback cycle을 막는다. domain 밖 값은 기존 positional out-of-range 정책을 따르며 자동 domain 확장 금지.
- Polar/Parallel statistical references, grouped multiple lines, weight 별도 옵션, arbitrary callback, 일반 editReference facade(#35)는 범위 밖. 필요한 수정은 source edit/기존 style와 recreate로 가능.

## 저장 결과와 생명주기

requested source/statistic/population/field-mode를 reference owner config로 보존한다. computed datum은 generated helper data/result이고 직접 source literal과 구별된다. source removal 시 기존 source-owned dependent closure와 함께 제거; R25는 live statistical reference가 붙은 resources 삭제를 막는다. facet에서 통계는 각 partition의 local source로 계산한다.

## 구현 순서와 action 계층

1. literal reference와 dynamic reference discriminated union validator.
2. dependency collector에 source mark/data/axis scale binding 기록.
3. source data/final marks/filter가 완성된 뒤 pure summary evaluator → reference datum materializer.
4. source encoding/derived edit/filter/Canvas/facet replay triggers, stale registry cleanup.
5. guide domain inference에 dynamic reference contribution exclusion 명시.

## 독립 oracle와 인수 테스트

- y=[2,4,6], mean → 4. filter visibleItems gt3 → 5, boundData → 4. selection만 gt3으로 바꾸면 둘 다 통계 불변.
- derived edit y*2 → mean8, 원래 source program mean4. scale rebind 후 line 위치는 새 scale을 따름.
- quantile .25,.75 of[0,10,20,30] → band[7.5,22.5]. mean line/data domain 순환 없음.
- empty/invalid source, statistic+literal, p>1, series visibleItems, reference-as-source 오류.
- two facets A[1,3], B[10,20]: local means2,15. remove source 이후 dangling reference 없음.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 구현 고정 명세 — dynamic reference의 population

### 정확한 union

ReferenceStatistic={op:"mean"|"median"|"min"|"max"}|{op:"quantile",p:number}.
dynamic line는 기존 style/id와 source,axis,statistic,population?,field?를 받는다. dynamic band는 statistics:[ReferenceStatistic,ReferenceStatistic]를 받는다. literal x/y,space,data,coordinate,temporalUnit과 혼합하지 않는다. statistical source가 Cartesian quantitative axis를 가져야 하며 temporal 통계는 이번 범위 밖이다.

field 생략은 requested에서 {kind:"axis"}로, 명시는 {kind:"explicit",field}로 구별한다. 추론한 현재 field 이름을 explicit처럼 저장하지 않는다.

### population 결정

| population | row/item origin | filter 영향 |
| --- | --- | --- |
| boundData (기본) | source의 authoring binding dataset, mark-filter용 derived wrapper 앞 | filterMarks 영향 없음 |
| visibleItems | 최종 mark-filter 이후 item scalar | filterMarks 영향 있음 |

현재 filterMarks가 layer.data를 markFilter derived dataset으로 rebind할 수 있으므로 boundData를 단순 현재 layer.data.values로 읽으면 잘못된5를 만들 수 있다. provenanceTransparent markFilter를 따라가서 source authoring binding의 데이터까지만 복원한다. 일반 filterData/computed/summary를 넘어 original raw까지 역추적하지 않는다.

aggregate mark의 axis field 생략은 aggregate final bound output role을 따른다. boundData와 그 role의 population은 transform 이후 authoring data다. explicit field는 그 population 안에 존재해야 한다. visibleItems의 Line/Area/Parallel series scalar는 거부한다.

### 실행

source/field/axis scale dependency 기록 → source scale domain 확정 → 필요하면 source final items 생성 → finite population 검사 → aggregate 계산 → generated datum → existing Rule/Rect materializer. quantile p는 aggregate의 {op:"quantile",probability:p}로 변환한다.

reference가 자기 domain에 기여하지 않도록 consumer policy에 명시한다. mean이 domain 밖이어도 domain 확장하지 않고 기존 positional mapping을 따른다. reference source removal은 기존 source-owned dependent closure로 처리한다. annotation style 편집은 statistic recipe를 literal로 바꾸지 않는다.

### 고정 인수 사례

- R36-N01: y[2,4,6],mean →4.
- R36-N02: filterMarks gt3 후 boundData4,visibleItems5.
- R36-N03: selection gt3만 적용 → 둘 다4;selection이 filter가 아님.
- R36-N04: [0,10,20,30],quantile .25/.75 → band[7.5,22.5].
- R36-E01: empty values,p1.1,band reversed,statistic+literal,reference source → 오류.
- R36-L01: source y field 변경 → inferred field는 추적,explicit field는 유지;source scale ID도 동행.

## 완료 조건

- [x] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [x] 위 수치 oracle를 `test/contracts/statistical-references.test.js`에 독립 기대값으로 구현했다.
- [x] scale/mark/guide/label/selection/facet/Canvas replay와 aggregate series·binned scale policy를 `test/contracts/statistical-references.test.js`와 `test/contracts/label-reference-lifecycle.test.js`에서 검증했다.
- [x] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [x] Polar/Parallel, grouped lines, weight, callback은 이 Phase의 미지원 범위로 유지했고 범용 resource collector는 R25 `c29f496c`에 연결했다.
- [x] Phase 7 구현 `d7136174`와 통합 수정 `5832228c`, 실제 누적 검증을 Phase 7 STEP1에 기록했다.
