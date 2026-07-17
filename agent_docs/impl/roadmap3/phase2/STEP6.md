# STEP 6 — Polar Semantic, Scale and Coordinate Policy

## 진행 상태

- [ ] Theta/radius scale role compatibility
- [ ] Default IDs와 safe coordinate inference
- [ ] Cartesian/Polar mixed-channel rejection
- [ ] One-channel incomplete state policy
- [ ] Scale consumer와 planner registration

첫 position action은 compatible unique Polar coordinate를 재사용하거나 default `polar` coordinate를 명시적으로
저장한다. Ambiguity는 explicit option을 요구한다.
