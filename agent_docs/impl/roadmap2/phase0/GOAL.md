# Roadmap 2 — Phase 0 Goal

## 목표

Roadmap 2의 모든 visual variant를 primitive-first로 검토할 수 있도록 hierarchical PNG artifact,
recursive cleanup과 static comparison gallery를 구축한다. 동시에 Phase 1의 encoding reassignment가
의존하는 `editScale` parameter contract를 검토 가능한 상태로 만든다.

## 진행 상태

- [x] Roadmap 2 artifact path와 filename contract
- [x] Legacy flat PNG와 hierarchical PNG의 공존
- [x] Recursive artifact cleanup
- [x] Deterministic static gallery generator
- [x] Primitive-only/pair/invalid state 처리
- [x] Existing cars scatterplot baseline pair
- [x] Path, cleanup, gallery unit coverage
- [x] `test:render` gallery generation 연결
- [x] Desktop/mobile gallery browser verification
- [x] Roadmap/agent/test documentation 갱신
- [x] `editScale` review draft 작성
- [ ] `editScale` contract 사용자 승인
- [ ] Phase 0 종료 및 Phase 1 시작 승인

## 산출물

```text
.artifacts/test/png/roadmap2/
├─ cars-scatterplot/
│  └─ baseline/
│     ├─ primitive.png
│     └─ user-facing.png
└─ index.html
```

`npm run test:render`는 기존 flat PNG regression을 유지하면서 Roadmap 2 pair를 생성하고 마지막에
gallery를 다시 만든다. `npm run artifacts:gallery`는 이미 존재하는 artifact로 gallery만 갱신한다.

## 완료 조건

- Structured artifact path는 roadmap/chart/variant/kind를 검증하고 path traversal을 허용하지 않는다.
- Cleanup은 flat PNG와 nested Roadmap 2 directory를 모두 deterministic하게 제거한다.
- Gallery는 chart/variant를 정렬하고 primitive와 user-facing을 나란히 보여준다.
- Primitive-only variant는 visual confirmation 대기로 표시한다.
- `user-facing.png`만 존재하면 generator와 test가 실패한다.
- Existing render suite와 새로운 infrastructure tests가 모두 통과한다.
- `editScale` contract가 승인되기 전에는 Phase 1 scale-backed reassignment를 시작하지 않는다.

## 관련 문서

- [`STEP1.md`](STEP1.md)
- [`EDIT_SCALE_REVIEW.md`](EDIT_SCALE_REVIEW.md)
- [`../ROADMAP.md`](../ROADMAP.md)
