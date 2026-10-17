# Legends and marks implementation checkpoints

승인: [PROPOSAL.md](PROPOSAL.md), remote `bad3f346`, approval record `f53dd78a`.
번역 작업 및 유료 모델 호출은 중지 상태다. 이 문서는 구현 진척이며 전체 12개 완료 선언이 아니다.

## Checkpoint 1 — existing legend block selectors

- `editLegend`와 focused 5종의 단수 `channel`을 기존 descriptor/family validator에 연결했다.
- target ambiguity, absent channel, selector-only request 및 plural-content/group controls 충돌을 거부한다.
- 선택된 categorical/size 편집에서만 현재 유효 size typography를 보존하고 legacy 공유 상속을 분리한다.
- selector 없는 기존 우선순위/상속은 유지한다. 저장 config의 owner를 추가하지 않는다.
- 완전한 공개 enum/옵션을 유지한 `editLegend` compact card 실측은 3,531 bytes다.
  해당 카드만 3,600 bytes로 제한하고 나머지는 기존 3,360 bytes를 유지한다.
- 검증: 기존 guide unit 650 PASS; 새 selector/persistence/data-scale-Canvas 독립성 6 PASS;
  선택 관련 contract/render/type 30 PASS; installed package consumer PASS;
  실제 고정 데이터 3종 각각 5회 Cartesian lifecycle + SVG 렌더 15 PASS.
- 고정 데이터 cache는 저장소 `/Users/hyeonjeon/Projects/ggaction/.artifacts/datasets/tidytuesday`를
  `GGACTION_TEST_TIDYTUESDAY_CACHE_ROOT`로 지정했다. 테스트가 canonical manifest/hash를 검증한다.
- types, Current, ACTION_INDEX, public reference, generated cards/signatures/machine docs를 동기화했다.
- 전체 새 옵션 literal의 realistic witness 소비자 행렬은 후속 기능 checkpoint와 함께 최종 검증한다.
