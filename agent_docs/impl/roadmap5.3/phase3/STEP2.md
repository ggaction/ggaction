# STEP 2 — Classify 173 Actions and Publish Recipe Knowledge

## 진행 상태

- [x] Every ACTION_INDEX action appears exactly once in recipe coverage
- [x] Primary/supporting/lifecycle backlinks are non-empty and bidirectionally exact
- [x] Extension-only/metadata-only/not-applicable reasons are concrete and schema-valid
- [x] Action `recipeIds`, recipe records and coverage source join deterministically
- [x] Generated `knowledge/index.json` and public `docs/llms-recipes.json`
- [x] Recipe router, full LLM docs and generated drift synchronization
- [x] Focused, docs, contract and package-boundary verification
- [x] R53-P3-A Gate package commit/push

## Coverage 규칙

| Classification | Required evidence |
| --- | --- |
| `primary` | 최소 한 recipe step에서 같은 action이 `primary` |
| `supporting` | 최소 한 recipe step에서 같은 action이 `supporting` |
| `lifecycle` | 최소 한 recipe step에서 같은 action이 `lifecycle` |
| `extension-only` | extension author workflow 또는 구체적인 비적용 이유 |
| `metadata-only` | 실행 step이 아닌 이유와 직접 metadata example/contract evidence |
| `not-applicable` | standalone task recipe가 부적절한 구체적인 이유 |

한 action이 여러 recipe에 나올 수는 있지만 coverage row는 정확히 하나다. Classification은 그 action이 recipe catalog에서
맡는 대표 역할을 의미하며, generated action `recipeIds`와 recipe step backlinks는 source 양쪽에서 정확히 일치해야 한다.

## 완료 기준

- `actions = 173`, `unclassified = 0`, duplicate/missing/unknown reference = 0.
- Primary recipe coverage 100%; ordinary supporting/lifecycle classification backlink 100%.
- Generated outputs가 byte-reproducible하고 public structured recipe document와 action backlinks가 일치한다.
- R53-P3-A Gate package를 commit/push한 뒤 승인 전 Phase 4 retrieval 구현을 시작하지 않는다.
