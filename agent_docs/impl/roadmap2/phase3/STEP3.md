# Roadmap 2 — Phase 3 Step 3: Histogram Bin Controls and Reassignment

## 목표

Gate A primitive를 재현하는 `binStep`, `binBoundaries`와 atomic `encodeHistogram` reassignment를 구현한다.

## 진행 상태

- [ ] Shared three-mode bin option normalization
- [ ] Zero-anchored exact-step boundary calculation
- [ ] Strictly increasing irregular boundary calculation
- [ ] Explicit domain precedence와 compatibility validation
- [ ] `encodeX.bin` semantic storage와 concrete boundary persistence
- [ ] `encodeHistogram` field/bin reassignment
- [ ] Existing stack/color/legend preservation
- [ ] Scale/bar/axes/grid deterministic rematerialization
- [ ] Negative/constant/empty/boundary/exclusivity failure matrix
- [ ] Target inference, ambiguity, immutability와 atomic failure
- [ ] Three approved primitive/public pairs와 PNG
- [ ] Types/docs/current contract/catalog, commits와 push

## 구현 원칙

- Bin grammar는 pure calculation이며 program과 trace를 모른다.
- Aggregate action은 wrapped `encodeX`와 `encodeY`를 사용하고 child validation을 복제하지 않는다.
- Resolved bin mode와 boundaries는 semantic state에 남기고 renderer는 final rect만 읽는다.
- Reassignment가 실패하면 partial x/y semantic이나 stale graphic을 남기지 않는다.

## 완료 조건

세 approved pair와 exhaustive bin/reassignment coverage가 통과하고 earlier program이 보존된다.
