# Roadmap 2 — Phase 2 Step 4: Curve Grammar and Line Editing

## 목표

Gate A의 primitive를 재현하는 8-value curve grammar, `createLineMark.curve`와 `editLineMark`를 구현한다.

## 진행 상태

- [ ] Eight-token curve validation과 default `linear`
- [ ] Linear/step family exact command builders
- [ ] Basis/cardinal/monotone/natural cubic builders
- [ ] Short-series fallback과 monotone ordering validation
- [ ] `createLineMark({ curve })`
- [ ] `editLineMark({ target?, strokeWidth?, curve? })`
- [ ] Target inference, ambiguity, empty edit와 invalid option policy
- [ ] Canvas/scale/group rematerialization과 deterministic trace
- [ ] Earlier-program immutability와 atomic failure
- [ ] Approved primitive/public exact pair와 PNG
- [ ] TypeScript, action reference, marks/path docs
- [ ] Contract/catalog promotion, conceptual commits와 push

## 완료 조건

8개 token의 exact command fixture와 renderer parity가 통과하고 두 approved visual variant가
primitive/public pair가 된다.
