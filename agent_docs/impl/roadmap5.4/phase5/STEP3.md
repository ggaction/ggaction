# STEP 3 — Paid runner와 evaluator 경계 근본 수리

## 진행 상태

- [x] Attempt 5의 A/B/provider 실패를 서로 다른 경계로 분리
- [x] 과거 v5 source, result와 ledger 불변 보존
- [x] Responses API forced function `tool_choice` 기반 상태 머신 구현
- [x] 제품 renderer 예시와 evaluator wrapper 계약 분리
- [x] PNG/PDF literal output path를 실행 전에 분류하는 구조 검증 추가
- [x] missing/wrong function call을 provider protocol mismatch로 분류
- [x] task/global token, transport, call, cost cap 유지
- [x] 32 route / 8 canonical evaluator dry-run
- [x] focused 9 / 9, full 2,127 / 2,127, coverage critical floor 70 / 70
- [ ] R54-P5-I 승인 뒤 exact v6 paid smoke 1회 실행

## 원인 분리

### 1. A는 공개 문서 baseline의 관측 결과다

`final3-03-bars-png:A`는 검색과 문서 읽기라는 배정된 route를 지켰지만, 모델이 complete bootstrap 대신 action fragment를
골라 package namespace에 존재하지 않는 `Canvas` constructor를 발명했다. 이것은 runner 중단 원인이 아니라 공개 문서 route의
실제 authoring closure 약점이다. 실패를 본 뒤 검색 순위나 선택 URL을 바꾸면 비교를 사후 조정하게 되므로 v6는 A의 검색 결과와
모델 선택을 그대로 보존한다.

### 2. B는 제품 계약과 evaluator adapter 계약이 섞였다

Compact packet의 `renderToPNG(program, { output: "chart.png" })`는 일반 사용자가 출력 위치를 정하는 올바른 제품 예시다.
하지만 isolated evaluator는 자신이 허용한 임시 경로를 `renderChart(program, output)`의 두 번째 인자로 주입한다. v5 prompt가
`renderChart(program)`만 요구해 두 계약을 구분하지 않았고, 모델은 제품 예시의 literal 경로를 그대로 사용했다.

v6는 제품 packet을 바꾸지 않는다. 평가 prompt만 renderer별 wrapper를 exact하게 제공하고, evaluator가 다음 adapter 계약을
실행 전에 검사한다.

- Canvas — `renderChart(program, context)`
- SVG — `renderChart(program)`
- PNG/PDF — `renderChart(program, output)`과 동적 `{ output }`

### 3. 마지막 중단은 오케스트레이션 모순이다

v5는 모든 turn에 `tool_choice: "auto"`를 보내면서 function call이 정확히 하나여야 한다고 가정했다. `auto`는 메시지 응답도
허용하므로 이 둘은 동시에 참일 수 없다. v6는 route를 상태 머신으로 소유하고 매 turn 다음 function을
`{ "type": "function", "name": "..." }`로 강제한다. Knowledge search, optional resource read, 최초 submit, evaluator feedback 뒤
수정 submit이 각각 명시적 상태다. 강제 호출이 없거나 다른 호출이 오면 모델 실패가 아니라
`provider-protocol-mismatch`로 기록하고, 청구 usage를 먼저 보존한 뒤 중단한다.

Responses API의 특정 function 강제 형태는 [OpenAI tool guide](https://developers.openai.com/api/docs/guides/tools)와
[공식 openai-node 생성 타입](https://github.com/openai/openai-node/blob/main/src/resources/responses/responses.ts)의
`ToolChoiceFunction` 계약으로 확인했다.

## 변경 경계

| Owner | 역할 |
| --- | --- |
| `scripts/compact-paid-state-machine-v1.js` | forced route, usage ledger와 모든 실행 cap |
| `scripts/compact-full-evaluator-v2.js` | renderer별 evaluator wrapper preflight |
| `scripts/compact-paid-smoke-v6.js` | v6 prompt, route, dry-run, plan/auth/full-run 연결 |
| `scripts/run-compact-paid-smoke-v6.js` | Gate 승인 뒤에만 credential을 읽는 단일 실행 entry |
| `test/contracts/compact-paid-runner-state-machine.test.js` | Attempt 5 재현과 protocol/cap 회귀 |

제품 candidate `4e211ba4`의 `src`, `types`, `knowledge`, `docs`, `package.json`은 바뀌지 않았다. Attempt 5의
`IN_PROGRESS.json`, `ATTEMPT5.md`와 비용 ledger도 수정하지 않았다.

## 검증 결과

| 검증 | 결과 |
| --- | --- |
| Attempt 5 B literal output 재현 | isolated execution 전 `renderer-wrapper-contract` |
| 수정 turn route | `search_ggaction → submit_result → submit_result` 강제 |
| zero-call provider response | billed usage 보존 뒤 `provider-protocol-mismatch` |
| global call cap | 외부 request 전에 차단 |
| v6 dry-run | routes 32 / 32, canonical evaluator 8 / 8, spend `$0` |
| focused contracts | 8 / 8 |
| full suite | 2,127 / 2,127 |
| coverage | lines 94.75%, branches 90.26%, functions 98.43%, critical floors 70 / 70 |

## 남은 경계

R54-P5-I는 같은 8 tasks × A/B/C/D를 한 번만 다시 실행한다. Approval 전에는 credential read, external model call,
additional spend가 모두 차단된다. 이 Gate는 complete paid evaluation, 제품 변경, PR, merge, publish 또는 deploy를 열지 않는다.
