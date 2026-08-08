# Phase 2 Step 1 — Resolve Constraints into a Bounded Task Packet

## 진행 상태

- [x] Human constraint phrases and explicit unsupported intents authored
- [x] Provider coverage, anchor and option ownership validated
- [x] Exact action and semantic-intent routes combined without top-one ranking
- [x] Set-cover, ordering, conflict and unresolved rules implemented
- [x] Runtime Canvas/SVG/PNG/PDF and composition signatures checked against declarations
- [x] Exact action 173 / 173 and supported semantic constraints 74 / 74 resolved
- [x] Design fixtures 30 / 30 satisfy closure oracle
- [x] All generated calls type-check
- [x] Focused contract tests pass
- [x] Cumulative contract suite recorded in Gate package — 175 / 175 pass
- [ ] Review target committed and pushed
- [ ] R54-P2-A user approval

## Resolution flow

1. Query에서 exact camel-case action name과 bounded English phrases를 각각 찾는다.
2. Chart, transform, scale, encoding, guide, layout, selection, composition와 renderer requirement를 독립 constraint로
   기록한다.
3. Matched constraint를 anchor로 provider 후보를 연다. Chart facade는 자기 chart constraint가 있을 때만 color,
   grouping과 guide constraint를 함께 덮을 수 있다.
4. 아직 덮이지 않은 constraint 수가 가장 많은 provider를 먼저 고르고, 동일 coverage에서는 materialization 순서와
   stable provider ID로 결정한다.
5. Data transform → chart/mark → position encoding → appearance encoding → statistics → guides → layout → composition →
   renderer 순으로 plan을 정렬한다.
6. Provider의 current card signature/route와 typed option samples로 `exactCalls`를 만든다.
7. Matched constraint마다 plan coverage 또는 explicit unresolved가 있는지 검사하고 serialized packet byte를 측정한다.

## Hard boundaries

- Query는 1–500 characters다.
- Packet은 6,144 UTF-8 bytes를 넘으면 truncate하지 않고 `TaskPacketBudgetError`로 실패한다.
- Candidate identity는 최대 3개지만 complete `actionPlan`은 유지한다.
- Geographic, animation, interaction, 3D와 JPEG intent는 explicit unresolved다.
- Legend position처럼 한 resource에 동시에 적용할 수 없는 mutually exclusive constraint는 각각 unresolved다.
- Resolver는 chart를 실행하거나 file/network에 접근하지 않는다.

## 완료 조건

- Exact action lookup gap 0, supported semantic constraint gap 0
- Design fixtures의 recognized constraint silent partial 0
- Typed call error 0
- Design fixture maximum ≤ 6,144 bytes, median ≤ 4,096 bytes
- Deterministic repeated result equality
- Verified review target이 remote branch에 push되고 R54-P2-A 승인 전 Phase 3을 시작하지 않음
