# R09 — 기간 기반 window와 최소 관측수

원래 감사 번호: **9**. Primary owner: **Phase 2**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

불규칙 관측 시계열에서 행 개수와 시간 길이를 구분한다. 로컬 달력 bucket은 R08, window는 elapsed duration으로 책임을 나눈다.

현재 파일(저장소 root 상대 경로):
- `src/grammar/window.js`
- `src/actions/data/window.js`
- `src/grammar/transforms.js`
- `types/program.d.ts`

관련 항목: R08. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
// movingMean/movingSum의 frame union 확장
frame: {preceding:number,following?:number}
 | {duration:{preceding:number,following?:number,unit:"millisecond"|"second"|"minute"|"hour"|"day"}}
// WindowDataOptions root: temporalUnit?: TemporalInputUnit (duration이 있을 때만)
// 아래는 moving operation마다 제공
minPeriods?:number
missing?:"error"|"skip"
```

## 값·기본값·오류 계약

- 기존 row frame 기본과 출력은 유지. duration은 exactly one ascending temporal sortBy field 필수, temporalUnit으로 명시적 parsing. 숫자 값은 unit 배수의 elapsed time; day는 정확히24h이며 local calendar day가 아님.
- frame interval은 [t-preceding, t+following] 양끝 포함. 동일 timestamp의 모든 row 포함. following 기본0, duration 값 finite nonnegative. row/duration key 혼용 오류.
- minPeriods 기본1, 양의 정수. 유효 numeric 관측수가 미달하면 output null. missing 기본error, skip은 null/undefined만 빼고 NaN/Infinity는 오류. missing skipped row에도 그 시각/위치의 window 결과를 출력한다.
- Output 순서는 source 그대로, 각 그룹 독립. calendar month/year window는 범위 밖. backward sorting은 duration에서 거부하며 row frame 기존 descending은 유지.
- movingSum/Mean만 확장한다. rank/lag/lead에 duration/minPeriods를 전달하면 오류.

## 저장 결과와 생명주기

window operation에 normalized frame/minPeriods/missing을 저장한다. Duration을 밀리초로 resolve한 파생 값을 requested와 이중 source of truth로 사용하지 않는다. statistical facet replay로 각 panel의 시간 구간을 다시 계산한다. null output은 downstream null 지원에 따르며 자동0 변환 없음.

## 구현 순서와 action 계층

1. operation-specific validation을 확장하고 stable timestamp 정렬과 group partition을 재사용한다.
2. 두 pointer로 각 timestamp의 포함구간을 계산하고 compensated sum/count를 관리한다. naive rows² 구현은 금지한다.
3. null 정책 및 minPeriods 후 output을 원래 index에 매핑한다.
4. R02 editWindowData와 R43 facet replay가 동일 materializer를 호출하도록 등록한다.

## 독립 oracle와 인수 테스트

- t=[0,1,10] days, x=[2,4,10], trailing7days mean=[2,3,10]; trailing2rows 결과와 다름을 확인한다.
- t=[0,7], trailing7days의 second window는 두 점 포함; 경계+1ms는 첫 점 제외.
- 같은 t의 값 [2,4]는 두 row 모두 mean3. groups는 섞이지 않는다.
- x=[null,4], minPeriods2 skip → [null, null]. 유효0과 null 구분.
- unsorted source, invalid sort types, duration overflow, 기존 row-frame equivalence, O(n log n) sorting/O(n) scan을 검증한다.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
