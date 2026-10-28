# Private civil-day domain checkpoint

## 진행 상태

- [x] 명시 day/start/end/timeZone과 inclusive Gregorian domain을 처리하는 pure kernel
- [x] 기존 parser와 IANA boundary owner 재사용, 한도 사전 검사
- [x] 독립 literal/oracle, 실제 DST, 삭제 날짜, low year, immutable 시험
- [x] 집중·critical coverage·discovery/source/package boundary와 canonical package 검증
- [x] 설치형 browser bundle 검사
- [ ] complete author/edit/replay/schema/lineage/persistence/type 공개 통합
- [ ] STEP-015 전체 lifecycle 및 STEP-024 calendar geometry·시각 검토

상태는 **private 날짜 domain 준비, 공개 calendar completion 미통합**이다.
실행 승인은 [전체 계획 승인](../../AUTHORIZATION.json)을 재사용한다.
Branch는 `codex/roadmap9-statistics`, 직전 local quadratic checkpoint는
`9a48574acc659006519588c5a91f78c89db3f428`이다. Main source freeze를 지키며 격리 worktree에서 수행했다.
Main의 `phase3/STEP5.md` 설계를 읽고 owner/API 제안을 담당자에게 전달한 후 같은 승인 범위로 진행했다.

## 내부 API와 소유권

`normalizeCalendarDayDomain(options)`는 accessor를 실행하지 않고 닫힌 네 필드를 검증한 frozen 복사본을 반환한다.
`deriveCalendarDayDomain(options)`는 같은 검증 후 각 날짜의 day-start epoch milliseconds를 frozen 배열로 반환한다.
두 함수는 private이며 공개 entry/type 또는 transform registry에 연결하지 않는다.

```js
deriveCalendarDayDomain({
  unit: "day",
  start: "2024-01-01",
  end: "2024-12-31",
  timeZone: "America/New_York"
}); // 366 finite, strictly increasing instants
```

Start/end는 Gregorian0000..9999의 정확한 `YYYY-MM-DD`이고 양쪽 끝을 포함한다.
Timezone은 명시 UTC 또는 기존 Intl owner가 지원하는 IANA 이름이다. Numeric offset 문자열은 거부한다.
`parseTimeValue(...,"%Y-%m-%d")`가 leap/rollover를 소유하고 새 모듈은 고정 폭 lexical guard만 추가한다.
`Date.UTC`의0..99년 remapping을 사용하지 않는다.

UTC에 표현한 civil date의 차이는 day count 계산에만 사용한다. 열거는 `setUTCDate`로 진행하고 각 day-start는
기존 `resolveCalendarBoundary`로 구한다. Normal gap/fold 및 midnight gap은 기존 정책을 그대로 따른다.
Apia2011-12-30처럼 날짜 전체가 사라지면 기존 owner가 오류를 반환하며 다른 날짜로 대체하지 않는다.
반환 직전 finite/순증가/zone-local civil-date roundtrip 불변식을 확인한다. Process timezone을 사용하지 않는다.

기존 boundary resolver의 ±72시간/6시간 probe에는 변화가 없다. 같은 owner의 `CALENDAR_BOUNDARY_WORK`는
25 probes와 최대25 distinct offset candidates에 필요한 roundtrip50회를 상한으로 제공한다.
새 domain은 roundtrip 확인1회를 더해 `count * (CALENDAR_BOUNDARY_WORK + 1)`을 공통10,000,000 work와 비교한다.
먼저 count10,000 한도를 검사하므로 허용되는 단일 domain의 최대 경계 작업은510,000이다.
Count와 work 검사는 output 배열과 Intl 계산 전에 수행한다. Allocation 후 overflow를 찾지 않는다.

이 kernel은 source rows, group 또는 lineage를 받지 않는다. 후속 complete 통합에서 input validation,
group×domain, duplicate rows 보존, lineage를 포함한 누적 work 및 최종10,000 rows를 검사해야 한다.
Calendar normalization만으로 실제 모든 zoned date가 존재함을 보장하지 않는다. Boundary 존재 검증은 derive가 소유한다.

## 독립 증거

- 독립 `test/oracles/calendar-days.js`는 production/Date/Intl 없이 Gregorian 날짜 label을 열거한다.
- UTC2024의366일, Feb29,1900/2000 century leap 규칙과 singleton을 literal epoch 및 독립 oracle로 비교한다.
- New York spring/fall 경계를 literal UTC instant로 고정하고 실제23/25시간 간격을 확인한다.
- Sao Paulo midnight gap 및 Kolkata non-hour offset도 literal과 civil-date roundtrip을 함께 검사한다.
- Fold 전후 두 event가 기존 `bucketTime`에서 동일 day key에 대응한다.
- Apia의 삭제 날짜를 포함하면 실패하고 입력은 그대로다.
- UTC 직접 경로와 Etc/UTC IANA resolver에서0000/0099/9999년을 확인한다.
- 잘못된 날짜/zone/옵션/accessor를 거부하고10,000일은 허용하며10,001일은 Intl 검증보다 먼저 거부한다.
- process TZ UTC/Los_Angeles/Seoul에서 같은 domain을 확인한다.

환경은 Node22.23.1/npm10.9.8이다. 로그와 hash manifest는 `.artifacts/validation/calendar-day/`에 보존한다.

| 명령 | 결과 |
| --- | --- |
| `node scripts/run-tests.js unit unit/grammar/calendar-days.test.js unit/grammar/transforms/time-unit.test.js unit/grammar/expression-calendar.test.js unit/actions/data/time-unit-data.test.js unit/actions/data/time-unit-missing.test.js unit/actions/data/parse-time-data.test.js unit/actions/data/computed-calendar-year.test.js unit/support/coverage-policy.test.js` | 44 passed: 신규9 + 기존35 |
| `node scripts/run-tests.js contracts contracts/test-discovery.test.js contracts/source-boundaries.test.js` | 25 passed |
| `node scripts/run-tests.js contracts contracts/package-artifact.test.js contracts/package-boundaries.test.js` | 13 passed |
| `node --test --experimental-test-coverage --test-coverage-include=src/grammar/calendarDay.js --test-coverage-lines=90 --test-coverage-branches=85 --test-coverage-functions=100 test/unit/grammar/calendar-days.test.js` | 9 passed;96.43/96.43/100 |
| `npm run package:check` | 682entries; packed1,013,735/unpacked4,726,245bytes |
| `npm run package:bundle` | Full507,597/Basic285,702gzip bytes; 기존 bundle 한도 통과 |

새 high-risk family floor는90/85/100으로 기존 관련 grammar/core 정책보다 낮추지 않았다.
Per-file critical floor 검사도 통과했다. 미실행 방어 오류 줄은 올바른 기존 boundary owner 결과에서
위반할 수 없는 최종 invariant guard이며, 이를 덮으려고 production time engine을 mock하지 않았다.
이 결과는 전체 source coverage, realistic corpus 또는 공개 completion lifecycle 통과를 뜻하지 않는다.
