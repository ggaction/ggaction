# Phase 4 Local Evaluation Harness Report

## 결과

기존 Condition A runner의 provider request, program submission, execution, scoring, repair, budget와 result assembly를
`condition-runner.js` 한 곳으로 이동했다. A/B wrapper는 knowledge adapter만 주입한다.

| Shared envelope | A/B 공통 여부 |
| --- | --- |
| Task prompt, dataset fields and 640×400 authoring constraints | 동일 |
| Model, reasoning, verbosity, service tier and storage setting | 동일 |
| Input/output token, model-call, knowledge-call, timeout and spend limits | 동일 |
| Program sandbox, executor, renderer, oracle and failure categories | 동일 |
| Submission feedback, repair loop and result schema | 동일 |

Condition 차이는 아래 bounded knowledge surface뿐이다.

| Condition | Mode | Tools | Knowledge owner |
| --- | --- | --- | --- |
| A | `current-docs` | `search_docs`, `read_doc` | starting commit public docs |
| B | `structured-knowledge` | `search_ggaction`, `read_ggaction` | exact supplied 40-character implementation commit |

두 condition 모두 같은 `submit_program` tool을 사용한다. B search는 기본 six bounded results를 반환하고 read는 exact
action/recipe/docs ID만 받는다. B에서 A의 `read_doc`을 호출하면 adapter가 거부한다. `mcpCalls`는 A/B 모두 0이며 Phase 5
Condition C만 실제 MCP call을 기록한다.

## 비용 없는 재현성 증거

| Evidence | Result |
| --- | ---: |
| Synthetic Condition A tasks | 24/24 schema/oracle passed |
| Synthetic Condition B tasks | 24/24 schema/oracle passed |
| Total local dry results | 48/48 passed |
| Mocked Condition A executable submission | first-pass success |
| Mocked Condition B knowledge calls | search + exact action read |
| Mocked Condition B submissions | incomplete first pass + corrected second pass |
| Mocked B final result | final valid, 3 model calls, 1 repair, 0 MCP calls |
| External provider/model calls | 0 |
| Actual spend | $0.00 |

Mocked B flow도 실제 Cars dataset과 package source를 사용해 program을 실행하고 Canvas artifact를 생성한다. 첫 program은
요청한 categorical color를 빼 oracle validation에 실패하고, 같은 runner가 feedback을 다음 model input에 넣은 뒤 두 번째
program에서 `createScatterPlot`의 color와 guides를 완성해 통과한다.

## Condition A compatibility

- Compatibility `condition-a-runner.js` entry와 existing `run-condition-a.js` import는 유지된다.
- Run ID `A-<task>-r<repetition>`, starting commit, `current-docs` mode와 public docs routing text는 유지된다.
- A tool names/schema/order, model request fields, evaluator와 result schema는 유지된다.
- Existing mocked A execution test가 같은 first-pass result, tokens와 renderer evidence로 통과한다.

## 검증과 경계

- `npm run test:contracts`: 200/200 passed.
- `npm run knowledge:check`: combined/search generated drift 없음.
- `npm run package:check`: package bytes/boundary passed; harness와 knowledge는 Phase 4 publish files가 아니다.
- Token file/API key normalization과 no-log tests: passed.
- Condition B는 exact supplied commit 없이는 시작할 수 없다.
- MCP SDK, Condition C adapter, package bin/files/dependency와 paid B/C execution은 추가하지 않았다.
