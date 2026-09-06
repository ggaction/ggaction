# Phase 5 W2 C2 — Same-edge guide collision과 title-first placement

기준 `7dc1936de9844c083475f8c806caf4a41db03746`, 결과는 이 문서를 포함한 commit이다. [전체 승인](../APPROVAL.md)과 [계약](CONTRACT_W2_GUIDE_COLLISIONS.md)에 따라 [#98](https://github.com/ggaction/ggaction/issues/98)과 [#99](https://github.com/ggaction/ggaction/issues/99)를 수정·검증했다. 전체 Roadmap 6과 실제 0.0.13 릴리즈는 아직 미완료다.

## 문제와 원인

7개 범례군 × 4edge의 baseline 28cases에서 실제 overlap을 허용하는 경우18, 작성 순서에 따라 accept/reject가 다른 경우4를 재현했다. 기존 categorical/lane/title의 cross-guide 검사는 family와 edge마다 다른 graphic 집합을 사용했다. Title은 size/width/interval을 일부 누락했고 axis 이후 생성에는 일관된 검증이 없었다. Left axis 전체 strip을 사용하는 일부 검사에서는 실제로 분리된 content까지 거절했다.

새 final-state owner를 적용한 동일28cases는 overlap 허용0, accept/reject 불일치0이다. Dynamic occupied bounds로 충돌 위치를 맞춘 unit matrix는 Full7/Basic5family×4edge에서 두 작성 순서를 검사한다. 실제 Cars392행으로도 Full7×4edge와 두 collision order56개를 검증했다.

추가 title-first matrix에서 bordered gradient/opacity 생성이 before/after를 동시에 지정해 실패하는 #99를 발견했다. 기본 chartTitle 앞 배치와 explicit background 뒤 배치가 중첩된 것이 원인이다. Creation과 title/border 복원에서 explicit relative anchor를 shared placement resolver에 전달해 하나의 기준만 유지했다. 모든7family×4edge의 border 추가·제거, title 숨김·복원, legend 제거와 direct creation의 graphicSpec/order가 일치한다.

## 책임과 의미

`materialization/guides/layout.js`는 canonical resource registry와 axis IDs로 concrete bounds를 수집한다. Pure `layout/guideCollisions.js`는 같은 edge의 독립 block intersection을 검사한다. Same-target categorical+size는 retained nested border까지 포함한 하나의 group이다. Axis 내부 component 제약과 family Canvas bounds는 기존 owner가 담당한다.

Domain action과 dependent materialization plan을 transient nested transaction으로 감싸 sibling guides가 모두 새로운 좌표를 가진 뒤 검사한다. Canvas/scale replay 중 old/new geometry의 일시적인 교차를 최종 오류로 오인하지 않는다. Private flag는 반환 program에 남지 않고 source program/context/trace는 실패 시 보존한다. Core action wrapper, pure generic planner와 renderer에는 chart-guide policy를 넣지 않았다. Extension primitive의 의도된 overlap도 그대로 허용한다.

새 public action, option, type signature나 valid geometry/default 변경은 없다. Existing invalid cross-guide 배치에 공통 오류를 적용한다. Packed entries450→452는 pure layout과 materialization owner 두 모듈을 반영한 조정이다. Packed510000/unpacked2500000, Full254000/Basic140000/SVG25000gzip ceilings는 유지한다.

## 검증

| Evidence | Result |
| --- | --- |
| 집중 guide/title/density/edit/source-boundary | 45/45 PASS |
| Normal | 2884/2884 PASS |
| Source coverage | lines95.39%, branches92.22%, functions99%;84 critical floors PASS |
| Original authoring-order audit | 28cases;overlap18→0,accept/reject mismatch4→0 |
| Real Cars | 392rows,28valid cases,56collision rejections;Canvas replay PASS |
| Representative primitive/public PNG | 25/25 PASS |
| Packed Node/types/SVG/PNG/PDF/MCP/tutorials | PASS |
| Same final artifact Chromium | Canvas/SVG1/1 PASS;4full graphicSpec/order comparisons |
| Docs generate/preflight/build/built | PASS;125pages |
| Catalog/navigation/documentation closeout | 21/21 PASS |

[Package 원장](package-guide-collision-results.json)의 final artifact SHA-256은 `30a1746ee6537e784a0454de1e92f14531d22312643110391120fa8daaef8c58`이다. Entries452, packed509357, unpacked2435370. Gzip Full253716/Basic139979/SVG6437. 현재0.0.12는 개발 checkpoint version이다.

초기 검사 실패도 원인을 확인했다. Source boundary 위반은 bounds projection을 materialization owner로 옮겨 해결했고 boundary 규칙은 유지했다. 과거 일부 family의 error-message 기대는 공통 정책에 맞췄다. 새 consumer probe의 Basic createTitle 사용과 Cars probe의 semantic domain/series-grain 입력은 기존 지원 계약에 맞춰 수정했다. Browser probe의 JSON string 비교는 객체 key 삽입 순서를 drawing order로 오인하므로 Node에서 전체 graphicSpec을 deepEqual로 비교한다. 실제 order array도 이 비교에 포함한다. 정상 최종 검사만 위 PASS 원장에 포함했다.

Runtime 수정 후 normal/coverage/package/PNG를 완료했다. 후속 browser 비교 방식과 closeout 기록만 수정했으며 최종 browser를 다시 통과했다. Docs UI 변경은 없어 responsive browser 전체는 반복하지 않았다.

## 남은 범위

C2 categorical/continuous occupied alignment, hidden categorical title metrics와 gradient↔interval의 compatible edge transition matrix는 계속 진행한다. W3 final-item labels/reference/format, W4 themes, W5 fitting, Phases6–11과 실제0.0.13 릴리즈도 남아 있다. Same-edge collision 완료를 W2 또는 전체 roadmap 완료로 기록하지 않는다.
