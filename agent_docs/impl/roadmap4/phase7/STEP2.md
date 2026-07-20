# Step 2 — Primitive development trajectory와 P7-A

## 진행 상태

- [ ] Gapminder China/South Africa/United States trajectory fixture
- [ ] year-ascending grouped command oracle와 primitive path
- [ ] axes, two-direction grid, categorical legend와 title
- [ ] semantic position과 concrete vertex/order assertions
- [ ] Browser Canvas와 2x Node PNG 검증
- [ ] P7-A review package 작성, commit/push와 사용자 승인

Primitive는 아직 존재하지 않는 `encodePathOrder`를 호출하지 않는다. 기존 line authoring으로 scale/guide를 만든 뒤
independent oracle의 ordered concrete commands를 low-level `editGraphics`로 적용해 목표만 고정한다.
