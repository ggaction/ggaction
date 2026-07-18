# STEP 7 — Transitive Rematerialization Matrix

## 진행 상태

- [ ] Child Canvas resize to all ancestor layouts
- [ ] Child scale/data/filter revision to parent snapshots
- [ ] Selection/highlight and shared legend synchronization
- [ ] Child replacement and facet layout convergence
- [ ] Earlier child/parent immutability

각 edit는 canonical child state에서 affected composition ancestors를 dependency order로 다시 materialize한다.
Equivalent final state는 edit 순서와 nesting depth에 관계없이 같은 parent `graphicSpec`과 Canvas calls를 만든다.
