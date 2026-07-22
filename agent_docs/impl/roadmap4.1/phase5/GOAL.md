# Roadmap 4.1 Phase 5 — 2D-bin Edit

## 목표

`editBin2DData`가 current/unique logical Bin2D owner를 선택하고 explicit transform/source option만 교체하며
omitted provenance를 보존하게 한다. Complete candidate와 affected consumers를 먼저 검증한 뒤 immutable derived
revision, explicit layer rebind, dependent rematerialization과 safe orphan release를 한 domain transition으로 수행한다.

## 진행 상태

- [x] R41-P4-A explicit approval과 active Phase 전환
- [x] R41-P5-A Gate 선언
- [x] Bin2D logical owner/provenance/revision/rebind/release flow 전수 mapping
- [x] Partial edit preflight와 implementation
- [x] Consumer rematerialization, orphan release와 repeated-create compatibility
- [x] Types/current contracts/ACTION_INDEX/public docs 동기화
- [x] Focused/cumulative/Browser/PNG/package verification
- [x] R41-P5-A remote checkpoint
- [x] 사용자 explicit approval

## Gate R41-P5-A

### 승인 대상

- `target`의 explicit/current/unique logical Bin2D owner resolution과 ambiguity rejection
- `source`, `x`, `y`, `bins`, `extent`, `includeEmpty`, `members`, `as` partial revision
- Omitted provenance preservation, immutable revision, explicit rebind와 safe orphan release
- Affected scale/mark/guide rematerialization과 repeated `createBin2DData({ id: existing })` compatibility

### Required evidence

- Shortest valid partial edit와 every editable option의 complete-candidate result
- Missing/ambiguous owner, empty edit, invalid field/source/output and downstream failure atomicity
- New revision ID, logical owner continuity, trace decomposition and exact consumer bindings
- Shared prior revision preservation and unreferenced prior revision release
- Scale/mark/guide/selection behavior, previous program, source rows와 caller option immutability
- Existing repeated-create equivalence and public create/edit intent documentation
- Focused/cumulative/Browser/PNG/package results and remote checkpoint

### 승인 전 차단

Phase 6 statistical owner revision and error-band boundary implementation.

## Non-goals

- Mutable dataset update, public generic `editData` or `editDerivedData`
- Standalone source/derived data removal or public layer-data rebind
- Bin2D renderer, output schema or transform vocabulary expansion
- Scale, coordinate, guide or consumer resource identity replacement beyond required rematerialization
- Existing repeated-create behavior deprecation or persisted schema change
