# Roadmap 5.4 Phase 2 — Intent Resolution and One-Call Closure

## 목표

자연어 query를 하나의 top result로 축약하지 않고 atomic constraint로 분해한 뒤, 그 constraint를 가장 적은 action과
runtime operation으로 덮는 bounded task packet을 만든다. 지원하지 않는 요구나 서로 충돌하는 요구는 가까운 action으로
숨기지 않고 `unresolved`에 남긴다.

## 진행 상태

- [x] Chart, transform, scale, encoding, guide, layout, selection과 renderer constraint taxonomy 작성
- [x] Exact action-name lookup 173 / 173 유지
- [x] Greedy capability set-cover와 deterministic execution ordering 구현
- [x] Facade가 color/guide 등 여러 constraint를 덮을 때 중복 action 제거
- [x] Stored selection → highlight 같은 cross-action dependency call 연결
- [x] `matchedConstraints`, `actionPlan`, `exactCalls`, `unresolved`, 최대 3 candidates packet 구현
- [x] Unsupported와 exclusive conflict의 explicit unresolved 처리
- [x] 30개 resolver design fixture에서 closure 또는 expected unresolved 30 / 30
- [x] 생성된 unique call 213개를 current TypeScript declarations로 compile
- [x] Packet 최대 1,980 bytes, 중앙값 1,109 bytes
- [x] Credential reads, external calls와 spend 0 / 0 / $0
- [x] R54-P2-A explicit approval — 2026-08-08

## 결과물

- Human constraint/provider source: `knowledge/intent-taxonomy.json`
- Direct deterministic resolver: `knowledge/task-resolver.js`
- Bounded packet schema: `knowledge/task-packet.schema.json`
- Design-only closure fixtures: `knowledge/task-closure-cases.json`
- Stable contract evidence: `test/contracts/compact-task-resolver.test.js`

`task-closure-cases.json`은 resolver implementation을 검증하는 design fixture이며 Roadmap 5.4의 development,
validation 또는 held-out evaluation corpus가 아니다. Phase 4 corpus는 이 query나 expected result를 재사용하지 않고
별도 identity와 SHA로 동결한다.

## Gate R54-P2-A

Canonical review record는 [`GATE_A.md`](./GATE_A.md)가 소유한다. 승인 전에는 MCP executable, dependency/package,
public docs fallback, installed artifact와 evaluation corpus를 구현하지 않는다.
