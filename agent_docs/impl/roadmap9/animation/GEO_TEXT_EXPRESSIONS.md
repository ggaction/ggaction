# Geographic Text 현재 카메라 표현 전환

## 진행 상태

- [x] Current의 camera + content/static-layout 동시 전환 후행 의무와 기존 owner를 확인했다.
- [x] `AUTHORIZATION.json#remainingApproval` 및 부모의 구체안 승인을 재사용한다.
- [x] 공통 raw 의미와 최대 64개의 평탄한 표현을 준비·검증한다.
- [x] 현재 카메라의 native Text/layout/leader 결과를 per-item blend로 합친다.
- [x] 현재 frame 재기준·strict offline·정확 endpoint·한도와 원자 실패를 검증한다.
- [x] 현재 hit/접근성 대표 표현·실제 font metrics와 네 renderer를 검증한다.
- [x] Current/types/docs 및 같은 archive 3 Node 증거를 고정한다.

시작점은 Cartesian 완료 `6830445aa`(source `d939c695a`)이며 독립 branch
`codex/roadmap9-animation-geotext-expressions`에서 진행한다. 새 일반 Text family나
전체 animation/STEP077 완료 선언을 포함하지 않는다.

## 승인·원래 의미

[남은 승인](../AUTHORIZATION.json)의 `remainingApproval`은 원안 잔여 API·저장·
아키텍처·시각 결정을 포괄한다. 부모는 공통 raw identity/source/anchor/camera 1회,
평탄한 최대 64개 표현, 현재 native layout 재생 및 weighted blend 방식을 명시 채택했다.
기존 `geoTextTracks`는 content/static style/layout이 다르면 endpoint pixel crossfade했으며,
이 경로만 현재 카메라를 따르는 의미 전환으로 완결한다. 같은 source/membership·호환
projection/clip을 요구하고 다른 raw geometry/topology/unsupported backdrop는 원래 fallback을
유지한다. 표현별 leader 발생·미발생은 source membership 변경이 아니다.

## 단일 저장 구조

`native-geo-text@2`의 presentation은 다음 닫힌 필드를 갖는다.

- 공통: scoped key, coordinateKind, exact projection ref, normalized current parameters,
  entries(identity/source/anchor), plotOrigin, bounds.
- expressions: 1..64개의 `{weight, properties, textMetrics, layout, leader}`.
  `properties`는 공통 entries 순서의 concrete native Text 속성 배열이며 x/y는 기존과 같이
  raw anchor에 상대적인 native offset이다. Text 문자열·줄·폰트·정적 외관은 이 표현에만 둔다.
  properties의 null은 formatted content가 없거나 native placement가 생략된 경우다.
  명시 text:"" primitive는 null과 달리 native output을 보존한다.
  weight는 finite (0,1]이고 합은 1이다. Native endpoint는 한 표현의 weight1이다.

Raw anchor/source/digest/identity는 표현마다 복제하지 않는다. 현재 camera/bounds도 한 번만
보존한다. 복원은 새 kernel version, 닫힌 own-data, identity/source token, 동일 token anchor
일관성, 실제 forward geometry와 output item을 검산한다. Sampled-only digest는 과거 데이터의
출처 인증서가 아니다. 표현들은 현재 값이며 이전 plan/frame/program을 저장하지 않는다.

## 샘플·재기준

현재 하나의 camera를 기존 `cameraInterpolation`으로 계산하고 모든 표현의 raw anchor를
기존 projection owner에 넣는다. 각 표현은 기존 Text bounds/fill, collision layout, leader
owner로 독립 배치한다. 현재 projection clip/visibility를 그대로 적용한다. 같은 raw item/role의
실제 primitive들을 기존 weighted-blend로 합친다. 누락된 primitive를 가짜 graphic으로 만들지
않고 가시 source의 weight 합을 opacity로 보존한다. 하나만 가시이면 해당 primitive의 opacity로
스케일하며, 둘 이상이면 정규화 weight와 group opacity를 사용한다.

Content/layout이 동일하고 기존 solid appearance 보간이 호환되는 경우 기존 typed 보간을 유지한다.
정적 표현이 다르면 각각의 native 표현을 현재 camera에서 재생하여 weight로 합친다. 재기준은
현재 표현 weight에 새 transition 비중을 곱하고 평탄화한다. 동일 표현은 합치고 zero weight만
제거하며 tiny positive weight를 임의 삭제하지 않는다. 합산 64개 및 기존 stream/work/node/pixel
budget은 allocation/forward 전 preflight한다. 정확 raw t0/t1은 원 frame/graphicSpec identity다.

최대 weight의 실제 현재 그려진 Text를 scene의 대표 표현으로 검증하며 동률은 뒤 표현이다.
기존 keyboard metadata는 표시 문자열을 저장하지 않고 정적 accessibility export/formatter는
native program을 읽는다. 새 공개 sampled accessible Text API는 만들지 않으며 native text를
임의 교체하지 않는다. 따라서 scene 대표와 정적 native metadata의 의미를 구분한다.
Hit geometry는 실제 visible source들을 포함하고 raw source identity/lineage는 그대로 유지한다.
Primary native origin과 raw lineage는 target source를 유지한다. 최대 weight 표현은 표시 Text에만
적용하며 다른 revision의 출처로 primary lineage를 바꾸지 않는다. 각 weighted source의 font
metrics는 실제 표현 origin에서 독립 검산한다. Offline은 bytes/profile을
보존하며 새 native program authority를 만들지 않는다.

## 소유와 최소 연결

- `materialization/animation/geoTextGeometry`: closed state, native layout/geometry owner.
- `materialization/animation/geoText`: native preparation, exact source proof/origin.
- `animation/geoTextTracks`, `geoTextFrames`: current camera 표현 준비·샘플·ordered emission.
- 필요한 작은 표현/weighted output helper는 위 책임을 분리하되 계산을 복제하지 않는다.
- 공유4 및 timeline owner는 부모 소유다. 예상 exact seam은 geographic Text의 weighted-blend
  primitive admission, actual expression별 metric origins 전달, timeline endpoint style accessor다.
  실제 repro/patch 범위를 먼저 전달하고 별도 승인된 delta만 적용한다.

Timeline의 explicit item style patch는 모든 현재 표현에 적용한다. 표현들이 서로 다른 endpoint
style 값을 가지면 하나의 scalar boundary를 추정하지 않는다. 같은 property가 모든 표현에서
유일할 때만 기존 timeline boundary로 제공하고, 그렇지 않은 explicit style track은 명시 거부한다.
Camera geometry retime은 표현 수와 독립적으로 기존 한 clock/progress를 사용한다.

## 검증

다른 문자열·font/size/wrapping/offset·collision/leader를 같은 camera 이동과 함께 시험한다.
현재 native camera에서 별도로 배치한 두 결과와 weighted pixel/geometry를 비교하고, rotation,
clip-hidden→visible, inset/namespace, current rebase/offline, content tie의 scene 대표와 정적 native metadata 경계를 검증한다.
Getter/추가 field/version/weights/anchor/font/geometry 오염 및 >64 표현·work 초과는 원자적으로
거부해야 한다. 네 renderer와 source-free 같은 archive 3 Node 소비자로 닫는다.

## 연결 승인과 복구

부모가 재현 후 승인한 공유 delta는 sample의 actual collector slots/order·metrics[],
frameEndpoint의 supplied metrics 보존·weighted-blend admission, timeline의 expression style/leader
accessor에 한정했다. planner/frameProvenance는 수정하지 않았다. Native leader가 없어도 실제
parent collection frame은 보존해 역방향/재기준에서 label clip을 leader frame으로 추정하지 않는다.

첫 renderer 검사는 서로 다른 Text rasterization의 가장자리까지 동일 좌표로 비교해 실패했다.
원 로그를 보존하고 각 backend의 현재 native camera로 작성한 두 expression을 독립 weighted
primitive로 조합한 결과와 exact 비교한다. Canvas의 실제 두 native source 공통 내부 픽셀에는
선형광 literal `[188,0,188,255]`를 별도로 검산한다. SVG·PDF의 glyph antialias를 서로 같은
픽셀로 강제하지 않는다. 성공 여부와 원 실패는 최종 qualification 기록에 분리한다.

## Source checkpoint 검증

Source는 `5a958cd1d118b5a7bc53ebd2d44c78ec5b7774cb`이며 다음 증거를 보존한다.

- Animation 및 영향 Text owning 544/544, 변경9 owner100/94.68/100; 기존각95/90/100 floor 유지.
- Labels/layout/annotation3종의 Canvas·PNG·SVG·PDF와 Chromium Canvas/SVG DPR1·2 통과.
- 기존5실데이터×3 native camera 레시피의 planar cell에 현재 label content/font 표현 비교를 추가, canonical16/16 통과. 새 corpus파일/분모 없음.
- Source 소비자3건 및 같은 archive `ca26ce2c45656c03b4e5e01225470410d83381d5bb5aa9b840c27a8a02da4f5a`의 Node20/22/24 각각3 runtime·strict types·optional peers·6bundle 통과.
- Source/discovery/문서 상한33, package/type14, 문서 원232중230(생성물 stale2) 후 owning47 통과.
- Package1193entries / packed최대1704713 / unpacked7690735, 최소cap1193/1705000/7691000.
  Animation installed269758→269800, Basic422903→423000. 이전 Basic422900초과3bytes 원로그 보존.
- Source pin 이후 owning47/47, built186페이지·1598 선택 LLM 산출물 및 전체 페이지 320·390·768px browser 검사를 마쳤다. 최초 system Ruby2.6 build 실패는 보존하고 설치된 Ruby3.3 도구로 preflight/build/built/browser를 복구했다.
- [고정 증거](geotext-expression-evidence/qualification.json)는 source input·원 실패·회복 로그·동일 archive·대표 renderer 산출물의 hash를 보존한다. 소스 고정 뒤 변경은 문서 provenance와 이 기록·증거뿐이다. 최종 전체AT60/077은 root 합산 의무다.
