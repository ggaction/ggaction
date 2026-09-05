# W2 C2 — Hidden categorical title bounds

[전체 승인](../APPROVAL.md) 아래 #101을 수정한다. 기준 `9ecb134be97a65958d40d99389cdbdddb199da24`다. Categorical color/series의 숨긴 title은 grid height, inline prefix/gap, border와 fit 판단에 기여하지 않는다. Visible title geometry는 유지한다. Legacy-bottom의 samples/labels는 기존 Canvas 고정 anchors를 유지하고 hidden border의 위쪽 경계는 실제 item 높이에서 구한다. 보이는 item 자체가 plot margin을 넘으면 여전히 오류다.

Primitive-first target은 `.artifacts/roadmap6-authoring/hidden-categorical-targets.mjs`의 literal graphic chain이다. Top/bottom Canvas1000×800/margin250/A,B color legend에서 title:false의 border height61→36, top border y193→218, bottom label y589→564다. Top sample y230과 legacy sample anchors는 그대로다. Top target을 렌더링해 확인했다. Stable primitive/public full graphicSpec와 PNG를 같은 실행에서 비교한다.

Hidden title의 text/style/titlePosition 수정, edge/legacy, color/series, border, Canvas/scale replay를 검사한다. Stored inferred/custom title/style은 유지하며 복원 시 visible bounds를 검증한다. 다른 family와 combined lane에는 같은 visibility 규칙을 적용하고 일부 독립 정렬 문제를 이번 수정의 완료로 포장하지 않는다. 실제 occupied alignment와 큰 recipe/grid spacing은 별도 C2 작업이다.

복원 검사에서 legacy-bottom의 visible title 자체 Canvas bounds가 검증되지 않던 경로도 확인했다. 실제 title bounds 검증을 추가하되 valid visible geometry는 바꾸지 않는다.
