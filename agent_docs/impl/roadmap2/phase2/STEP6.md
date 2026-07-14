# Roadmap 2 — Phase 2 Step 6: Dash Vocabulary and Series Reassignment

## 목표

Gate B를 재현하는 named/constant dash와 `encodeGroup`/`encodeStrokeDash` reassignment를 구현한다.

## 진행 상태

- [ ] Shared named dash registry와 direct pattern normalization
- [ ] Named values를 받는 ordinal dash range
- [ ] Constant `encodeStrokeDash({ value })`
- [ ] Field↔constant atomic replacement
- [ ] `encodeStrokeDash` field/current/new-scale reassignment
- [ ] `encodeGroup` field reassignment
- [ ] Group/color/dash compatibility validation
- [ ] Existing legend inferred title update와 custom config preservation
- [ ] Obsolete legend component cleanup
- [ ] Canvas/scale rematerialization과 trace order
- [ ] Four approved primitive/public pairs
- [ ] TypeScript/docs/current contract/catalog, commits와 push

## 완료 조건

Named styles와 direct patterns가 renderer-ready numeric arrays로만 저장되고 네 visual pair와 전체 failure
matrix가 통과한다.
