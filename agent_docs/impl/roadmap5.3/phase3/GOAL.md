# Roadmap 5.3 Phase 3 — High-Coverage Task Recipes

## 목표

LLM이 action 173개를 개별 이름으로만 찾는 데서 끝나지 않고, 실제 chart task를 완성하는 최소 public action 순서와
선택 기준을 바로 찾게 한다. Recipe는 action catalog를 기계적으로 잘라 붙이지 않고 하나의 recognizable user intent,
필요한 입력, ordered steps, 대안, 함정과 실행 가능한 완성 program을 함께 설명한다.

## 진행 상태

- [x] R53-P2-A explicit approval and Phase 3 activation
- [ ] Existing public recipe/example and action-role inventory
- [ ] Canonical structured recipe source catalog
- [ ] Focused executable recipe examples for uncovered workflows
- [ ] 173-action zero-gap classification and bidirectional backlinks
- [ ] Generated index/public recipe JSON/router integration
- [ ] R53-P3-A remote review checkpoint

## 고정 결과

- `knowledge/recipes/<id>.json`: task intent별 English narrative source.
- `knowledge/recipe-coverage.json`: `ACTION_INDEX.json`의 173개 action을 정확히 한 번 분류하는 canonical source.
- `knowledge/index.json`: action backlink, structured recipe와 coverage를 stable action-name/recipe-ID order로 join.
- `docs/llms-recipes.json`: 같은 recipe records와 coverage summary의 public documentation view.
- `docs/llms/recipes.md`: 작은 family router를 유지하고 complete machine-readable recipe catalog로 연결.

## Recipe 품질 원칙

1. 한 recipe는 하나의 사용자가 알아볼 수 있는 결과나 수정 workflow를 해결한다.
2. `intent`, `useWhen`, `avoidWhen`은 title이나 서로를 반복하지 않고 인접한 대안과 선택 기준을 설명한다.
3. Steps는 실제 public action을 순서대로 연결하고 각 action을 `primary`, `supporting`, `lifecycle` 중 하나로 표시한다.
4. Primary action은 최소 한 recipe에서 primary여야 한다. Supporting/lifecycle로 분류한 ordinary action도 최소 한 recipe
   backlink를 가져야 한다.
5. `extension-only`, `metadata-only`, `not-applicable`은 recipe 수를 부풀리지 않고 20자 이상의 구체적인 이유를 가진다.
6. 기존 canonical `examples/**/program.js` export를 우선 재사용하고, 독립 task가 없을 때만 focused
   `test/llm/recipe-knowledge-examples.js` registry를 추가한다.
7. Example은 import/실행되어 `ChartProgram`을 반환하고 recipe step의 primary action을 trace에서 증명해야 한다.

## 범위 경계

- Public chart API, declarations, action behavior, state와 renderers는 변경하지 않는다.
- Recipe count를 목표로 삼지 않는다. Existing public tasks와 uncovered action workflows를 합쳐 distinct intent만 남긴다.
- Deterministic ranking/search API는 Phase 4, package/MCP boundary는 Phase 5까지 차단한다.
- External paid B/C evaluation, PR Ready/merge, publish/deploy/release는 별도 Gate/승인 없이는 진행하지 않는다.

## Gate

Canonical review record는 [`GATE_A.md`](./GATE_A.md)가 소유한다.
