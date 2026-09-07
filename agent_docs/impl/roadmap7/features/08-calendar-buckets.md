# R08 — 주간·요일·시간대 버킷

원래 감사 번호: **8**. Primary owner: **Phase 2**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

주간 리포트와 지역별 일자 집계를 추가한다. 문자열 날짜 parser와 표시 formatter를 이 작업에서 재설계하지 않는다. timezone 구현 선택은 계산 oracle를 만족하는 방식으로 Gate A에서 동결한다.

현재 파일(저장소 root 상대 경로):
- `src/grammar/timeUnit.js`
- `src/actions/data/timeUnit.js`
- `types/program.d.ts`
- `src/grammar/transforms.js`

관련 항목: 공통 계약 C01–C12만 선행. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
createTimeUnitData({...,unit: ExistingTimeUnit|"week"|"weekday",
  timeZone?:string, weekStartsOn?:0|1|2|3|4|5|6,
  weekRule?:"calendar"|"iso"})
```

## 값·기본값·오류 계약

- timeZone 기본 UTC. 현재 unit의 UTC 출력과 temporalUnit parsing을 그대로 보존한다. 숫자 year/timestamp 구분은 existing temporalUnit 계약이다.
- week 기본 weekRule:calendar, weekStartsOn:1(월요일). ISO는 월요일 고정; 다른 weekStartsOn은 충돌 오류. unit:week 출력은 해당 지역 주 시작을 표현하는 UTC timestamp이다. week number/year label을 출력하는 API는 이번 범위 밖이다.
- weekday는 선택 시간대에서 Sun=0..Sat=6의 nominal number를 출력한다. weekday 결과를 temporal timestamp로 추론하지 않도록 docs/example fieldType:ordinal을 명시한다. week 옵션은 다른 unit에서 오류.
- timezone은 지원되는 IANA ID 또는 UTC이며 offset 없는 입력 문자열은 기존 parser 계약을 유지한다. timeZone이 입력 문자열의 해석 규칙을 몰래 바꾸지 않고 bucket 계산에만 쓰인다.
- 지역 달력 성분을 얻은 뒤 해당 bucket의 시작 instant를 계산한다. 반복되는 local boundary는 첫 occurrence, 존재하지 않는 경계는 그 bucket 안의 최초 유효 instant를 택한다. 완전히 존재하지 않는 local date는 입력에서 나올 수 없으며 결과를 발명하지 않는다.
- epoch milliseconds가 출력의 canonical 값. format locale와 분리. 지원 안 되는 timezone/Date 범위 밖 결과는 명확한 오류.

## 저장 결과와 생명주기

timeUnit transform에 unit/timeZone와 week 전용 requested options를 저장한다. resolved timezone offset을 고정해 이후 날짜에 재사용하지 않는다. weekday output type의 의미를 transform metadata에서 찾을 수 있게 타입 정책에 등록한다. Row-preserving facet topology는 유지한다.

## 구현 순서와 action 계층

1. 기존 UTC fast path를 보존한다. host local timezone/getDay 기본값을 사용하지 않는다.
2. 명시적 zone의 calendar parts 및 boundary resolution을 소유하는 작은 pure helper를 둔다. 런타임 timezone 지원 검사를 입구에서 수행한다.
3. boundary 후보 offset을 수집해 역변환하고 parts 검증으로 earliest valid instant를 선택한다. 고정 24h 빼기로 day/week를 계산하지 않는다.
4. Node20/22/24와 browser에서 동일 fixture를 검증한다. 사용 라이브러리가 필요하면 Gate A에 dependency·bundle 분석을 포함한다.

## 독립 oracle와 인수 테스트

- UTC 2024-01-03T12:00Z, week Monday → 2024-01-01T00:00Z.
- 같은 입력 Asia/Seoul week start → 2023-12-31T15:00Z. UTC weekday=3.
- America/New_York 2024-03-10T12:00Z day start → 2024-03-10T05:00Z; 다음날 start는 04:00Z. 24h 차이를 강제하면 실패.
- fall-back 반복 hour 두 instant, year boundary week, leap day, UTC early years, invalid zone, DST 없는 zone을 검증한다.
- legacy UTC unit 7개 결과가 동일하고 facet replay/strict types가 일치한다.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
