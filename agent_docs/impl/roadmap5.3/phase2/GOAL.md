# Roadmap 5.3 Phase 2 — Informative Action Metadata

## 목표

173개 public `ChartProgram` action 각각을 LLM이 이름 추측 없이 선택하고 조합할 수 있도록 informative English
metadata를 만든다. Narrative source는 action이 만드는 결과와 사용 조건만 소유하고, exact signature/layer/domain/
lifecycle/contract route는 기존 canonical owner에서 생성 시 결합한다.

## 진행 상태

- [x] R53-P1-A explicit approval and Phase 2 activation
- [x] Canonical public example path schema amendment approval
- [x] Exact signature generator constructor/property contamination fix
- [x] Phase 2 source, generation, example and quality boundary 결정
- [x] 11 domain action source files and generated knowledge index
- [x] 173 informative English records and parameter-note validation
- [x] Canonical/focused executable example coverage
- [x] Generated public JSON and action router integration
- [x] R53-P2-A remote review checkpoint

## 고정 결과

- `knowledge/actions/<domain>.json`: 11 domain narrative source files.
- `knowledge/index.json`: ACTION_INDEX, exact signatures, public references와 source를 stable name order로 join한 artifact.
- `docs/llms-actions.json`: 같은 generated action records의 public documentation view.
- `docs/llms/actions.md`: 작은 family router를 유지하고 machine-readable complete metadata로 연결.
- Missing/duplicate action, domain mismatch, stale parameter path, invalid action relation, broken docs/example/export,
  uninformative/duplicate summary와 generated drift는 test failure다.

## Example 원칙

- 기존 canonical `examples/**/program.js` export를 우선 재사용한다.
- 기존 public program에 없는 ordinary action은 focused `test/llm/action-knowledge-examples.js` registry가 실행한다.
- `not-applicable`은 standalone chart example이 의미 없는 primitive/metadata action에만 구체적인 이유와 함께 허용한다.
- Existing public example 또는 focused builder는 linked action을 실제 top-level/wrapped trace에 포함해야 한다.

## Gate

Canonical review record는 [`GATE_A.md`](./GATE_A.md)가 소유한다.
