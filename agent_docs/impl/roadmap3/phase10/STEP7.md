# STEP 7 — Transitive Rematerialization Matrix

## 진행 상태

- [x] Child Canvas resize to all ancestor layouts
- [x] Child scale/data/filter revision to parent snapshots
- [x] Selection/highlight and shared legend synchronization
- [x] Child replacement and facet layout convergence
- [x] Earlier child/parent immutability

각 edit는 canonical child state에서 affected composition ancestors를 dependency order로 다시 materialize한다.
Equivalent final state는 edit 순서와 nesting depth에 관계없이 같은 parent `graphicSpec`과 Canvas calls를 만든다.

Immutable child는 기존 parent를 역참조해 몰래 바꾸지 않는다. Revised leaf를 direct parent의 stable slot에
넣고, revised nested parent를 다음 ancestor slot에 넣는 explicit replacement chain이 transitive closure다.
각 replacement는 complete namespaced snapshot과 layout을 다시 만들며 earlier leaf/parent identities는 유지된다.
