# Roadmap 2 — Phase 3 Step 5: Normalized Stack and Color Layout Vocabulary

## 목표

Gate B를 재현하는 low-level normalized stack과 accepted bar/area color layout vocabulary를 구현한다.

## 진행 상태

- [ ] `encodeY({ stack: "normalize" })`
- [ ] `encodeColor({ layout: "fill" })` wrapped hierarchy
- [ ] Bar `overlay`와 `diverging` materialization
- [ ] Area `stack | fill | overlay | diverging` compatibility
- [ ] Point/line/incompatible mark rejection
- [ ] Positive/negative/zero/missing partition fixtures
- [ ] Domain, render order와 legend order preservation
- [ ] Y scale/bar-or-area/axes/grid/legend rematerialization
- [ ] Unsupported layout transition atomic rejection
- [ ] Action-order convergence와 Canvas resize
- [ ] Three approved primitive/public pairs와 PNG
- [ ] Types/docs/current contract/catalog, commits와 push

## 구현 원칙

- Color layout은 semantic encoding에 저장하고 concrete geometry는 mark materializer가 만든다.
- `fill`은 wrapped y normalize assignment를 호출하고 중복 normalization 로직을 가지지 않는다.
- Overlay는 opacity를 자동 변경하지 않으며 explicit series order를 graphical order로 사용한다.
- Diverging는 positive/negative accumulator를 분리하고 automatic domain에 zero를 포함한다.

## 완료 조건

Accepted layout matrix, 세 approved pair와 complete failure/rematerialization coverage가 통과한다.
