# W2 C2 — 최종 guide collision 검증

[전체 승인](../APPROVAL.md) 아래 [W2](CONTRACT_W2.md)의 same-edge guide collision 대칭성을 구현한다. 기준은 `7dc1936de9844c083475f8c806caf4a41db03746`이다. Baseline `.artifacts/roadmap6-authoring/phase5-guide-collision-baseline.json`은 7family×4edge28cases, 실제 overlap 허용18과 authoring-order 불일치4를 확인한다.

Shared resource policy로 categorical/gradient/interval/size/opacity/strokeWidth의 실제 graphic IDs와 effective edge를 수집한다. 같은 target의 categorical+size는 하나의 group이며 retained border도 occupied bounds에 포함한다. Cartesian 각 component는 자신의 position을 쓰며 chart title/subtitle은 title position을 쓴다. Same-edge title↔axis, title↔legend, axis↔legend 및 independent legend group 간 actual occupied intersection은 오류다. Touching bounds는 overlap이 아니다. 명시적으로 겹치는 primitive action은 domain 검증의 적용 대상이 아니다.

계산은 pure layout owner가 책임지고 domain transaction은 materialization owner가 책임진다. Generic core action wrapper나 renderer에 chart-guide 분기를 넣지 않는다. Complete axes/legend/title operations와 Canvas/scale/dependent materialization plan은 내부 child가 모두 갱신된 뒤 검증한다. Private transient validation scope는 중첩 transaction에서만 살아 있고 반환된 program에는 남지 않는다. 특정 operation 이름을 검사하는 우회가 아니라 동일한 aggregate boundary를 사용한다.

Family별 일부 edge의 별도 cross-guide 검사와 title의 불완전한 prefix 목록을 공통 owner로 대체한다. Title와 labels 내부 배치, axis 내부 label/title 검증과 기존 Canvas bounds는 해당 owner에 남긴다. This change는 기존 유효 geometry/default를 바꾸지 않는다. 잘린/겹친 기존 fixture는 원인을 확인하고 명시 공간/배치로 migration하되 separate rejection regression을 둔다. Categorical/continuous 전체 occupied alignment와 scale kind transitions는 별도의 C2 통합으로 남는다.

검증은 family×edge×create order, focused/aggregate edits, 숨김·제거·복원, Canvas/scale/encoding replay, rotated/wrapped title, nested border, 실패 시 원본 semantic/graphic/config/context/trace 불변성이다. 최종 package와 동일 artifact browser, normal/coverage floors, representative primitive/pixels/실제 Cars와 current/types/docs 동기화를 완료한다.
