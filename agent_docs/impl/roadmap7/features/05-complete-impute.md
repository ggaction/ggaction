# R05 — 결측 조합 완성과 대체

원래 감사 번호: **5**. Primary owner: **Phase 2**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

현재 stack/area가 요구하는 정렬된 group×position 데이터와 결측값 정책을 사용자가 명시적으로 만든다. 관측 없음과 0을 라이브러리가 임의로 같게 취급하지 않는다.

현재 파일(저장소 root 상대 경로):
- `src/grammar/stack.js`
- `src/grammar/areaSeries.js`
- `src/grammar/transformTopology.js`
- `src/actions/data/shared.js`

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
- forward/backward는 그룹을 넘지 않는다. edges 기본 keep, 보간할 양 끝이 없으면 기존 null 유지 또는 error. maxGap은 연속 missing row 최대 개수인 양의 정수; 초과 구간은 edges policy 적용. output row 순서는 원본 그대로; source cells 중 지정한 fields만 대체.

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

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
