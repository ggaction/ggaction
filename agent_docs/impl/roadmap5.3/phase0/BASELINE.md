# Phase 0 Current LLM Knowledge Baseline

## 측정 범위

Starting commit `9414d07179c9e7c6bbfdf00b762fc35de0ff25ec`, package `0.0.8`의 다음 canonical/generated
surface를 외부 LLM 호출 없이 측정했다.

- `ACTION_INDEX.json`의 173개 direct action
- `docs/_data/action_metadata.json`의 현재 structured metadata
- Public action reference links와 exact TypeScript reference
- 48개 canonical example program
- 19개 task recipe page
- 117개 public Markdown page와 generated `llms.txt`/`llms-full.txt`

Machine-readable action별 결과는 [`CURRENT_KNOWLEDGE_INVENTORY.json`](./CURRENT_KNOWLEDGE_INVENTORY.json)이
소유한다. Generator는 `scripts/llm-eval/inventory.js`, focused evidence는
`test/contracts/llm-knowledge-inventory.test.js`다.

## 핵심 결과

| 항목 | Present | Missing | 해석 |
| --- | ---: | ---: | --- |
| Current contract route | 173 | 0 | Exact behavior owner는 완전하다 |
| Public reference route | 173 | 0 | 모든 action 이름을 public docs에서 찾을 수 있다 |
| Exact type signature route | 173 | 0 | Signature lookup은 완전하다 |
| Informative structured summary | 0 | 173 | 현재 metadata는 operation/layer/domain만 가진다 |
| Structured use/avoid/effects/errors/example/relations | 0 | 173 | LLM이 여러 prose source를 조립해야 한다 |
| Canonical executable program 연결 | 72 | 101 | Complete chart examples가 action 전체를 직접 덮지 않는다 |
| Task recipe 직접 연결 | 42 | 131 | Recipe catalog는 chart family 중심이며 action coverage owner가 아니다 |
| Public Markdown mention | 173 | 0 | 정보가 없기보다 흩어져 있는 문제가 크다 |

현재 concise `docs/llms.txt`는 3,601 bytes이고 canonical-order `docs/llms-full.txt`는 476,376 bytes다.
전자는 좋은 routing entry지만 action별 task intent를 반환하지 않는다. 후자는 complete bundle이지만 단일 task에
필요한 context보다 훨씬 크다. Current `docs/search-index.json`도 269,541 bytes이며 사람용 page search에 맞춰져 있다.

## 결론

Roadmap 5.3은 public docs를 새로 만드는 작업이 아니다. Current docs는 exact reference와 canonical examples가
강하다. 부족한 것은 다음 세 layer다.

1. Action 하나를 바로 선택할 수 있는 informative structured metadata
2. 실제 task에서 여러 action을 올바른 순서로 조합하는 high-coverage recipes
3. 전체 page bundle을 넣지 않고 필요한 knowledge만 bounded result로 찾는 deterministic retrieval

따라서 Phase 1~5는 current prose와 contract를 복제하지 않고 하나의 canonical structured source에서 docs/package/MCP
view를 생성해야 한다. A/B/C benchmark도 A에 current `llms.txt` routing과 linked docs를 정상적으로 허용해야 하며,
일부러 `llms-full.txt` 전체만 주는 약한 baseline을 만들면 안 된다.

## 아직 해석하면 안 되는 것

- Recipe direct-call 42/173은 recipe 품질 점수가 아니다. 한 recipe가 wrapped actions를 설명하거나 composite action
  하나로 많은 behavior를 제공할 수 있다.
- Example coverage 72/173은 모든 action에 새 chart example이 필요하다는 뜻이 아니다. Edit/remove/primitive action은
  metadata example이나 shared lifecycle recipe가 더 적절할 수 있다.
- Public mention 173/173은 LLM usability가 완성됐다는 뜻이 아니다. Exact information을 찾는 token/call/time 비용은
  실제 benchmark에서 측정해야 한다.

## 다음 측정

Phase 0의 다음 작업은 action별 부족분을 무조건 example로 채우는 것이 아니라 task corpus와 classification policy를
먼저 고정하는 것이다. Provider/model/repetitions/비용과 acceptance threshold는 R53-P0-A 전까지 숫자로 제안하며,
승인 전에는 외부 LLM 호출을 하지 않는다.
