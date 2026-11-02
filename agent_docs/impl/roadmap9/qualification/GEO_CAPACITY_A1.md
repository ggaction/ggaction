# Geo 명시 용량 A1 구현 기록

## 상태와 승인

- A1 제품 소스·기능 검증 완료. Source `784b2165c7f1d691d2f4951e26ebf2d46d0ea5f4`는 push됐고, 이 후속 metadata checkpoint가 문서 source pin과 변경 페이지 검증을 마감한다.
- 검토 source `62e51bb42`의 [구체안 A](GEO_CAPACITY_PROPOSAL.md)를 기준으로 한다. 2026-11-02 root가 기존 [remainingApproval](../AUTHORIZATION.json)의 범위에서 구현 순서 1을 명시 채택했다. 새 질문이나 별도 승인 범위를 만들지 않았다.
- Native binding `capacity`와 concrete path `maxCommands`의 own/closed/default/최대값, native create/edit/source revise/projection/Canvas closure, 네 renderer·scene·codec·weighted bounds·flatten 전달이 이번 checkpoint다. 정확한 공개 계약은 [GEOMETRY](../../../contract/current/GEOMETRY.md)와 [PRIMITIVES](../../../contract/current/PRIMITIVES.md)가 소유한다.
- 기존 clip/generator/graphic count/work/hit stroke/query 한도와 투영 수학·원 vertex는 유지했다. `src/core/validation.js` 변경은 없으며 후행 P 합산의 explicit generated ceiling 200002를 낮추지 않는다. Geo 고유 explicit ceiling 200000은 Geo/path normalizer에서 닫는다.
- Animation camera payload/version/transport는 P 공개 v4 합산 뒤 A2에서 별도로 연결한다. 이번 제품 변경과 지원 주장에 포함하지 않는다. B proof 최적화, 큰 stroke hit와 query, 최종 P95/SLO도 미완료다. full Geo/AT56/STEP071/077 완료가 아니다.

## 단일 소유 경계

- `grammar/geo/capacity.js`가 native 옵션 기본값과 정규화, exact binding↔graphic 선언 검산을 소유한다. `selectors/graphicCapacity.js`는 retained composition을 따라 실제 scoped binding만 조회한다. 최초 selector→grammar import는 boundary 검사에서 거부되어 이 역할로 분리했다.
- `grammar/pathTopology.js`는 path별 선언과 command 수를 cache 조회 전에 검사한다. 기존 path grammar, scalar 계산 순서, clip/generator 기본 한도는 같다. `pathCommands`, `pathGeometry`, concrete schema와 bounds는 명시된 같은 path 정책을 전달한다.
- Native materializer는 aggregate projected point/command를 먼저 제한하고 각 path에 선언을 기록한다. Primitive edit와 editable restore는 scoped native binding과 일치해야 한다. Standalone concrete는 native 권한 없이 concrete schema를 만족한다.
- Renderer source에는 semantic 조회나 새로운 renderer별 옵션을 추가하지 않았다. 기존 graphicSpec 소비가 path 선언을 보존하며 Canvas/PNG/SVG/vector PDF와 source-free scene에서 검증됐다. Weighted sources도 같은 concrete path 검증을 쓴다.
- Capacity 생략 기본은 projected 10000 / command 30000, 명시 필드는 정수 1..200000이다. 생략 edit은 기존 값을 유지하고 `{}`는 기본값을 정규화한다. own data와 closed field, undefined/null/accessor/inherited 거부, 낮은 정책 재검산, caller 불변성과 실패 원자성을 회귀로 고정했다.

## 원 입력과 독립 수치 검산

원 fixture는 하나의 GeoJSON FeatureCollection/LineString이며 i번째 원좌표는 `[-30 + 60*i/(N-1), (i%2 ? 1 : -1)*5]`다. 원 1k/10k/100k, 모든 행, precision 0.5, source-segment refinement, 400×400 Canvas, scale 100→sqrt(20000)→200을 유지했다. 기대 equirectangular 좌표를 native output에서 역산하지 않고 `x=200+scale*lon*pi/180`, `y=200-scale*lat*pi/180`으로 전 command 검산했다.

| 원 vertices | 실제 commands | 최종 source 기능 실행 total |
| --- | --- | --- |
| 1000 | 1999 | 350.07 ms |
| 10000 | 19999 | 2951.12 ms |
| 100000 | 199999 | 30981.45 ms |

- `2N-1` 수/순서와 모든 좌표를 확인했으며 최대 오차는 3.98e-13이다. 원100k 입력 SHA256은 `3abb4487631f9099de7725acc9bf1fec159d3c6807f5abeba6e583ef3d5d5079`다. 기본 정책의 10k/100k 거부는 그대로다.
- 네 형식 검산은 Canvas=PNG decoded pixels, Canvas scene 동일 pixels, native=source-free SVG와 모든 path command, raster image 없는 PDF vector stream의 선 수를 확인한다. Backend 간 서로 다른 glyph/AA의 강제 equality는 사용하지 않았다.
- 최초 dirty-source 실행은 `geo-capacity-large.json`으로 보존했다. selector 책임 수리 뒤 최종 source에서 별도 `geo-capacity-large-final.json`을 실행했고 모든 src/types 파일 SHA가 source commit 직전과 같다. 각 실행의 scene hash는 실제 identity allocation을 포함하므로 실행 간 같은 scene hash라고 주장하지 않는다.
- 위 시간은 단발 기능 admission이며 독점 production P95나 SLO 합격이 아니다. No drop/chunk/guard 우회다.

## 검사 결과와 한계

[원 로그·JSON·재실행 helper](geo-capacity-a1-evidence/) 및 [해시 목록](geo-capacity-a1-evidence/SHA256.json)에 결과를 보존한다.

- 영향 unit 92/92, 최종 focused coverage 439/439. 변경 영역 12 critical owner가 각 기존 floor를 통과했다. 추가 계측한 `editGraphics` 전체 수치는 92.58/95.57/91.67이며 별도 전체 owner floor 성공으로 확장하지 않는다.
- Persistence 광역 owning 3292/3292, 후속 attribution 3010/3010, 원 보고 99.74/98.09/92.31이다. 기존 OHLC/Pyramid/nearest 45/45 보완의 동일 source V8 offset 합집합은 53 함수 모두 호출됐음을 확인했다. 이 합집합 증거와 원 coverage 보고를 분리했고, 단일 canonical 보고의 functions 100%나 whole-repository coverage 성공으로 바꾸지 않았다.
- Source/package/discovery/type/문서 경계 owning 47/47, 최종 package/discovery/truth 33/33, 추가 negative+truth 15/15. 독립 4backend 소형 회귀 2/2.
- 실제 Chromium에서 원100k / 199999 commands를 DPR1/2 각각 전수 검산하고 native/source-free Canvas·SVG를 확인했다: 2/2, 약19.94초. Hit/SLO 결과로 세지 않는다.
- 문서 전체 최초 244 중242 통과, search index byte cap 2실패를 원본 보존했다. 실제1093644bytes에 최소1093700cap을 반영한 해당 owning31/31이 통과했다. 최초 build186pages/1604LLM 통과; source-pin 뒤 같은 범위와 변경2page×4width를 재확인한다.

## 동일 archive의 설치 소비자

최종 archive SHA256: `6fb7f03f61270293ed0cec0443272ffe0db834dd7d4b4fd2a7ac017709d34f13`.

- Node20/22/24 각각 같은 archive에서 public runtime2 + strict TS + 실행 문서 snippet + optional peers + 6 minimal entry bundle 모두 통과했다. 첫 runtime은 원1k→10k→100k 전체와 원자성/scene, 두 번째는 1k의 source-free 네 출력 형식이다. Fresh-process editable restore는 network hooks0과 graphic equality를 확인한다.
- runtime1 시간은 Node20 28838.60ms / Node22 25938.22ms / Node24 22762.34ms, runtime2는184.39/155.27/147.14ms다. 성능 qualification이 아니다.
- 최초 Node20 harness가 optional peers 설치 전에 canvas를 import한 실패와 기존 bundle cap 초과를 따로 보존했다. 순서를 수리하고 최종 archive를 모든 Node에서 다시 사용했다. 원 실패 archive와 final archive를 혼합하지 않는다.
- 실측 최소 bundle ceiling은 Full785300 / Basic425500 / Animation334400 / Interaction136900이며 SVG26000/Graph46000은 그대로다. 원 최댓값은785238/425444/334301/136880이었다. README와 architecture 현재 표를 동기화했다.
- Package는1246entries / Node22packed1788941 / unpacked8068202bytes다. Node20 원 동일 product 측정1792600bytes에 따라 cap1246/1792700/8068300을 쓴다. 용량 변경을 성능 성공으로 세지 않는다.

## 재현 및 다음 경계

Evidence helper의 상대 import는 저장 이력을 위한 원 실행 위치 `.artifacts/` 기준이다. Helper를 그 위치로 복사한 후 같은 Node PATH에서 실행한다. 테스트 본체는 canonical test/consumer 경로를 소유하며 roadmap 기록을 import하지 않는다.

```sh
node .artifacts/geo-capacity-coverage.mjs
node --test test/unit/geo/capacity.test.js test/contracts/geo-mark-types.test.js
node --test test/charts/geographic-marks/capacity.render.js
node --test test/browser/geographic-capacity.browser.js
node .artifacts/geo-capacity-large.mjs
node .artifacts/geo-capacity-package.mjs
GEO_EVIDENCE_PREFIX=geo-capacity-final-installed node .artifacts/geo-capacity-installed.mjs
```

큰 원100k와 renderer/설치 실행은 CPU 슬롯을 조율해 직렬 수행했다. 모든 프로세스는 자연 종료했고 large 슬롯을 반환했다. 이후 root 통합에서 P v4의 넓은 명시 endpoint 한도와 기존 정책을 보존한다. A2는 camera state/closed payload/strict restore/sample capacity 의미를 그 안정 union에서 별도로 구현·검증해야 한다.

## Source pin 후 최종 확인

- 공개 source pin은 `784b2165c7f1d691d2f4951e26ebf2d46d0ea5f4`이며 src/types 전체는 최종 large receipt와 byte 동일하다. 재생성 후 canonical package를 다시 생성해 archive `6fb7f03f…34f13`의 정확 SHA256 동일성을 확인했다. 설치를 반복하거나 새 archive의 결과로 바꾸지 않았다.
- Source-pin 문서 owning31/31, built186pages/1604LLM, 변경2page(`api/geometry`, `extension/primitives`)×1440/320/390/768 총8개의 containment/Axe/console 검사를 통과했다.
- 첫 source-pin browser 실행은 기존 Primitive 도식의320폭 `scrollable-region-focusable` 1개를 발견했다. 해당 도식에 `tabindex=0`만 추가하고 실제 focus+ArrowRight scroll까지 확인했다. 원 실패 로그와 회복8개를 별도 보존한다. 이 문서 전용 수정은 package/runtime 입력을 바꾸지 않는다.
- Browser 원100k 2건은 repository ES modules의 canonical browser-host 검사다. 동일 archive의 설치 검사는 Node public runtime과6 production entry bundles이며, 설치된 production browser100k 성능 qualification으로 합쳐 주장하지 않는다.
- 변경 runtime은15 owner JS와 generated `inspectionDescriptors.js` 1개, 선언2개다. Core/generated ceiling과 renderer 구현/animation kernel은 변경0. 최종 source/pin 차이는 docs/evidence뿐이다.
