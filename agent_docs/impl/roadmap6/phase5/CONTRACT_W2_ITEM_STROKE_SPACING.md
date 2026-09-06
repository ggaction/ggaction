# W2 C2 — 구간색·선 굵기 sample의 실제 점유 공간

[전체 승인](../APPROVAL.md) 아래 #105를 수정한다. 기준 d3eb4ca0의80case 감사에서32case overlap이며 이번 공통 owner 범위는 interval/width의8case다. Categorical24case는 #106에서 별도로 처리한다.

`layout/legendItems.js`는 각 sample의 local bounds를 먼저 계산한다. Swatch width/height에 양쪽 strokeWidth/2를 더하고, line은 양끝 strokeWidth/2 및 실제 stroke height를 포함한다. 모든 item을 수용하는 공통 slot을 nominal slot과 actual bounds의 union으로 확보한다. Sample origin을 slot의 음수 left extent만큼 옮기고 label은 slot outer right+labels.offset에 둔다. 따라서 동일 sample은 exact offset, 두께가 다른 sample은 minimum offset과 동일 label column을 보존한다. Size의 minimum32 slot과 중앙 정렬을 보존한다.

Side pitch=max(itemGap, occupied height, label height)와 기존 title gap12를 유지하되 실제 sample height로 계산한다. Horizontal grid도 occupied slot width/height를 사용한다. Existing final occupied union alignment, shared lane, border/Canvas fit 및 immutable error를 그대로 적용한다. Default interval stroke0.5와 width의 실제 stroke도 반영하므로 기존 literal reference와 문서가 바뀐다. 새로운 action/parameter는 없다.

Public 수정 전 독립 literal primitive 두 개를 작성·렌더링한다. Canvas1000×700/plot(240,200,520,300): interval right stroke40의symbolx810,labelx852,itemcenter264.5/316.5,title790/220; width top range2..60/count2의slot92,width261.96,최종actualunion중심500. Graphics/order/PNG pair, 네 방향과 horizontal title/columns/direction, large fonts/strokes, hidden/restore, scale/Canvas/filter/content/remove replay, Full/Basic 경계, 큰 Cars data 및 package/browser/docs를 검증한다.
