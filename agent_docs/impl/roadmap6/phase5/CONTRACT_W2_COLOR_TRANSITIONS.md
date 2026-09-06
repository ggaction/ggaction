# W2 C2 — Compatible color legend edge transitions

[전체 승인](../APPROVAL.md)과 [W2](CONTRACT_W2.md) 아래 #100의 stale right-only 제한을 수정한다. 기준은 `e712b644803d174b0043829bd47d958ac70653a3`이다. 기존8cases는2accept/6reject이며 모두 destination family의 직접생성이 가능한 edge다.

Full editScale과 nested encodeColor의 공통 transition owner에서 position을 보존한다. Left/right는 vertical·center·top-title, top/bottom는 horizontal default interval flow·left/center/right align·top-title 교집합을 허용한다. Common target/title/visibility/inferred mode/labels/titleStyle/border/offset은 보존한다. 새 family의 count/gradient size 또는 interval symbol/itemGap은 그 family default다.

Interval columns는 horizontal에서 명시되면 단일 gradient에 보존할 수 없어 거절한다. Side의 columns1은 원래 유일한 열과 동등하므로 허용한다. Horizontal vertical flow, inline title, custom interval symbol/itemGap, custom gradient count/size는 조용히 버리지 않고 오류다. Side noncenter gradient align도 destination interval과 호환되지 않아 거절한다. Basic structural transition 제한은 유지한다.

새 destination geometry나 renderer 구현을 만들지 않는다. 네 edge direct creation은 이전 item/guide 작업에서 검증했으며 transition과 direct destination의 full graphicSpec/order 비교 및 기존 color-transitions primitive/public PNG를 사용한다. Point/aggregate Bar/Rect,3discretized types,양방향,edge/align,hidden/custom title,scale/Canvas/encoding replay,shared companions와 immutable overflow를 검사한다. Current/types/docs와 packed Node/browser를 같은 변경으로 갱신한다.
