# STEP 5 — Text Reference Grammar and Gate J-B

## 진행 상태

- [x] IMDb label fixture and deterministic formatting oracle
- [x] Explicit annotated-scatterplot primitive
- [x] Position, alignment, rotation and offset variants
- [x] High-DPI PNG and Gate J-B artifact
- [x] Gate J-B user approval

IMDb rows에서 complete numeric position과 non-empty title을 가진 representative subset을 사용한다. Point와 text
layer는 같은 Cartesian position을 공유하고 text는 graphical offset으로 분리한다. Gate는 library-wide automatic
collision avoidance를 약속하지 않으며 explicit `dx`, `dy`, alignment와 filtering으로 readable annotation을 만든다.
