# Geo typed animation 준비와 연결

## 진행 상태

- [x] 원안 camera/clip 의무와 기존 cameraInterpolation·stream·markGeometry owner를 대조했다.
- [x] remainingApproval를 재사용하고 공개 graph 안정6492d12f6와 별도 branch로 분리했다.
- [x] Native group의 원 feature/완료 projection/반지름을 닫힌 값으로 준비한다.
- [x] 기존 camera kernel과 native stream으로 실제 중간 geometry를 계산한다.
- [ ] Shared planner/sample/rebase/strict offline에 연결하고 공개 소비자를 검증한다.

## 범위와 승인

[remainingApproval](../AUTHORIZATION.json)의 잔여 API/schema/architecture 승인을 재사용한다.
[원안 animation](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/animation.ko.md)의
Geo camera quaternion/log-scale/translation 및 projection clip 의무다. 이번 준비 checkpoint는
공개 export/schema를 추가하지 않으며 Current 지원으로 표시하지 않는다.

기존 `grammar/geo/cameraInterpolation.js`는 동일 projection과 정적 clip/center/precision
호환성, quaternion 최단 회전, positive scale와 translation을 소유한다.
`geoMarkGeometry`는 radiusDeg의 실제 구면 원, `projectGeometry`는 winding/holes/complement,
antimeridian·horizon·viewport clip와 bounded refinement를 소유한다. 이 계산을 복제하지 않는다.
완료된 fit의 scale/translation을 `projectionParameters`에서 읽고 샘플 중 fit을 다시 실행하지 않는다.

## 준비값과 소유 파일

`grammar/animation/geoState.js`는 group의 닫힌 값·version·호환성·반복 샘플을 소유한다.
`materialization/animation/geo.js`는 명시 native layer의 exact projection/geometry refs와
최종 drawable feature grain, resolved radiusPx를 읽는다. 원본을 pixel에서 역산하지 않는다.
작은 `validateGeoSourceBinding`과 `validateGeoMarkGeometry` 추출은 기존 native binding/geometry 검증을
재사용하기 위한 것이며 정책을 바꾸지 않는다.

Group은 scoped key, native binding, coordinateKind, projection InputRef, normalized camera
parameters, logical source ID와 `{key, geometry, radiusPx, polygonWinding?}` feature 배열이다.
Geometry는 native 정규형이고 join/LOD의 현재 exact source 의미를 한 번 보존한다. 클립 밖의
feature는 제거하지 않는다. 매 sample의 전체 projected parts가 현재 camera에서 다시 계산되어
숨김/출현과 seam의 part 수 변화까지 native 결과를 따른다. Native source row/field와 paint는
이 numeric state에 중복 저장하지 않는다.

같은 scoped source와 feature key의 geometry/binding/winding이 같을 때 camera와 radius를
보간한다. Source geometry/topology/정적 projection 정책이 다르면 명시 crossfade 이유다.
Feature 추가/삭제·순서 변경은 keyed correspondence에서 다루며, geometry 변경을 임의 vertex
lerp로 숨기지 않는다. 반환 geometry는 카메라와 함께 불변이며 현재 sample group을 다음 준비의
endpoint로 사용할 수 있다. 복원은 정규형·unknown version·getter·추가 필드·budget을 거부한다.

## 후행 연결 의무

Root partition, 다른 담당 Cartesian과 공유 planner/sample/provenance seam을 조율한다.
Feature별 dynamic clipped parts를 단순 endpoint node 목록에 억지로 제한하지 않고, 실제 현재
parts와 stable feature/part role·native hit 연결을 검증해야 한다. 정확 t0/1은 원 graphicSpec/scene
참조를 유지한다. 이 준비 checkpoint만으로 공개 typed Geo, Text labels/annotations, offline hit,
네 backend/player/session 또는 STEP061–064 전체가 완료된 것은 아니다.

## 준비 checkpoint 검증

두 새 owner는 직접 공개 entry에 연결하지 않았다. 기존 native Geo 검증과 합친234개가
통과했고 해당4owner line100/branch97.32/function100을 확인했다. 기존95/90/100 floor를
유지하며 branch를 낮춘 별도 기준은 없다. Node20/24에서도 새11개와 기존camera10개를
합친21개씩 통과했다. 원 최초실패는 신규fixture의 scene1/scene2 읽기와 composition/graticule/
primitive-edit API 사용 오류이며 runtime 동작을 바꾸지 않고 현재 공개계약대로 고쳤다.

숫자중간값, 현재 camera 재기준, horizon 재출현, seam part 분할/통합, planar holes,
radiusDeg120 complement, graticule, great-circle hint, final size mapping과 caller 불변을
검증한다. Null/빈geometry는 native 계산대로 빈parts이며 unknown fields/getter/cycle/invalid
shape/feature budget은 사전 거부한다. 정규화된 group을 다시 prepare하여 복원하고, process
내 authentic prepared plan의 변조/unknown version은 sample에서 거부한다.

## 동적 feature admission 연결 결정

`remainingApproval`와 2026-10-30 root 확인을 재사용한다. 양 끝점에서 보이지 않는 feature가
중간 camera에서 나타날 수 있고 antimeridian part 수가 바뀌므로 endpoint node index를
만들어내지 않는다. Scoped native Geo owner의 모든 drawable feature·완료 camera·최종 appearance와
실제 named collection frame/그리기 순서를 준비하고 현재 native stream이 생성한 parts를 방출한다.

- 준비 state는 `groups`에 numeric geometry와 동일 feature 순서의 appearance를 한 번 둔다.
  `items`는 endpoint scene 순서의 `{group,key,role}` 또는 null이다. Hidden owner도 group을 유지한다.
- `collectTransitionGraphics`의 기존 concrete tree walk가 named collection의 frame·scene insertion
  위치를 관찰하게 한다. Clip/offset 계산을 다른 owner에서 복제하지 않고 semantic 조회도 추가하지 않는다.
- Native Geo의 feature style/part identity와 paint materialization을 기존 owner에서 공유한다.
  Object-space pattern은 현재 shape bounds, plot-space pattern은 준비된 명시 plot origin을 사용한다.
  직접 primitive 수정은 실제 endpoint와 native 의미를 비교하여 명시 fallback으로 보존한다.
- Camera 생성 part의 closed decision은 실제 feature item key/part role과 Geo kernel을 갖는다.
  Native metadata proof는 actual program+scoped owner+feature key를 사용한다. 현재 endpoint에 없는
  scene index나 과거 endpoint pixel에서 원 데이터를 추정하지 않는다.
- strict restore는 group/appearance/frame/lineage/scene role 정합성을 다시 검증하고 입력 budget을
  누적 적용한다. Endpoint exact refs, 기존 point/graph/Cartesian/partition 의미는 보존한다.
- 현재 hit는 `resolveMarkSourceItems`의 source grain을 기존 metadata owner에서 재사용하며
  computed 담당과 조율한다. Renderer는 완성 concrete nodes만 소비한다.

공개 sampler 연결 전 이 독립 admission/helper 단계의 결과를 별도 검증한다. 동적 feature를
준비만 한 상태로 실제 planner/player/hit 완료를 주장하지 않는다.


## 동적 준비 검증

새 presentation은 양 끝점에서 viewport 밖인 feature가 중간에 출현하는 실제 native 결과,
seam의 part 수 변경, 중첩 반복 owner의 clip/offset, empty collection 순서, object/plot pattern과
outline/shadow를 보존한다. Primitive 수정은 원 그래픽을 덮어쓰지 않을 fallback으로 남긴다.
Actual child ID가 namespace 문자열과 구분되는 hidden-feature origin도 검증한다.

누적 owning445개 및 boundaries35개 통과 후 추가된 원점·literal collection 회귀까지 포함한
coverage266개가 통과했고 변경6owner는100/94.94/100이다. Node20/24에서는23개씩 통과했다.
Native Geo renderer8개 통과, pattern4backend1개는 기존 fixture의 dependency mode 누락 때문에
처음 실패했다. 실제 Chromium에서 geographic-math bare import 오류를 확인해 canonical
startStaticServer의 repository dependency mode만 설정했고1/1 재검증했다. 원 실패는 보존한다.
Public sampler·현재 hit·offline 재기준은 후행으로 남는다.
