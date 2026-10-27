# 복합 geometry paint와 디자인 계약

## 복수 subpath

현행 src/grammar/pathCommands.js는 M/L/C/Z만 허용하며 처음 M 하나와 마지막 Z 하나만 허용한다. 이를 subpath state machine으로 바꾼다. 각 subpath는 M으로 시작하고 L/C를 포함하거나 point-only일 수 있다. Z는 현재 subpath를 닫는다. Z 뒤에는 새 M만 올 수 있다. 연속 Z, M 전 L/C/Z, nonfinite coordinate, unknown key를 거부한다. point-only subpath는 bounds에는 포함하되 채움 면적은 0이다. 현행 30,000 command limit를 유지하고 복합 path 전체 합계에 적용한다. 더 큰 geo는 primitive collection으로 분할하며 semantic feature key를 공유한다.

fillRule은 nonzero 또는 evenodd, 기본 nonzero다. stroke는 열린 subpath를 닫지 않는다. fill은 backend의 implicit close 의미를 공통 schema에 명시한다. hole을 하얀 도형으로 덮지 않는다. source ring winding을 일괄 뒤집지 말고 geo adapter의 외곽/구멍 구분 후 canonical orientation을 부여한다. clip도 같은 compound contract를 사용한다.

Cubic B(t)=(1-t)^3P0+3(1-t)^2tP1+3(1-t)t²P2+t³P3. bounds는 x/y 도함수의 (0,1) 실근과 endpoint를 평가한다. control polygon의 bounds만 쓰는 과대 bounds와 sample points만 쓰는 과소 bounds를 구분한다. flatten은 de Casteljau 이분, control-to-chord 최대거리≤tolerance까지 반복한다. tolerance는 scene CSS px로 변환한 후 적용하며 default 0.25px, maxDepth 20, 초과 시 진단을 반환한다. close segment와 zero-length segment를 명시적으로 처리한다.

arc를 cubic으로 내릴 때는 각 segment angle≤π/2, control factor 4/3 tan(Δθ/4)를 사용하고 더 작은 오차가 필요하면 adaptive 분할한다. full-circle에서 start=end라는 이유로 빈 path를 만들지 않는다. path 문자열 간 interpolation은 금지한다.

검증 fixture: 외곽 (0,0)-(10,10), 구멍 (3,3)-(7,7)의 면적은 84, 섬 (12,0)-(14,2)을 추가하면 88이다. (5,5)는 hole, (1,1)는 fill, (13,1)는 island다. cubic (0,0),(0,10),(10,10),(10,0)의 y최댓값은 7.5이고 bounds [0,0,10,7.5]다. 회전/translation/clip 후 hit와 occupied bounds를 함께 비교한다.

## 공통 primitive 소비자 목록

concreteGraphic/graphicBounds/graphicClip validator → primitive create/edit → materializer → Canvas path/fill/stroke → SVG serialization → native PNG/PDF → scene serialization → hit → accessibility item metadata → persistence를 모두 갱신한다. 한 renderer의 permissive 동작에 기대지 않는다. unsupported property는 action 시점에 거부한다.

새 mark adapter는 resolveItems, materialize, rematerialize, bounds, hitShape, semanticRole, highlightBaseline, lineage, sceneTopology를 제공한다. 실제 함수명은 기존 capabilities/policies registry 형태에 맞춘다. 별도의 parallel registry를 생성하지 않는다. 적용 불가 consumer도 이유와 시험을 남긴다.

## Paint 자원

기존 계획의 7개 texture style인 solid, diagonal, antidiagonal, horizontal, vertical, cross, dots를 유지한다. solid는 반복 없는 단색이며 나머지 여섯 style은 하나의 벡터 tile geometry 체계로 만든다. diagonal과 antidiagonal은 방향이 반대다. 이름만 바꾸어 기존 요구를 누락하지 않는다. pitch>0, strokeWidth≥0, phase=[x,y] finite, foreground/background 유효 색, coordinateSpace='plot'|'object'를 저장한다. plot은 같은 frame에서 phase가 이어지고 object는 item bounds 원점에서 반복한다. pattern의 alpha는 색 alpha×mark opacity로 딱 한 번 곱한다. clip 밖 ink는 없어야 한다.

linear gradient는 기존 계약을 보존한다. radial gradient는 center/focal/radius, stops를 정규화하고 radius>0, focal이 radius 밖이면 error다. stop offset은 [0,1] nondecreasing, 같은 offset은 hard stop으로 보존한다. default interpolation은 기존 color 계약을 재사용한다. svg defs ID는 resource hash+scope로 충돌 없이 만들고 renderer 객체는 저장하지 않는다. PDF가 native paint를 구현하지 못하면 동일 tile geometry의 vector lowering을 사용하고 조용한 solid fill 대체는 금지한다.

## Image와 font

resolver는 asynchronous host 함수로 uri, expected SHA256, MIME, byte limit, AbortSignal을 받아 bytes/dimensions/hash를 반환한다. resolve 후 createImageResource가 immutable 결과를 저장한다. renderer는 network fetch를 하지 않는다. URI만 남은 editable snapshot은 offline-ready가 아니다. export bundle에는 content-addressed payload와 license/attribution metadata를 포함한다. hash mismatch, decode error, CORS, abort를 구분한다. tainted Canvas는 export 전에 진단한다.

image fit contain/cover/fill, align 0..1 두 축, viewport clip을 고정한다. 200×100 image를 100×100 contain하면 rendered100×50, 중앙 align이면 y=25다. cover면 200×100을 유지하고 좌우50씩 clip한다. zero dimensions와 음수 size는 거부한다.

font resolver는 family/style/weight/bytes hash/metrics provider version을 저장한다. textMetrics는 실제 사용 font에 묶는다. load 전 fallback으로 측정했으면 완료 후 affected layout을 다시 계산하고 stale result는 버린다. deterministic export는 bundled font를 요구한다. 한글·combining mark·emoji ZWJ·hard break를 code point slicing으로 쪼개지 않는다. line text/origin/bounds는 materializer가 결정하고 renderer는 재측정하지 않는다.

## 디자인 우선순위와 null

ggaction defaults < chart-family defaults < theme < plot/mark style < explicit channel/mark/guide < named interaction overlay 순서다. 각 resolved property에 winning source를 inspect할 수 있게 한다. omission은 현행값 보존/생성 시 inference, 0/false/빈문자열은 해당 option이 허용하면 유효한 explicit값이다. null을 universal reset으로 만들지 않는다. 계약이 허용하는 nullable property만 null이고 reset은 해당 기존 API의 auto 규칙을 따른다. interaction style은 baseline에서 매번 계산하여 opacity가 누적되지 않게 한다.

theme schema에는 color palette, background, text family/size/weight/color, guide stroke/ticks/grid, spacing token, pattern palette를 넣되 resolved graphics 좌표를 넣지 않는다. theme edit는 property dependency로 재계산한다. color만 바뀌었는데 node force simulation을 다시 실행하면 실패다.

## Layout solve

text measure → guide intrinsic bounds → reserved lanes → plot bounds → marks → final occupied bounds → ancestor composition 순서로 계산한다. explicit Canvas dimensions와 margins를 보존한다. 최대 4회 고정점 solve, CSS px 변화≤0.1이면 수렴으로 제안한다. oscillation 또는 공간 부족은 layout-unsatisfied와 required bounds를 반환한다. 폰트 크기를 몰래 줄이지 않는다. layout 같은 입력은 같은 결과여야 한다.

동일 column의 plot/header/footer 정렬은 mark bounds만으로 계산하지 않고 retained guide, title, rotated text, border까지 포함한다. ragged facet의 occupied edge, empty panel, nested concat, shared legend, explicit child dimensions를 검증한다. responsive resize는 child program을 임의 crop하지 않고 root layout intent로부터 재계산한다. insets/panel별 frame id를 보존하고 single-Y validator를 재실행한다.

## 추가 paint와 furniture 의무

shadow, halo, outline, blend를 style capability matrix에 포함한다. halo/outline은 text 또는 mark 경계의 명시 stroke geometry로 낮춘다. shadow는 offsetX/offsetY/blurRadius/color를 저장하고 bounds를 확장한다. blur는 동일한 deterministic filter 또는 명시 raster sublayer lowering으로 네 export에서 구현하되 chart 전체 raster 대체는 금지한다. blend는 source-over/multiply/screen을 첫 native 지원 집합으로 제안하고 compositing order 및 premultiplied alpha fixture를 둔다. unsupported backend는 action/export preflight에서 명시 진단하며 지원 완료로 세지 않는다. headline/deck/source-note/footer/annotation은 named typography와 lane resource를 갖고 title만 바꾸는 방식으로 축소하지 않는다.

responsive label policy는 wrap→skip→rotate의 declared sequence다. maxLines/minPlotSize/skipStride/rotationCandidates를 explicit로 저장하며 각 단계 적용 reason을 inspect한다. threshold 너비 양옆에서 layout이 반복 진동하지 않아야 한다. 모든 phase에서 font fallback, source note, shared footer를 occupied bounds에 포함한다.

SVG image asset은 resolver에서 element/attribute allowlist를 검사하고 script/event-handler/external-resource를 거부한다. decode한 image는 immutable content hash로 고정한다. active SVG document를 DOM에 그대로 삽입하지 않는다.
