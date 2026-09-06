# Roadmap 6 Phase 11 X — Integration discovery and Roadmap closeout

## 고정 결과

- W1 source ref는 `4df800e29395e0979bc2ef52a58ebdad0733db73`, W2 source ref는
  `4068121a73a6d34cfd5c8edece13ea3301d5346e`이며 둘 다
  `origin/codex/roadmap6-hierarchical-actions`에 push했다.
- [W1](RESULTS_W1.md)은 234개 action의 hierarchy, relationships, entry support, units, inference와 completion을
  card schema v3로 고정했다. [W2](RESULTS_W2.md)는 H0→H2→H4 chain, H3/composition editors, strict declarations,
  realistic corpus, MCP, renderer와 fresh installed package를 교차 검증했다.
- 이 단계는 새 chart 의미나 시각 target을 추가하지 않는다. 기존 stable evidence를 재실행했으므로 별도 V Gate는
  적용 대상이 아니다.

## 원장 대조

- `ACTION_INDEX.json`: direct 234, user-facing 228, advanced 3, primitive 3, Planned action 0,
  Planned capability 0.
- `PROPOSALS.json`: Phase 0–11과 46개 work package를 실제 결과 문서에 연결했다. B01–B08, D01–D20,
  F01–F19는 모두 `implemented-verified`다.
- F20은 2026-09-05 사용자 범위 결정에 따라 연구·구현 대상에서 제외한 상태를 `scopeDecision`에만 보존한다.
- 승인 범위의 hidden deferral은 없다. Product limitation으로 남긴 Polar/Parallel facet·repeat는 지원한다고
  표시하지 않으며 Phase 10의 explicit coordinate-support matrix가 소유한다.

## 최종 검증

Unit 2,277, contracts 328, charts 578, renderer 216, docs 47, browser 73, realistic 243개가 모두 통과했다. Coverage는
95.46% lines, 92.33% branches, 98.96% functions이고 critical floor 88개가 모두 통과했다. Fresh package는
486 entries, packed 591,993 bytes, unpacked 2,948,977 bytes이며 installed consumer와 세 browser bundle ceiling을
통과했다. 자세한 SHA-256과 bundle/cold-start 수치는 [W2 결과](RESULTS_W2.md)에 있다.

## 종료 판정

- D20을 포함한 47개 승인 범위 항목은 구현·검증 evidence를 갖고 Current surface와 동기화됐다.
- Source, declarations, action cards, generated public docs, MCP resources, renderers와 package가 같은 234-action
  inventory를 설명한다.
- [전체 실행 승인](../APPROVAL.md)이 A/X에 적용되고 실제 종료 조건이 충족됐으므로 R6-P11-X를 approved로 닫는다.
  Roadmap 6은 completed이며 다음 작업은 별도로 승인된 0.0.13 release 절차다.
