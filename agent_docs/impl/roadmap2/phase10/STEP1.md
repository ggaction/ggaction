# Roadmap 2 — Phase 10 Step 1: Contract and Migration Audit

## 목표

Current scale implementation, Planned vocabulary, temporal/discrete ownership, consumer compatibility and Gate
fixtures를 감사해 구현 전에 migration boundary를 고정한다.

## 진행 상태

- [x] Current create/edit/encoding scale surface audit
- [x] Linear/time/ordinal/sequential grammar and guide consumer audit
- [x] `ordinal` position to `band | point` migration inventory
- [x] UTC-only `time` and removed `utc` token contract
- [x] `editScale({ type })` atomic transition and parameter-removal matrix
- [x] Aggregate-bar continuous color grain and aggregate inference matrix
- [x] Four Gate owners, artifact paths and target call chains
- [x] Executable inventory/contract guard
- [x] STEP status, conceptual commit and push

## 감사 결과

- Current public `ScaleType`과 direct creation은 `linear | time | ordinal`, point quantitative color의 internal
  consumer는 `sequential`까지만 지원한다. New types는 Gate 승인 전 runtime/type surface에 노출하지 않는다.
- Scale validation은 `src/grammar/scales/`, semantic definition은 `src/actions/scales/definitions.js`, cross-consumer
  resolution은 `src/actions/scales/materialize.js`가 소유한다. Phase 10은 이 책임을 유지하며 type dispatch만
  canonical family registry로 확장한다.
- Current ordinal position은 category center와 full bandwidth를 함께 만든다. Migration은 bar/xOffset consumers를
  `band`, point/line category consumers를 `point`, appearance consumers를 `ordinal`로 분리해야 한다.
- Current `time` parsing, nice와 tick fixtures가 이미 UTC를 사용한다. Stored token을 유지하고 별도 temporal alias는
  추가하지 않는다.
- `editScale` type transition은 complete next definition을 먼저 만든다. Valid domain/range는 보존하고 invalid
  values는 same-call replacement를 요구하며 old type-only properties는 structural removal한다.
- Aggregate bar continuous color는 final rect grain에서 one value를 요구한다. Measure와 같은 field는 measure
  aggregate를 상속하고 다른 field는 explicit aggregate를 요구한다.
- Gate A–D의 exact public chain과 visual ownership은 chart contract가 소유하고, 각 Gate manifest가 artifact path와
  executable call-chain metadata를 이어받는다.
- `test/contracts/phase10-scale-plan.test.js`가 세 Planned capability, UTC-only time token과 pre-Gate non-public
  boundary를 고정한다.

## 검증

- `npm run test:contracts`
- `npm run contracts:catalog:check`

## 완료 조건

No type, parameter, consumer, migration, Gate owner or public signature remains ambiguous before source implementation.
