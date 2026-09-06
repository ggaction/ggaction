# W2 C2 — Opacity sample의 실제 간격

[전체 승인](../APPROVAL.md) 아래 #104를 수정한다. 기준 `23a64dbcf28f8964cca1ed38acd58cb0b4f8316e`의36cases에서22overlap cases와20labels.offset 불일치를 재현했다.

Sample occupied radius는 radius+strokeWidth/2다. 모든 edge와 title arrangement에서 labels.offset은 visible symbol edge와 label edge 간 실제 거리다. Side의 기존 -2px 보정은 제거한다. Side sample outer edge를 기존 baseX에 맞추고 title/label mirrored 방향을 유지한다. Side pitch는 max(itemGap,occupied diameter,label font height)다. 첫 item은 기존 plot.y+46 anchor를 최소로 하고 visible title bottom 뒤 gap12와 item half height를 확보한다.

Horizontal top-title arrangement의 equal center pitch는 max(56,itemGap*2,occupied diameter+itemGap,max label width+itemGap)다. 기존 기본 pitch를 유지하면서 큰 원/label의 이웃 겹침을 제거한다. Label은 occupied sample bottom 뒤 labels.offset에 배치하고 title은 sample top보다12px 위에 끝난다. Inline arrangement는 title prefix와 각 sample occupied diameter+labels.offset+label width를 측정하며 이웃 item 사이 itemGap을 유지한다. Hidden title의 width/height/prefix를 제외한다.

Final horizontal align/offset/border는 기존 occupied union owner가 처리한다. Side/Canvas fit과 cross-guide collision도 유지하며 공간 부족은 immutable error다. Full만 opacity encoding을 지원하는 기존 Basic 경계는 바꾸지 않는다. 새 parameter/renderer 분기는 없다. Custom radius/stroke/font의 유효한 결과와 잘못된 default side label gap 교정은 관찰 가능한 변화다.

독립 literal primitive targets를 public 수정 전에 작성·렌더링한다. Canvas2400×2000/margin500/count3/offset40,values0/5/10의 right mixed,top stacked,bottom inline 세 variant를 사용한다. Paired graphics/order/pixels,36case audit,hidden/style/position/count/content/Canvas/scale/filter/remove/multi-block lifecycle와 real Cars/package/browser/docs를 검증한다. Categorical/interval/width 내부 sample extent 감사와 W2 전체 통합은 계속 남는다.

공유 side lane의 추가 회귀도 같은 수정에 포함한다. Left intrinsic label은 sample 왼쪽의 right-aligned anchor지만 lane은 symbol→label 읽기 순서를 사용한다. 공통 label column 계산은 anchor와 symbol center의 절대 거리를 보존한다. 큰 opacity sample의52px 거리를 음수로 처리해44px default column으로 축소하면 안 된다. 이 변경 전에 left shared lane의 네 번째 literal primitive target을 렌더링·확인했다.
