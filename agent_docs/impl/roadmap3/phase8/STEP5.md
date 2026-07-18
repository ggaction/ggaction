# STEP 5 — Outer Axes and Shared Guide Grammar

## 진행 상태

- [ ] Occupied row/column edge selection
- [ ] Incomplete final-row oracle
- [ ] Concrete guide bounds and placement
- [ ] Shared legend compatibility resolver
- [ ] Child-guide removal and parent promotion plan

Outer axes는 layout slot이 아니라 실제 occupied cell을 기준으로 선택한다. Each column's bottommost occupied
cell keeps x; each row's leftmost occupied cell keeps y. Independent axes retain their local ticks and domains.

Shared legend resolver는 canonical child guide config와 compatible resolved scales를 사용한다. Categorical,
gradient, discretized color, size와 opacity recipes를 지원하되 incompatible child definitions은 명확히 거부한다.
