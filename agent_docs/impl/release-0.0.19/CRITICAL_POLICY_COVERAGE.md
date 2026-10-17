# 새 정책 모듈의 coverage 보호

## 범위

`test/contracts/AGENTS.md`의 새 고위험 정책/renderer 모듈 보호 규칙에 따라
legend grammar와 facet guide scaffolding에 자동 prefix family를 적용했다.
새 결합, 축, 용량/namespace, 부모 범례, graphic translation owner에는
기존 family보다 엄격한 명시적 floor를 적용한다. 기존103개 floor와 global94/89/98은 유지한다.

## 실제 누락 회귀

- Linked categorical order는 domain만 정렬하고 category별 물리 면적 대응을 보존해야 한다.
  잘못된 linked field/domain 및 비어 있거나 음수·비유한 면적을 거부하는 정책을 직접 검증했다.
- 합성된 point graphic에 서로 다른 raw owner가 중복되면 하나를 고르지 않고 진단 정보를
  포함해 거부해야 한다. 단일 child owner의 실제 row count와 Unicode namespace도 검증했다.
- 정책/규칙 unit8개 통과. 결합 정책95.56lines/90branches/100functions,
  graphic capacity100/100/100의 집중 coverage 통과. runtime 구현은 바꾸지 않았다.
- 이전 source28 전체 coverage는95.33/92.52/98.66 및 기존103개 floor를 통과했다.
  확장된 floor를 포함한 최종 전체 coverage는 별도 실행하며 이 기록을 그 성공으로 대체하지 않는다.

부모 color-size meaning 복원 뒤에는 semantic primitive owner에도95/90/100 floor를 추가했다.
기존 public composition guard를 넓히지 않는 좁은 private adapter의 잘못된 host/임의 key 거부,
원래 program 불변과 composition 보존을 추가 회귀로 검사했다. 관련28개 unit 통과이며
최종 전체 gate는133개 floor를 적용한다. 아래132개 raw 결과는 그 이전 입력의 증거로 보존한다.

## 통합 입력의 132개 floor 실행

- 입력: `a5634be5c4cf66e7530cd0b1707cf7457fcd7438` — `5827527e` 정책과
  `a188e0ff` 범례 외형 canonical 예제의 병합. Node22.23.1/npm10.9.8/macOS.
- `npm run test:coverage`가 사용하는 `collectTestFiles('coverage')`와
  `testRunnerArguments('coverage', files)`를 그대로 사용한 별도 `/tmp` orchestration으로
  전체 normal suite를 실행했다. 제품 runner나 policy를 수정하지 않았다.
  원래 `assertCriticalCoverage(raw)`를 동일 보고서에 적용했다.
- 총4,575개: 4,572PASS/3FAIL, skipped0/todo0, 185,671.808167ms.
  global95.33lines/92.54branches/98.68functions; **132개 critical floor 모두 PASS**.
- 실패3개는 source 동작 실패가 아니다. 새 `legend-layout`/`legend-recipe-opacity`
  owner가 아직 반영되지 않은 gallery inventory1개와, 완전 검색 payload830,598bytes가
  당시830,000bytes 예산을 넘긴 docs2개다. root가 소유한 최종 통합 검사에서 해결·재실행한다.
  이 실행을 전체 suite 성공 또는 최종 릴리스 완료로 표시하지 않는다.
- 신규 prefix/override 중 `grammar/facets/legendIntent.js`90.16/85.29/100,
  `materialization/facetGuides/ownerLayout.js`91.55/84.78/100,
  `materialization/facetGuides/placement.js`82.86/81.67/81.25가 비교적 좁은 여유로
  실제 floor를 통과했다. 모든 수치는 lines/branches/functions 순서다.
  colorSize grammar100/100/100, clip grammar100/100/100,
  clip materialization97.37/89.74/100, axis selector100/97.65/100도 확인했다.
- 기준 미달이 없으므로 추가 테스트나 runtime 변경은 하지 않았다. 기존103개와 확장132개
  기준/global94/89/98을 그대로 보존했으며, 실제 결함이 없는 성공 경로를 반복 검사해
  커버리지 숫자만 올리지 않았다.

### 원시 증거 및 재현

로컬 원시 증거:

- `/tmp/ggaction-integrated-28-critical-first.log` (전체 TAP 및 파일별 coverage)
- `/tmp/ggaction-integrated-28-critical-first.stderr.log` (빈 stderr)
- `/tmp/ggaction-integrated-28-critical-first-args.json` (정확한 executable/arguments)
- `/tmp/ggaction-integrated-28-critical-first-result.json` (132개 actual/floor 및 결과)
- `/tmp/ggaction-integrated-28-critical-first-v8/` (원시 V8 coverage, 약1.3GiB)

전체 raw log SHA256:
`bdf92af1f1bbdf5183ea8eb3d3bd66a290dffef55cc41e32755f0d56b5695557`.
`/tmp` 파일은 로컬 증거이며 원격 영구 artifact라고 주장하지 않는다.

제품 명령 `npm run test:coverage`로 같은 test set/정책을 재현할 수 있다.
raw report를 보존하려면 동일 tree에서 다음과 같이 실행한다(제품 코드 수정 없음):

```js
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { collectTestFiles, testRunnerArguments } from './scripts/run-tests.js';
import { assertCriticalCoverage } from './scripts/coverage-policy.js';
const args = testRunnerArguments('coverage', collectTestFiles('coverage'));
const run = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
writeFileSync('/tmp/ggaction-coverage.log', run.stdout);
writeFileSync('/tmp/ggaction-coverage.stderr.log', run.stderr);
if (run.error) throw run.error;
assertCriticalCoverage(run.stdout);
process.exitCode = run.status ?? 1;
```

## 통합 입력의 133개 floor 최종 선제 검증

위 132개 실행의 실패 원본과 판단은 그대로 보존한다. 아래는 gallery/search 동기화와
부모 color-size meaning 복원, private adapter 회귀 및 추가 floor를 반영한 별도 입력의 결과다.

- 입력: `f1fae3bd29831824b6af607554b332265b779bdd`, Node22.23.1/macOS.
  `collectTestFiles('coverage')`의 정상 테스트 837개 파일과
  `testRunnerArguments('coverage', files)`가 생성한 정확한 인자로 실행했다.
  Concurrency4 및 global lines94/branches89/functions98 기준은 그대로다.
  외부 `/tmp` orchestration이 전체 stdout/stderr를 보존한 뒤 원본
  `assertCriticalCoverage(raw)`를 같은 보고서에 호출했다.
- **4,585/4,585 PASS**, 실패·취소·skip0. TAP duration175753.716083ms,
  child 실행과 결과 수집을 포함한 wall time181100ms다. 프로세스 exit0, stderr0bytes다.
- 전체 coverage는 **95.35% lines / 92.58% branches / 98.68% functions**다.
  **133개 critical floor를 모두 통과**했다. 기존 기준을 내리거나 파일을 제외하지 않았다.
- 추가된 `actions/primitives/semanticAction.js`는99.45/97.34/100으로95/90/100 floor를 통과했다.
  `grammar/facets/legendIntent.js`90.77/88.64/100,
  `materialization/facetGuides/owner.js`97.6/88.14/100,
  `materialization/facetGuides/edit.js`93.33/92.31/100,
  `materialization/facetGuides/ownerLayout.js`91.55/84.78/100,
  `materialization/facetGuides/placement.js`83.56/83.08/81.25다.
  `materialization/graphicTranslation.js`100/100/100,
  `selectors/axes.js`100/97.65/100도 확인했다. 수치는 lines/branches/functions 순서다.
- 검사 중 제품 소스, runner, coverage policy, threshold 또는 fixture를 수정하지 않았다.
  최종19 tag의 별도 CI/release 검증을 이 선제 실행으로 대체하지 않는다.

### 보존한 원시 보고서

- `/tmp/ggaction-axes-release-coverage-stdout.log`: 전체 TAP와 파일별 coverage,1005144bytes.
- `/tmp/ggaction-axes-release-coverage-stderr.log`: 빈 stderr.
- `/tmp/ggaction-axes-release-coverage-invocation.json`: Node 버전,837개 정확한 파일·인자와133개 floor 수.
- `/tmp/ggaction-axes-release-coverage-summary.json`: 프로세스 상태, 시간, 전체 파일별 측정값과 원본 정책 판정.
- `/tmp/ggaction-axes-release-coverage.mjs`: 원본 보고서를 보존하고 정식 정책을 적용한 외부 orchestration.

stdout SHA256:
`8e747f6324ab3a047b379b5ce635a2887356e3c200157b1b55787089ed87bff9`.
이는 로컬 원시 TAP/coverage 보고서 보존이며, 원격 영구 artifact 또는 별도 원시 V8 계측 파일의
보존을 주장하지 않는다. 위 재현 코드 또는 제품 `npm run test:coverage`로 같은 검사를 실행할 수 있다.
