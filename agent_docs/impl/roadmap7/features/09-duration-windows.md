# R09 — 기간 기반 window와 최소 관측수

원래 감사 번호: **9**. Primary owner: **Phase 2**. 상태: **Implemented-primary** (`9d4d0840`).
Elapsed-duration frame, closed peers, minPeriods/missing, stable temporal sort와 public 타입·Current 계약·facet replay·설치 패키지를 구현했다. R02의 `editWindowData`와 Phase 12의 duration-window downstream revision은 `d29287c9`, `8c4b56ad`에서 닫혔다.

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

## 구현 고정 명세 — moving window

WindowFrame은 RowWindowFrame | DurationWindowFrame의 배타 union이다. WindowOperation의 movingMean/movingSum만 frame/minPeriods/missing을 허용한다. row frame의 기존 preceding/following 기본값과 integer 규칙을 보존한다. duration.preceding은 필수이며 following은0, 둘 다 finite>=0, 단위는 millisecond/second/minute/hour/day다.

### duration과 null 결정표

| 조건 | 결과 |
| --- | --- |
| sortBy 생략 / 2개 이상 / descending | duration이면 오류 |
| row frame만 + temporalUnit | 오류 |
| duration이 하나 이상 | 정확히 한 sort field에 temporalUnit 적용 |
| preceding:0,following:0 | 현재 timestamp와 동률인 모든 rows |
| missing:"skip" + null/undefined | 합과 count에서 제외 |
| missing:"skip" + NaN/Infinity | TypeError |
| validCount<minPeriods | null |
| validCount>=minPeriods | movingMean=sum/count, movingSum=sum |
| missing row 자신의 output | 그 row의 frame 계산 결과; 자동 null이 아님 |

window source field 자체가 없는 것은 skip 대상이 아니다. 전체 partition에서 source values를 먼저 검증하므로 범위 밖의 잘못된 row를 우연히 못 본 것으로 처리하지 않는다. timestamp가 정상이어도 duration×unit 또는 t±duration이 finite/Date 범위를 벗어나면 RangeError다.

### O(n log n)+O(n) 실행

1. 기존 partitionBy typed grouping과 stable sort를 재사용한다. sort parsing은 row당1회 캐시하며 requested state에 parser 객체를 저장하지 않는다.
2. 각 duration moving operation에 left/right 포인터, compensated rolling sum, validCount를 둔다. 같은 timestamp 묶음은 같은 [left,right)와 같은 수치를 공유한다.
3. right는 timestamp<=upper인 동안 포함, left는 timestamp<lower인 동안 제거한다. upper/lower 양끝이 포함되는 부등호를 바꾸지 않는다.
4. subtraction이 반복되는 sum의 수치 오차는 numeric helper 전략으로 처리한다. 단순 sum 누적값이 Infinity였다가 빠져나가기를 기다리는 방식은 금지한다.
5. operation별 output을 원본 row index에 기록한다. 여러 operations는 각각 자기 frame/missing/minPeriods를 가진다. 어느 하나 실패하면 dataset 전체를 반환하지 않는다.
6. row-window와 duration-window가 한 operations 배열에 공존할 수 있다. duration의 temporal sort 제약은 그 호출 전체에 적용한다.

### 고정 인수 사례

- R09-N01: days=[0,1,10],x=[2,4,10],duration preceding7day → means=[2,3,10].
- R09-N02: ms=[0,604800000],x=[2,4] → means=[2,3]; 두 번째를604800001로 변경 → [2,4].
- R09-N03: t=[0,0,1],x=[2,4,8],duration0 → [3,3,8].
- R09-N04: t=[0,1,2],x=[2,null,4],row preceding1,skip → [2,2,4]; minPeriods2 → [null,null,null].
- R09-N05: unsorted t=[10,0,1],x=[10,2,4]의 N01 조건 → [10,2,3].
- R09-E01: minPeriods0, mixed frame keys, rank+missing, undefined sort field, all nonfinite → 각 오류.
- R09-L01: editWindowData와 facet-local replay의 closed-boundary/duplicate 규칙이 같아야 한다.

## 완료 조건

- [x] row/duration frame, temporalUnit, minPeriods와 missing 경계를 타입과 runtime으로 동기화했다.
- [x] 위 수치 oracle를 `test/unit/actions/data/window-data.test.js`에 독립 기대값으로 구현했다.
- [x] same-instant peer/rank, source-order output, point encoding과 facet-local Canvas replay를 검증했다.
- [x] Full 타입·Current 계약·catalog·card·MCP·문서·installed consumer를 갱신했다.
- [ ] `editWindowData`와 source revision replay는 R02/Phase 4에서 같은 two-pointer materializer로 검증한다.
- [x] Phase 2 승인과 `9d4d0840` 검증 근거를 `phase2/STEP1.md`에 기록했다. appearance 전용 Gate V는 data-only라 새 시각 목표가 없다.
