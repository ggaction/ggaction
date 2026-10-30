# Geo Text의 현재 camera 의미

## 진행 상태

- [x] 원안 animation·Geo 계약과 본체/레이블/주석 소유자를 대조했다.
- [x] `AUTHORIZATION.json#remainingApproval`의 잔여 API·schema·architecture·visual 승인을 재사용한다.
- [x] stored geographic/feature annotation의 독립 preparation·sample owner와 수치 시험.
- [x] source Text labels의 기존 selection/format/override/placement 준비 owner 연결.
- [x] 현재 camera의 source Text collision layout·leaders·final effects 재실행.
- [x] root appearance v2·guide 안정본 뒤 shared planner/sample/proof 연결.
- [ ] 현재 frame hit/선택·hidden eligibility·graticule/inset·offline·네 renderer 및 설치 증거.

이 문서는 계획과 구현 순서다. Current 지원이나 STEP062/AT44 완료를 선언하지 않는다.
본체의 source 정본은 c8470d1e8이며 native shape/point/line/graticule은 그 경로를 유지한다.

## 원 소유자와 구현 경계

`materialization/geo/annotationSource.js`는 명시 anchor의 exact resource, feature key/LOD,
projection과 coordinateKind를 이미 해결한다. `geo/annotation.js`는 stored position 또는
원 feature의 `geometryCentroid`를 `createProjectionKernel.forward`에 전달하며, native
`concreteTextItem`·font binder·effects·fill materializer로 Text를 만든다. 이 계산을 복제하지
않고 geographic anchor 계산과 concrete Text 준비 부분만 작은 owner로 추출한다.
수학은 `grammar/geo/annotationPosition.js`, 원 native Text 구성은 기존
`materialization/geo/annotation.js`의 함수가 공유한다. Basic에서도 읽는 annotation shape
validator에는 centroid를 import하지 않는다. 최초 경계 검사가 그 잘못된 import를 검출했고
수학 owner 분리 뒤 같은 Basic 경계 검사가 통과했다. 원 실패 로그는 보존한다.

첫 독립 slice는 annotation preparation/pure state다. `materialization/animation/geoAnnotation.js`는
실제 native layer를 확인하고 native owner가 해결한 anchor 원본·camera·Text style을 준비한다.
`grammar/animation/geoAnchor.js`는 descriptor-safe closed state와 버전, 원 anchor source,
정규화 camera를 검증하고 기존 `cameraInterpolation` 및 projection의 forward를 재사용한다.
Shared planner/sample/frameEndpoint/frameProvenance는 root appearance v2까지 수정하지 않는다.

준비 정본은 scoped owner와 exact geometry/projection refs, coordinateKind, resolved parameters,
원 anchor source와 native Text의 상대배치/문자열/paint/font 자산이다. Position anchor는 원
좌표 하나, feature anchor는 원 feature geometry+winding 하나를 가진다. 계산된 centroid와
원 geometry를 함께 정본으로 저장하지 않는다. Text의 상대 x/y는 명시 native dx/dy·placement
owner에서 얻으며 endpoint screen pixel을 역산하지 않는다. Source callback이나 program은
serialized state에 넣지 않는다. Empty/null anchor는 hidden이며 원 source를 버리지 않는다.

호환 camera는 quaternion/positive-log-scale/translation owner를 그대로 사용한다. Static clip,
projection type 또는 원 anchor source가 다른 경우 reason 있는 safe fade다. 문자열과 appearance
변경은 기존 weighted crossfade를 유지할 수 있다. Exact endpoint, 현재 sample의 의미 재기준,
unknown version/extra field/getter/undefined와 실제 forward geometry 검산은 동일 owner가 맡는다.
기존 geometry input/work 및 generated item budget을 적용하고 별도 완화된 cap을 만들지 않는다.
준비 track의 source centroid는 private WeakMap에 한 번 계산하여 반복 sample에서 원 geometry를
다시 집계하지 않는다. 정본 상태에는 원 feature만 있고 복원은 같은 bounded 검증을 다시 거친다.
Text profile은 기존 schema1/2 normalizer, 정확 font identity 및 실제 font payload 검증을 사용한다.
측정값이 없는 font-bound 문자열은 기존 `metrics-required` 오류를 유지하며 추정하지 않는다.
빈 문자열·clip 밖 source의 공개 planner admission은 다음 shared 연결에서 최종 처리한다.

## Source labels의 후속 연결

비공개 `textGeometry.resolvePreparedSourceTextEntries`는 명시 `Map<itemKey,{x,y}>`와 native
item resolver를 받는다. 원점 `{x:0,y:0}`은 준비 단계의 입력이며 기존 출력 pixel에서 뺀 값이
아니다. 기존 `resolveSourceTextItems`가 all/inline/named selection, conditional text/color,
format, textOverrides와 `resolveMarkLabelPlacement`를 그대로 계산한다. 일반 materialization은
원래 constructor 등록 anchor resolver를 계속 사용하며 Basic에 Geo 수학 import를 추가하지 않는다.

`materialization/animation/geoLabels.js`의 `projectGeoLabelEntries`는 exact native layer와 Geo
source를 확인하고 기존 source reader·appearance owner·`identifyGeoLabelItems`를 재사용한다.
현재 projection 밖 feature도 같은 원본 key/rows/lineage로 준비하며 null/empty feature와 빈
content는 제외한다. Graticule은 geometry ref를 꾸미지 않고 원래 projection lineage를 보존한다.
Join 행 재정렬·LOD representationKeys·다른 mark selection의 실제 row/property 의미를 유지한다.
새 DTO나 persisted schema를 만들지 않고 native transient Text definitions만 반환한다. 원 source
geometry는 본체 group에 한 번 남기며 label 정의에 복제하지 않는다.
Private helper의 마지막 `{sourceOnly:true}`는 같은 native membership/provenance 단계에서
반환한다. 이는 font query·현재 projection clip에 의존하지 않는 D source-reader 연결용이며
새 그래픽이나 실제 표시 권한을 만들지 않는다. 표시 여부는 authentic current frame이 증명한다.

이 준비 결과는 collision-layout·leaders·highlight·conditional opacity·final mark effects 적용 전의
native Text 입력이다. 따라서 공개 scene으로 그대로 내보내지 않는다. 후속 public 연결에서 현재
camera의 anchor로 native layout/effect owner를 실행하고 endpoint 그래픽과 대조해야 한다.
원 Text/font owner는 실제 font bytes와 정확 query를 결박한다. 이미 준비된 문자열은 clip 밖에서도
사용 가능하지만 원래 hidden이어서 측정하지 않은 새 문자열은 `metrics-required`로 원자 거부한다.
추정 폭이나 이전 pixel로 그 경계를 숨기지 않는다.

`resolveTextGraphicEntries`와 `geoLabelAnchors`가 selection/format/override/inheritColor/placement,
centroid·clip eligibility를 소유한다. 새 animation owner는 이 결정을 별도로 구현하지 않는다.
숨겨진 feature의 source identity는 body가 보존하는 원 grain과 같아야 하며, 현재 camera에서
보이지 않는 label은 hit 대상이 아니다. Source labels의 hidden admission은 기존 source reader와
Text 준비 경계를 좁게 확장하여 원 feature key·rows·lineage를 한 번 해결하는 방향으로 진행한다.
특히 named selection과 conditional text/color가 있는 경우 native owner의 의미를 그대로 유지하고,
endpoint pixel이나 첫 dataset을 추측해서 부족한 의미를 채우지 않는다.

동적 Text의 native origin은 actual program/childPath/owner/key로 검증해야 한다. Endpoint에 없는
scene index를 만들지 않으며 기존 D source-reader와 current source 교집합 검증을 확장한다.
Offline payload는 실제 Text/font bytes를 보존하지만 native program 권한을 생성하지 않는다.
Graticule label은 generated feature key와 projection ref, inset label은 각 native component의
forward/clip 결과를 사용한다. Body geometry 지원만으로 이 소비자 의무를 닫지 않는다.

## 첫 private preparation 검증

새 anchor/presentation owning15개와 원 native 주석15개는 Node20/22/24 각각30개 통과했다.
현재 branch의 animation+Geo 누적516개, source/package/Basic boundary/discovery/문서 계약48개가
통과했다. 변경4 owner의 coverage는100/97.87/100이며 자동 적용되는 기존95/90/100 floor를
그대로 통과했다. 새 floor나 면제는 없다. 수치·검증의 구체 범위는 test/unit/animation/geo-anchors.test.js가 소유한다.

최초 owning 입력의5개 실패는 비교용 action의 별도 revision·독립 생성 resource logicalId,
부동소수 log-scale 기대, 틀린 fixture paint/shadow 옵션이었다. fixture를 실제 계약에 맞춘 후
owning15개 및 누적516개가 통과했다. 별도의 Basic import 실패는 source 수리 후 owning3개와
누적 contracts48개로 다시 확인했다. 최초 실패를 통과 로그로 대체하지 않고 함께 보존한다.

이 단계는 browser나 installed public animation 검증을 반복하지 않았다. 공개 entry와 shared
planner의 추가 연결이 없기 때문이다. Native 구성 추출의 Basic 경계와 여섯 entry 번들은
세 Node에서 확인했으며 package staging은 canonical owner로 세 Node에서 검증했다.
재현 로그·정확 source 및 artifact hashes는 [private evidence](geo-anchor-evidence/qualification.json)에 기록한다.
Source labels/public current-frame integration, 실제 Font 준비 lifecycle, 네 renderer/offline과
same-tar 설치 소비자는 다음 공개 Geo Text checkpoint의 의무로 남아 있다.

## Source label 준비 검증

비공개 준비14개와 원 Geo labels13개는 세 Node에서 검증하며, 현재 animation+Geo530개,
기존 Text/label177개 및 source/Basic/package/discovery 계약48개가 통과했다. 새 Geo 준비
owner는100/100/100으로 기존 animation-meaning family95/90/100을 통과한다. Shared Text
owner의 새 함수도 owning 검사에서 실행하며 전체 Text regression을 재사용한다.

실측 package는1161entries, unpacked7,512,892bytes, Node22packed1,658,889bytes,
Node20/24packed1,661,620bytes다. 기존상한을 통과했다고 주장하지 않고 최소한도
1161/1,662,000/7,513,000으로 조정한다. 여섯 browser entry는 세 Node source build18개 모두
현재상한 안이며 installed/public frame 검증은 아직 수행하지 않았다. 첫 owning fixture의
placement 옵션 위치·empty constant·Line geometry 선택 오류는 원 실패로그를 보존하고
현재 native 계약에 맞게 fixture를 수정한 뒤 다시 검증했다.

## 공개 sampler 연결의 구체 계약

2026-10-30 root와 `remainingApproval`을 재사용해 다음 작은 준비 경계를 채택했다.
`geotexts`는 기존 의미 vector와 같은 optional `{groups,items}`이며, group은 scope/owner,
exact projection/camera, Text의 raw source anchor, 원 source binding/key/geometry digest,
상대 Text properties/font profile, layout policy/실제 bounds와 명시 collection drawing slot을 가진다.
원 polygon은 body `geos`에만 남긴다. Native endpoint는 같은 geometry에서 기존 centroid owner로
anchor와 digest를 검산한다. Camera sample은 검증한 raw anchor와 현재 camera만 보유하므로
body의 structured-paint fallback과 독립적으로 Text를 forward-project할 수 있다.
이 sampled-only payload는 과거 원 geometry의 역사적 인증을 주장하지 않는다. Point의 준비값처럼
닫힌 source binding·digest·anchor·camera와 현재 concrete 출력의 내부 정합성을 검증하며,
같은 source binding/key/digest에 모순되는 anchor는 두 endpoint를 포함해 거부한다.
원 geometry·winding 변화는 digest가 달라져 명시 crossfade가 된다. Pixel을 역산하지 않는다.

Native all/inline/named 선택·format·conditional content/paint는 preparation에서 원 Text owner가
결정한다. 현재 camera에 맞춰 native collision layout/leader geometry와 fill bounds를 다시 계산한다.
정확 endpoint는 원 객체를 반환한다. Dynamic Text/leader는 `native-geo-text` geographic decision으로
실제 source identity를 갖고 가짜 endpoint index를 만들지 않는다. 현재 의미·font 자산·실제drawing
slot은 rebase/closed offline에서도 유지한다. 일반 edited graphics나 지원하지 못하는 조합은 이유를
보유한 concrete fade이며, 이를 해당 family 의무 완료로 세지 않는다.


## 공개 source 체크포인트 검증

현재 source는 typed camera Text와 exact endpoint/rebase/closed offline를 연결했다.
`.artifacts/animation-geo-text/public-source-owning.log`는 누적 animation와 source/package/type
384개 중 383개 통과이며 유일 실패는 기존 TypeScript fixture의 geographic kernel 단일 값
기대였다. 새 native-geo-text union을 fixture에 동기화한 후
`public-owning-final-2.log`에서 신규12개+strict types1개 13/13 통과했다.
앞서 empty/null-only source에 존재하지 않는 field를 지정한 fixture와 clip reason 기대값,
배경 node를 빠뜨린 budget fixture의 실패도 원 로그에 보존했다. Runtime 오류로 숨기지 않는다.

양 endpoint가 모두 hidden인 5,001개 feature+label의 중간 10,002 item 출력을 실제 생성해
공통 10,000 한도에서 sample/export 모두 거부하고 원 endpoint를 유지함을 확인했다.
Source reader D bridge 합산 뒤 actual click/keyboard, critical coverage, 네 backend, browser,
실데이터, 고정 tar 3Node와 최종 문서는 아직 진행 항목이며 이 source commit으로 완료를
주장하지 않는다. Runtime 원안 전체 Text 의미 보간 의무도 위 fallback 설명과 구분한다.
