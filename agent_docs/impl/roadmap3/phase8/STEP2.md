# STEP 2 — Dataset Dependency DAG and Partition Anchor

## 진행 상태

- [ ] Dataset graph validator
- [ ] Unique partition-anchor resolution
- [ ] Topological replay order
- [ ] Branch, cycle, missing ancestor와 ambiguity errors
- [ ] Independent graph oracle

Visible layer dataset에서 source 방향으로 dependency graph를 추적한다. Facet field가 존재하고 모든 affected
branch가 공유하는 latest row-preserving dataset을 partition anchor로 선택한다. Cell filter는 이 anchor 뒤,
첫 statistical transform 전에 삽입한다.

Pure resolver는 program을 수정하거나 trace node를 만들지 않는다. Literal graph fixtures로 direct,
prefiltered, regression branch, box sibling branch와 invalid graphs를 검증한다.
