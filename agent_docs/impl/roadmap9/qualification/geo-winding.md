# Geographic ring 방향 감사와 명시 입력 계약

## 진행 상태

- [x] 원본 실제 land source의 실패 재현과 기존 보완 영역 검사 확인
- [x] 기존 승인 및 원본 불변성·방향 선택 경계 기록
- [x] source/stream/fit/centroid/labels/LOD 공통 연결
- [x] 실제 자료·literal·renderer·restore·원자성 검증
- [ ] Current/types/docs/evidence 및 안정 checkpoint

## 감사 결과

부모 integration `cb90ed2f5`의 `scripts/chart-gallery/data/land-110m.geojson`은
Natural Earth v5.1.2의 원본 자료이며 SHA-256은
`9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9`이다.
127개 exterior는 모두 시계 방향이다. 현재 geographic stream은 모든 ring을
무조건 뒤집어 private spherical math로 보내므로 127개 feature 모두 태평양
(-140°,0°)을 채운다. 원본 좌표/순서/hash를 바꾸지 않고 재현했다.

기존 `test/unit/geo/stream.test.js`는 반대 exterior winding으로 구면 보완 영역을
명시하는 동작을 검사한다. 따라서 항상 작은 영역을 택하거나 ring role만으로
자동 방향 수정하면 기존 동작과 반구보다 큰 지리적 원의 의미를 삭제하게 된다.
현재 Current의 첫 ring exterior/나머지 hole 및 자동 ring repair 금지와 함께
보존해야 한다. [RFC7946 §3.1.6](https://www.rfc-editor.org/rfc/rfc7946#section-3.1.6)은
외곽 반시계/구멍 시계 방향을 규정하면서 과거의 반대 방향 자료를 거부하지
않도록 권고한다. 현재 입력은 형식 검증을 통과하지만 방향 convention이 명시되지
않아 작성자가 의도한 영역과 다르다.

## 구체 계약

기존 전체 승인 [remainingApproval](../AUTHORIZATION.json)을 재사용한다. 새
자동 repair나 renderer 추론을 추가하지 않는다. `createGeometryData`와
`editGeometryData`에 `polygonWinding: "right-hand" | "left-hand"` 선택을 둔다.
생략 시 기존 right-hand 의미를 유지한다. right-hand는 exterior의 반시계,
left-hand는 exterior의 시계 방향이 내부를 뜻하며 holes는 그 반대다. 실제
원본 data는 left-hand를 명시한다. 반대 방향 ring이 선택하는 큰 보완 영역은
그대로 보존한다. planar에 방향 옵션을 명시하면 의미가 없으므로 거부한다.

이 결정은 source resource의 options 한 곳에만 저장한다. retained values,
normalized feature geometry, source-path, feature identity 및 content hash는
원본과 동일하다. transient math adapter만 필요한 reverse를 수행한다. source
revision은 기존 exact-ref closure를 재사용해 fitted projection, shape/labels,
annotation을 같은 최종 후보에서 갱신한다. Join/LOD는 원 source의 정책을
exact dependency로 조회하며 별도 authored 결정을 복제하지 않는다. LOD의
비활성 feature anchor는 그 지정 source의 정책을 쓴다. generated radiusDeg
원은 source point의 정책과 무관하게 생성 owner의 기존 방향을 유지한다.

## 소유 범위와 검증

공통 input traversal은 기존 `materialization/geo/features.js`에 둔다. Selector의
허용 import 경계를 그대로 유지하고 원래 source policy를 exact refs로 조회한다.
단일 pure 방향 adapter는 `grammar/geo/projectionMath.js`의 기존 stream 및
centroid 변환을 공유한다. Source 옵션 owner, action facade와 기존
materialization 전달 경계만 확장한다. `createProjectionResource`는 기존
candidate input resolver를 받아 join/LOD의 원 source를 정확히 찾는다. 새
semantic/graphic kind, renderer 분기, callback 저장은 없다.

독립 시험은 CW/CCW exterior+hole, seam/pole, 큰 보완 영역, 반구보다 큰
generated disk, 원본 127 features의 육지/바다 literal hit를 포함한다. source
보존·options-only edit의 identity·fit/label/annotation/LOD closure·corrupted
restore·invalid 실패의 old program/trace 불변을 검사한다. 같은 자료의 Canvas/
SVG/PNG/PDF를 확인하며 source/transient 변경을 혼동하지 않는다. 새 옵션은
타입·Current·generated metadata·실제 direct lifecycle witness와 동기화한다.

## 검증 경계

새 옵션의 공개 의미는 Current와 타입에 동기화했다. 별도 원본 자료를 수정하지
않고 같은 canonical land fixture와 manifest를 부모 통합 revision에서 그대로
가져왔다. Canvas·SVG(DPR 1/2)·PNG·PDF의 실제 land/ocean 8점과 구면
보완 영역·seam·pole·120도 disk·TopoJSON 원본 arc 보존을 독립 검사한다.

실행한 Geo 집중 검사 213개 및 기존 critical owner 51개가 모두 통과했다.
이 범위의 line/function은 100%, branch는 98.52%이며 기존 95/90/100 floor를
낮추지 않았다. 타입/패키지 경계 28개, 기존 실제 자료 Geo 48개, 설치된 같은
archive의 Node20/22/24 각각 geometry runtime 4개·strict types·optional peers·
5 browser bundles가 통과했다. 전체 release/global coverage로 확대 해석하지
않는다. 초기 test argument 오류, selector import 경계, unpacked cap 실패와
각 수리 검증은 최종 evidence에 별도로 보존한다.

공통 `buildDirectDataResources`는 `includeEmpty`의 양쪽 값에서 create/edit의
right-hand/left-hand를 서로 바꿔 각 공개 경로의 두 literal을 직접 실행한다.
현재 단계는 owning lifecycle와 inventory의 정합을 검증하며, 이 공통 builder에
의존하는 `realistic-lifecycle-factor-effects`, `realistic-scenario-generator`,
`realistic-scenario-generation-isolation` 전체 합산은 부모 최종 candidate에서
한 번 실행할 의무로 남긴다. 갤러리의 공개 실제 land 호출에 명시 left-hand를
추가하고 fill을 되돌리는 적용도 부모 통합에서 담당한다.
