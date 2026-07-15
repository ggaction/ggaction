# Roadmap 2 — Phase 3 Step 7: Bar Width, Offset Padding and Reassignment

## 목표

Gate C를 재현하는 `encodeBarWidth` width modes, `encodeXOffset` padding과 atomic grouped field
reassignment를 구현한다.

## 진행 상태

- [ ] Mutually exclusive `band | pixels` normalization
- [ ] Default/omitted/reassignment width policy
- [ ] `paddingInner`와 `paddingOuter` validation/defaults
- [ ] Explicit/reversed offset range geometry
- [ ] Canvas resize와 pixel/band width behavior
- [ ] Same-field direct xOffset scale/padding reassignment
- [ ] `encodeColor(layout: "group")` atomic color+xOffset field reassignment
- [ ] Matching domain/order와 existing legend rematerialization
- [ ] Zero-bandwidth, ambiguity, mismatch와 invalid-option failure matrix
- [ ] Earlier-program immutability와 action-order convergence
- [ ] Three approved primitive/public pairs와 PNG
- [ ] Types/docs/current contract/catalog, commits와 push

## 구현 원칙

- Offset scale이 slot geometry와 padding을, bar-width action이 slot 안의 final width를 소유한다.
- Width보다 큰 bar와 explicit overlap은 허용하되 non-finite/zero width와 zero bandwidth는 오류다.
- Field 변경은 `encodeColor`가 wrapped matching `encodeXOffset`을 호출해 atomic하게 수행한다.
- Old named scales는 자동 삭제하지 않고 current consumer plan만 deterministic하게 갱신한다.

## 완료 조건

세 approved pair와 width/padding/reassignment boundary 및 rematerialization matrix가 통과한다.
