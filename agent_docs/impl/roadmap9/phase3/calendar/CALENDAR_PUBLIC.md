# Calendar day completion public checkpoint

## 진행 상태

- [x] 기존 Full complete의 calendar mode와 generic transform/materializer 연결
- [x] Immutable edit/revision/restore, numeric empty schema와 정확한 row contributions
- [x] Literal leap/DST, cumulative work/output limits, host TZ 독립·기존 week 경계 검증
- [x] Types·Current·canonical references·실행 가능한 예제·generated documents
- [x] Focused/coverage44개, 기존 time/summary 회귀30개, source/contracts50개, docs161개
- [x] 설치 node190개·complete snippets66개·types/MCP/optional peers/bundles
- [x] Built docs150페이지·1183 selective artifacts의 링크·identity hashes
- [x] Docs desktop search와 전 페이지320/390/768px browser 검증
- [x] Verified implementation commit/push와 source provenance 고정
- [ ] STEP-014/015 전체 numeric matrix·AT-17 통합과 STEP-077 완료
- [ ] STEP-024 calendar cell/month geometry와 그 rendered primitive 승인

기존 [전체 계획 승인](../../AUTHORIZATION.json)과 main의 승인된 STEP5 계약을 재사용한다.
새 visual target 없이 기존 `createCompleteData`/`editCompleteData`의 day domain만 확장했다.
기준은 `58aa2bea79d94ac129f14725722a64bfeccdff5d`, branch는 `codex/roadmap9-statistics`다.
Main/G-DATA worktree 파일은 수정하거나 복사하지 않았다. 이 체크포인트만으로 STEP-015/AT-17 또는
Roadmap9 전체 완료를 선언하지 않는다. Calendar cell 배치·month label·시각 facade는 아직 미구현이다.
구현 source commit은 `982c53a2587d5747b0865e6f68f47ee79a13fd27`이며 원격 push를 확인했다.
이 commit으로 provenance를 고정한 뒤 docs161개와 built150페이지/1183artifacts를 다시 검증했다.
문서 내용과 UI는 그대로이므로 먼저 통과한 browser sweep을 재사용한다.

## 구현과 소비자 경계

`grammar/calendarDay.js`가 기존 parseTime/timeUnit을 재사용하는 pure civil-day domain과
검증된 count/work estimate를 소유한다. `grammar/complete.js`는 그 domain을 기존 typed group completion에
연결한다. 고정24시간을 IANA day instant에 더하는 새 산술이나 parser/timezone converter를 만들지 않는다.
Authored calendar object만 transform에 저장하고 expanded values나 renderer의 시간 계산은 추가하지 않는다.

기존 data creator/editor/transform registry, explicit materializer, datasetSchema와 rowLineage 경로를 쓴다.
Lineage가 pure completion을 한 번 더 계산하는 비용까지 conservative preflight에 포함한다.
Domain·group/duplicate output·input/output cell work는 calendar 확장 전에 검사한다.
정확한 API와 한도는 [Current CORE](../../../../contract/current/CORE.md#createcompletedata)가 소유한다.

| 소비자 | 검증 |
| --- | --- |
| Full create/generic/materialize/edit | 같은 stored definition과 값, domain mode 교체, whole calendar replacement, omission 보존 |
| Immutable source/revision | caller options 복사, raw·trace 불변, range 확장/축소·빈 source, domain 밖 변경 원자적 거부 |
| Schema | grouped empty에도 numeric key·nullable fill·member fields, empty source의 명시 schema 요구 |
| Lineage | TimeUnit→원본, Summary→실제 관측, Complete observed→summary row, synthetic→빈 refs |
| Persistence/removal | restore 후 edit, invalid stored Gregorian date 거부, source removal dependency 보호 |
| Facet/repeat | facet source partition마다 통계 재계산, 기존 repeat statistical 미지원 유지 |
| Selection/composition/scene | 실제 raw membership, synthetic refs 없음, highlight/edit 재계산, ordinary temporal marks |
| SVG/Canvas/PNG/PDF | 설치 package의 기존 point graphic 출력, 수정 전후 SVG 차이와 scene node 수 |
| Basic | direct create 없음, generic complete 명시 거부. 공유 lineage 의존성만 포함됨 |
| Types/docs | exclusive mode union, required zone/day-only, 설치 declarations와 complete 예제 |

## 독립 값과 검증

`test/oracles/calendar-days.js`의 Gregorian 열거는 production·Date·Intl import가 없으며 literal
leap-year/DST anchors가 기준이다. 새 public 시험은2024년366일, 단일 날짜,23/25시간 경계,
fold의 두 이벤트를 명시 sum으로 합친5, 관측0과 합성null, 중복 보존, 사라진 Apia 날짜,
잘못된 zone/date/key,10,000일·행 경계, grouped/duplicate 확장, wide-cell work와 getter 거부를 검증한다.
기존 private 시험의0000/0099/9999·non-hour zone·midnight gap 검증은 그대로 포함한다.
일요일/월요일 week start의2023→2024 경계와 UTC/Los_Angeles/Seoul process TZ도 검사한다.

`.artifacts/validation/calendar-public/oracle-evidence.json`에는 실제 public chain의 input/expected/actual/diff와
SHA256, 독립 oracle hash가 저장된다. Runtime tests는 roadmap 파일을 import하지 않는다.

| 명령 | 결과 |
| --- | --- |
| `node --test --experimental-test-coverage --test-coverage-include=src/grammar/complete.js --test-coverage-include=src/grammar/calendarDay.js` + calendar-completion/calendar-lifecycle/calendar-days/complete-impute-data/derived-editing | 44 passed |
| 두 owner의 canonical critical floor 검사 | 90/85/100 기준; complete93.59/93.02/100, calendarDay96.72/96.67/100 |
| `node scripts/run-tests.js unit` + time-unit-data/time-unit-missing/transforms/time-unit/expression-calendar/summary-data | 30 passed |
| `node scripts/run-tests.js contracts` + calendar-types/source-boundaries/test-discovery/package-boundaries/package-artifact/action-catalog | 50 passed |
| `npm run docs:generate`, `npm run test:docs` | 생성 성공,161 passed |
| `npm run docs:preflight`, `npm run docs:build`, `npm run test:docs:built` | 150페이지·1183 artifacts 통과 |
| `npm run test:docs:browser` | desktop search, 전 페이지320/390/768px, keyboard/ARIA/Axe 통과 |
| `npm run test:package` | node190/190·complete snippets66/66·types/MCP/optional peers/bundles 통과 |

환경은 Node22.23.1/npm10.9.8, 문서 Ruby3.3.12다. 기존 node_modules symlink를 사용했고 의존성을 설치하지 않았다.
Ruby 경로는 `PATH="/opt/homebrew/opt/ruby@3.3/bin:$PATH"`이며 source/built/browser/package logs는 같은 artifact 폴더에 둔다.

## 실측 한도와 남은 통합

공식 staging artifact SHA256은 `661a49196d5a00e0f8366ba32e0084cdceb7775e56bff4a404d8a213ae6a2910`다.
683entries/1,016,672packed/4,741,042unpacked bytes로 cap은683/1,017,000/4,742,000이다.
Full/Basic/SVG gzip은510,544/287,705/8,111bytes로 cap은511,000/288,000/25,000이다.
Search858,646bytes는859,000 cap이다. 증분의 최소1,000byte 경계만 올렸고 검증 기준은 낮추지 않았다.
Basic의 shared rowLineage→complete import 경로가 calendar owner를 포함하지만 authoring 지원은 늘리지 않았다.
이전 isolated branch 수치는 root의 main parameter/G-DATA 병합 후 combined package 실측을 대체하지 않는다.

다음 단계는 STEP-014/015 전체 카드와 AT-17의 기존 통계 수치·lineage·revision·consumer fixture를 감사하여
미검증 칸을 닫는 것이다. 별도 primitive review 없이 calendar 전용 시각화 액션을 추가하지 않는다.

후속 비시각 수치·소비자 감사 결과는 [STATISTICS_AUDIT](../statistics/STATISTICS_AUDIT.md)에 기록했다.
Main 통합·최종 qualification과 calendar 전용 시각화는 계속 남은 의무다.
