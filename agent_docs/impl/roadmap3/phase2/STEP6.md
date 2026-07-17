# STEP 6 — Polar Semantic, Scale and Coordinate Policy

## 진행 상태

- [x] Theta/radius scale role compatibility
- [x] Default IDs와 safe coordinate inference
- [x] Cartesian/Polar mixed-channel rejection
- [x] One-channel incomplete state policy
- [x] Scale consumer와 planner registration

첫 position action은 compatible unique Polar coordinate를 재사용하거나 default `polar` coordinate를 명시적으로
저장한다. Ambiguity는 explicit option을 요구한다.
