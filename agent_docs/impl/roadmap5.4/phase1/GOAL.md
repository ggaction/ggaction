# Roadmap 5.4 Phase 1 — Compact Knowledge Source

## 목표

173개 public action 각각에 대해 LLM이 기본 lookup에서 바로 사용할 수 있는 작은 action card를 만든다. Complete
reference를 다시 복사하지 않고 current declaration, action inventory와 canonical docs route에서 exact truth를 생성하고,
사람이 관리하는 작은 intent/call-pattern source로 의미와 대표 호출만 보강한다.

## 진행 상태

- [x] `types/program.d.ts`의 실제 TypeScript type checker에서 exact signature와 top-level option key 생성
- [x] `ACTION_INDEX.json`의 173-action identity, layer, domain과 lifecycle 연결
- [x] Human-owned operation/domain/term intent와 high-risk call variant source 작성
- [x] 173 / 173 compact cards 생성, unclassified action/term 0
- [x] 모든 card에 canonical route와 최소 executable snippet 제공
- [x] 173개 snippet을 exact `ChartProgram` declaration으로 TypeScript compile
- [x] Individual payload budget 검증 — 최대 1,501 bytes, 중앙값 993 bytes
- [x] Existing action behavior, source, declarations, renderer, public/generated docs와 package surface 미변경
- [ ] R54-P1-A explicit approval

## 결과물

- Human source: `knowledge/action-intents.json`
- Bounded schema: `knowledge/action-card.schema.json`
- Generated projection: `knowledge/action-cards.json`
- Type-aware generator: `scripts/action-card-source.js`, `scripts/generate-action-cards.js`
- Stable contract evidence: `test/contracts/compact-action-cards.test.js`

Generator는 TypeScript declaration의 named type, union과 intersection을 실제 checker로 해석한다. 따라서 string regex로
option key를 추측하지 않는다. Union branch에만 존재하는 option도 query 후보에는 포함하고, 모든 branch가 요구하는
option만 `required: true`로 표시한다.

## Gate R54-P1-A

Canonical review record는 [`GATE_A.md`](./GATE_A.md)가 소유한다. 승인 전에는 intent resolver, task packet search,
MCP, package/dependency, public docs와 evaluation corpus를 구현하지 않는다.
