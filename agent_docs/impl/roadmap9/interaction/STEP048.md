# STEP048 — current scene의 private 공간 인덱스

## 진행 상태

- [x] [전체 승인](../AUTHORIZATION.json)과 STEP047 검증 checkpoint 재사용
- [x] 기존 immutable CanvasScene을 받는 private bounded BVH broad phase
- [x] exact narrow phase, stale scene 거부, row/resource lineage와 의미 중복 제거
- [x] guide 5종 명시 role, z-order/distance/stable key 정렬 독립 검증
- [x] Node20/22/24 각38개, 경계33개, 새 owner100% coverage
- [ ] concrete scene→geometry/semantic adapter와 실제 모든 guide materializer 연결
- [ ] STEP035 중첩 composition 및 공개 interaction/browser/AT33 통합
- [ ] STEP049 current frame lifecycle과 AT34

이 checkpoint는 순수 계산을 검증한 것이며 STEP048 또는 전체 AT33 완료 표시는 아니다.
문서·타입·codec에 새 public 지원이나 저장 schema를 추가하지 않았다.

## 소유권과 최소 입력

`grammar/hitIndex.js`는 명시 `prepareHitIndex(scene,entries)`→`hitIndex(index,scene,point,options)`를
소유한다. 기존 `createTransitionScene(...,{format:"canvas"})`의 owned immutable version2 객체를
그대로 받는다. Scene 객체와 정확히 다른 identity는 내용이 같아도 stale로 거부한다.
DOM, renderer, 데이터 리소스를 탐색하거나 첫 번째 mark를 추측하지 않는다.

Entry는 `{nodeKey,shape,metadata,zIndex}`다. Node key는 해당 scene에 실제 존재하고 중복되지 않아야 한다.
Shape는 STEP047의 authentic prepared handle이다. Adapter가 명시한 safe integer zIndex를 사용하며
같은 zIndex에서는 painted distance, stable itemKey, 명시 child/owner scope 순으로 결정한다.
Metadata는 `{itemKey,ownerId,role,childPath,rowKeys,resourceRefs}`이며 resource ref는 기존 core validator로
exact revision과 kind를 확인한다. Roles axis-tick/axis-title/legend-item/facet-header/chart-title을 포함해
제공된 의미를 그대로 보존한다. Private 인덱스가 graphic ID 문자열에서 role을 발명하지 않는다.

동일 childPath/ownerId/itemKey의 decorative primitives는 metadata가 일치할 때만 한 후보로 합친다.
서로 다른 edge나 owner의 overlap bundle은 전부 반환한다. 각 후보는 CSS screenPoint와 같은 prepared
transform으로 계산한 geometry-local point를 가진다. Resource resolution은 수행하지 않는다.

## 범위와 실패 원자성

최대100,000 nodes/entries, 준비10,000,000 work, query2,000,000 work로 제한한다. Metadata 문자 길이,
반복 sort/순회, 좁은 도형 검사 비용도 누적한다. 동일 prepared shape는 query 안에서 한 번만 판정한다.
균형 BVH를 반복문으로 구성하고 bounds를 통과한 항목에만 exact clip/fill/stroke/opacity 판정을 한다.
Broad phase는 CSS slop을 포함하며 결과 geometry를 바꾸지 않는다. 부분 결과는 반환하지 않는다.
Caller array/metadata나 이전 program을 변경하거나 freeze하지 않고 output provenance는 깊게 고정한다.

독립4096 rectangle×40 queries oracle에서 모든 후보가 같고 각 query 방문 node는100미만, narrow phase는
최대1이었다. 겹친 복잡 path의 누적 work 실패 후에도 기존 index의 다른 query는 정상이다. 원본 실패,
Node별 실행, 95/90/100 critical floor 및 실측 package는 `index-evidence/`에 보존한다.
Package는819 entries/5,552,006unpacked, 최대1,210,811packed bytes로 cap819/1,211,000/5,553,000을 쓴다.

## Consumer matrix

- 기존 Canvas scene: 실제 createTransitionScene 결과를 그대로 수용하는 read-only 통합 회귀 통과.
- Mark/guide/row/resource metadata: 명시 mapping과 보존/중복 검증 통과. 실제 materializer 자동 수집은 남음.
- Revision/cache: exact current scene identity로 결합, 복제/endpoint scene 거부 통과.
- Ref collector/rematerialization/codec: 저장 상태를 만들지 않는 private 계산이므로 이 checkpoint는 변경 없음.
- Browser/DPR/session/selection commit/animation sampler: 후속 adapter/runtime 검증 의무로 유지.

Source `ce5de4d8b` provenance/machine/LLM 고정 후 docs19/19와 built154pages/1310artifacts를 통과했다.
Browser CSS/JS/images/layout은 같아 ccbce6a6b의 desktop/mobile/Axe 증거를 재사용한다.
