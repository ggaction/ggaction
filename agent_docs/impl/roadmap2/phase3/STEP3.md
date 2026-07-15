# Roadmap 2 — Phase 3 Step 3: Histogram Bin Controls and Reassignment

## 목표

Gate A primitive를 재현하는 `binStep`, `binBoundaries`와 atomic `encodeHistogram` reassignment를 구현한다.

## 진행 상태

- [x] Shared three-mode bin option normalization
- [x] Zero-anchored exact-step boundary calculation
- [x] Strictly increasing irregular boundary calculation
- [x] Explicit domain precedence와 compatibility validation
- [x] `encodeX.bin` semantic storage와 resolved scale/graphic boundary persistence
- [x] `encodeHistogram` field/bin reassignment
- [x] Existing stack/color/legend preservation
- [x] Scale/bar/axes/grid deterministic rematerialization
- [x] Negative/constant/empty/boundary/exclusivity failure matrix
- [x] Target inference, ambiguity, immutability와 atomic failure
- [x] Three approved primitive/public pairs와 PNG
- [x] Types/docs/current contract/catalog, commits와 push

## 구현 원칙

- Bin grammar는 pure calculation이며 program과 trace를 모른다.
- Aggregate action은 wrapped `encodeX`와 `encodeY`를 사용하고 child validation을 복제하지 않는다.
- Authored bin mode는 semantic state에 남기고 auto-resolved boundaries는 resolved scale/graphic 결과에만
  구체화한다. Renderer는 final rect만 읽는다.
- Reassignment가 실패하면 partial x/y semantic이나 stale graphic을 남기지 않는다.

## 완료 조건

세 approved pair와 exhaustive bin/reassignment coverage가 통과하고 earlier program이 보존된다.
