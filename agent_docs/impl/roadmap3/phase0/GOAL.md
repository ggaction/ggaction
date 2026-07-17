# Roadmap 3 Phase 0 — Capability Lab and Contract Baseline

## 목표

Phase 0는 새 public 기능을 구현하기 전에 현재 `ggaction@0.0.2`의 실제 capability와 API 공백을
executable evidence로 고정하고, Roadmap 3 Proposed 후보를 구현 Phase에 정확히 배치한다.

이 Phase는 생각만으로 action을 늘리지 않는다. Existing public API로 representative chart를 직접
작성해 보고 다음 세 상태를 구분한다.

1. 현재 API로 자연스럽게 가능함
2. 가능하지만 raw primitive, generated ID 또는 깊은 edit option을 요구함
3. 현재 architecture에 필요한 capability가 없어 불가능함

Phase 0에서는 `src/`에 Polar, composition, facet 또는 새 edit action을 구현하지 않는다. Contract와
artifact/test 기반을 준비하고 Gate A에서 사용자가 승인한 후보만 Planned로 승격한다.

## 진행 상태

- [x] STEP 1 — Current repository, package, action, chart, type와 documentation baseline
- [ ] STEP 2 — Existing public API capability lab
- [ ] STEP 3 — Focused edit와 create/edit/remove lifecycle audit
- [ ] STEP 4 — Polar, composition과 chainable facet stored-state contract
- [ ] STEP 5 — Roadmap 3 artifact/gallery and executable evidence foundation
- [ ] STEP 6 — Proposed inventory, Phase assignment audit와 Gate A

## 범위

### 포함

- Current tests, package boundary와 contract inventory 기준선
- Representative chart capability probes
- Public option type/export와 API-layer classification 감사
- Focused edit/remove 후보의 필요성 검증
- Polar, child-program composition과 `.facet({ field })` 목표 계약
- Roadmap 3 primitive/public artifact pair 기반
- Proposed → Planned 승인 Gate

### 제외

- 새 public runtime action 구현
- Polar geometry와 guide materialization
- `children`/`compositionSpec` state 구현
- `hconcat`, `vconcat`, `facet` runtime 구현
- Public docs에 아직 호출할 수 없는 Proposed API 게시
- 기존 unrelated source refactor

## 실행 순서

```text
Current baseline
→ capability probes
→ observed gap classification
→ exact Proposed contracts
→ Roadmap 3 artifact/evidence support
→ capability-to-Phase audit
→ Gate A
→ approved candidates become Planned
```

각 STEP은 별도 coherent change로 검증, 커밋과 push한 뒤 다음 STEP으로 넘어간다. 사용자가 중간
상태를 검토할 수 있도록 STEP을 건너뛰거나 여러 STEP을 한 번에 구현하지 않는다.

## Gate A

Gate A에서는 다음을 함께 제시한다.

- Capability gap matrix와 executable evidence
- Phase 1 focused edit/create/edit/remove 후보
- Exact Polar target call chain과 angle option syntax
- `children`, `compositionSpec`과 parent `graphicSpec` 예시
- Package-level `hconcat`/`vconcat`과 chainable `.facet({ field })` 계약
- 모든 Proposed action/capability의 implementation Phase
- Roadmap 3 artifact/gallery 구조
- Explicitly deferred capabilities

Gate A 승인 전에는 Proposed candidate를 Planned로 승격하거나 `src/` 구현을 시작하지 않는다.

## 완료 조건

- Current package baseline과 known gap이 재현 가능한 근거로 기록되어 있다.
- Possible, awkward와 unsupported capability가 구분되어 있다.
- 모든 Proposed 후보는 concrete chart/use case와 owning Phase를 가진다.
- Runtime, TypeScript, contract, docs와 test evidence 경계가 일치한다.
- Roadmap 3 artifact helper와 gallery가 primitive/public Gate를 지원한다.
- Gate A 결정이 inventory와 Roadmap에 반영된다.
- 전체 기존 테스트와 installed-package consumer 검증이 계속 통과한다.
