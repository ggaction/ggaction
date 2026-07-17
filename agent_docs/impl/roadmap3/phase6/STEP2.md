# STEP 2 — Pure Concat Layout Grammar

## 진행 상태

- [x] `gap`, `align`, `padding` normalization
- [x] Horizontal/vertical parent extent 계산
- [x] Unequal-size start/center/end placement
- [x] Independent literal oracle와 invariant coverage

Layout grammar는 program이나 trace를 수정하지 않고 child width/height에서 parent 크기와 각 child의 concrete
`x`/`y`를 계산한다. Gap/padding은 non-negative finite value만 허용하고 입력 순서를 보존한다.
