# 실제 axis ink를 따르는 inferred legend clearance

## 진행 상태

- [x] Native 네 방향 clearance를 read-only owner로 추출했다.
- [x] Full/Basic 네 edge의 기존 작성·편집 및 Full 삭제 20개 의미/trace가 동일하다.
- [x] 독립 literal·native56검사·새 owner coverage100/100/100, source boundaries13을 확인했다.
- [ ] Canonical current axis line/tick/label/title meaning의 complete dependency proof.
- [ ] R의 dynamic label group/current bounds와 종속 제목을 참조하는 typed lane 연결.
- [ ] Strict rebase/offline/네renderer/실제data/설치/public 문서 qualification.

[AUTHORIZATION.json](../AUTHORIZATION.json)의 remainingApproval과 기존 inferred lane 승인을
재사용한다. 이 checkpoint는 기존 native 정책의 순수 owner 추출이며 공개 지원 범위를
넓혔다고 집계하지 않는다. 기존 lane10 source는 dc704e9f6, pin은5c054738f다.

## Native 식과 경계

`materialization/guides/axisClearance.js.resolveAxisLaneClearance(position,plot,blocks)`는
같은 edge의 실제 occupied blocks에 대해 bottom−plot.bottom, plot.top−top,
plot.left−left, right−plot.right 중 해당 방향의 최댓값과0을 반환한다. Native
`resources.resolveLegendAxisOffset`의 inferred/edge/legacy short-circuit은 그대로이며
original config.offset에 이 값만 더한다. Source/semantic/graphic/trace mutation은 없다.
Explicit offset, in-plot, legacy는 axis 조회 자체를 하지 않는다.

## 후속 typed 설계

Endpoint의 계산된 offset이나 pixel bounds를 보간하지 않는다. Current typed axis line,
tick, fixed label/title 및 R의 dynamic label group이 실제 native 계산으로 내는 nonempty
labelBounds/requiredBounds를 사용한다. Dynamic raw values/layout은 R groups 단일 owner가
저장하므로 lane은 scope/axis owner의 exact reference로 이를 가리키며 layout을 복제하지
않는다. 어떤 current sibling이 unsupported 또는 오염된 경우 전체 종속 lane을 명시
fallback한다. Exact metrics/font binding, label ink, stroke와 원4방향 식을 유지한다.

Timeline3에서는 축과 범례의 native-progress가 서로 다를 수 있으므로 dependency를
범례 progress로 재생하면 안 된다. 각 dependency의 실제 owner progress 및 최종
strokeWidth/paint patch를 같은 read-only sample context에서 적용해 native occupied
bounds를 얻는다. 단순 opacity/fill도 native bounds owner가 결정하는 의미를 유지한다.
현재 child namespace frame 변환도 해당 owner progress에 맞춰 검증한다.

Dynamic label emission과 current dependency samples를 받는 최소 sample context는 root/R와
함수 경계로 합친다. Shared4는 이번 foundation에서 변경하지 않는다. Guide manifest10 및
현재 public signatures도 그대로다. 실제 typed 확대 이후 manifest version을 함께 정합한다.

## 검증

[qualification.json](axis-clearance-foundation-evidence/qualification.json)에 정확 baseline
5c054738f의 resources 모듈을 Node load hook으로만 대체한 before/after20개 비교, 최초
package entry 실패 및 각 Node 실측을 보존한다. 프로브 첫 초안의 Basic removeAxis 호출은
공개 Basic에 없는 메서드여서 Full만 삭제를 검사하도록 정정했다. 또한 최초 operations
필드는 실제 trace가 아니므로 의미 비교만 가능했으며, 최종 프로브는 canonical trace 전체를
포함해 양쪽을 다시 실행했다. 실행 소스의 reset/임시 교체는 하지 않았다.
