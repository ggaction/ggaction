# STEP 2 — Density and Regression Data-role Revisions

## 진행 상태

- [ ] Density source/field/group owner mapping and implementation
- [ ] Regression data/x/y/group owner mapping and implementation
- [ ] Complete candidate and consumer/component preflight
- [ ] Revision/rebind/rematerialization/release and selection replay
- [ ] Contract/type/docs synchronization
- [ ] Focused and cumulative verification
- [ ] Gate evidence/commit/push

## 실행 순서

1. Density는 existing transform의 output fields, density channel, coordinate와 scale IDs를 보존하며 source, field와
   `groupBy`만 partial replace한다.
2. Regression은 stable owner/band/line IDs, coordinate와 position scale IDs를 보존하며 data, x, y와 `groupBy`를
   partial replace한다.
3. Complete source fields/group/color/component compatibility와 every affected consumer를 speculative immutable branch에서
   먼저 검증한다.
4. Existing derived-revision planner, wrapped rebind, materialization planner와 orphan release를 재사용하고
   selection/highlight를 current final items에서 다시 적용한다.
5. Current contracts, declarations, inventory, architecture note, public docs와 generated references를 동기화한다.
6. Focused tests부터 cumulative, coverage, Canvas/PNG/Browser와 packed consumers 순으로 검증한다.

## Gate evidence

구현 완료 뒤 exact public calls/source/state/trace/test/compatibility 결과와 remote commit을
[`GATE_A.md`](./GATE_A.md)에 기록한다.
