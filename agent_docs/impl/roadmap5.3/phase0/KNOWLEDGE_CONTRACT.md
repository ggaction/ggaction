# Roadmap 5.3 Knowledge Contract

## 결정 목적

LLM용 설명을 추가하면서 action behavior, TypeScript signature와 public docs가 서로 다른 사실을 소유하지 않게 한다.
새 source는 **영어 narrative knowledge**만 소유하고, exact fact는 기존 owner에서 generator가 결합한다.

## Canonical source

| 사실 | Canonical owner | 새 knowledge에서 처리하는 방식 |
| --- | --- | --- |
| Action 존재, layer/domain/lifecycle, contract route | `agent_docs/contract/ACTION_INDEX.json` | 이름으로 join하고 drift를 검증한다 |
| Exact behavior와 semantic/graphic effect | `agent_docs/contract/current/` | Narrative effect가 모순되지 않는지 review하고 contract link를 생성한다 |
| Public signature와 required/optional parameter | `types/`와 signature generator | 복사하지 않고 build 때 exact signature를 생성한다 |
| LLM용 summary, 사용/회피 시점, parameter 설명, 오류와 조합 힌트 | `knowledge/actions/*.json` | Domain별 source file이 소유한다 |
| 실제 chart task의 순서, 대안, 함정과 executable example | `knowledge/recipes/*.json` | Recipe ID별 source file이 소유한다 |
| 173-action recipe classification | `knowledge/recipe-coverage.json` | Action마다 정확히 한 row를 소유한다 |
| Docs/search/MCP가 읽는 결합 결과 | generated `knowledge/index.json` | 위 canonical source에서만 생성한다 |

Action source가 exact signature나 required/optional boolean을 다시 적지 않는 것은 의도적이다. `parameterNotes.path`는
생성된 signature의 실제 path와 일치해야 하며, generator가 없는 parameter와 stale note를 실패시킨다.

## Final source schemas

- [`action-knowledge.schema.json`](../../../../test/llm/action-knowledge.schema.json): Informative English action metadata.
- [`recipe-knowledge.schema.json`](../../../../test/llm/recipe-knowledge.schema.json): Task-centered, ordered recipe.
- [`recipe-coverage.schema.json`](../../../../test/llm/recipe-coverage.schema.json): Zero-gap action classification.

모든 source는 `schemaVersion: 1`, unknown field 거부와 bounded text를 사용한다. Action summary는 기능 이름만 바꿔
반복하는 문장이 아니라 어떤 chart/result를 만들고 언제 쓰는지 설명한다. Recipe step은 실제 public action과 역할을
연결하고, example은 repository 안의 import 가능한 JavaScript export를 가리킨다.

## Generated index contract

`knowledge/index.json`은 source를 그대로 복사한 별도 truth가 아니다. 다음 join 결과를 stable name/ID order로 가진다.

- `schemaVersion`, generator version와 input SHA-256 identities
- Actions: 모든 action narrative + exact layer/domain/lifecycle + generated signature + canonical contract/docs links
- Recipes: 모든 recipe narrative + validated action references + executable example identity
- Coverage: 173개 action classification + recipe backlink + validation status
- Docs sections: Phase 1에서 고정할 bounded overview/action/recipe/detail route

Generator는 duplicate/missing action, 잘못된 domain, 존재하지 않는 action/recipe/docs/example/export, stale parameter path,
깨진 backlink, primary action의 recipe 0개와 unclassified action을 실패시킨다. Primitive/extension action의 실행 예시가
부적절할 때만 `not-applicable`과 구체적인 이유를 허용한다.

## Phase 1~5 file and package boundary

| Phase | Canonical input | Generated/public output | Package 영향 |
| ---: | --- | --- | --- |
| 1 | 작은 English overview/section route source | `/llms/`, action/recipe routes, `llms.txt` navigation | 없음 |
| 2 | `knowledge/actions/*.json` | Action pages와 action records in `knowledge/index.json` | Phase 5 전에는 publish files 변경 없음 |
| 3 | `knowledge/recipes/*.json`, `knowledge/recipe-coverage.json` | Recipe pages, backlinks와 coverage report | Phase 5 전에는 publish files 변경 없음 |
| 4 | generated `knowledge/index.json` | Deterministic bounded search API/index | Node build tool만 추가; browser entry import 없음 |
| 5 | 같은 generated index + official MCP SDK adapter | `ggaction-mcp` local stdio bin과 read-only resources/tool | `knowledge/`, bin, dependency를 package에 포함 |

Phase 5 package 변경 때만 `package.json`의 `files`, `bin`과 runtime dependency를 바꾸고
`SECOND_ARCHITECTURE.md`를 갱신한다. MCP adapter는 Node-only entry에서만 import한다. Existing root/basic/extension 및
Canvas/SVG/PNG/PDF browser import graph는 knowledge index나 MCP SDK를 import하지 않는다.

## Verification boundary

- Phase 1: Route size, stable navigation, broken-link와 generated drift test.
- Phase 2: 173/173 metadata, informative-text lint, signature/parameter join과 example execution.
- Phase 3: 173 unique coverage rows, `unclassified = 0`, primary recipe 100%, recipe action/backlink/example validation.
- Phase 4: Stable ranking/tie-break, bounded result size와 repeated-query identity.
- Phase 5: Packed tarball and clean consumer, stdio protocol, read-only/no-file/no-network/no-execution negative tests,
  browser bundle isolation.

이 계약은 public chart API나 action behavior를 바꾸지 않는다. 실제 source 작성과 package boundary 변경은 각각 후속
Gate 승인 범위 안에서만 진행한다.
