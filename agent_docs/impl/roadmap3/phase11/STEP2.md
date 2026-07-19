# STEP 2 — F-012 Numeric Font Weight

## 진행 상태

- [x] Exact `0.0.3` reproduction과 600/700/string control 확인
- [ ] Browser와 Node가 공유하는 renderer policy 확정
- [ ] Text, title, facet, categorical legend, Cartesian/Polar label 회귀 추가
- [ ] Runtime, type와 typography 문서 동기화
- [ ] Focused Node PNG, browser, package 검증

공통 Canvas text renderer에서 numeric weight를 backend-safe CSS font string으로 변환한다. 같은 public input이
Browser와 Node에서 다른 font size로 해석되지 않아야 하며, glyph 높이를 `fontSize`의 합리적 배수로 검사한다.
