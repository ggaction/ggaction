# STEP5 — STEP-015 civil-day grain과 날짜 보완 설계

## 진행 상태

- [x] 원본 STEP-015와 기존 timezone·calendar·completion owner 확인
- [x] 최소 공개 옵션, inclusive domain, DST·lineage·budget 설계
- [x] 전체 계획 실행 승인과 STEP-024 인계 경계 연결
- [ ] 독립 날짜 oracle와 실패 시험 작성
- [ ] calendar completion 및 소비자 구현
- [ ] focused·누적 검증과 현재 계약·선언·문서 동기화
- [ ] AT-17 evidence closure와 검증 checkpoint commit/push

상태: **설계 초안, 제품 구현 미착수**. 2026-10-28 source freeze 중 읽기 전용 조사로 작성했다.
코드의 존재와 실행 증거를 구분한다. 이 문서의 명령·fixture는 이후 구현 검증 계획이며 통과 기록이 아니다.

## 범위와 승인

[원본 STEP-015](../../../../study/coverage-expansion-2026-10-27/roadmap/tasks/STEP-015-time-transform.ko.md),
[data-statistics 계약](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/data-statistics.ko.md),
[현재 CORE](../../../contract/current/CORE.md)가 기준이다. 선행 통계 보강은 [STEP4](STEP4.md)다.
사용자의 STEP-077까지 실행 승인은 [AUTHORIZATION](../AUTHORIZATION.json)을 재사용한다.
전체 실행 담당자가 이번 최소 방향을 확인했으며 inclusive end와 work bounds도 구체화했다.

STEP-015는 날짜 데이터 grain과 missing-date completion을 소유한다. Calendar chart의 cell geometry,
week index 배치, month boundary union과 시각 검토는 원본 STEP-024의 의무로 남긴다.
새 chart facade, mark family 또는 렌더러 날짜 해석을 이 STEP에 섞지 않는다.
OR-19 및 STEP-014에서 넘겨받은 통계 evidence를 합쳐 AT-17을 닫고, 최종 qualification은 STEP-074에 남긴다.

## 이미 있는 기능

| 현재 owner | 현재 지원 | 실제 추가 필요 |
| --- | --- | --- |
| `src/grammar/timeUnit.js` | Gregorian UTC/IANA civil parts, year/quarter/month/day/hour/minute/second/week/weekday, explicit weekStartsOn/weekRule | 새 flooring engine 불필요 |
| 같은 파일의 `resolveCalendarBoundary` | fold의 이른 instant, midnight gap의 같은 bucket 첫 유효 instant, 존재하지 않는 civil date 오류 | 날짜 열거에서 같은 정책 재사용 |
| `src/grammar/parseTime.js` | strict leap/rollover 검증, ISO offset parser, explicit zone date parsing private helpers | 새로운 date parser나 host-local Date.parse 경로 불필요 |
| `createTimeUnitData`/focused edit | 기존 rows/order/raw cells 보존, numeric epoch bucket, timezone provenance, row-preserving lineage | 기존 default UTC와 생략 stored shape 보존 |
| `createSummaryData` | group×day 명시 집계, missing/empty policy, row membership | date 전용 aggregate를 새로 만들 필요 없음 |
| `createCompleteData`/focused edit | 관측/명시 values/numeric sequence domain, fill, duplicate-row 보존, observed groups, synthetic empty lineage | timezone-aware **civil day domain** 모드가 없음 |
| 기존 시험 | `time-unit-data.test.js`, `expression-calendar.test.js`에 DST/leap/week/host TZ 사례 | 366 civil days 및 aggregate→complete→revision의 독립 통합 증거 |

기존 `offsetUtcTimeUnit`의 UTC day 증가는 UTC tick 책임이므로 이 작업 때문에 전역 변경하지 않는다.
새 IANA domain을 그 helper의 고정 epoch 간격으로 만들지 않는다.

## 최소 공개 추가: complete의 calendar domain

`createCompleteData`와 `editCompleteData`에 `calendar`를 추가한다. `values`, `sequence`, `calendar`는
상호 배타다. 기존 두 모드의 기본값·입력·정규형은 변경하지 않는다. Full-only 지원을 유지한다.

```ts
type CalendarDayDomain = {
  unit: "day";
  start: string; // strict Gregorian YYYY-MM-DD, inclusive
  end: string;   // strict Gregorian YYYY-MM-DD, inclusive
  timeZone: string; // explicit UTC or supported IANA zone
};
```

최소 daily chain:

```js
chart()
  .createData({ id: "events", values: events })
  .createTimeUnitData({
    id: "days", field: "when", unit: "day", as: "day",
    timeZone: "America/New_York"
  })
  .createSummaryData({
    id: "daily", groupBy: "day",
    aggregates: [{ op: "sum", field: "value", as: "total" }]
  })
  .createCompleteData({
    id: "year", key: "day",
    calendar: {
      unit: "day", start: "2024-01-01", end: "2024-12-31",
      timeZone: "America/New_York"
    },
    fill: { total: null }
  });
```

Start와 end를 **모두 포함**한다. 기존 numeric sequence의 end 포함 규칙과 같다.
위 범위의 domain은 366개다. `start === end`는 한 날짜다. 역순·invalid date·invalid zone은 오류다.
`YYYY-MM-DD`는 Gregorian 0000..9999의 정확한 civil date이며 timestamp/offset/host locale 문자열은 받지 않는다.
윤년 여부를 strict parser로 검증한다. Timezone은 필수이고 시스템 기본 zone을 사용하지 않는다.
명시 UTC도 저장한다. Minute/hour/month/year stepping과 임의 step 옵션은 현재 요구가 없어 추가하지 않는다.

각 domain 값은 해당 civil date의 zone-local day start를 나타내는 finite epoch milliseconds다.
Key column은 그 domain 중 하나와 **정확히 같은 숫자**여야 한다. Raw midday instant를 보완 과정에서
자동 floor하지 않는다. 앞선 `createTimeUnitData`가 grain을 소유하며 timezone 불일치는 observed-outside-domain
오류로 드러난다. null key는 calendar domain에 없으므로 오류다. Missing input을 허용하려면 앞선 명시 처리로
해결해야 하며 completion이 행을 버리거나 의미를 추정하지 않는다.

Stored transform은 기존 `{type:"complete", key, groupBy, fill, members?}`에 authored calendar object를
추가한다. 확장된 epoch values 배열을 transform에 중복 저장하지 않는다. Materialized rows와 row refs는
기존 dataset owner에 저장한다. Edit의 새 calendar/values/sequence 중 하나를 지정하면 이전 다른 domain 모드를
제거한다. Calendar object는 전체 교체다. 생략하면 기존 domain 의도를 보존한다.

## Civil-day 열거, 경계와 한도

작은 pure owner `src/grammar/calendarDay.js`를 추가한다. 기존 `timeUnit.js`의 calendar parts/boundary와
`parseTime.js`의 strict Gregorian 검증을 재사용한다. Program/resource/renderer를 읽지 않는다.
Timezone-aware input date parser가 이 모듈을 역으로 import하도록 만들어 순환 dependency를 만들지 않는다.

1. Closed calendar options와 두 날짜를 descriptor-safe input 경로에서 검증한다.
2. Civil `(year,month,day)`를 UTC상의 같은 Gregorian date에 대응시켜 integer day ordinal을 얻는다.
   이는 달력 산술용 좌표이며 zone-local instant가 아니다. `endOrdinal-startOrdinal+1`로 domain 크기를 검사한다.
3. Civil date를 `setUTCDate` 등 Gregorian calendar 연산으로 한 날씩 진행시킨다. 이전 zone instant에
   86,400,000을 더하지 않는다. 각 날짜마다 기존 `resolveCalendarBoundary(...,"day")`로 instant를 구한다.
4. 정상적인 DST gap/fold는 같은 날짜의 기존 boundary policy를 따른다. Midnight가 빠진 날은 그 날 첫 유효
   instant를 사용한다. 날짜 전체가 사라진 역사적 zone transition은 기존 정책대로 RangeError다.
   다음 날짜로 조용히 이동시키거나 같은 instant 두 개를 만들지 않는다.
5. 모든 output instant가 finite이며 strictly increasing이고, 해당 zone의 civil date로 roundtrip되는지 검사한다.

Domain 최대 **10,000 civil days**다. Calendar ordinal count를 확인한 뒤 배열과 Intl 작업을 시작한다.
그룹×domain 최소 출력 수와 실제 duplicate rows를 포함한 최종 출력도 기존 **10,000 rows** 한도를 지킨다.
입력 validation, domain boundary resolution의 고정 probe 수, group×domain cell work, lineage 작업은
공통 **10,000,000 work** 한도로 사전 계산한다. 빈 grouped source라고 oversized domain 검사를 생략하지 않는다.
값을 크게 할당한 뒤 한도를 검사하지 않는다. 실패는 첫 semantic/trace mutation 전 발생한다.

UTC day ordinal을 만들 때 86,400,000으로 나누는 것은 calendar 좌표의 변환이다.
DST 날짜 열거를 epoch+24h로 구현하는 것과 구분해 시험한다. Calendar 차트가 나중에 사용할 week index는
`floor((ordinal - firstWeekStartOrdinal)/7)`이며 `firstWeekStartOrdinal`은 명시 weekStartsOn으로 정한다.
STEP-015는 이미 있는 week floor의 Sunday/Monday/ISO 경계만 증명하고 cell 배치는 STEP-024가 소유한다.

## 중복, missing date, eligibility와 lineage

동일 civil day의 여러 이벤트는 `createSummaryData({groupBy:"day", aggregates:[...]})`의 명시 op로 집계한다.
`createCompleteData`의 기존 duplicate-row 보존 의미를 변경하지 않는다. Summary를 생략한 호출에
completion이 숨은 sum/first/last를 수행하지 않는다.

Missing date 정책은 공개 call chain에서 명시된다. `createCompleteData({calendar,...})`를 호출하면 빈 날짜를
채우고 `fill`의 total null/0을 그대로 보존한다. Completion 없이 daily summary를 소비하면 관측 날짜만 남는다.
STEP-024 chart facade는 이 둘을 `empty cell/omit` 의도로 연결할 책임이 있으며, 이번 STEP에서 임의 chart option을
추가하지 않는다. Missing date의 null total과 관측된 숫자 0을 구별하고 opacity나 값의 truthiness로 eligibility를 정하지 않는다.

TimeUnit row는 원본 한 행을, summary day row는 실제 그 날짜의 모든 기여 행을 가리킨다.
Complete가 보존한 day row는 summary input row를 가리키고 새 빈 날짜 row는 `[]` contribution을 갖는다.
Synthetic row가 이전 날 또는 임의 source index를 가리키면 실패다. 날짜 key의 field lineage는 기존 day field를
계승하고 fill output의 nullable/optional schema는 실제 completion 결과와 일치해야 한다. 빈 source에도
명시 calendar key와 fill fields의 declared schema가 남는지 확인한다.

`reviseData`는 timeUnit→summary→complete 순서로 실제 새 cardinality를 계산한다. 새 source date가 범위 밖이면
오류이며 domain을 몰래 확장하지 않는다. 모든 날짜가 제거돼도 ungrouped explicit calendar는 빈 날짜 domain을
생성한다. Grouped complete는 실제 관측 group만 사용해 source가 비면 group Cartesian product를 만들지 않는다.
선택/highlight가 synthetic date에 source row membership을 붙이지 않고, source revision 후 이전 row refs와
scale/guide/mark가 남지 않는지 통합 증거를 만든다.

## 파일과 소비자 계획

| 책임 | 수정 또는 추가 후보 | 검증 |
| --- | --- | --- |
| calendar domain | 새 `src/grammar/calendarDay.js`, 기존 `grammar/complete.js` | strict civil validation, Gregorian ordinal, inclusive domain, boundary policy, work preflight |
| author/edit/replay | `actions/data/complete.js`, `grammar/transforms.js` | closed option, exclusive mode cleanup, stored calendar 유지, explicit wrapped materialization |
| schema/lineage | 기존 `grammar/datasetSchema.js`, `rowLineage.js` | calendar key numeric schema, fill nullable, empty/synthetic refs; 필요 시 최소 correction |
| declaration | `types/program.d.ts`, `types/index.d.ts` | calendar/values/sequence discriminated union, day-only/required-zone/positive 및 negative type calls |
| persistence/inspection | 기존 complete transform validator와 dataset schema/row ref 검사 | schema 4 additive option 검증, 변형된 date/zone/domain 거부, 복원 후 replay |
| public contract/docs | current CORE, data action source, relevant data examples와 generated references | Full-only, inclusive endpoint, DST, explicit aggregation/completion policy |
| later calendar | STEP-024 chart contract/obligation | cell/month geometry와 시각 Gate를 완료로 표시하지 않음 |

새 resource 종류·URL resolver·async cleanup은 추가하지 않는다. Dataset reference는 기존 단일 source다.
Facet은 existing complete의 statistical replay를 사용하고 group별 domain을 다시 적용한다.
Repeat의 기존 unsupported statistical shape 정책은 유지한다. Scene/renderer는 이미 materialize된 geometry만
읽으며 시간대나 달력 산술을 추가하지 않는다. 필요한 경우 ordinary temporal mark로 concrete output equality를 검증한다.

## 독립 fixture와 evidence

`test/oracles/calendar-days.js`를 새 capability oracle로 둔다. Production/date kernel과 roadmap 파일을 import하지
않고 손으로 고정한 날짜·UTC instant anchor와 작은 독립 Gregorian 알고리즘을 사용한다.
기존 `test/oracles/time.js`는 frame clock용이므로 이 목적에 맞지 않는다.

| 입력 | 기대 결과 |
| --- | --- |
| UTC 2024-01-01..2024-12-31 inclusive | 366 unique civil days, February29 포함 |
| UTC 2024-02-01..2024-02-29 | 29 days; 2023-02-29는 오류 |
| UTC 2024-02-29..2024-02-29 | 정확히 한 날짜 |
| New York 2024-03-09..2024-03-11 | starts 03-09T05:00Z, 03-10T05:00Z, 03-11T04:00Z: 3 dates, 마지막 간격23h |
| New York 2024-11-02..2024-11-04 | starts 11-02T04:00Z, 11-03T04:00Z, 11-04T05:00Z: 3 dates, 마지막 간격25h |
| 같은 zone의 fold 전후 두 이벤트 | day key 하나; 명시 sum 결과 한 row |
| Sao Paulo 2018-11-04 | midnight gap의 첫 유효 boundary 2018-11-04T03:00Z |
| Apia 2011-12-30을 포함한 domain | 사라진 civil date RangeError, old program/trace 동일 |
| 2023-12-31 Sunday / 2024-01-01 Monday | explicit weekStartsOn 0/1에 따른 기존 week floor 및 연말 경계 |
| 빈 ungrouped source + 3-day domain + fill total:null | 3 synthetic rows, 모두 empty contribution |
| 관측일 2회, 빠진 날, 실제 total 0 | explicit aggregation; missing null과 관측0 구별; 원본 refs 정확 |
| 10,000 days / 10,001 days 및 grouped multiplication | 경계 허용/오류, allocation 전 work/output guard |
| process TZ UTC/Los_Angeles/Seoul | 동일 calendar rows와 stored options |

집중 시험은 새 `test/unit/grammar/calendar-days.test.js`,
`test/unit/actions/data/calendar-completion.test.js`, `test/contracts/calendar-data-lifecycle.test.js`로 나눈다.
기존 `time-unit-data.test.js`, `time-unit-missing.test.js`, `complete-impute-data.test.js`,
`expression-calendar.test.js`는 floor/missing/default/replay 회귀를 소유한다.
Edit timezone/range, source revision 확장·축소·빈 입력, restore 후 편집, source removal protection,
facet replay, selection/scene, positive/negative types, installed Full/Basic 경계를 포함한다.

실제 runner discovery를 확인한 뒤 focused unit/contract를 먼저 실행한다. 통합 checkpoint에서 해당 소비자와
누적/coverage/package/docs evidence를 연결한다. 이 설계만으로 현재 통과한 docs suite를 다시 실행하지 않는다.
AT-17 receipt에는 STEP-014 통계와 이 날짜 fixture의 input hashes, shortest public calls,
independent expected/actual/diff hashes, command exit, 구현 commit과 consumer matrix를 함께 기록한다.
