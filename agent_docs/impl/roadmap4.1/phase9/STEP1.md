# STEP 1 — Lifecycle and Cross-Capability Closeout

## 진행 상태

- [ ] Current lifecycle, coverage ledger와 selected gap mapping 감사
- [ ] Stable test ownership과 roadmap dependency 감사
- [ ] Representative cross-capability regression 보강
- [ ] Contract/declaration/docs/example/package surface synchronization
- [ ] Full verification과 R41-Exit evidence 고정

## 실행 순서

1. `PROPOSALS.json`의 선택 action/extension을 Current inventory, owning contract, declaration과 public docs에 대조한다.
   빠진 항목은 Current로 동기화하고 의도적으로 제외된 항목은 roadmap non-goal과 current lifecycle 설명으로 닫는다.
2. Stable executable test가 roadmap/Gate 문서를 읽거나 Phase identity에 의존하지 않는지 감사한다. Durable assertion은
   current capability 또는 cross-cutting contract owner로 이동하고 proposal inventory는 역사 기록으로만 보존한다.
3. Removal→selection/highlight, guide removal/edit, derived-owner revision→consumer rematerialization, facet policy
   rederivation의 대표 조합을 public call chain으로 검증한다. Earlier state와 caller input immutability, failure atomicity,
   stable identity와 stale semantic/materialization/graphic 부재를 함께 확인한다.
4. Runtime exports, strict declarations, current contracts, ACTION_INDEX/catalog, architecture routing, public docs/examples,
   generated references/search/LLM output와 installed-package consumer의 정확한 공개 surface를 대조한다.
5. Normal, coverage, Node render, Browser, docs/generator freshness, package boundary와 installed consumer suite를 모두
   실행한다. 실패는 owning capability에서 수정하고 전체 검증을 다시 통과시킨 뒤 R41-Exit package를 commit/push한다.
