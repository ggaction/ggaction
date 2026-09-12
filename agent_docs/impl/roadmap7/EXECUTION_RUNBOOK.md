# Roadmap 7 — 단계별 구현 실행 명세

문서 상태: **실행 기준**. 기준일 2026-09-13. 사용자는 Roadmap 7의 25개 기능과 Phase 0–12 Gate를 모두 승인했다. 이 승인은 아래에 고정된 공개 계약과 구현 범위를 진행할 권한이며, 아직 구현되지 않은 기능을 Current로 표시해도 된다는 뜻은 아니다. 현재 Phase 1–2의 primary 경로가 구현됐고 Phase 3을 진행 중이다.

이 문서는 구현 순서와 완료 판정을 한 곳에서 찾게 하는 실행 원장이다. 정확한 필드, union, 수식, 지원 행렬은 각 [기능 명세](features/)가 단일 owner이고, case별 literal 기대값은 [ACCEPTANCE_CASES.json](ACCEPTANCE_CASES.json)이 소유한다. 이 문서와 기능 명세가 충돌하면 기능 명세를 따르고 이 문서를 같은 변경에서 고친다.

## 1. 구현자가 임의로 바꾸면 안 되는 범위

선택 기능은 `R02, R05, R06, R07, R08, R09, R10, R19, R20, R21, R22, R23, R25, R27, R29, R31, R32, R33, R36, R37, R38, R39, R43, R47, R49`의 25개다. 감사 번호 20은 제외된 항목이 아니라 `R20` Parallel scale 편집으로 포함된다.

다음 결정은 승인된 계약이므로 구현 편의로 축소하거나 다른 뜻으로 바꾸지 않는다.

- `ChartProgram`과 호출자 입력은 성공과 실패 모두 불변이다.
- 일반 저작은 domain action을 통한다. 새 API를 `editSemantic`, `createGraphics`, `editGraphics` 호출로 사용자에게 떠넘기지 않는다.
- action은 요청을 먼저 완전히 검증한 뒤 private candidate에서 계산하고, 모든 consumer가 유효할 때만 새 program을 반환한다.
- 자동 target 선택은 저장 상태가 유일하게 정하지 못하면 오류다. 배열 첫 항목을 임의 선택하지 않는다.
- `requested`와 `resolved`를 분리한다. auto 결과, 계산된 domain, layout 좌표, 선택된 item index를 다음 replay의 요청값으로 저장하지 않는다.
- 데이터 revision, scale, mark, label, reference, guide, layout, highlight를 각 owner가 명시적으로 다시 만든다. 범용 semantic-to-graphic compiler를 추가하지 않는다.
- facet/repeat는 원래 source recipe에서 다시 실행한다. 이미 partition된 child snapshot을 다음 source처럼 사용하지 않는다.
- renderer는 `graphicSpec`만 읽는다. Canvas/SVG/PDF가 semantic/config를 다시 해석하지 않는다.
- 미선택 기능은 작은 private helper로만 허용한다. 새 public Join/Pivot/transpose/viewport/axis-template/style-reset/export-preset API를 추가하지 않는다.
- 새 동작을 구현하기 전의 legacy omission 호출은 가능한 한 semantic/graphic/trace shape와 숫자 결과를 유지한다.

## 2. 한 기능을 구현하는 기계적인 순서

모든 기능과 wave에 아래 12단계를 같은 순서로 적용한다. 한 단계의 실패를 다음 단계에서 숨기지 않는다.

1. **현 상태 확인**: `git status`, 현재 Phase `GOAL.md`/`STEP1.md`/`GATES.md`, 기능 명세, `IMPLEMENTATION_MAP.json`, 현재 contract owner, 실제 source와 기존 tests를 읽는다.
2. **호출 표 작성**: 최소 호출, 모든 옵션을 쓴 호출, omission, reset/false/auto, mode 전환, unknown key, 잘못된 target을 fixture로 먼저 적는다.
3. **정규화 함수 작성**: plain object와 closed keys를 검사하고 defaults를 canonical requested 형태로 만든다. validation 함수가 program이나 입력을 쓰지 않게 한다.
4. **pure 계산 작성**: 데이터/통계/geometry/selection/layout 결과를 program action과 분리한다. 수치 expected는 `src` 함수를 호출하지 않는 literal 또는 `test/oracles`로 검증한다.
5. **읽기 전용 plan 작성**: owner, live dependency, affected consumer, release 후보, 실행 순서를 모두 수집한다. 이 단계에서 ID, trace, revision, global counter를 소비하지 않는다.
6. **private candidate 실행**: 기존 wrapped primitive와 materializer를 사용해 candidate를 만든다. 중간 상태를 public result처럼 검증하지 않는다.
7. **최종 consumer preflight**: shared scale, secondary channel, offset, series grain, selection, labels, references, guides, composition ancestor까지 최종 상태로 검증한다.
8. **결정적 materialization**: data → domains → effective bounds/ranges → marks → label membership/reference values → guides → occupied layout → highlights 순서를 지킨다.
9. **resource 정리**: 새 owner.current와 consumer rebinding이 끝난 뒤 live-reference collector로 이전 snapshot/scale/graphic을 정리한다. 값이 같다는 이유로 소유권을 합치지 않는다.
10. **공개 표면 동기화**: Full export, direct action registry, `types/program.d.ts`, `types/index.d.ts`, current contract, `ACTION_INDEX.json`, internal materializer inventory, relation source, knowledge intent, public docs와 installed consumer를 갱신한다. Basic에 advanced action을 자동 추가하지 않는다.
11. **검증**: focused test, 기존 regression, cumulative unit/contracts/docs, installed tarball, 필요한 renderer/browser/realistic suite를 실행한다. case JSON의 상태는 실제 test 경로와 revision이 있을 때만 바꾼다.
12. **기록과 checkpoint**: `STEP1.md`, feature status, `PROPOSALS.json`, `IMPLEMENTATION_MAP.json`, `TRACEABILITY.md`, `ACCEPTANCE_CASES.json`, roadmap index를 실제 결과와 맞춘다. coherent diff만 commit/push한다.

### 오류 원자성 비교 대상

오류 테스트는 반환값이 없다는 사실만 확인하지 않는다. 호출 전 program과 다음 경로를 `deepStrictEqual`로 비교한다.

- `semanticSpec`
- `graphicSpec`
- `materializationConfigs`
- `context`
- `trace`
- `resolvedScales`
- `children`
- `compositionSpec`

호출자 options, nested AST, arrays, data rows는 deep-freeze fixture로 mutation을 검출한다. JSON round-trip은 `undefined`, `Date`, prototype 의미를 잃으므로 불변성 oracle로 쓰지 않는다.

### public action 하나의 필수 산출물

새 direct action마다 최소 다음 항목이 실제 repository에 있어야 한다.

- source 구현과 public Full 등록
- 필요하면 wrapped internal materializer 등록
- strict TypeScript options/result와 root export
- Current contract의 signature/default/inference/effects/errors/lifecycle/coverage
- `ACTION_INDEX.json`의 정확히 한 implemented owner
- generated catalog/card/relationship/action reference/signature/metadata/search/machine/LLM artifacts
- intent terms와 실제 runnable sample
- Node runtime 및 strict TypeScript installed-package 소비
- 최소 정상, 경계, 오류 원자성, lifecycle test

함수가 source에 존재해도 위 항목이 빠지면 완료가 아니다. 생성 파일은 직접 고치지 않고 owner source를 바꾼 뒤 generator를 실행한다.

## 3. Phase 1 — R06/R07 후속 의무

Primary 구현은 `b891d1d5`에 있다. 이 Phase를 다시 구현하지 않는다.

### R06 조건·문자열·null 계산식

- 현재 evaluator/validator가 닫힌 typed AST, lazy `if`/boolean/coalesce, code-point 문자열 비교, result type 일관성, depth/node budget를 소유한다.
- Phase 4는 `editComputedData`와 descendant recompute에서 같은 normalizer/evaluator를 사용해야 한다. 별도 식 엔진을 만들지 않는다.
- R06-L01은 edit/revision 경로가 통과할 때 최종 passed가 된다.

### R07 그룹 정규화

- `share`, `minmax`, population/sample `zscore`, `index`, `change`, `percentChange`와 group-local stable baseline, zero policy가 현재 owner다.
- `percentChange`는 fraction이고 `index`만 100 기준이다.
- Phase 4는 `editNormalizedData`를 같은 transform owner에 연결한다.

## 4. Phase 2 — R05/R08/R09

Phase 2는 data-only 기능이다. 새 시각 디자인은 없지만 결과를 소비하는 Cartesian/facet Canvas program까지 검증한다. 구현 checkpoint는 R05, R08, R09, Phase 통합의 네 묶음으로 나눈다.

### W2.1 R05 Complete

수정 owner는 `src/grammar/complete.js`, `src/actions/data/complete.js`, data action registry, transform registry/topology다.

1. `key`와 `groupBy`를 nonempty unique field로 검증하고 서로 겹치면 거부한다.
2. `values`와 `sequence`는 배타다. 둘 다 없으면 source 전체의 key를 typed identity와 first appearance 순서로 모은다.
3. group domain은 관측된 group tuple만 사용한다. group field 각각의 Cartesian product를 만들지 않는다.
4. 동일 group×key가 둘 이상이면 집계하지 않고 오류다. explicit domain 밖의 관측 key도 오류다.
5. 출력 순서는 group first appearance, 그 안에서 key-domain order다. 원본 row는 전체 field를 보존하고 합성 row의 나머지 field는 `fill[field]` 또는 `null`이다.
6. `members`가 있으면 원본은 source row index 배열, 합성 row는 빈 배열이다. source에 같은 출력 field가 있으면 거부한다.
7. sequence는 `start + i * step`으로 계산하고 finite, `start <= end`, `step > 0`을 요구한다. 최대 10,000 output row를 allocation 전에 검사한다.
8. empty source와 groupBy 유무의 결과는 기능 명세의 empty 표를 그대로 따른다. 임의 default group이나 0..1 domain을 만들지 않는다.

필수 test는 observed/explicit/sequence domain, mixed typed key rejection, duplicate, budget, field collision, source immutability, transform registry, statistical facet replay다.

### W2.2 R05 Impute

수정 owner는 `src/grammar/impute.js`, `src/actions/data/impute.js`와 같은 registry/topology다.

1. missing은 `null`과 `undefined`만이다. `NaN`/`Infinity`는 missing으로 보지 않고 오류다.
2. `constant`는 `value`가 필수이고 `sortBy`를 요구하지 않는다. `forward`, `backward`, `linear`는 `value`를 금지하고 `sortBy`를 요구한다.
3. 정렬은 group 안에서 stable하다. 계산 뒤에는 원래 전체 row 순서로 돌려놓는다.
4. forward/backward anchor는 group 경계를 넘지 않는다. linear는 단일 finite numeric/time position, strictly increasing unique anchor 위치, numeric target을 요구한다.
5. linear 값은 행 index가 아니라 `(x - x0) / (x1 - x0)` 거리로 보간한다.
6. `maxGap`은 연속 missing row 수 기준이다. 초과 run은 그대로 두고, anchor 부족에만 `edges: keep|error`를 적용한다.
7. 지정한 fields만 새 값으로 바꾸고 다른 cell과 source rows는 보존한다.

필수 literal은 `(t,v)=(1,2),(2,null),(5,10)`에서 `t=2` 결과 4다. group leakage, leading/trailing gap, maxGap 우선순위, invalid sort/value, facet-local replay를 별도 test로 둔다.

### W2.3 R08 TimeUnit

기존 `createTimeUnitData`를 확장한다. 새 action 이름을 만들지 않는다.

1. `week`, `weekday`, IANA `timeZone`, `weekStartsOn: 0..6`, `weekRule: calendar|iso`를 closed union으로 검증한다.
2. week 전용 옵션을 다른 unit에 쓰면 오류다. ISO week는 Monday만 허용한다.
3. timeZone 생략과 기존 7개 unit은 기존 UTC 결과와 저장 shape를 유지한다.
4. timestamp parsing은 기존 temporal helper만 쓴다. locale 문자열 파싱이나 host local timezone에 의존하지 않는다.
5. IANA zone에서는 instant → Gregorian civil parts → unit boundary civil parts → instant 순서로 계산한다.
6. fold의 두 instant는 가장 이른 instant를 선택한다. gap은 해당 bucket 안의 첫 유효 instant를 선택한다. 존재하지 않는 전체 civil date는 명시 오류다.
7. weekday는 zone-local Sunday=0 … Saturday=6의 정수다. week output은 해당 week 시작 local midnight의 epoch milliseconds다.
8. UTC/Seoul/New_York/Kolkata/Lord_Howe/Apia fixture로 정시·30분 offset·DST gap/fold·날짜 건너뜀을 검증한다.

`Date#setHours`와 process timezone 변경으로 구현하지 않는다. host/locale별 결과가 달라지면 실패다.

### W2.4 R09 duration Window

기존 `createWindowData`의 movingMean/movingSum을 확장한다.

1. row frame `{preceding, following}`과 duration frame `{duration:{preceding,following,unit}}`은 배타다.
2. duration unit은 millisecond/second/minute/hour/day이고 day는 정확히 24시간이다. 달력 하루 의미를 R08에서 가져오지 않는다.
3. duration frame에는 정확히 하나의 ascending sort가 필수다. temporal value는 기존 temporal helper로 epoch milliseconds가 된다.
4. interval endpoints는 닫혀 있다. 동일 timestamp peer는 모두 같은 window와 같은 결과를 가진다.
5. `minPeriods` 기본 1, positive integer다. `missing` 기본 `error`는 nullish와 nonfinite 값을 거부한다. 명시한 `missing: skip`만 nullish를 count와 합계에서 제외하며 NaN/Infinity는 항상 오류다.
6. stable sort + two pointers + rolling accumulator로 group당 `O(n log n)+O(n)`을 지킨다. 각 row마다 전체 배열을 filter/find하지 않는다.
7. 큰 수의 합은 compensated/rescaled helper를 쓰고 최종 nonfinite를 거부한다. 입력 순서로 결과를 복구한다.

필수 test는 row-window legacy parity, irregular times, peer equality, group isolation, minPeriods, null policy, overflow/date boundary, large-n operation budget, facet-local duration replay다.

### W2.5 Phase 2 통합과 종료

`complete → impute → duration window → quantitative encoding`을 한 public program으로 실행한다. A/B facets에 서로 다른 missing pattern을 주어 child가 전역 anchor나 window를 공유하지 않는지 확인한다. Full-only export, types, Current data contract, catalog/cards/relations/MCP/docs/installed package를 갱신한다. R05/R08/R09 edit case는 Phase 4 owner를 `partial`로 남기되 primary create/extension을 Planned로 남겨서는 안 된다.

## 5. Phase 3 — R10 가중 통계

R10은 하나의 `StatisticalWeight` 계약을 summary/bin/density와 histogram/density/violin facade까지 전달한다. ECDF/Pie의 기존 weight 계약은 교체하지 않는다.

### W3.1 pure weighted statistics

1. `{field, kind: frequency|reliability}`를 검증한다. frequency weight와 합계 `W`는 nonnegative safe integer, reliability는 nonnegative finite다.
2. 값과 weight는 0-weight row까지 사전 검증한다. 통계 membership/domain에는 positive-weight row만 포함한다. all-zero group은 오류다.
3. `W`, `W2`, weighted mean, centered sum `Q`, population/sample variance, stdev, stderr, `nEff`를 기능 명세 수식 그대로 구현한다.
4. frequency sample denominator는 `W-1`, reliability는 `W-W2/W`; reliability `nEff=W²/W2`다.
5. frequency quantile은 virtual repeated sample의 기존 linear quantile과 같아야 하지만 row를 실제 복제하지 않는다. reliability quantile은 combined equal-value weights의 inverse CDF다.
6. rescaling/compensation으로 중간 overflow를 피하고 각 공개 결과만 finite 검사한다.

### W3.2 transforms와 facades

- summary whitelist는 count/sum/mean/variance/varianceP/stdev/stdevP/stderr/median/q1/q3/parameterized quantile다. weighted min/max/CI 등은 명시 거부한다.
- bin count는 row 수가 아니라 weight mass다. positive-weight rows만 auto extent에 기여한다.
- KDE unit/count 수식과 `bandwidth:auto = 1.06*s*nEff^(-1/5)`를 적용한다. explicit positive bandwidth는 sample-size 추정 실패와 독립적으로 허용한다.
- facet/group마다 W, nEff, IQR, bandwidth를 다시 계산한다. 서로 합치지 않는다.
- `encodeHistogram`, `encodeDensity`, `createHistogram`, `createDensityPlot`, `createViolinPlot`, 관련 edit 경로에 동일 requested weight를 전달한다.
- omitted unweighted 호출의 기존 output/schema/trace를 유지한다. edit의 `weight:false`만 제거 sentinel이고 create에서 false는 오류다.

R10-N01..L01의 숫자와 scaling invariant를 모두 테스트하고 installed Node/browser에서 동일 결과를 확인한다.

## 6. Phase 4 — R02 파생 데이터 편집

R02는 Roadmap 7 data 기능의 lifecycle을 닫는 단계다. transform마다 따로 revision 코드를 복제하지 않는다.

### W4.1 registry와 owner

1. 기존 Bin2D revision과 interval ownership 회귀를 먼저 고정한다.
2. transform registry에 family별 `extractRequested`, `validate`, `materialize`, `editable`, `outputRoles` adapter를 둔다.
3. standalone create owner는 `materializationConfigs.data.<family>.<logicalId>.current`만 저장한다. definition 사본을 config에 중복 저장하지 않는다.
4. logical ID 또는 current snapshot ID만 편집 가능하다. source, stale revision, chart-private derived dataset은 거부한다.

### W4.2 API와 patch

- 공통 `editDerivedData`는 동일 transform type의 완전한 requested definition을 받는다.
- 15개 focused editor는 기존 create options에서 `id/source/type`을 뺀 patch와 `target`, `dependents`를 받는다.
- focused patch omission은 유지, arrays/AST/aggregate/as는 전체 교체다. `undefined`/`null`을 삭제로 해석하지 않는다.
- 기존 `editBin2DData`의 source/target inference 호환 예외를 다른 editor에 확장하지 않는다.
- 빈 patch와 canonical no-op을 구별한다. 빈 patch는 오류, no-op은 revision을 만들지 않는다.

### W4.3 transaction

1. downstream DAG, retained facet recipes, consumer bindings, role changes를 읽기 전용으로 수집하고 cycle/unsupported path를 검사한다.
2. 기본 `dependents: reject`는 하위 derived가 하나라도 있으면 쓰기 전에 실패한다.
3. `recompute`는 deterministic topology 순서로 모든 reachable revision을 private candidate에 만든다.
4. output rename은 일대일 semantic role만 이동한다. 식 안의 field 문자열이나 배열 index를 추측해 치환하지 않는다.
5. scales → marks → selection membership → labels/references → guides → layout → highlights를 최종 revision에 맞춰 갱신한다.
6. `context.currentData`가 old current일 때만 new current로 옮긴다. 내부 materializer의 마지막 대상이 public context에 새지 않게 한다.
7. rebinding 후 실제 live ref가 없는 old revision만 release한다.

computed부터 imputed까지 16 family 표 기반 create/edit/edit/no-op/recompute/facet replay를 테스트한다. R06/R07/R05/R08/R09/R10의 lifecycle `partial` case를 이 Phase에서 닫는다.

## 7. Phase 5 — R20/R21/R23/R22/R19

focused scale/channel 기능을 먼저 구현하고 R19가 그 pure planners를 조합한다. 순서를 바꾸면 batch API에 임시 전용 로직이 생기므로 금지한다.

### W5.1 R20 Parallel scale

- `editParallelScale({target?, dimension, ...scalePatch})`는 Parallel mark와 dimension의 nested scale ID를 정확히 resolve한다.
- 동일 이름 dimension이 여러 target에 있으면 target을 요구한다. 첫 Parallel mark를 선택하지 않는다.
- domain/type/nice/zero/clamp/reverse patch는 기존 `editScale` 의미를 재사용한다.
- 해당 dimension axis와 모든 series point만 갱신한다. sibling dimension domain과 order를 바꾸지 않는다.
- constant/없는/중복 dimension, wrong target, incompatible patch는 원자적으로 거부한다.

### W5.2 R21 offset scales

- `editXOffsetScale`/`editYOffsetScale`는 nested band scale의 focused editor다.
- semantic scale padding이 requested 단일 owner다. mark config의 이전 resolved padding은 compatibility migration 후 중복 source가 되면 안 된다.
- inner/outer padding, align, reverse와 parent band resize를 existing band formula로 계산한다.
- grouped/stacked bar consumer, guides, legend, selection, facet/replay를 갱신하고 sibling offset axis를 보존한다.
- mode 전환에서 old-only keys를 정리한다. offset scale이 없거나 target이 모호하면 오류다.

### W5.3 R23 size scale types

- size scale type은 linear/sqrt/pow/log/ordinal/threshold/quantize/quantile의 닫힌 union이다.
- continuous/discrete option 조합, exponent/base/threshold/domain/range 길이를 type별로 preflight한다.
- size range의 단위는 px² 면적이다. circle radius는 `sqrt(area/pi)`, square side는 `sqrt(area)`다.
- scale type edit는 incompatible old keys를 제거한 뒤 새 type defaults를 적용한다. omission patch는 유지한다.
- mark와 size legend가 같은 mapper를 사용한다. legend가 radius를 size value처럼 재사용하면 실패다.

### W5.4 R22 stroke channel

- `stroke`를 fill/color와 독립된 field channel로 등록하고 `editStrokeScale`을 제공한다.
- constant→field→constant 전환에서 binding, scale, legend, style override를 정확히 정리한다.
- family별 series grain을 검증한다. 한 series 안에서 여러 stroke 값이 생기는 Line/Area는 기능 명세의 series 정책을 적용한다.
- SVG/PDF/Canvas, legend samples, selection highlight, facet child에 같은 stroke value를 전달한다.
- fill color scale과 stroke color scale의 shared ID 호환성을 최종 consumer 전체에서 검사한다.

### W5.5 R19 atomic encodeChannels

1. canonical channel 순서는 기능 명세의 19개 순서를 쓴다. 입력 object key 순서에 의존하지 않는다.
2. 각 기존 single-channel validator를 pure normalize/plan으로 추출한다. batch가 public `encodeX` 등을 순차 호출하지 않는다.
3. 모든 새 binding을 반영한 draft layer와 scale requests를 만든 뒤 final-state compatibility를 검사한다.
4. 같은 scale ID에 모순된 definition이 오면 last-write가 아니라 오류다.
5. semantic patch는 한 transaction에서 commit하고 affected scale/mark/guide를 deduplicate한다.
6. one-channel batch는 focused action과 semantic/graphic/config가 같고 trace root만 다르다.

필수 조합은 x↔y swap, x/x2·y/y2, band+offset, group+pathOrder, theta+r, color+stroke+size, combined legend다. 하나가 invalid면 어느 channel도 바뀌지 않는다.

## 8. Phase 6 — R27/R29

### W6.1 R27 aspect

- `editCoordinate`에 Cartesian frame ratio와 data-unit ratio를 구분한 discriminated 요청을 추가한다.
- frame ratio는 allocated bounds 안에 requested width/height 비율의 최대 centered rectangle을 만든다.
- data-unit ratio는 final x/y quantitative domain span과 requested unit ratio로 effective frame을 계산한다. domain을 바꾸지 않는다.
- explicit position/alignment 옵션이 있으면 기능 명세 수식대로 leftover space를 배치한다.
- domain → aspect → range 순서를 지키고 Canvas/layout 변경 때 effective bounds를 다시 계산한다.
- zero/nonfinite domain span, unsupported coordinate, 잘못된 ratio는 candidate 생성 전에 거부한다.

### W6.2 R29 Polar frame

- center는 local effective bounds의 비율 좌표다. 기본 center와 radius는 기존 Polar 결과를 유지한다.
- radius는 center에서 네 frame edge까지 거리의 최솟값에 requested ratio를 곱해 완전한 원이 들어가게 한다.
- theta/r scale ranges, arcs, points, axes, grid, labels가 같은 resolved center/radius를 소비한다.
- resize/aspect/facet child에서 local frame으로 다시 계산한다. 이전 absolute pixels를 requested로 저장하지 않는다.
- center/radius overflow와 degenerate bounds는 명시 오류이며 clipping으로 성공을 가장하지 않는다.

두 기능은 allocated/effective bounds를 분리한 pure geometry oracle과 Canvas/facet replay를 요구한다.

## 9. Phase 7 — R31/R32/R33/R36

### W7.1 R31 label-only removal

- `removeMarkLabels({target})`는 source mark를 보존하고 label owner config, text graphics, leaders, collision/layout bookkeeping만 제거한다.
- source mark가 가진 unrelated children, selection/highlight, scales를 지우지 않는다.
- remove 후 source/Canvas/facet replay에서 라벨이 부활하지 않게 retained recipe도 정리한다.
- label이 없거나 target이 모호한 경우의 no-op/error는 기능 명세와 기존 remove policy를 따른다.

### W7.2 R32 selected labels

- label membership은 raw row index가 아니라 source의 현재 final items에서 평가한다.
- inline selector와 named selection은 구별한다. named selection은 live dependency라서 selection edit/remove 뒤 label을 다시 평가한다.
- filtering, aggregation, reorder, facet partition 뒤 각 local final-item grain에서 top-k/predicate를 실행한다.
- mark highlight selection과 label membership을 같은 상태로 합치지 않는다.
- synthetic/aggregate members와 explicit membership provenance를 보존한다.

### W7.3 R33 semantic anchors

- family×anchor 지원표는 닫혀 있다. 지원하지 않는 Point/Line/Parallel 조합을 자동 center로 낮추지 않는다.
- source final geometry에서 boundary point와 outward vector를 구하고 `gap`은 boundary와 text bbox edge 사이의 pixel 거리로 적용한다.
- pipeline은 metrics → semantic anchor → gap → dx/dy → fit/overflow → collision → leader다.
- inside fit은 full bbox containment이며 Arc는 inner hole과 edge 교차까지 검사한다.
- leader는 이동한 visible label에만 하나 생성하고 hide/remove 때 같이 제거한다.

### W7.4 R36 dynamic statistical references

- literal reference와 dynamic `{source,axis,statistic,population,field}` union을 혼합하지 않는다.
- `boundData`는 mark-filter wrapper 전 authoring data, `visibleItems`는 mark filter 후 final scalar items다. selection/highlight는 population을 바꾸지 않는다.
- inferred field mode와 explicit field mode를 저장에서 구별한다.
- source scale domain을 먼저 확정하고 reference 값을 계산한다. reference는 그 domain에 기여하지 않는다.
- facet child마다 local population으로 통계를 계산한다. source edit/reencode/remove에 dependency를 연결한다.

Phase 통합은 derived edit → mark filter → named selection → selected labels/anchors → statistical reference → layout → highlight → remove 순서로 검증한다.

## 10. Phase 8 — R37/R38/R39

### W8.1 R37 exact legend values

- continuous size/opacity/strokeWidth legend의 explicit values는 finite, ascending, unique이고 scale domain 안에 있어야 한다.
- auto와 explicit mode를 구별해 저장한다. edit reset은 auto로 돌아가며 계산된 samples를 requested values로 저장하지 않는다.
- scale edit 뒤 explicit values가 invalid해지면 scale과 legend를 함께 preflight하고 전체 호출을 거부한다.
- 표시 순서는 사용자 배열의 우연한 순서를 고치지 말고 계약대로 ascending을 요구한다.

### W8.2 R38 legend blocks

- combined legend block identity는 graphic array index가 아니라 canonical channel-set identity다.
- `editLegendBlock` patch whitelist와 merged/split 전환 표를 그대로 구현한다.
- block override는 재정렬, source replay, theme, Canvas에서 동일 channel block에 남는다.
- channel이 사라지거나 merged 구성이 달라질 때 stale override를 남기거나 다른 block에 옮기지 않는다.

### W8.3 R39 display names와 headers

- display map key는 typed scalar identity를 보존한다. 숫자 1과 문자열 `"1"`을 같은 key로 합치지 않는다.
- raw domain/selection/filter key는 바꾸지 않고 guide text만 바꾼다.
- facet header는 row/column 역할별 side/align/strip을 계산하고 child 위에 임의 text를 얹는 legacy 단일 위치와 구별한다.
- header strip이 occupied bounds에 반영되어 plot과 겹치지 않게 한다.
- legend block, axis, facet headers가 같은 display resolver를 사용하되 role별 요청 owner는 분리한다.

## 11. Phase 9 — R47/R49

### W9.1 R47 custom theme

- `ThemeDefinition`은 built-in 이름 또는 `{base,tokens}`다. token keys는 feature의 18개 closed list만 허용한다.
- 새 custom theme는 이전 custom tokens와 merge하지 않고 base 위에 이번 tokens만 overlay한다.
- data palette와 explicit mark/guide styles는 보존한다. 값이 우연히 default와 같아도 explicit provenance를 잃지 않는다.
- composition `self|descendants` 의미를 구분하고 descendant recipe를 retained facet/repeat source에 저장한다.
- nested composition은 immutable deterministic postorder로 layout을 다시 계산한다. 원래 child input program은 바뀌지 않는다.
- font 변경 뒤 common metrics, labels, legends, headers, layout을 다시 계산한다.

### W9.2 R49 shape/stroke details

- cornerRadius는 Bar/Rect만, cap/join/miterLimit은 기능의 family 표만 지원한다. 미지원 property는 무시하지 않고 오류다.
- radius는 normalized rect에서 `min(requested,w/2,h/2)`다. 0이면 legacy rect path를 유지한다.
- rounded rect는 공통 M/L/C/Z path로 한 번 만들고 모든 renderer가 같은 commands를 쓴다.
- Canvas draw마다 cap/join/miter default를 명시해 이전 node state가 다음 node로 새지 않게 한다.
- painted/hit/occupied bounds에 cap과 miter extension을 반영한다.
- legend symbol과 highlight가 source mark의 style vocabulary를 보존한다.

Phase 9는 primitive/public 같은 실행의 graphic·Canvas·PNG parity와 SVG/PDF raster를 모두 요구한다.

## 12. Phase 10 — R43 Polar/Parallel facet와 repeat

R43은 새 generic composition API가 아니라 기존 `facet`, `facetGrid`, `repeatCharts`, `editFacetScales`, `editFacetSource`의 family 지원 확장이다.

1. 지원 대상 7 family의 exact matrix를 chart contract와 test table로 고정한다. 지원하지 않는 family/role은 명시 오류다.
2. parent source를 partition하고 각 child를 원래 public recipe로 local frame에 다시 생성한다.
3. Polar radial/theta와 Parallel dimension domain을 역할별로 shared/independent resolve한다. Pie share는 child 합계로 local 재계산한다.
4. shared categorical domain은 parent first appearance 순서를 보존한다. independent empty auto domain은 오류다.
5. repeat는 1차원 theta/r/parallelDimension field substitution만 지원한다. Pie/Radar의 의미 role 변환이나 2D repeat를 추가하지 않는다.
6. non-Cartesian axes는 local `each`가 기본이고 `outer`는 오류다. 호환되는 legend만 shared한다.
7. header, selected labels, semantic anchors, references, theme, rounded/cap/join style를 child namespace에서 replay한다.
8. source edit, scale policy edit, Canvas/aspect/frame edit, theme, removal 후 같은 recipe가 유지되는지 검증한다.

각 family는 primitive/public/render/type/package 증거를 모두 가져야 한다. 한 Polar 예제로 Parallel과 다른 family를 완료 처리하지 않는다.

## 13. Phase 11 — R25 안전한 resource 삭제

R25는 앞 Phase에서 추가한 모든 reference path가 확정된 뒤 구현한다.

1. `collectDataReferences`, `collectScaleReferences`, `collectCoordinateReferences`가 `{owner,path,kind}` 목록을 반환하게 한다.
2. semantic bindings, materialization configs, owner.current/source DAG, retained facet/repeat templates, Parallel dimensions, legend recipes/blocks, labels, references, theme/composition context를 전수 검사한다.
3. historical trace는 live reference가 아니다. context-only current pointer는 삭제 전에 안전한 값으로 clear할 수 있다.
4. 하나라도 live reference가 있으면 `removeData/removeScale/removeCoordinate`는 변경 없이 오류다.
5. 허용된 삭제는 semantic/config/graphic/resolved/context를 한 transaction에서 정리한다.
6. R02 old revision release와 같은 collector를 재사용한다. 별도 느슨한 삭제 규칙을 만들지 않는다.
7. 각 숨은 reference path마다 “그 reference 하나만 남은” fixture를 만들어 누락을 검출한다.

미사용 resource 삭제 전후의 visible pixels와 unrelated trace/state는 같아야 한다.

## 14. Phase 12 — 전체 통합과 main merge 준비

### 전수 대조

25개 각각에 대해 다음 연결이 모두 존재하는지 machine-readable inventory와 실제 파일을 대조한다.

`feature → approved API → source owner → pure test/oracle → lifecycle test → types → Current contract → ACTION_INDEX → generated docs/cards/relations → installed package → applicable renderer/composition evidence`

`Proposed`, `Planned`, `partial`, `pending`이 하나라도 남으면 해당 owner Phase를 다시 연다. 사용자가 명시적으로 범위를 바꾸지 않은 항목을 삭제하거나 future로 보내지 않는다.

### 누적 검증 순서

1. affected focused tests
2. `npm run test:unit`
3. `npm run test:contracts`
4. `npm run test:charts`
5. `npm run test:render`
6. `npm run test:browser`
7. `npm run test:realistic`
8. `npm run docs:generate` 후 generated diff 검토
9. `npm run test:docs`
10. `npm run docs:build`, `npm run test:docs:built`, `npm run test:docs:browser`
11. `npm run package:check`, `npm run package:bundle`, `npm run test:package`
12. `npm test`

동일 source revision에서 생성한 artifact만 증거로 사용한다. ceiling을 넘으면 새 기능의 정당한 증가인지 bundle/package 구성 누수인지 먼저 조사하고, 측정값을 숨기기 위해 테스트를 완화하지 않는다.

### 종료 상태

- `ROADMAP.md`, 모든 Phase GOAL/STEP/GATES, `PROPOSALS.json`, `IMPLEMENTATION_MAP.json`, `ACCEPTANCE_CASES.json`, `TRACEABILITY.md`, `ROADMAP_INDEX.json`가 같은 완료 상태를 가리킨다.
- current contracts와 public docs는 실제 지원만 설명한다.
- branch가 origin과 동기화되고 working tree가 clean하다.
- 열린 Roadmap 관련 issue/PR을 실제 main 반영 상태와 대조한다.
- 사용자에게 이미 승인받은 범위에 따라 최종 PR을 만들고 main에 merge한 뒤, 반영된 issue를 닫고 remote main에서 검증한다.

## 15. 구현 중 판단이 필요한 경우

다음은 새 승인을 요구하지 않고 가장 단순한 기존 패턴을 선택한다: private helper 이름, 파일 분할, local fixture 값, 오류 문장의 세부 문구, 동일 계약을 만족하는 자료구조.

다음은 승인된 명세에서 벗어나는 material change이므로 구현을 숨겨 진행하지 않는다: public 이름/signature/default 변경, persisted schema 의미 변경, 수식/정렬/selection population 변경, 지원 family 축소, renderer representation 변경으로 backend 결과가 달라짐, 사용자가 고른 기능의 삭제/연기. 이 경우에도 영향 없는 작업과 구체적인 diff/test 제안은 먼저 완성한다.

구현자가 막혔다는 이유로 `any`, unknown-key 허용, silent fallback, 첫 resource 선택, renderer별 ad-hoc 분기, skipped test, 문서만 Current 승격을 사용하면 안 된다.
