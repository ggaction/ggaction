# STEP 3 — F-013 Right Categorical Legend Offset

## 진행 상태

- [ ] Exact `0.0.3` create/edit reproduction 실행
- [ ] Right categorical layout의 hardcoded displacement 제거
- [ ] Symbol, title, labels와 background가 같은 offset origin 사용
- [ ] Four-direction categorical와 right continuous control 회귀 추가
- [ ] Focused guide, browser와 render 검증

Right categorical legend도 다른 방향과 같은 plot-boundary + explicit offset 계약을 사용한다. Create와
`editLegendLayout`은 동일 resolver 결과를 내며 8→80 변경에서 모든 legend component가 72px 이동해야 한다.
