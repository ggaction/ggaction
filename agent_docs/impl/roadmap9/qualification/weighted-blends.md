# 항목별 weighted blend concrete 계약

## 진행 상태

- [x] 기존 concrete/tree/codec/scene/asset/hit 및 네 renderer 경계 선행 조사
- [x] 사용자 전체 승인 재사용 및 source/API 소유 범위 기록
- [x] 순수 수식·concrete shape·일반 extension primitive 연결
- [x] 네 backend·asset·scene·hit 연결
- [x] numeric/pixel/browser/codec/한도/원자성/동일 tar 3 Node 증거

이 기록은 [전체 승인](../AUTHORIZATION.json)의 remainingApproval를 재사용한다. 새 semantic mark나 action, clock/player는 만들지 않는다. 기존 `createGraphics`/`editGraphics`가 concrete type을 작성하고, 애니메이션 sampler는 이 결과를 소비하는 별도 owner다. 기존 Canvas isolated glyph는 한 primitive 내부의 fill/outline을 한 번 감쇠하지만 두 source의 가중합은 제공하지 않으므로 동등 owner가 아니다.

## 저장 shape와 책임

새 primitive type은 `weighted-blend`이며 properties는 `sources`, 선택적 `opacity`, `blend`만 갖는다. `sources`는 2..64개의 `{weight,type,properties,offset,clip,clips}` own-data record이다. `type`은 기존 circle/rect/line/text/path/image만 허용한다. `properties`는 해당 기존 concrete validator를 그대로 사용한다. `offset`은 유한 2원소 배열, `clip`은 그룹 local 좌표의 필수 유한 rect, `clips`는 같은 좌표의 추가 rect/path clip 배열(최대64)이다. source의 primitive 좌표에 offset을 적용하고 source clip을 적용한다. 외부 named owner clip/Canvas frame은 그룹 전체에 기존처럼 적용한다. source identity/semantic 정보는 복제하지 않는다. 그룹 하나가 기존 item identity 하나를 보존한다.

가중치는 0..1 유한수이며 합은 1(부동소수 누산 오차 1e-12만 허용)이다. 0 weight source도 shape와 retained 자산을 검증한다. nested weighted-blend는 저장하지 않는다. 중단 화면을 다시 합칠 때 sampler가 기존 source weight를 곱해 평탄화하며 64 초과는 명시 거부한다. 빈 source 배열은 오류이고, 면적0/opacity0/clip으로 비는 정상 source는 투명이다. weight1 endpoint는 해당 source를 직접 그려 색/alpha 재양자화를 피한다.

source의 `blend`는 생략 또는 normal만 허용한다. 동일 backdrop blend는 그룹의 `blend` 하나에 둔다. 서로 다른 backdrop mode 전환은 투명 source raster의 가중합으로 exact endpoint를 표현할 수 없으므로 sampler가 명시 compatibility 경계로 처리한다. 이 제한을 숨겨 source-over로 대체하지 않는다.

## 수식과 한도

각 source는 자신의 opacity/fill/outline/shadow/image/font를 완성한 straight sRGB RGBA를 낸다. RGB를 선형 sRGB로 변환해 alpha로 premultiply한 뒤 `Σ weight × premultipliedRGBA`를 Float64로 합한다. 마지막에 unpremultiply, sRGB encoding, RGBA8 양자화하고 그룹 opacity/backdrop blend를 한 번 적용한다. alpha0은 RGB0이다. 기존 animation 값 owner의 색 변환 두 함수만 작은 pure `grammar/linearColor.js`로 공유하며 clock/player/endpoint를 편집하지 않는다.

항목 결과는 최대1,048,576 pixels, 전체 장면 결과 보관은16,777,216 pixels, source-pixel 처리량은67,108,864이다. 기존 native coordinate/dimension/path/image/font/shadow 한도를 낮추거나 우회하지 않는다. 모든 shape/asset/계획/할당/픽셀 읽기 실패는 대상 Canvas resize/clear 이전에 발생한다. 장면 전체 screenshot과 renderer 간 파일 중계는 없다.

## backend와 경계 연결

- Canvas/PNG: 각 항목의 유한 paint union과 source clip 안에서만 임시 raster를 만들고 읽는다. ordinary source drawer/isolated outline/pattern 및 prepared shadow/image/font를 재사용한다. source는 한 장씩 읽어 누적하며 재귀 blend surface는 만들지 않는다.
- SVG: 기존 concrete serializer의 source를 재사용하여 필수 rect/additional path clip과 offset을 유지하고, native `linearRGB` arithmetic filter로 가중합한다. endpoint는 원 source serializer를 직접 사용한다. 별도 그림자 처리는 기존 prepared glyph owner가 맡는다.
- PDF: ordinary endpoint는 기존 벡터 경로를 유지한다. 중간 weighted group만 논리1px 밀도의 제한된 per-item raster로 낮추어 삽입한다. 이 명시 lowering은 page screenshot이 아니며 관련 retained 자산을 그대로 사용한다.
- generic tree/codec: 그룹은 일반 primitive이고 embedded sources는 named attachments가 아니다. 한 개의 bounded source visitor로 assets/paint 검사를 재사용한다. codec는 sources를 재계산하지 않고 닫힌 concrete shape를 검증한다.
- scene: version2 node의 새 concrete type으로 유지하고 outer offset을 source offset/clip에 일관되게 적용한다. prepared handle은 exact scene/graphicSpec 및 기존 hash/abort/dispose 규칙을 유지한다.
- hit: weight>0인 source들의 현재 clip 안 painted geometry 합집합을 하나의 item 후보로 반환한다. transparent source/zero weight는 일반 hit에 참여하지 않으며 shadow는 기존처럼 hit geometry를 늘리지 않는다.

## 소유 파일 계획

신규 pure owner: `src/grammar/linearColor.js`, `src/grammar/weightedBlend.js`, `src/grammar/schemas/weightedBlend.js`, bounded embedded source visitor. 기존 concrete schema/bounds, primitive generic validation, scene reconstruction, hit geometry union을 좁게 확장한다. Renderer는 `canvas/weightedBlend.js`를 새 per-item 합성 owner로 하고 기존 canvas/svg/PDF 및 asset visitors에 연결한다. Types `program.d.ts` 및 reexports, Current PRIMITIVES/renderer 안내, architecture concrete type 설명, focused numeric/primitive/codec/hit/4backend/browser/installed consumer를 동기화한다. 최종 실제 파일 목록과 증거는 qualification 기록에서 확정한다.


SVG arithmetic 의미는 [W3C Filter Effects](https://www.w3.org/TR/filter-effects-1/#feCompositeElement)의 premultiplied arithmetic와 linearRGB 처리에 따른다. Native filter의 중간 buffer 양자화 누적을 줄이기 위해 source를 균형 트리의 가중평균으로 결합하며, 같은 총합을 유지한다. 직접 fragment feImage는 filter 원점을 더하므로 source definition에 그 원점의 역 translation을 한 번 적용한다. Browser DPR1/2의 실제 픽셀로 이를 검증한다.

## Source 후보 검증

Source 단계의 affected unit은 최초 326/329에서 ordinary Canvas의 불필요한
save/restore preflight 회귀를 발견했고, weighted group에만 검사하도록 수리한
동일 선택 최종 329/329가 통과했다. Object.values registry 전체 scan 하나를
source-aware tree walk로 대체했으므로 기존 최대 scan budget 2/1은 그대로 두고
실제 감소를 허용한다. 동작을 검사하는 Canvas assertions는 유지했다.

새 5개 owner 집중 coverage는 줄100 / 분기96.05 / 함수100이며 각 owner에
95/90/100 floor를 적용한다. 기존 global/critical floor는 낮추지 않았다.
관련 contracts44/44, package7/7, source docs205/205, 브라우저 DPR1/2 2/2,
PNG/PDF literal8/8이 통과했다. Text/font/outline/shadow 및 image, primitive kind,
3/64개 source, alpha/opacity/backdrop, empty/limits, inactive invalid, caller/input
보존을 포함한다. 최초 실패 로그와 최종 owning 결과는 별도 보존한다.

기존 graphic-hierarchy-migration inventory는 examples/registry.js에 Geo 4개
항목이 누락된 baseline 문제로 실패한다. 기대값을 삭제하거나 면제하지 않았고
부모 integration owner에 전달했다. 본 slice는 이 기존 실패를 성공으로 합치지
않는다. 최종 archive/3Node 설치와 source pin 문서는 다음 qualification에 남긴다.

기존 semantic mark의 concrete type 허용표는 바꾸지 않는다. 후행 animation
sampler가 native endpoint node와 weighted frame의 item 대응을 소유하고,
interaction session의 current-frame type admission도 그 proof와 함께 연결한다.
여기서는 generic Canvas scene 및 prepareConcreteHitShape의 clip/paint union을
지원하며 전체 clock/player 완료를 주장하지 않는다.

## 최종 qualification

구현 source는 `57e37c94e5683ab175f2cf5e0f03da93311e362f`로 고정했다.
[기계 판독 증거](weighted-blend-evidence/qualification.json)에 입력 hash, 원본 실패와
수리 후 결과, 압축 로그의 hash를 보존한다. 최종 변경은 문서 source pin과 실제
설치 bundle 측정에 따른 cap 조정, 이 기록뿐이며 runtime/types는 바뀌지 않았다.

동일 tar SHA-256 `d25f4f3ca3ca49ac50274a906fbb3ba202f6910d0e263340678cd1e8b2964a9b`는
1,048 entries, packed 1,482,864 bytes, unpacked 6,755,280 bytes이다.
Node 20/22/24 각각 공개 runtime 3개, strict declarations, 실행 문서 snippet 1개,
optional peers, 브라우저 bundle 5개가 통과했다. Node20 최초 실행에서는 runtime,
types, snippet, peers가 모두 통과한 뒤 interaction bundle의 기존 cap만 초과했다.
이 최초 결과를 보존하고 같은 archive에서 bundle만 재실행했다. Node22/24는
각각 전체 집중 소비자를 실행했다.

실제 설치 gzip 최대는 Full 732,039 / Basic 387,595 / SVG 24,941 /
interaction 110,455 / graph 44,047 bytes였다. Full 734,000 및 interaction
112,000 cap으로 측정 오차 여유를 반영했고 Basic/SVG/graph의 기존 floor와
경계는 유지했다. source-free 설치 검사는 내부 source를 복사하지 않는다.

문서는 source pin 뒤 source 205/205, built 172 pages 및 1,531 selective
artifacts, 전체 페이지 320/390/768px 및 desktop search browser 검사가 통과했다.
이 결과는 weighted concrete 기반의 집중 qualification이며 전체 release,
애니메이션 player/current-frame admission 및 원래부터 실패하던 Geo registry
4개 항목의 해결을 대신하지 않는다.
