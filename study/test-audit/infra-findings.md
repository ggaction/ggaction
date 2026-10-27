# Test infrastructure audit

- 대상: `/Users/hj/Desktop/ggaction_chongjeonglee/ggaction`, HEAD `31ce29f31e5ae87c57759a5b3e002db1f29a4808`.
- 범위: test discovery/capabilities, coverage policy, runner/process lifecycle, sharding, CI/release gates, package qualification reproducibility.
- 저장소 변경 없이 조사했다. 모든 변형 실험은 이 보고서 옆 `evidence/`의 독립 fixture/copy에서 수행했다.
- 2026-10-23 새로 실행한 `npm run test:coverage`: **exit 0, line 95.64%, branch 93.18%, function 98.74%, critical floor 137개 통과**, macOS / Node v23.5.0. `evidence/infra-coverage.log`. 이것은 CI의 Node 20/22/24 및 원격 Windows 실행 결과가 아니다.
- discovery: default 957 files, realistic 26, render 104, browser 30. 현재 src JS 595개, critical-presence floor가 있는 파일은 137개다. 파일 수와 테스트 case 수는 다르다.

## 유지해야 할 강점

- 정상/realistic/render/browser 집합을 전체 파일 inventory와 비교하고 중복·누락을 거부한다 ([test/contracts/test-discovery.test.js:27–49](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/test-discovery.test.js:27)). 모든 test JS의 정적 reachability도 검사한다 (`:105–127`).
- realistic은 명시적 capability registry, 별도 heap/concurrency, 체크섬 corpus/cache 및 7개 shard를 사용한다. shard의 exhaustive/disjoint/deterministic 성질과 실패·취소·skip된 prerequisite의 aggregate rejection을 테스트한다.
- release는 하나의 candidate artifact를 검증해서 후속 job이 소비하고, publish 전에 모든 필수 job 성공을 요구한다. 아래 workflow test 취약점은 **현재 release가 이미 qualification을 생략한다는 뜻이 아니다**.
- optional native/SDK dependencies가 없는 installed consumer와 설치한 consumer를 모두 검사하며, 공개 export/types/package contents 및 브라우저 bundle budget을 검증한다.

## 확인된 문제와 구체적인 개선점

### INF-01 / P2 — source coverage denominator에 로드되지 않은 파일이 자동 포함되지 않는다

**근거:** [scripts/run-tests.js:157–164](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/run-tests.js:157)는 Node V8 coverage에 `src/**/*.js` include filter만 지정한다. [scripts/coverage-policy.js:284–303](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/coverage-policy.js:284)의 파일 존재 검사는 137개 floor 대상에만 적용된다. 모든 595개 src 파일이 report에 존재하는지 비교하는 검사는 없다.

**재현:** `evidence/infra-coverage-fixture/`에 used module과 import되지 않는 throwing module을 만들고 동일 계열 Node coverage 옵션으로 실행했다. `infra-unimported-coverage.log`에서 모든 threshold 100%를 통과하지만 unimported module 행은 없다. 이는 repository에서 현재 458개 파일이 미검증이라는 주장이 아니다. 현재 테스트는 거의 모든 source를 정적으로 도달하지만, 새 파일·분리된 helper·CLI child code의 누락을 전역 퍼센트만으로 감지하지 못한다는 enforcement gap이다. 정적 normal graph에서 유일하게 도달하지 않는 `src/mcp/cli.js`는 subprocess tests가 있으므로 단순히 untested라 분류하지 않았다 (`infra-source-static-reachability.json`).

**개선/완료 기준:** 전체 source inventory와 raw coverage file set을 비교해 누락 파일을 0% 또는 명시적 reviewed exclusion으로 처리한다. 새 미로드 src 파일을 추가한 mutation이 CI를 실패시켜야 한다. CLI/worker/subprocess coverage의 병합 범위를 별도 fixture로 확인한다.

### INF-02 / P2 — 자동 critical family가 일부 고위험 경계에만 적용된다

**근거:** [scripts/coverage-policy.js:7–57](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/coverage-policy.js:7)의 renderer family는 `renderers/canvas/`뿐이다. `renderers/pdf.js`, `svg.js`, `svgSerialization.js`, `transitionScene.js`, `mcp/*`, 대부분의 `core/*`에는 family/file floor가 없다. `core/ChartProgram.js`, `core/programState.js`, `core/materializationState.js`, `core/extensionRegistry.js`도 파일별 floor가 없다. [test/README.md:104–108](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/README.md:104)은 새 policy/renderer가 floor를 벗어나지 않는다고 설명하므로 현 정책의 보호 범위를 과대 표현한다.

**재현:** `evidence/infra-source-policy.json`에 595/137 inventory와 unfloored boundary 목록, 새 SVG/PDF/MCP/selector/core 파일에 자동 floor가 생기지 않는 결과를 저장했다.

**개선/완료 기준:** state, selectors, 모든 backend, inspection/scene/MCP 경계별 risk policy를 명시하고 자동 family 매칭 및 stricter override를 검사한다. 현재 baseline을 측정한 뒤 floor를 정한다. 기존 코드의 테스트가 없다는 주장과 구분한다. 해당 경계에 새 파일을 추가하는 policy unit fixture가 각각 floor를 받아야 한다.

### INF-03 / P2 — 기본/unit suite의 Chromium 전제와 안내가 어긋난다

**근거:** [test/README.md:3–7](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/README.md:3)은 바로 `npm test`를 제시하고 `:41–43`은 browser/resource tests가 별도라고 설명한다. 하지만 [test/unit/support/failure-artifacts.test.js:104–116](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/unit/support/failure-artifacts.test.js:104)은 Chromium을 launch한다. [test/docs/interaction-regressions.test.js:8–10](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/docs/interaction-regressions.test.js:8) 이하도 8개 browser tests를 default/coverage에 포함한다. CI는 Chromium을 설치하므로 CI green만으로 clean local setup 문제를 발견할 수 없다.

**재현:** 빈 `PLAYWRIGHT_BROWSERS_PATH`로 unit failure-evidence case를 실행하면 executable missing으로 실패한다 (`evidence/infra-clean-browser.log`). 기존 설치물을 제거하지 않았다.

**개선/완료 기준:** browser-dependent tests를 browser suite/resource capability로 분리하거나 default suite의 prerequisite를 명시하고 preflight를 제공한다. `npm ci` 직후 documented default command가 실행되거나 필요한 설치 command를 명확히 안내해야 한다. resource-missing을 조용히 skip해서 green으로 만들지는 않는다.

### INF-04 / P2 — release workflow contract가 실행을 검사하지 않고 문자열 존재를 검사한다

**근거:** `test/contracts/release-workflow.test.js:44–64,89–115`는 command의 문자열/순서와 일부 regex를 검사한다. 필수 step의 `if` 조건이나 run의 실제 executable form은 검증하지 않는다.

**재현:** 독립 test copy의 읽은 workflow 문자열에서 `Run unit, acceptance, and contract tests` step에 `if: ${{ false }}`를 넣어도 **9/9 tests 통과** (`evidence/infra-release-skip-mutant.test.mjs`, `.log`). 해당 command를 `echo 'node scripts/run-check.js test -- npm test'`로 바꿔도 9/9 통과했다 (`infra-release-command-mutant.*`). 저장소 workflow는 수정하지 않았다. 현재 release workflow의 실제 skip은 발견하지 않았다.

**개선/완료 기준:** YAML을 구조로 읽고 필수 job/step identity, command, gating condition, matrix 및 needs edge를 검사한다. 필수 step 삭제·skip·echo 치환·`continue-on-error`·잘못된 candidate 의존성 등 소수의 mutation fixture가 모두 실패해야 한다. 명령 전체를 brittle snapshot으로 고정하는 대신 검증하려는 실행 속성을 검사한다.

### INF-05 / P2 — Windows 기본 테스트에서 경로 포맷이 깨지는 지점이 있다

**확정된 정적 원인:** [test/unit/support/test-sharding.test.js:11](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/unit/support/test-sharding.test.js:11)은 slash-normalized timing JSON key와 native `path.relative`를 비교한다. `:17`도 그 native 경로로 JSON을 인덱싱한다. Windows에서는 `contracts\\…`이 되어 비교가 실패하고 timing lookup은 undefined가 된다. production [scripts/test-sharding.js:15](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/test-sharding.js:15)는 이미 separator normalization을 한다.

**재현:** `path.win32.relative`로 동일 key lookup을 수행한 `evidence/infra-windows-path.log`에 undefined를 기록했다. Windows 머신에서 full suite를 실행한 결과는 아니다.

**추가 portability 위험:** 62개 test 파일이 `spawnSync(path.join(root, 'node_modules/.bin/tsc'), …)`를 직접 사용한다. 예: [test/contracts/distribution-color-facade-types.test.js:31–35](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/distribution-color-facade-types.test.js:31). [test/contracts/source-data-types.test.js:51–54](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/source-data-types.test.js:51)처럼 `process.execPath` + compiler JS entry를 쓰는 기존 안전한 패턴과 불일치한다. 이 부분의 native Windows 실패는 별도 실행 확인이 필요하다.

**왜 CI에서 안 보이나:** [.github/workflows/ci.yml:189–208](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/.github/workflows/ci.yml:189)의 Windows/macOS job은 `test:platform` package smoke만 실행한다.

**개선/완료 기준:** test-side JSON path key도 canonical slash 형식으로 통일한다. compiler launch helper를 하나로 합친다. Windows에서 discovery/sharding/type harness focused contract를 실행한 뒤 플랫폼 full suite 지원범위를 명시한다.

### INF-06 / P2 — platform qualification의 native backend 버전이 움직인다

**근거:** [scripts/test-platform-package.js:10–11](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/test-platform-package.js:10)이 bare `@napi-rs/canvas`를 새 temporary consumer에 설치한다. [scripts/package-consumer.js:5710–5715](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/package-consumer.js:5710)도 committed lock 없이 declared peer range를 새로 resolve한다. repo의 `npm ci`로 설치한 버전과 consumer 버전이 같다는 보장은 없다. platform receipt `:61–65`에는 ggaction identity만 있고 resolved native backend identity가 없다.

**영향:** 동일 commit 재실행 결과가 registry의 새 backend release에 따라 달라질 수 있다. peer compatibility 테스트 자체는 유익하지만 재현 가능한 baseline과 분리되지 않았다. 실제 현재 dependency incompatibility를 재현한 것은 아니다.

**개선/완료 기준:** 최소/고정 baseline dependency fixture를 lock하고 최신 compatible backend 검증을 별도 matrix로 둔다. receipt에 resolved peer version, OS/arch, browser version, lock/hash를 남긴다. 최소한 platform install은 declared peer policy를 따르게 한다.

### INF-07 / P2 — 성공 coverage의 상세 evidence가 사라지고 critical-floor failure도 원본 report를 잃는다

**근거:** [scripts/run-tests.js:190–205](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/run-tests.js:190)는 full stdout을 메모리에 모았다가 성공 시 one-line summary만 출력한다. global threshold는 통과했지만 `assertCriticalCoverage`가 실패하면 `:199`에서 throw되어 원본 stdout도 기록되지 않는다. [.github/workflows/ci.yml:280–292](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/.github/workflows/ci.yml:280)은 failure artifacts만 업로드한다.

**이번 관찰:** 새 full coverage run의 `evidence/infra-coverage.log`에도 line/branch/function summary만 남았다. per-file uncovered lines, testcase count/duration, coverage JSON/LCOV가 없다. 원인 조사·threshold 근거·coverage change review를 위해 매번 expensive run을 다시 해야 한다.

**개선/완료 기준:** structured coverage와 full report를 `.artifacts/coverage/<run>/`에 먼저 저장하고 console은 summary로 유지한다. 성공/실패 모두 artifact identity와 source commit/runtime을 기록한다. critical-only failure fixture에서도 전체 report가 보존되어야 한다. 10MiB stdout buffer 한도에 도달하는 실패도 구별해 보고한다.

### INF-08 / P2 개선 — 일반 runner/job의 시간·취소 경계가 없다

**근거:** [scripts/run-tests.js:190–195](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/run-tests.js:190)의 spawnSync에는 timeout이 없고 `testRunnerArguments:148–167`에 default per-test timeout이 없다. [scripts/run-check.js:18–34](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/run-check.js:18)는 child close를 무기한 기다리며 timeout/cancellation forwarding 정책이 없다. CI/release workflow에도 명시적 job timeout-minutes가 없다. 일부 realistic isolation tests에는 별도의 상세 timeout/kill 검증이 있으나 일반 runner에 공통 적용되지는 않는다.

**영향/제한:** 이번 실행에서 hang은 없었다. 소켓·browser·native child가 닫히지 않을 때 실패 진단과 잔여 프로세스 정리가 외부 runner 제한에 의존한다는 resilience gap이다.

**개선/완료 기준:** suite별 현실적인 deadline, graceful SIGTERM→bounded SIGKILL, descendant cleanup 및 timeout receipt를 정의한다. 실제 hanging child fixture로 timeout 반환·원래 실패 보존·잔여 child 없음·bounded evidence를 검사한다. corpus 전체에 짧은 획일 timeout을 적용하지 않는다.

### INF-09 / P3 — coverage parser가 malformed metric을 fail-open 처리한다

**근거:** [scripts/coverage-policy.js:263–279](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/coverage-policy.js:263)에서 metric regex가 optional이다. line만 있는 row는 branch/functions가 NaN이 되며 `:296–300`의 `<` 비교는 false다.

**재현:** `# src | | | |\n#  fake.js | 100 | | |`를 넣고 세 metric floor100을 검사하면 통과한다 (`evidence/infra-coverage-parser.log`). 정상 Node report에서 NaN을 관찰한 것은 아니다.

**개선/완료 기준:** file row의 세 metric이 모두 finite, 0..100인지 검증하고 malformed/missing/duplicate row를 거부한다. malformed floor config도 검사한다. TAP/spec format fixture와 실제 supported Node output fixture를 함께 둔다.

### INF-10 / P3 — 잘못된 capability가 다른 selector에 가려질 수 있다

**근거:** [scripts/run-tests.js:117–119](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/run-tests.js:117)의 `selectors.some` 내부에서만 unknown capability를 검증한다 (`:94–102`). 앞 selector가 모든 file에 match하면 후속 unknown selector는 평가되지 않는다.

**재현:** `collectTestFiles('all', undefined, ['unit','contracts','charts','docs','gates','capability:does-not-exist'])`는 오류 없이 957개를 반환한다. unknown selector만 전달하면 올바르게 실패한다 (`evidence/infra-selector.log`).

**개선/완료 기준:** file filtering 전에 모든 selector를 parse/validate한다. valid+invalid 순서 및 exact-file/path/chart/capability 조합의 CLI integration cases를 추가한다. 사용되지 않은 typo selector를 report하는 정책도 명확히 한다.

### INF-11 / P3 개선 — shard performance guard가 단일 과거 측정과 파일 단위에 묶여 있다

**근거:** [test/realistic-timings.json:3–5](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/realistic-timings.json:3)의 기본값은 과거 Ubuntu per-test duration 합이고 후속 key들은 macOS 측정으로 수정되었다. [scripts/test-sharding.js:15–23](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/test-sharding.js:15)는 파일을 쪼개지 않고 duration 합 기준으로 나누며, 실제 runner는 shard 내부 concurrency2다. 최대 파일의 기록값은 945,678ms이다. 전체 weight 합/분할은 `evidence/infra-sharding.json`에 있다. 이 값은 이번 실측 wall time이 아니다.

**개선/완료 기준:** CI per-file wall time·메모리·실패율을 지속 수집하고 동일 runtime/platform 기준 median/p95로 scheduling baseline을 갱신한다. 큰 test module은 capability/isolation contract 경계로 나눈다. [test/unit/support/test-sharding.test.js:18](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/unit/support/test-sharding.test.js:18)의 현재 timing에서 이전 round-robin보다 반드시 빠르다는 assertion 대신 합리적인 imbalance/capacity contract를 검토한다. exhaustive/disjoint 검증은 유지한다.

## 별도 확인이 필요한 운영 항목

- CI에는 realistic 전용 stable aggregate가 있고 release에는 전체 aggregate가 있다. PR CI 모든 matrix job의 stable aggregate와 branch-protection required-check 설정이 일치하는지는 이번 local-only audit에서 확인하지 않았다. 현재 merge protection이 약하다고 단정하지 않는다.
- package `engines >=20`, CI package matrix20/22/24, full source suite20, coverage22의 역할을 명시하고 local runner의 Node preflight를 제공할 수 있다. 이번 coverage 결과는23.5.0이므로 CI-runtime 재실행을 대체하지 않는다.
- source/docs/coverage/package qualification 사이의 중복 실행은 비용과 runtime 다양성의 tradeoff다. 먼저 per-phase wall time을 기록한 뒤 docs browser prerequisite와 types compiler 중복 비용을 줄인다. 단순히 default/coverage를 하나 제거하는 방향은 권하지 않는다.

## 제안 우선순위

1. INF-01/02/04: 검증 누락을 green으로 받아들일 수 있는 coverage/workflow enforcement부터 수정한다.
2. INF-03/05/06: clean checkout과 Windows 및 dependency 재현성 문제를 바로잡는다.
3. INF-07/08: 상세 evidence·timeout·취소 처리를 공통 runner에 둔다.
4. INF-09/10/11: parser/selector edge cases와 측정 기반 sharding을 보강한다.

현재 검사 결과가 높다는 점과 위 취약점은 양립한다. 새 full coverage는 통과했지만, coverage 수치가 source inventory completeness, assertion quality, workflow execution, clean-environment portability를 대신하지는 않는다.
