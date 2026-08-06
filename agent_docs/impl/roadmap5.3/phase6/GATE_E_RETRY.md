# Gate R53-P6-E-Retry — Corrected One-Run B/C Paid Smoke

## Gate state

`changes-requested`

Approved by the user on 2026-08-07.

Candidate behavior checkpoint: `060a13f1017485f2a19579ef640a768b86a63417`

Remote branch: `origin/codex/roadmap5-3-llm-friendly`

## 왜 별도 승인이 필요한가

첫 Gate E 실행은 B의 function schema를 provider가 model execution 전에 거부해 token과 비용이 0이었고, C는
시작되지 않았다. 비용이 없었더라도 승인된 B 요청 한 번은 이미 사용했으므로 같은 승인을 재사용하지 않는다.

수정은 공개 검색 계약을 바꾸지 않는다. 선택적인 `limit`는 계속 선택 사항이며, B의 structured search와 C에서 실제
MCP discovery로 얻은 search tool만 OpenAI에 non-strict schema로 전달한다. 모든 property가 required인 도구는 strict
상태를 유지한다.

## Exact retry scope

| 항목 | 고정값 |
| --- | --- |
| Task | `cars-scatter-origin` |
| Repetition | `r1` only |
| Conditions | B once, then C once |
| Maximum runs | 2 |
| Candidate commit metadata | `060a13f1017485f2a19579ef640a768b86a63417` |
| New isolated output root | `.artifacts/llm-eval/corrective-smoke-retry-060a13f1/` |
| Expected combined cost | $0.144 |
| Calculated token maximum | $0.312 |
| Hard caps | B $0.20 / C $0.20 / combined $0.40 |

Model, reasoning effort, verbosity, service tier, corpus, task, oracle, validation threshold, model-call limit, MCP-call limit,
token ceiling과 180초 timeout은 원래 [`GATE_E.md`](./GATE_E.md)와 동일하다.

## 승인 뒤 실행 순서

1. 기존 smoke plan과 첫 실행 evidence를 수정하지 않는다.
2. 위 candidate SHA와 새 output root만 허용하는 별도 retry plan/guard를 추가한다.
3. Credential read 전 scope/hash/cap/output-root 검증과 mocked B→C stop behavior를 테스트한다.
4. 전체 테스트와 `knowledge:check`를 통과한 retry guard checkpoint를 commit·push한다.
5. B를 한 번 실행하고 provider/model/hash/cap/timeout 오류가 없을 때만 C를 한 번 실행한다.
6. 두 trace, validation, token, elapsed time과 actual cost를 제출하고 full rerun 진입 여부를 다시 판단한다.

## Retry 통과 조건

- B와 C의 resolved model이 정확히 `gpt-5.6-terra`다.
- Provider, budget, timeout 오류가 없다.
- 각 trace가 `search_ggaction → exact read → submit_program`을 세 model call 안에 보인다.
- Search와 exact read는 각각 한 번이며 C의 MCP call은 8회를 넘지 않는다.
- B와 C 모두 `finalValid: true`이고 renderer evidence가 non-empty다.
- Sanitized evidence에 credential, raw provider response, reasoning, 전체 knowledge source 또는 submitted source가 없다.

하나라도 실패하면 즉시 중단하고 full rerun을 제안하지 않는다. 성공하더라도 48-run 성능 개선을 입증한 것은 아니므로
correctness/efficiency benefit claim은 금지한다.

## 이 승인이 포함하지 않는 범위

- 48-run B/C full rerun
- PR Ready 전환, merge 또는 main 검증
- Package publish, docs deployment 또는 release
- Correctness/efficiency benefit claim

## 승인 효과

명시적으로 승인하면 위 retry plan/guard의 무과금 구현·검증과, guard checkpoint push 뒤 B/C 각 한 번의 API 실행을
합계 최대 $0.40 범위에서 허용한다.

이 Gate는 승인되었으며 위 범위만 해제되었다.

## 실행 결과 — 2026-08-07

Retry guard checkpoint `ac0e0576b1539833661301cfd20661db4ffd5a63`을 push한 뒤 승인된 B와 C를 각각 한 번
실행했다. Provider schema, model identity, timeout과 spend guard는 모두 통과했고 두 조건 모두 정확한 검색과 recipe
read 뒤 program을 제출했다. 그러나 두 program 모두 실행 가능한 결과가 아니어서 이 Gate의 통과 조건을 충족하지 못했다.

| 항목 | Condition B | Condition C |
| --- | ---: | ---: |
| Run ID | `B-cars-scatter-origin-r1` | `C-cars-scatter-origin-r1` |
| Call sequence | search → recipe read → submit | search → MCP resource read → submit |
| Model calls | 3 | 3 |
| MCP calls | 0 | 3 |
| Input / output tokens | 5,807 / 995 | 5,066 / 1,028 |
| Total tokens | 6,802 | 6,094 |
| Actual cost | $0.0188860 | $0.0185933 |
| finalValid | false | false |
| Failure | runtime error | runtime error |
| Renderer evidence | none | none |

- Actual combined spend: **$0.0374793** / approved $0.40
- Observed combined command wall time: approximately 25.75 seconds
- Time-to-valid: both `null`
- Resolved model: both exactly `gpt-5.6-terra`
- Full rerun decision: **blocked; do not propose or execute**

두 제출 모두 존재하지 않는 `renderCanvas`를 `ggaction/basic`에서 import했다. Renderer import만 현재의 정확한
`chart, render` contract로 바꿔 offline 재평가하자 B는 지원되지 않는 `createScatterPlot({ xLabel })` option에서,
C는 color 대신 `encodeGroup`을 적용한 뒤 `path mark requires an eligible layer`에서 각각 다시 실패했다.

### 판정

이번 교정으로 B의 structured tool과 C의 discovered MCP tool은 모두 실제 provider schema를 통과했고, 두 조건은
`scatterplot` recipe를 정확히 찾아 읽었다. 따라서 search와 MCP transport correction은 효과가 있었다.

남은 병목은 self-contained recipe payload다.

1. Recipe payload는 Canvas renderer의 정확한 function name과 package entry를 제공하지 않는다.
2. Minimal example은 x/y만 보여 주고 요청된 color와 labeled-guide option shape를 실행 코드로 보여 주지 않는다.
3. Supporting action 목록의 `encodeGroup`은 “Origin으로 색칠” 요구에 필요한 `encodeColor`를 대신할 수 없다.
4. Frozen 3-call limit은 search, read, first submission에 모두 사용되므로 invalid submission 뒤 repair 기회가 없다.

3-call limit이나 공통 evaluator prompt를 지금 바꾸면 frozen A/B/C axis가 달라진다. 다음 교정은 평가기를 유리하게
바꾸는 방식이 아니라, B/C가 전달하는 recipe를 정확한 runtime import와 흔한 variant까지 포함한 완결된 executable
knowledge로 만드는 방향이어야 한다. 이 무과금 교정은 이후 [`GATE_F.md`](./GATE_F.md)에서 별도 승인되었으며, 추가
paid retry는 여전히 승인되지 않았다.

### 봉인된 실행 증거

- B result: `50285b816747aca56aef38a4f1b72d1a3ad93118a0a64fb292d3cd0da54e1635`
- B sanitized trace: `a453bc4867fa96e90bceddbccb007cf514851826c1a142090e9c448c6bd55e37`
- B submitted program: `ae310d6e868c8bea003f85ffbe01bd48463814967b86621831503b22c82114e3`
- B validation: `959040cc2ebd11357ec7972898aa5c11f98fd234b4831a8e5fc6e93b319c9394`
- C result: `c70694d0e7388f282e0ab9f523ebab995299bab4767f717e8748ab4d34ab6289`
- C sanitized trace: `c4d5adf33a48773f5191755d7ce8440222eb96a8dd868f1460c05b3093407765`
- C submitted program: `6230ff9d085f3f553dd7a52ab0c4b3c970d735a179769affacca41b53a3c18c3`
- C validation: `959040cc2ebd11357ec7972898aa5c11f98fd234b4831a8e5fc6e93b319c9394`
- Evidence root: `.artifacts/llm-eval/corrective-smoke-retry-060a13f1/`
