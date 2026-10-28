# Private local quadratic checkpoint

## 진행 상태

- [x] 선택된 이웃과 가중치만 사용하는 순수 2차 국소 회귀 계산
- [x] 기존 polynomial linear solve의 동일 연산·rank 정책 재사용
- [x] quadratic/line literal, scale/translation, ties/singular/zero weight, overflow/work/immutable 시험
- [x] focused·critical coverage·discovery/source/package boundary 및 bundle 검증
- [ ] LOESS degree2 공개 normalization·fit/robust/predict dispatch 통합
- [ ] facade/edit/revise/types/current contract 및 STEP-014 전체 종료

상태는 **private math 준비 완료, 공개 degree2 통합 미완료**다.
실행 승인은 [전체 계획 승인](../../AUTHORIZATION.json)을 재사용한다.
Branch는 `codex/roadmap9-statistics`, 직전 pivot checkpoint는 `933597d6358d16a7142af45d4106495d5a4b4f69`다.
Main source freeze를 유지하면서 격리 worktree에서 수행했다.

## 내부 책임

`predictLocalQuadratic(points, xValue)`는 이미 선택한 `{x,y,weight}` 배열과 finite prediction x를 받는다.
모든 x/y와 non-negative weight를 zero-weight 행까지 검증하고 accessors를 실행하지 않는다.
Positive weight가 하나 이상 필요하며, 전부0인 residual neighborhood에서 ordinary distance weights를
복원하는 결정은 기존 LOESS caller가 소유한다. 이 함수가 이웃을 다시 고르거나 범위를 늘리지 않는다.

Prediction x를 중심으로 x를 정규화하고 y/weight 크기도 정규화한 normal equations를 계산한다.
공유 `trySolveLinearSystem`의 partial pivoting과1e-12 rank 기준을 사용한다. Singular이면 같은 이웃의
weighted constant mean을 반환한다. 유한 extreme input과 representable result를 구분하고 결과 overflow는 오류다.
Work는 descriptor table이나 moment vectors를 만들기 전에 `points.length * 32 + 27 <= 10,000,000`을 검사한다.
후속 LOESS integration은 전체 group/robust/prediction 호출의 누적 work도 기존 owner에서 사전 검사해야 한다.

기존 polynomial solve의 행 연산 순서와 singular 오류 문자열은 보존했다. 현재 LOESS degree1 함수는
수정하지 않았고 기존 public parameter normalizer는 여전히 LOESS degree2를 거부한다.
새 함수는 공개 entry/type에 노출하지 않는다. Runtime tests는 roadmap 파일을 import하지 않는다.

## 독립 expected와 검증

- `2*x*x - 3*x + 4`, `2*x + 1`을 nonuniform positive weights로 fit하고 translated/scaled x에서도 직접 수식과 비교한다.
- 점 `(-1,0),(0,0),(1,0),(2,4)`의 독립 normal-equation 해는 `-3/5 + x/5 + x*x`다.
- x tie 또는2점 local rank 부족에서 y2/y8, weights1/3의 constant fallback은6.5다.
- 거의 singular인 scaled design의 fallback과 정확한1e-12 pivot 경계, row pivot 교환을 따로 검증한다.
- Positive duplicate x, residual weight0 outlier, 모든 weight0 오류와 caller의 기존 robust fallback 시험을 함께 실행한다.
- 최대범위 x 차이 overflow를 scale 경로로 처리하고 큰 y의 representable/nonrepresentable prediction을 구별한다.

환경은 Node22.23.1/npm10.9.8이다. `.artifacts/validation/local-quadratic/`에 로그와 hash manifest를 보존한다.

| 명령 | 결과 |
| --- | --- |
| `node scripts/run-tests.js unit unit/grammar/local-quadratic.test.js unit/actions/data/robust-loess.test.js unit/actions/data/regression-data.test.js` | 28 passed: 신규8 + 기존20 |
| `node scripts/run-tests.js contracts contracts/test-discovery.test.js contracts/source-boundaries.test.js` | 25 passed |
| `node scripts/run-tests.js contracts contracts/package-artifact.test.js contracts/package-boundaries.test.js` | 13 passed |
| `node --test --experimental-test-coverage --test-coverage-include=src/grammar/regression/linearSystem.js --test-coverage-include=src/grammar/regression/localQuadratic.js --test-coverage-lines=90 --test-coverage-branches=75 --test-coverage-functions=100 test/unit/grammar/local-quadratic.test.js test/unit/actions/data/robust-loess.test.js test/unit/actions/data/regression-data.test.js` | 28 passed; 두 신규 module 각각100/100/100 |
| `npm run package:check` | 681entries; packed1,012,717/unpacked4,722,952bytes |
| `npm run package:bundle` | Full507,618/Basic285,702gzip bytes; 기존 한도 통과 |

새 두 module은 기존 regression-grammar family의90/75/100 floor를 자동으로 상속한다.
별도 완화나 coverage exclusion은 없다. Parser를 통한 per-file critical floor 검사도 통과했다.
이 결과는 전체 source coverage, realistic corpus 또는 공개 degree2 lifecycle 통과를 뜻하지 않는다.
