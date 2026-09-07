# R36 — 데이터를 추적하는 통계 참조선·밴드

원래 감사 번호: **36**. Primary owner: **Phase 7**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

평균·분위수 기준선이 source 저작 변경을 따라가게 한다. 고정 datum reference와 통계 reference를 분리해 “무엇의 평균인가”를 명시한다.

현재 파일(저장소 root 상대 경로):
- `src/actions/marks/references.js`
- `src/actions/marks/rule/index.js`
- `src/grammar/summary.js`
- `src/materialization/planner.js`

관련 항목: R02, R19. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

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
- population 기본 boundData: source layer가 bind한 데이터 rows. visibleItems: mark filter 이후 final item의 선택 field 값; 집계 mark는 집계 결과 item, Line/Area/Parallel 등 series grain의 ambiguous scalar는 visibleItems 거부. source selection/highlight는 population을 바꾸지 않는다.
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

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
