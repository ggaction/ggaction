# LOESS degree2 public checkpoint

## 진행 상태

- [x] 공통 parameter normalization과 fit/robust/prediction dispatch
- [x] Degree1 결과·저장 shape 보존, degree2 local rank fallback과 누적 work preflight
- [x] 독립 quadratic oracle, finite/scale/tie/robust/empty 경계와 immutable lifecycle
- [x] Types·Current·reference·complete example와 generated documents
- [x] Focused69개, regression coverage107개, source/contracts50개, docs160개
- [x] 마지막 shared neighbor-count 추출 후 coverage와 source 증거 고정
- [x] Installed package189개·complete snippet65개·types/MCP/optional peers/bundles
- [x] Docs desktop search와 전 페이지320/390/768px browser 검증
- [x] 마지막 built docs 및 commit 후 provenance 고정
- [x] Verified conceptual checkpoint commit/push
- [ ] 나머지 STEP-014 통계 oracle evidence와 전체 STEP-077 실행

전체 실행 승인은 [AUTHORIZATION](../../AUTHORIZATION.json)을 재사용한다. 새 visual target 없이 기존
regression fit 옵션을 확장하며 renderer와 line primitive는 그대로다. 기준은 pivot checkpoint의
`aecab35eb1010dff6d4d13c70c03e02ab17f084c`, branch는 `codex/roadmap9-statistics`다.
Main/G-DATA worktree의 파일을 수정하거나 복사하지 않았다. 이 기록은 전체 STEP-014 또는 Roadmap9 완료가 아니다.
구현 source commit은 `1059ba42282d5d2b95782f66a054448b844e69e8`다. 이 commit으로 provenance를 고정한 뒤
docs160개와 build150페이지·1182 selective LLM artifacts/identity hashes를 다시 검증했다.
UI와 문서 내용은 동일하므로 먼저 완료한 browser sweep을 재사용한다.

## 구현 경계

`grammar/regression/parameters.js`가 LOESS degree1/2를 검증한다. 생략/1은 기존 parameter와 transform에서
degree를 생략하고2만 저장한다. `models.js`의 기존 이웃 선택과 tricube/residual weight 계산 뒤2만
private local quadratic kernel을 호출한다. 기본 local-linear 연산은 그대로다.

Fit과 work preflight는 같은 neighbor-count policy를 소비한다. 누적 preflight는 기존 sorting 작업에
각 quadratic fit의 descriptor/value 검증, moments와 solve 비용까지 더한다. Private kernel의
`32*neighborCount+27` 계산은 같은 owner에서 공유한다. Robust early stop 여부를 추측해 한도를 줄이지 않는다.
공개 옵션·특이행렬 처리·정확 한도는 [Current CORE](../../../../contract/current/CORE.md#createregressiondata),
표시 계층은 [Current STATISTICS](../../../../contract/current/STATISTICS.md#createregression)가 소유한다.

Pure private kernel은 이미 [이전 checkpoint](LOCAL_QUADRATIC.md)에서 검증했다. 이번 변경은 새로운
resource, generic compiler, renderer 분기를 만들지 않고 기존 explicit regression materialization을 재사용한다.
Focused derived editor는 method 전환 때 이전 degree를 제거하고 선택한 method의 기본값 또는 명시 degree를 쓴다.
Facade와 follow-source는 기존 parameter owner와 immutable revision을 재사용한다. Basic 미지원 경계는 유지한다.

## 독립 수치·소비자 증거

- Literal `2*x*x-3*x+4`와 `2*x+1`을 observed/novel prediction 위치에서 비교한다.
- `test/oracles/loess-quadratic.js`는 production import 없이 unscaled normal system의 Cramer determinant를
  사용한다. Production의 scaled partial pivot solver와 독립이며 literal interpolation으로 anchor한다.
- x의 이동·1e±150 scaling, y scaling, full finite x range, frozen input, grouped ordering을 검증한다.
- 최소2행·varying x, grouped empty와 ungrouped empty, tied source order, rank-deficient weighted constant,
  robust zero-weight fallback, 최종 residual weights의 prediction grid 적용을 따로 검증한다.
- 기존 ordinary/robust degree1 결과와 model/transform shape를 deep equality로 보존한다.
- Data create/generic materialize/edit/revise, method reset, facet source partition, facade/follow-source,
  restored edit, missing diagnostics와 malformed stored degree rejection을 검증한다.
- 기존 line geometry를 Canvas/SVG/PNG/PDF/scene 설치 package 소비자로 검증한다.

Runtime tests는 roadmap 파일을 import하지 않는다. `.artifacts/validation/loess-degree/`가 명령 로그,
oracle expected/actual, source/log hashes와 package receipt의 owner다.

## 검증과 package 측정

환경은 Node22.23.1/npm10.9.8, 문서 preflight는 설치된 Ruby3.3.12다. 별도 의존성 설치는 없었다.
기본 Ruby 대신 `PATH="/opt/homebrew/opt/ruby@3.3/bin:$PATH"`를 문서 preflight/build에 사용했다.

| 명령 | 결과 |
| --- | --- |
| `node scripts/run-tests.js unit`의 loess-degree/loess-lifecycle/robust-loess/regression-data/local-quadratic/create-regression/edit-regression/derived-editing 명시 파일 | 69 passed |
| `node --test --experimental-test-coverage`의 regression data/owner와 numeric invariant 명시 파일; 네 변경 regression grammar만 계측 | 107 passed |
| 같은 grammar의 자동 critical floor 검사 | 각90/75/100 기준 통과; 완화·exclusion 없음 |
| `node scripts/run-tests.js contracts`의 interval-regression-facade-types/source-boundaries/test-discovery/action-catalog/package-artifact/package-boundaries | 50 passed |
| `npm run docs:generate` 및 source 변경 뒤 provenance/images/machine/llms 재생성 | passed |
| `npm run test:docs` | 160 passed |
| `npm run docs:build`, `npm run test:docs:built` | 150 pages,1182 selective LLM artifact/hash/link 검사 통과 |
| `npm run test:docs:browser` | desktop 검색, 전 페이지320/390/768px 통과 |
| `npm run test:package` | installed node189/189, complete snippets65/65, types/MCP/optional peers/bundles 통과 |

최종 coverage(lines/branches/functions)는 derive98.23/97.25/100, models97.93/95.86/100,
parameters92.59/91.91/100, localQuadratic100/100/100이다. `critical-floor.json`이 per-file canonical floor를 검사한다.
`oracle-evidence.json`은 입력·expected·actual·diff와 각각의 SHA256, `1e-9 + 1e-9*max(abs(expected),abs(actual))`
tolerance 판정을 담는다. Source neutral 독립 oracle를 직접 실행했으며 roadmap JSON을 expectation으로 쓰지 않았다.

설치 artifact SHA256은 `ffc004976214003f37b0f4adbfdbd2b3694c092ee7d34d2a0ca7636463780914`다.
공식 staging 실측683entries/1,015,796packed/4,737,028unpacked bytes이며 entry/packed cap은683/1,016,000을
유지하고 unpacked만4,736,000에서 최소1,000bytes 경계4,738,000으로 올렸다. Full509,588, Basic285,851,
SVG8,111gzip bytes와 search857,752bytes는 기존510,000/286,000/25,000/858,000 한도 내다.

## 남은 통합

Parent가 최신 main parameter/v2와 G-DATA 변경을 통합하고 누적 package 한도를 다시 측정한다.
이 branch의 검증은 그 통합 또는 전체 source coverage/realistic corpus를 대신하지 않는다.
Pivot과 LOESS 공개 통합 이후에도 STEP-014의 공통 통계 oracle closeout, STEP-015 public calendar
completion/geometry와 STEP-077까지의 나머지 요구는 아직 미완료다.
