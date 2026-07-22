# Roadmap 4.1 Phase 8 — Facet Policy Editing

## 목표

Existing facet composition에서 `editCompositionLayout({ columns })`, `editFacetScales`와 `editFacetGuides`를
지원한다. Parent에 retained된 canonical pre-facet unit state와 current facet definition에서 모든 child를
immutable하게 rederive/replay하고 complete parent snapshot을 한 atomic transition으로 교체한다. Facet field,
source data, value order, child IDs, headers, title와 omitted policy는 보존한다.

## 진행 상태

- [x] R41-P7-A explicit approval과 active Phase 전환
- [x] R41-P8-A Gate 선언
- [ ] Parent/unit/child snapshot과 replay ownership mapping
- [ ] Facet-only columns layout edit
- [ ] Scale policy partial edit와 child rederivation
- [ ] Guide policy partial edit와 parent promotion reconciliation
- [ ] Types/current contracts/ACTION_INDEX/public docs 동기화
- [ ] Focused/cumulative/Browser/PNG/package verification
- [ ] R41-P8-A remote checkpoint
- [ ] 사용자 explicit approval

## Gate R41-P8-A

### 승인 대상

- `editCompositionLayout({ columns?, gap?, align?, padding? })`의 facet-only columns extension
- `editFacetScales({ x?, y?, xOffset?, yOffset?, color?, size?, shape?, opacity?, strokeDash? })`
- `editFacetGuides({ axes?, legend? })`
- Retained pre-facet unit에서 complete child rederive/replay와 atomic parent snapshot replacement

### Required evidence

- Facet-only dispatch, partial omission preservation와 empty/equivalent edit behavior
- Stable facet field/data/value order, child IDs, headers, title와 layout/policy boundaries
- Shared↔independent scale domain and histogram/derived-data replay
- Each↔outer axes ownership and false↔shared compatible legend promotion
- Selection/highlight and supported derived-owner replay from canonical unit state
- Failed rederivation/guide incompatibility atomicity and previous parent/children/caller immutability
- Existing facet/concat compatibility and focused/cumulative/Browser/PNG/package results

### 승인 전 차단

Phase 9 cross-capability regression, inventory/docs/package closeout.

## Non-goals

- Facet field, source data, value order or header content replacement
- Individual facet child replacement or mutation
- Polar facet expansion or new facet transform family
- Renderer, persisted state field or package entry-point changes
