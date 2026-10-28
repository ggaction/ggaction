# STEP-014/015 통계·시간 수치 및 소비자 감사

## 진행 상태

- [x] 원 카드·통계 계약·OR-16~19와 현재 구현의 차이 확인
- [x] 18개 독립 literal fixture와 변경된 source revision의 expected/actual/diff 저장
- [x] 모든 fixture의 원본·수정 후 실제 행 기여, schema, selection, scene, codec, SVG/Canvas 확인
- [x] 기존 통계의 invalid/empty/zero/duplicate/limit·weight·atomic failure 회귀 실행
- [x] 전체 등록 transform의 lineage, focused editor, source revision corpus와 타입·소스 경계 실행
- [x] 변경하지 않은 runtime의 설치 package·PNG/PDF·docs·critical coverage 증거 연결
- [ ] 최신 main parameter/G-DATA 통합 후 누적 검증과 AT-17 통합 완료 판정
- [ ] STEP-074 최종 qualification 및 STEP-077 전체 완료
- [ ] STEP-024 calendar cell/month geometry와 별도 rendered primitive 승인

승인은 [기존 전체 계획 승인](../../AUTHORIZATION.json)을 재사용한다. 이 기록은
[STEP-014](../../../../../study/coverage-expansion-2026-10-27/roadmap/tasks/STEP-014-statistics-oracles.ko.md),
[STEP-015](../../../../../study/coverage-expansion-2026-10-27/roadmap/tasks/STEP-015-time-transform.ko.md),
[통계 계약](../../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/data-statistics.ko.md)의
수치·행 의미 요구를 isolated `codex/roadmap9-statistics` branch에서 검증한 인계다.
AT-17의 closureTask는 STEP-015, qualificationTask는 STEP-074다. 최초 계획의 `not-run` 값을
제품 테스트로 읽거나 전체 계획의 완료 상태로 바꾸지 않았다. Main STEP4/STEP5 및 DATA STEP6는 parent가 소유한다.

## 실제 구현 차이

기존 summary/bin/bin2d/stack/window/fold/flatten/lookup/impute/regression/density/ECDF/timeUnit은
현재 소유자를 재사용했다. 추가 runtime은 앞서 검증·push한 Full pivot, LOESS degree2,
calendar day completion뿐이다. 공개 계약은 [Current CORE](../../../../contract/current/CORE.md)가 소유한다.

| 변경 | 구현 commit | 검증 기록 |
| --- | --- | --- |
| Full pivot 및 editor | `028157707ba1a55080fd00607f2569de4568aeff` | [PIVOT_PUBLIC](PIVOT_PUBLIC.md) |
| LOESS degree2와 기존 degree1 보존 | `1059ba42282d5d2b95782f66a054448b844e69e8` | [LOESS_PUBLIC](LOESS_PUBLIC.md) |
| Inclusive civil day completion | `982c53a2587d5747b0865e6f68f47ee79a13fd27` | [CALENDAR_PUBLIC](../calendar/CALENDAR_PUBLIC.md) |

이번 감사는 runtime·public API·types·docs·package 한도를 변경하지 않았다. 기존 numerical default를
fixture에 맞춰 수정하지 않았으며, 현재 interpolation/bin/weight 정책을 명시한 호출로 검증했다.
LOESS regression 결과를 ordinary mark로 그리는 fixture는 기존 placement 계약에 따라 먼저 원본 x/y
point layer를 만든다. 이 전제를 숨기거나 새로운 placement fallback을 추가하지 않았다.

## 독립 수치 matrix

기대값 owner는 [statistical-fixtures.js](../../../../../test/oracles/statistical-fixtures.js)다.
Production 및 roadmap import 없이 literal 값과 단순 입력 생성만 포함한다. 비교는
`absTol + relTol * max(abs(expected), abs(actual))`, 각각 `1e-9`다. Shape·type·nonfinite 차이는 실패한다.
각 fixture는 다른 입력으로 `reviseData`를 실행하고 두 번째 독립 기대값 및 새 source의 실제 기여 행을 검증한다.

| 영역 / fixture | 독립 기준 및 기존 edge 검증 owner (`test/unit/` 아래) |
| --- | --- |
| summary-variance | `[1,2,3]` mean2, sample1, population2/3; `actions/data/summary-data`의 null/group/weight/zero/atomic, `summary-capacity`의 30,000 groups 경계 |
| linear-quantiles | `[1,2,3,4]` endpoints1/4, q25=1.75, q50=2.5; `grammar/transforms/quantile-policies` |
| histogram-final-boundary | `[0,1,2,3]` counts1/1/2, 마지막 경계 포함; `actions/data/bin-data`의 step/extent/invalid/empty/weight |
| bin2d-corners | 네 corner 각1, 수정 후 empty cells0; `actions/data/bin2d-data`, `bin2d-assignment`의 양축 finite/assignment/empty/rename/revision |
| diverging-stack | 양수 endpoints0→2→5, 음수0→-2; `actions/data/stack-data`의 fill/center/order/invalid/atomic |
| trailing-window | trailing2 mean1/1.5/2.5와 정확한0,0+1,1+2 기여; `actions/data/window-data`, `grammar/transforms/window`의 rows/duration/ties/partition/minPeriods |
| pivot-duplicates | 명시 sum3, 없는 y는null; `actions/data/pivot-data`, `grammar/pivot`의 기본 duplicate error, typed keys, column collision/unseen key/null/NaN/overflow/work |
| fold-row-order | authored field 순서 b,a와 source row 순서,0 보존; `actions/data/fold-data`의 empty/missing/collision/field·output bound |
| flatten-aligned-arrays | 짧은 배열 null padding, 빈 배열 출력 없음; `actions/data/flatten-data`의 typed schema/field·output bound/edit/facet |
| lookup-left-multiplicity | left 중복 보존, unmatched null, secondary refs; `actions/data/lookup-data`, `grammar/lookup`의 right duplicate 거부/typed key/양 입력 revision/diamond |
| linear-imputation | 실제 t거리0,1,4에서2,4,10; `actions/data/complete-impute-data`의 mean/constant/linear/group/maxGap/edge/invalid/empty |
| linear-regression-coefficients | `(0,1),(1,3),(2,5)` slope2/intercept1/r²1; `actions/data/regression-data`, `regression-prediction`, `regression-statistics`의 singular/CI/grid/cache/finite |
| loess-degree-1 / loess-degree-2 | line `2*x+1`, 수정 후 `4*x+2`; `loess-degree`, `robust-loess`의 독립 quadratic/이동·scale/ties/최소 n/span/rank constant/zero robust weight/work |
| gaussian-unit-density | h1, 단일0에서 f0=.3989422804014327, 양옆 대칭·nonnegative; `actions/data/density-data`의 kernels/normalization/bandwidth/grid/weights/zero/finite |
| ecdf-right-continuity | `[1,1,3]` F0=0/F1=2/3/F3=1; `actions/data/ecdf-data`, `grammar/transforms/ecdf`의 ties/weight/zero/step/monotonicity |
| time-unit-fold | New York 반복되는01:30 두 입력이 같은 day instant; `actions/data/time-unit-data`, `time-unit-missing`, `grammar/transforms/time-unit`의 leap/weekStart/year-boundary/gap/fold/non-hour/invalid |
| calendar-synthetic-day | null/관측0/null, 다음 경계25h; `calendar-completion`, `calendar-lifecycle`, `grammar/calendar-days`의 2024년366일,23/25h,0000/0099,사라진 civil day,10k output·work |

위 경로는 모두 `.test.js`다. Calendar의 Gregorian 독립 oracle와 literal IANA boundaries는
[calendar-days.js](../../../../../test/oracles/calendar-days.js), quadratic 독립 연립방정식은
[loess-quadratic.js](../../../../../test/oracles/loess-quadratic.js)가 소유한다.
Calendar의 date projection→명시 summary→completion은 DST fold의 두 사건을 한 day total5로 만들며,
synthetic date의 원본 기여는 빈 배열이다. 고정24h 증가를 쓰지 않는다. Domain endpoints는 둘 다 포함한다.

## Consumer matrix

| 소비자 | 판정과 실행 근거 |
| --- | --- |
| create / generic / explicit materialize | 새3기능은 각각 data/lifecycle 테스트의 같은 canonical transform·child trace. 나머지는 기존 public fixtures와 grammar registry. Generic primitive에 계산을 숨기지 않음 |
| source/ref collector | 모든18 fixture의 source revision 재결합. `lookup-data`의 양 입력 removal 보호와 diamond 한 번 실행. 새 resource kind 없음 |
| schema / empty | 모든18 fixture는 known schema. `pivot-data`, `calendar-completion`, `loess-degree`, 기존 summary/flatten/lookup의 빈 입력·명시 schema 경계 |
| row lineage / identity | 모든18 fixture의 original 및 changed-source 정확한 raw contributor 인덱스. Lookup secondary refs. `row-lineage`가 registry 전체와 unique keys/exact logical revision/selection identity를 대조 |
| editor / revision / rematerialization | `derived-editing`의 모든 focused family create/edit/edit/no-op/logical reuse, direct consumer role rename, unrelated branch 보존. `source-revision`의 전체 action corpus unchanged-source SVG equality와 transitive 변경 |
| invalid / atomic / trace | family별 invalid 테스트, LOESS n0/1·ties/zero weight, pivot duplicate·overflow, calendar domain·work 실패 전후 기존 program equality. serialize에는 trace 포함 |
| selection / highlight | 모든18 fixture의 max selection/highlight와 source revision. `pivot-consumers`, `calendar-lifecycle`, `derived-editing`의 변경 후 실제 membership과 highlight 대상 |
| facet / composition | 기존 window/bin2d/flatten/complete/impute/timeUnit의 source partition replay 및 새3기능의 전용 consumer/lifecycle. Repeat의 통계 topology 제한은 유지하며 pivot/calendar rejection 검증 |
| inspection | `inspection-descriptors`, `public-state-inspection`이 현재 registry와 persisted state를 검사. 새 result/resource kind 없음 |
| scene | 모든18 fixture에서 concrete circle node 및 새3기능의 scene 변화. Calendar 전용 cell/month scene은 STEP-024 의무 |
| codec | 모든18 fixture semantic roundtrip, changed-source graphic roundtrip, unchanged-source SVG equality. 기존 stale/forged lineage·transform validation 별도 실행 |
| SVG / Canvas | 모든18 fixture를 기존 point primitive로 실제 실행. 새3기능의 기존 line/point consumer도 전용 검사. Renderer는 graphicSpec만 읽음 |
| PNG / PDF / installed entry | Calendar checkpoint의 동일 runtime installed node190/190: pivot/LOESS/calendar fixture의 SVG/Canvas/PNG/PDF/scene 및 기존 transform fixture. 같은 graphic primitive이므로 family마다 pixel golden을 복제하지 않음 |
| types / Basic | contracts42개와 기존 installed declaration. Pivot/LOESS/calendar는 Full-only; Basic direct 부재 및 generic transform 명시 거부. 기존 지원 범위 확대 없음 |
| docs / package boundary | Runtime source982c53a2와 provenance checkpointc862feae의 docs161·150pages/1183artifacts·browser 및 installed190/66snippets를 재사용. 이번 파일들은 packed allowlist 밖 |
| async cleanup | 비적용: 이 transform slice는 동기 순수 수치 계산과 immutable action이며 fetch/player/timer를 생성하지 않음. 외부 data resolver는 parent DATA STEP6 범위 |

## 실행 증거와 재현

Node22.23.1에서 아래 명령을 실행했다. Named selector는 [capabilities.json](../../../../../test/capabilities.json)의
46개 명시 파일을 소유한다. Source coverage나 realistic corpus의 대체 selector가 아니다.

| 명령 | 결과 |
| --- | --- |
| `node scripts/run-tests.js unit capability:statistical-fixtures` | 340 passed, exit0 |
| `node scripts/run-tests.js contracts capability:statistical-fixtures contracts/test-discovery.test.js contracts/source-boundaries.test.js` | 42 passed, exit0 |
| `node scripts/run-tests.js unit unit/actions/data/statistical-fixtures.test.js` | 새 revision 기여·plot 불변 assertion 보강 후20 passed, exit0 |
| `node scripts/check-statistical-fixtures.js` | 18 original+changed-source 수치 및 기여 검사, exit0 |

`.artifacts/validation/statistical-fixtures/`의 `numeric-evidence.json`은 각 입력과 정확한 public chain,
expected/actual/diff 및 SHA256, source revision의 같은 증거, oracle SHA256, runtime commit과 실행 Node를 저장한다.
`unit.log`, `contracts.log`, `focused.log`, `numeric.log` 및 `summary.json`을 함께 보존한다.
[audit-progress.json](audit-progress.json)은 원 progress template의 command/artifact/consumer/remaining 항목을 채운 인계다.
제품 테스트는 roadmap 계획을 import하지 않는다. Discovery/source boundary는 통과했고 source floor는 변경하지 않았다.
변경된3기능의 마지막 critical coverage와 설치 검증 수치는 위 checkpoint 기록이 소유한다.

## 남은 의무

이 branch에서 승인된 STEP-014/015의 비시각 구현과 수치·소비자 증거를 준비했다. 최신 main의
parameter/v2/G-DATA와 통합한 뒤 parent가 누적 source coverage·normal·realistic 및 combined
package/bundle 한도를 검증해야 AT-17의 통합 완료를 판정할 수 있다. 기존 isolated cap을 그대로 옮기지 않는다.
STEP-024의 day ordinal/week index/month union 시각 배치, rendered primitive 승인과 public calendar facade는
아직 구현되지 않았다. STEP-074 qualification 및 STEP-077까지의 전체 요청 역시 완료가 아니다.
