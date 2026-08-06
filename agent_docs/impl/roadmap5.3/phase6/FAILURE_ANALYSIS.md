# Roadmap 5.3 LLM Comparison Failure Analysis

## 결론

이번 0/48 결과를 “structured knowledge와 MCP 자체가 current docs보다 나쁘다”라고 해석하면 안 된다. 현재 evidence가
확실히 증명하는 것은 **지금 구현된 knowledge delivery와 evaluation adapter 조합이 세 model call 안에서 chart
submission으로 이어지지 않는다**는 사실이다.

원인은 chart runtime, renderer 또는 MCP transport 장애가 아니다. 다음 네 층이 동시에 실패했다.

1. Condition B가 승인된 증분 조건과 다르게 구현됐다.
2. Structured payload가 executable knowledge를 직접 제공하지 않고 접근 불가능한 경로를 가리킨다.
3. Search coverage 검증이 실제 model surface보다 느슨했다.
4. Tool loop가 탐색을 제한 시간 안에 제출로 전환시키지 못했다.

Condition C는 실제 MCP backend를 사용했지만 model에게 노출한 tool schema는 installed MCP의 실제 surface와도 달랐다.
따라서 현재 수치는 Roadmap benefit을 기각하기에는 충분하지만, A/B/C의 공정한 causal effect size로 사용하기에는
부적절하다.

## 관측된 실행 결과

| Evidence | B | C |
| --- | ---: | ---: |
| Runs | 48 | 48 |
| Model calls | 144 | 144 |
| Program submissions | 0 | 0 |
| Final success | 0 | 0 |
| Invalid-program | 48 | 48 |
| MCP calls | n/a | 380 |
| Runs at MCP call cap 8 | n/a | 46 |
| Runs with 6 MCP calls | n/a | 2 |
| Provider/model mismatch | 0 | 0 |

모든 B/C run은 세 model call을 전부 사용했고 program SHA가 없었다. C 48개 중 46개는 overview를 포함한 실행 MCP
call 상한 8회를 모두 사용했다. Output/token ceiling이나 provider failure로 중단된 run은 없다.

## 1. Condition B isolation contract 위반

Phase 0 benchmark contract는 B를 “같은 package와 reader에 generated structured action metadata와 task recipes만
추가”하는 조건으로 승인했다. 즉 A의 current-doc reader를 보존한 채 structured knowledge의 증분 효과를 측정해야 했다.

실제 `conditionBKnowledge`는 다음과 같이 구현됐다.

- A tools `search_docs`, `read_doc`: 제거
- B tools `search_ggaction`, `read_ggaction`: 대체
- Instruction: structured tools로 찾은 API만 사용
- `read_doc` 호출: 명시적으로 거부

따라서 B는 A+structured가 아니라 current docs 접근을 잃은 replacement condition이다. Phase 4 report도 이 replacement를
isolation이라고 기록했지만 Phase 0의 승인 계약과 충돌한다. B 0%와 A 35.42%의 차이를 structured metadata의 인과 효과로
해석할 수 없는 가장 큰 이유다.

## 2. Payload가 self-contained하지 않다

Generated knowledge는 completeness와 linkage를 충족하지만 model이 그 payload만으로 코드를 작성할 수 있는지는
충족하지 못한다.

- 173/173 action과 33/33 recipe가 example을 가지지만 inline source는 0개다.
- Example은 `examples/.../program.js` 같은 path와 export name만 제공한다.
- B/C의 `read_ggaction`은 action, recipe 또는 네 개 docs router만 읽을 수 있고 example file을 읽을 수 없다.
- Action/recipe의 public docs path도 payload에 있지만 B/C에는 해당 path를 읽는 tool이 없다.
- 173 action 중 147개 signature가 opaque `*Options` type을 참조하지만 inline option schema는 0개다.
- 21개 action은 parameter notes도 비어 있다. `createRegression` 같은 benchmark 핵심 action도 여기에 포함된다.

즉 payload는 “정확한 정보가 어디 있는지”는 알려주지만 그 정보를 전달하지 않는다. B의 initial routing text도 스스로
router가 exact signatures와 runnable examples를 대체하지 않는다고 말한다. A는 `read_doc`으로 linked public page를 읽을
수 있지만 B/C는 이 dead end에서 다시 search/read를 반복하게 된다.

## 3. Search coverage test가 production model surface를 대표하지 않는다

Evaluation model에게 노출한 `search_ggaction` schema에는 `query`만 있고 `limit`가 없다. 따라서 runtime default top 6만
받는다. 그러나 “every evaluation task” coverage test는 직접 `limit: 10`을 전달해 통과시켰다.

24개 task prompt를 그대로 query로 사용한 결과는 다음과 같다.

| Cutoff | Expected action/recipe가 포함된 task |
| ---: | ---: |
| Top 1 | 11/24 |
| Top 3 | 15/24 |
| Top 6 — actual evaluation default | 20/24 |
| Top 10 — current coverage test | 24/24 |

Actual top 6에서 expected route가 아예 빠지는 task는 regression, temporal line, moving window와 tick distribution이다.
예를 들어 regression task의 top 3은 `createRegressionLine`, `editRegressionLine`, `editRegression`이고 primary
`createRegression` 또는 regression recipe는 rank 7이다. Search test는 rank와 actual default를 검증하지 않아 이 문제를
놓쳤다.

## 4. Retrieval loop와 submission loop의 계약이 맞지 않는다

Evaluation은 task당 model call 3회와 MCP call 최대 8회를 허용한다. 그런데 MCP overview는 model에게 다음 순서를
권장한다.

1. overview 읽기
2. task 검색
3. matching action 또는 recipe 읽기
4. detailed docs route 사용

이 workflow는 이미 세 model response보다 길고 마지막 두 단계는 dead link를 포함한다. Runner도 모든 round에서
`tool_choice: "auto"`를 사용하며 model에게 남은 round 수를 알려주지 않는다. Final round에도 `submit_program`을
강제하지 않고, knowledge call 뒤에는 “이제 제출하라”는 boundary message도 추가하지 않는다.

그 결과 C의 46/48 run이 knowledge call cap을 모두 사용했지만 submission은 0이었다. 단순 token 부족이 아니라 model이
종료 조건을 알 수 없는 탐색 policy를 충실히 수행한 결과에 가깝다.

## 5. Condition C가 실제 MCP model surface를 그대로 사용하지 않았다

Installed MCP tool은 `{ query, limit? }`, title, detailed description, read-only annotations와 server instructions를
제공한다. Evaluation adapter는 B와 C의 model surface를 같게 만들기 위해 별도의 hard-coded tool schema를 사용했다.

- Evaluation `search_ggaction`: `query`만 노출
- Installed MCP `search_ggaction`: optional `limit` 1~10 노출
- MCP server instructions/tool discovery metadata: model input에 전달하지 않음
- Backend resource/tool call만 real local MCP process로 전달

따라서 C는 실제 MCP backend와 transport는 시험했지만 일반 MCP client가 model에게 보여주는 complete tool surface를
시험하지 않았다. 이 결과만으로 실제 local MCP 사용자 경험을 정확히 평가했다고 말할 수 없다.

## 6. Preflight가 plumbing만 검증했다

Phase 4~5 mocked tests는 model의 tool 선택을 검증하지 않았다. Test fixture가 다음 output sequence를 미리 제공했다.

- B: search/read → incomplete submission → repaired submission
- C: search/read → valid submission

이는 adapter, executor와 feedback plumbing이 작동함을 증명하지만 실제 model이 스스로 retrieval을 멈추고 submission을
선택하는지는 증명하지 않는다. Synthetic dry-run도 이미 정답인 result object를 생성하므로 같은 한계가 있다.

## 7. 실패 trace 관측성이 부족하다

Result는 token, call count, outcome과 final program evidence를 기록하지만 round별 function name, bounded arguments,
result identity/size와 remaining-call state를 보존하지 않는다. `store: false`이고 raw provider response도 보존하지 않아 B가
어떤 search/read를 반복했는지는 재구성할 수 없다.

현재 확실히 말할 수 있는 것은 B/C 모두 submission 0이고, C가 거의 항상 MCP cap을 사용했다는 사실까지다. Exact query,
read ID와 round sequence를 특정하는 주장은 evidence 범위를 넘는다.

## 인과 흐름

```text
task prompt
  → search result가 primary route를 늦게 또는 누락해 반환
  → action/recipe read가 opaque Options와 example path만 반환
  → linked example/public docs를 읽을 tool이 없음
  → model이 추가 search/read를 선택
  → 세 번째 model call 종료
  → submit_program 0회 → invalid-program
```

## 결과를 어떻게 해석해야 하는가

### 증명된 것

- 현재 B/C delivery path는 frozen three-call benchmark에서 사용할 수 없다.
- Current candidate는 acceptance threshold를 통과하지 못했고 merge하면 안 된다.
- MCP transport/package/browser isolation은 정상이며 chart runtime regression도 없다.
- Mechanical coverage 100%는 LLM task solvability를 보장하지 않는다.

### 증명되지 않은 것

- Structured knowledge라는 접근 자체가 public docs보다 나쁘다는 결론
- 실제 MCP client surface에서도 반드시 0%가 된다는 결론
- 호출 상한만 늘리면 correctness가 회복된다는 결론
- Search, payload, prompt policy 중 하나만 고치면 충분하다는 결론

## Corrective work의 우선순위

이 문서는 진단이며 구현 승인이 아니다. 다음 candidate는 순서대로 설계해야 한다.

1. **실험 계약 복구:** B를 A reader + structured knowledge로 되돌리고 C는 actual MCP discovery/schema/instructions를 사용한다.
2. **Self-contained payload:** top result 또는 exact read가 필요한 option shape와 최소 runnable source를 직접 제공한다.
3. **Production-surface retrieval test:** default top 6와 rank를 검증하고 24 task의 primary route를 실제 model surface에서 보장한다.
4. **Trace evidence:** model에 영향을 주지 않는 sanitized round trace를 남긴다.
5. **Unpaid trace-policy rehearsal:** repeated search, dead-link read와 final-turn tool attempt를 replay해 boundary가 안전하게
   종료되는지 검증한다. 이는 실제 model efficacy 증거로 과장하지 않는다.
6. **새 비용 Gate:** 위 항목을 검토한 뒤 one-run model smoke와 B/C paid rerun을 별도로 승인받는다.

Final-round submit 강제, model-call 상한 변경 또는 공통 prompt 변경은 A에도 영향을 주는 evaluation-envelope 변경이다. 이를
선택하면 기존 A를 그대로 비교할 수 없으므로 A/B/C 전체 재실행과 별도 비용 승인이 필요하다. 먼저 승인 계약을 복구하고
knowledge payload를 self-contained하게 만드는 편이 더 정확하고 비용도 적다.
