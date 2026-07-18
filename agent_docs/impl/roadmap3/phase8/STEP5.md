# STEP 5 — Outer Axes and Shared Guide Grammar

## 진행 상태

- [x] Occupied row/column edge selection
- [x] Incomplete final-row oracle
- [x] Concrete guide bounds and placement
- [x] Shared legend compatibility resolver
- [x] Child-guide removal and parent promotion plan

Outer axes는 layout slot이 아니라 실제 occupied cell을 기준으로 선택한다. Each column's bottommost occupied
cell keeps x; each row's leftmost occupied cell keeps y. Independent axes retain their local ticks and domains.

Shared legend resolver는 canonical child guide config와 compatible resolved scales를 사용한다. Categorical,
gradient, discretized color, size와 opacity recipes를 지원하되 incompatible child definitions은 명확히 거부한다.

Outer-axis resolver는 nominal grid 크기가 아니라 occupied placement의 row/column을 직접 비교하며, retained
child axis의 concrete bounds를 parent 좌표로 번역한다. Shared-legend resolver는 child-specific target만 제외한
canonical config와 represented resolved scale 전체가 동일한지 확인한다. Ownership plan은 child별 keep/remove
axis, 제거할 legend kind와 parent promotion source를 immutable하게 반환하며 아직 graphics를 수정하지 않는다.
