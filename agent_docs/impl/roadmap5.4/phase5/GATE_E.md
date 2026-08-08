# Gate R54-P5-E — Knowledge and Evaluation Boundary Repair Decision

## Gate state

`ready-for-review`

Canonical result: [`ATTEMPT3.md`](./ATTEMPT3.md).

Verified review checkpoint: `11d434881b8aa0755a927941df8306b36ffadc66`.

## 결정이 필요한 이유

v3 smoke는 runner 오류 없이 16 / 16을 완료했지만 strict pass가 7 / 16이다. Compact direct와 MCP는 각각 3 / 4로 public
docs 0 / 4보다 나았지만 correctness가 같지 않고 repetition도 한 번이므로 token, call 또는 time 개선으로 해석할 수 없다.

실패 원인은 한 종류가 아니다. Authoring prerequisite와 docs identity는 product knowledge gap이고, exact canonical ID와 forced
fallback read는 evaluation contract와 product semantics의 경계 문제다. Benchmark 전용 wrapper나 정답을 prompt에 주입하지
않으면서 이 경계를 먼저 바로잡을지, negative result로 종료할지 결정해야 한다.

## Options

### A — Separate product knowledge from evaluation context, then revalidate unpaid (recommended)

다음 네 경계를 하나의 versioned candidate repair로 닫는다.

1. **General authoring prerequisite closure.** Task packet은 benchmark-specific `buildChart(rows)`, fixed dimensions 또는 complete
   submitted module을 답으로 주지 않는다. 대신 `chart`, `createCanvas`와 `createData({ values })`의 exact signature, ordered call
   pattern과 caller-value binding을 selected domain steps 앞에 제공한다. Model은 evaluator가 제공한 `rows` context를 public
   `values` option에 결합할 수 있어야 한다.
2. **Terminal decision과 open decision 분리.** Canonical schema v3는 이미 결론 난 limitation과 추가 선택/문서가 필요한 상태를
   분리한다.

   ```json
   {
     "unsupported": [
       { "constraint": "unsupported.jpg", "reason": "JPEG is not a current renderer." }
     ],
     "unresolved": [
       {
         "constraint": "renderer.format",
         "reason": "Choose a supported output format.",
         "resources": ["ggaction://docs/choose-renderer"]
       }
     ]
   }
   ```

   `unsupported`는 terminal이므로 mandatory docs read가 없다. D는 `unresolved[].resources`가 있을 때만 search → read → submit을
   요구한다. Direct와 local MCP는 complete schema v3 packet도 byte-equal해야 한다.
3. **Public docs closure.** LLM docs에 root factory/data signature, general task-focused example과 public canonical capability IDs를
   한 bounded searchable route로 제공한다. 특정 smoke 문구를 위한 phrase patch가 아니라 histogram/regression/renderer family의
   fresh query variants로 route closure를 검증한다.
4. **Versioned evaluation boundary.** v3 corpus, oracle, evaluator와 result는 byte-for-byte 보존한다. Same task/query/dataset와
   correctness IDs를 유지하되 새 terminal/open semantics에 따른 v4 route oracle을 external result 확인 전에 별도로 동결한다.
   Submit schema는 canonical IDs의 public source를 명시하고, runner prompt는 function name/data variable 같은 evaluation context만
   제공하며 ggaction API 정답은 제공하지 않는다.

Model과 3-call limit은 유지한다. Schema/version change, generated knowledge, MCP, public docs, installed package와 browser
budget을 함께 검증한다. 새 product candidate는 unpaid closure를 모두 통과한 뒤에만 별도 R54-P5-F에서 exact v4 plan/cost와
paid execution 승인을 요청한다.

장점은 evaluator-specific answer injection 없이 실제 사용자-facing knowledge를 완성하고, 불필요한 fallback call을 제거하며
docs/direct/MCP/fallback correctness를 비교 가능하게 만든다는 점이다. 단점은 task packet public schema와 v4 routing oracle을
함께 versioning하고 package/docs evidence를 전부 갱신해야 한다.

### B — Keep one unresolved array and require explicit fallback for every entry

Current `unresolved`를 유지하고 모든 entry에 explicit resource URI를 추가해 D가 항상 read하도록 한다. 구현은 작지만 이미 결론 난
unsupported task에도 call/token을 강제하고 terminal/open 의미 혼합을 고착한다. 권장하지 않는다.

### C — Tune only the evaluation prompt

Runner prompt에 exact ggaction data call, canonical IDs와 D call order를 직접 넣는다. 가장 작지만 제품을 LLM-friendly하게
만들지 않고 evaluator가 답을 제공하므로 결과 해석을 훼손한다. 권장하지 않는다.

### D — Close as non-integration

v3의 7 / 16을 final negative result로 보존하고 Roadmap 5.4를 package/PR 변경 없이 종료한다. 추가 비용과 public contract 변경은
없지만 현재 확인된 causal knowledge gaps도 남는다.

## Option A unpaid acceptance

- Existing 173 exact actions와 fresh 48 tasks의 exact plan/authoring closure 유지
- Every authoring packet이 `createCanvas`/`createData` prerequisite signature와 binding을 빠짐없이 제공
- Four fixed smoke tasks의 context-bound source와 terminal/open decision을 model call 없이 실행·검증
- Fresh query variants가 smoke wording patch 없이 같은 family contract를 닫음
- D mock가 terminal unsupported 2-call path와 documentation-needed 3-call path를 각각 검증
- Direct/local-MCP complete schema v3 packet byte equality
- Task packet ≤ 6,144 bytes, package/browser budgets와 installed local MCP 통과
- Public-doc search/read가 fixed four tasks의 필요한 bootstrap/identity를 닫음
- v3 oracle/result 불변과 별도 v4 route oracle freeze
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

Option A 승인은 schema v3 product knowledge, public docs와 versioned v4 evaluation-route contract 구현 및 무비용 검증만 연다.
Credential read, external model call, additional spend, v3 retry/resume, v4 paid execution, full evaluation, PR, merge, publish,
deploy와 release는 열지 않는다.

## 승인 전 차단 범위

- Task packet/public docs/MCP와 v4 route contract repair
- Credential read와 external model call
- v3 overwrite/resume/retry와 additional spend
- v4 paid-smoke execution과 complete evaluation
- PR, merge, publish, deploy와 release
