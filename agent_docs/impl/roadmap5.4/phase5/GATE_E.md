# Gate R54-P5-E — v3 Result and Candidate Repair Decision

## Gate state

`ready-for-review`

Canonical result: [`ATTEMPT3.md`](./ATTEMPT3.md).

Verified review checkpoint: `fd2aebf4f43930ae2fc8bb5cb4dd7b04195aec7b`.

## 결정이 필요한 이유

v3 smoke는 runner 오류 없이 16 / 16을 완료했지만 strict pass가 7 / 16이다. Compact direct와 MCP는 각각 3 / 4로 public
docs 0 / 4보다 나았지만, 공통 authoring scaffold와 fallback protocol이 불완전해 integration이나 full evaluation으로 갈 수
없다. 이제 failed output을 재분류하거나 benchmark prompt만 보강하지 않고, product knowledge contract를 causal repair할지
negative result로 종료할지 결정해야 한다.

## Options

### A — Repair the product knowledge contract, then revalidate unpaid (recommended)

다음 세 gap만 하나의 candidate repair로 닫는다.

1. Task packet authoring block이 exact ESM function wrapper, `chart()`, `createCanvas(...)`,
   `createData({ values: rows })`, selected domain steps, return과 renderer wrapper까지 complete submit-ready scaffold를 제공한다.
2. Canonical packet에 unresolved constraint에서 deterministic하게 파생된 bounded `fallbackResources` URI를 포함한다. Direct와
   local MCP는 새 packet도 byte-equal해야 하고, D는 packet에 적힌 URI를 search → read → submit 순서로 사용한다.
3. Public LLM docs에 root factory/data signature, task-focused complete example과 canonical unsupported IDs를 한 bounded
   searchable route로 제공한다. Search ranking fixture가 histogram, regression과 unsupported renderer query를 그 route로
   연결하는지 검증한다.

Corpus, task query, dataset, oracle, evaluator, model, 3-call limit과 v3 result는 바꾸지 않는다. Schema/version change, generated
knowledge, MCP, public docs, installed package와 browser budget을 함께 검증한다. 새 product candidate는 unpaid closure를 모두
통과한 뒤에만 별도 R54-P5-F에서 exact v4 plan/cost와 paid execution 승인을 요청한다.

장점은 세 실패 원인을 실제 사용자-facing knowledge surface에서 직접 고치며 docs/direct/MCP/fallback comparison을 공정하게
만든다는 점이다. 단점은 task packet public schema가 다시 바뀌고 package/docs evidence를 전부 갱신해야 한다.

### B — Repair compact packet and D only

Complete scaffold와 explicit fallback resources만 고치고 A docs 0 / 4는 intentionally weak baseline으로 남긴다. 범위는 작지만
docs failure가 verbosity 차이보다 missing contract에서 발생했기 때문에 correctness comparison이 계속 혼재된다. 권장하지 않는다.

### C — Tune only the evaluation prompt

Runner prompt에 exact `createData({ values: rows })`, canonical unresolved IDs와 D call order를 직접 넣는다. 가장 작지만 제품을
LLM-friendly하게 만들지 않고 evaluator가 답을 제공하므로 결과 해석을 훼손한다. 권장하지 않는다.

### D — Close as non-integration

v3의 7 / 16을 final negative result로 보존하고 Roadmap 5.4를 package/PR 변경 없이 종료한다. 추가 비용과 public contract 변경은
없지만 현재 확인된 causal knowledge gaps도 남는다.

## Option A unpaid acceptance

- Existing 173 exact actions와 fresh 48 tasks의 exact plan/authoring closure 유지
- Four fixed smoke tasks의 submit-ready source와 unsupported decision을 model call 없이 실행·검증
- A/D realistic 3-call mock가 correct route와 sanitized progress를 통과
- Direct/local-MCP complete packet byte equality
- Task packet ≤ 6,144 bytes, package/browser budgets와 installed local MCP 통과
- Public-doc search/read가 fixed four tasks의 필요한 bootstrap/identity를 닫음
- Attempt 1/2/3 plan과 result SHA immutable
- Full contract, public docs, package와 repository suites 통과
- External model calls / credential reads / spend 0 / 0 / `$0`
- Exact v4 source hashes, cost proof와 separate paid authorization Gate 준비

## Current review evidence

| Evidence | Result |
| --- | --- |
| v3 result/progress structural and ledger invariants | pass |
| Result credential/encrypted-state/local-path sanitization | pass |
| Attempt 1/2/3 immutable hash contracts | pass |
| Focused paid-runner contracts | 15 / 15 pass |
| Agent-doc navigation | 7 / 7 pass |
| Cumulative contract suite | 207 / 207 pass |
| Full repository suite | 2,101 / 2,101 pass |
| External calls / spend after v3 completion | 0 / `$0` |

## Approval effect

Option A 승인은 product knowledge contract repair와 무비용 검증만 연다. Credential read, external model call, additional spend,
v3 retry/resume, v4 paid execution, full evaluation, PR, merge, publish, deploy와 release는 열지 않는다.

## 승인 전 차단 범위

- Task packet/public docs/MCP contract repair
- Credential read와 external model call
- v3 overwrite/resume/retry와 additional spend
- v4 paid-smoke execution과 complete evaluation
- PR, merge, publish, deploy와 release
