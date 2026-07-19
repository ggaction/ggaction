# STEP 4 — Mark and Encoding Orchestration

## 진행 상태

- [ ] Common mark lifecycle의 실제 중복 범위 확정
- [ ] Point/line/area/arc/rect/rule/text/bar orchestration 책임 정리
- [ ] Color encoding resolver/policy와 wrapped action facade 분리
- [ ] Position과 Polar axis registration 이름 충돌 제거
- [ ] Action trace와 primitive/public exact equivalence 유지

Generic factory가 action hierarchy나 mark-specific policy를 숨기면 도입하지 않는다.
