# W3 annotation 선행 — source-owned Text scale ownership

상태: approved. [전체 승인](../APPROVAL.md)에 따라 #115를 수정한다. 기준은 `79cdaf81`이다.

Source가 있는 Text의 position encoding은 inherited provenance다. 실제 anchor는 source의 최종 item에서
가져오므로 이 Text가 독립 domain/scale consumer로 참여하면 안 된다. Independent Text는 기존 consumer다.
Source-owned Text 판별을 단일 semantic helper로 두고 scale consumer, scale/Canvas/detach plan, guide rebinding,
orphan-guide cleanup, 새 mark/reference source 추론에 같은 규칙을 적용한다. Source-dependent materialization은 그대로 유지한다.

Source-owned Text에 직접 encodeX/Y를 호출하면 field/datum 종류와 무관하게 child 실행 전에 거부한다.
Source의 position을 편집하거나 editTextMark의 dx/dy를 사용한다. 독립 위치를 원하면 explicit data로 Text를 만든다.
Source 관계를 암묵적으로 끊거나 집계 라벨을 raw row grain으로 바꾸지 않는다.

Primitive target은 Canvas480×320/margin40에서 x=[40,440], source y=[280,40], label y=[272,32]다.
이전 y=[1,3]을 newY=[100,1000]으로 바꾸어도 source의 domain과 primitive/label 위치는 라벨 없는 차트와 같아야 한다.
동일/새 scale ID, axis/grid, category/temporal, resize, source removal, explicit independent Text를 검증한다.
이 수정 뒤 Text datum 위치와 createAnnotation을 계속 구현한다.
