# R05 — 결측 조합 완성과 대체

원래 감사 번호: **5**. Primary owner: **Phase 2**. 상태: **Implemented-primary** (`9d4d0840`).
Complete/impute grammar·materializer·public API·facet replay·타입·Current 계약·설치 패키지를 구현했다. R02의 `editCompleteData`·`editImputedData` revision과 Phase 12의 complete→impute 누적 provenance는 `d29287c9`, `8c4b56ad`에서 닫혔다.

## 목적과 현재 연결점

현재 stack/area가 요구하는 정렬된 group×position 데이터와 결측값 정책을 사용자가 명시적으로 만든다. 관측 없음과 0을 라이브러리가 임의로 같게 취급하지 않는다.

현재 파일(저장소 root 상대 경로):
- `src/grammar/complete.js`
- `src/grammar/impute.js`
- `src/actions/data/complete.js`
- `src/actions/data/impute.js`
- `src/actions/data/shared.js`
- `src/grammar/transformTopology.js`
- `src/grammar/transforms.js`
- `types/program.d.ts`

관련 항목: 공통 계약 C01–C12만 선행. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
createCompleteData({id,source?,groupBy?,key,
  values?: readonly Scalar[],
  sequence?: {start:number,end:number,step:number},
  fill?: Readonly<Record<string,Scalar>>, members?:string})
createImputedData({id,source?,fields,groupBy?,sortBy?,
  method:"constant"|"forward"|"backward"|"linear", value?:Scalar,
  edges?:"keep"|"error", maxGap?:number})
```

## 값·기본값·오류 계약

- Complete: key는 하나의 field, groupBy 기본 []. 각 observed group tuple마다 key domain을 완성한다. values와 sequence 배타; 둘 다 없으면 전체 source에서 관측한 unique key first appearance를 사용한다. 다른 groupBy field의 Cartesian product는 만들지 않는다.
- values는 unique scalar, sequence는 finite start<=end, step>0이며 k=start+i*step<=end인 항만 생성한다. floating 누적 대신 index multiplication; numeric UTC timestamps는 숫자로 처리한다. 날짜 달력 sequence는 별도 R08과 결합하며 임의 월 step을 밀리초로 환산하지 않는다.
- duplicate group×key는 자동 집계하지 않고 오류. 출력 순서는 group first appearance, key domain order. explicit domain 밖 기존 key는 오류. source field union을 보존하고 합성 row의 비key field는 fill값 또는 null.
- members를 지정하면 source row는 기존 row index 배열, 합성 row는 []로 provenance를 구별한다. 출력 필드명 collision 오류. 기본 output 최대10,000 rows, product 사전 계산으로 초과 시 거절.
- Impute: fields unique nonempty. missing은 null/undefined만이며 NaN/Infinity는 오류. constant에는 value 필수; 나머지 method는 value 금지와 sortBy 필수. linear는 단일 finite numeric/time sort field와 numeric 대상만 허용한다.
- forward/backward는 그룹을 넘지 않는다. edges 기본 keep, 보간할 양 끝이 없으면 기존 null 유지 또는 error. maxGap은 연속 missing row 최대 개수인 양의 정수; 초과 run은 그대로 유지하며 edges:error로 바꾸지 않는다. 그 외 필요한 anchor가 없는 run에만 edges policy를 적용한다. output row 순서는 원본 그대로; source cells 중 지정한 fields만 대체.

## 저장 결과와 생명주기

`complete`는 새 row grain, `impute`는 기존 row grain이지만 이웃/그룹 의존이 있으므로 둘 다 facet statistical replay다. Source values는 수정하지 않는다. 합성 membership이 []인 cell을 실제 관측 count에 포함하지 않도록 downstream members/count 의미를 명시한다. createSummaryData count는 output row 수를 세므로 사용자가 members 기반 관측 통계를 선택해야 하며 숨은 재해석은 금지한다.

## 구현 순서와 action 계층

1. Complete key identity/group domain/product budget을 pure grammar에서 계산한다.
2. Complete canonical rows → createDerivedData → materializeCompleteData를 구현한다.
3. Impute는 stable sort된 그룹에서 anchor를 탐색하고 원본 index에 결과를 되돌린다. linear는 x 거리 비율을 사용한다.
4. 두 transform의 validate/materialize/facet replay와 R02 editable policy를 각각 등록한다.

## 독립 oracle와 인수 테스트

- [{g:A, t:1, v:2},{g:A, t:3, v:6}] values=[1,2,3] → t2, v:null; linear → v=[2,4,6]. constant0 → [2,0,6].
- 비균등 t=[1,2,5], endpoints v=[2, null,10] → t2=4; 행 index 비율로 6을 만들면 실패다.
- A/B forward가 서로의 값을 가져오지 않는다. 양 끝 missing keep/error를 검증한다.
- duplicate key, unsorted input, mixed key type, empty input, huge product, field collision, explicit domain 누락을 검증한다.
- 완성된 데이터로 stacked Area가 materialize되고 synthetic rows의 selection membership 계약을 검증한다.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 구현 고정 명세 — completion과 imputation

### 옵션 결정표

| 옵션 | 정규형과 범위 | 생략 / 전환 |
| --- | --- | --- |
| CompleteDataOptions.key | nonempty string, groupBy와 중복 금지 | 필수 |
| groupBy | 중복 없는 field 배열 | [] |
| values | nonempty typed unique scalar 배열 | sequence와 배타 |
| sequence | start/end finite, step>0, start<=end | values와 배타 |
| fill | plain object, 값은 JSON-safe scalar | {} |
| members | source field와 충돌하지 않는 새 field 이름 | 생성하지 않음 |
| ImputedDataOptions.fields | nonempty unique field 배열 | 필수 |
| method | constant/forward/backward/linear | 필수 |
| value | constant에서 own key 필수; null 가능 | 나머지 method에서는 금지 |
| sortBy | 기존 WindowSort 배열 | constant에서만 생략 가능 |
| edges | keep/error | keep |
| maxGap | 양의 safe integer | 제한 없음 |

신규 export는 CompleteDataOptions, ImputedDataOptions, DatasetCompleteTransform, DatasetImputedTransform이다. transform.type은 각각 complete/impute. complete의 canonical domain은 요청한 values/sequence 또는 생략 상태를 저장한다. 관측 union을 explicit values로 굳혀 replay하면 안 된다.

### Complete 알고리즘

1. source field union과 observed group tuples를 source 순서로 수집한다. key/groupBy는 각 기존 row에 존재해야 하며 typed scalar를 검증한다.
2. observed domain은 source 전체 first appearance, explicit domain은 요청 순서. sequence는 길이를 먼저 검사하고 start+i*step으로 생성, end 이하인 항만 포함한다. decimal endpoint를 epsilon으로 억지 포함하지 않는다.
3. observedGroups.length × domain.length를 안전하게 비교해 10,000 초과를 allocation 전에 거부한다. 빈 global source+explicit domain은 group 1개; groupBy가 있으면 빈 source의 group은 0개.
4. tuple→key→row index lookup을 만든다. duplicate tuple/key와 domain 밖 기존 key는 Error. fill이 key/groupBy/members를 덮거나 prototype setter를 유발하지 않도록 own-property 데이터 레코드를 사용한다.
5. group 순서→domain 순서로 기존 row를 복사하거나 새 row를 만든다. 새 row는 source field union+fill keys를 가지며 key/group fields 외 미지정 값은 null. fill은 기존 row의 값 또는 누락 cell을 바꾸지 않는다.
6. members가 있으면 기존 row는 [sourceIndex], 합성 row는 []. 이 배열을 downstream count의 숨은 가중치로 취급하지 않는다.

### Impute 알고리즘과 경계 우선순위

field가 row에 없으면 오류, own field의 undefined/null만 결측이다. constant 대체값과 기존 non-null 값은 field별 단일 primitive type이어야 한다. 모든 값 null인 field에 constant를 넣으면 그 타입으로 정한다. NaN/Infinity는 method와 무관하게 오류다.

그룹별 stable sort 후 field마다 원본 known anchors와 maximal missing runs를 수집한다. 새로 채운 값을 다음 run의 원본 anchor로 취급하지 않는다. linear의 sort 좌표는 전체 그룹에서 단일 타입: finite number는 그대로 거리, 기존 parser가 허용하는 명시적 시간 문자열은 UTC ms로 변환한다. numeric year 추론을 하지 않는다. linear에서 ascending만 허용하고 duplicate 위치는 missing 여부와 무관하게 오류다.

정책 적용 순서는 다음과 같다.

1. run 길이 > maxGap이면 그 run 전체를 원래대로 둔다. edges:error도 이 run을 다시 오류로 바꾸지 않는다.
2. constant는 value로 전부 채운다.
3. forward는 왼쪽 known anchor, backward는 오른쪽 anchor, linear는 양쪽 numeric anchor가 필요하다.
4. 필요한 anchor가 없는 run만 edges:keep이면 유지, error이면 RangeError. forward의 trailing run은 왼쪽 anchor가 있으므로 채운다. backward의 leading run도 채운다.
5. linear v(t)=vL+(vR-vL)*(t-tL)/(tR-tL). overflow를 피하는 기존 interpolation helper를 재사용한다. 원본 row index에 결과를 돌려놓는다.

기존 초안의 "maxGap 초과 구간은 edges policy 적용" 문구는 위 1번으로 정정한다. API_DETAILS와 같은 의미다.

### 고정 인수 사례

- R05-N01: A의 (t,v)=[(1,2),(3,6)], values=[1,2,3] → [2,null,6], members=[[0],[],[1]].
- R05-N02: (t,v)=[(1,2),(2,null),(5,10)], linear → [2,4,10].
- R05-N03: v=[null,2,null,null,8,null], forward,maxGap:1 → [null,2,null,null,8,8].
- R05-E01: 위 입력 edges:error → leading run 때문에 실패. leading row를 제거하면 maxGap 초과 internal run은 그대로 두고 성공.
- R05-E02: 같은 group/key 중복, unknown field, values:[1,1], size10001 → 각각 오류.
- R05-L01: source empty, values:[1,2], groupBy:[] → 2 synthetic rows; groupBy:["g"] → 0 rows.

## 완료 조건

- [x] create API의 최단 호출과 explicit source, method별 옵션, 누락/empty 경계를 타입과 runtime으로 동기화했다.
- [x] 위 수치 oracle를 `test/unit/actions/data/complete-impute-data.test.js`에 독립 기대값으로 구현했다.
- [x] point/quantitative encoding과 complete→impute→window→facet-local Canvas replay를 검증했다.
- [x] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] `editCompleteData`/`editImputedData`, source revision 뒤 label/selection/reference consumer는 R02/Phase 4와 Phase 12에서 검증한다.
- [x] Phase 2 승인과 `9d4d0840` 검증 근거를 `phase2/STEP1.md`에 기록했다. appearance 전용 Gate V는 data-only라 새 시각 목표가 없다.
