# Shadow private alpha-mask 계산

## 진행 상태

- [x] 현행 paint·stroke·text·bounds owner와 계약 확인
- [x] Native blur 차이의 독립 probe와 실패 증거 보존
- [x] 순수 alpha-mask kernel과 독립 2D convolution oracle
- [ ] 현재 checkpoint 검사·commit·push 기록
- [ ] 같은 sublayer를 사용한 4개 출력 primitive 검토
- [ ] 사용자 시각 확인 및 공개 flow 연결

Roadmap 9 전체 실행 승인과 부모 agent의 2026-10-28 명시 private 위임으로 진행한다. 이 문서는 공개 API·저장 schema·새 시각 목표의 승인을 기록하지 않는다. Pattern 및 radial 승인도 별도이며 아직 대기 중이다. STEP-017 또는 AT-13 완료가 아니다.

## 현재 owner와 관찰

현행 `grammar/schemas/graphic.js`, `concreteGraphic.js`는 rect/path의 normal|difference, circle의 normal 합성을 허용한다. `renderers/canvas/isolated.js`는 fill+outline source를 한 번 합성하며 Canvas 크기 변경 전에 surface·mode·bounds를 검사한다. `svgSerialization.js`는 difference를 mix-blend-mode로 기록한다. 기존 difference를 새 source-over/multiply/screen 계획 때문에 지우지 않는다. Current PRIMITIVES 앞부분의 explicit normal 거부 문장은 후반부 및 실제 구현과 충돌하므로 공개 통합 시 단일 계약으로 정리해야 한다.

Mark outline은 `strokeStyle`와 `graphicBounds`가 cap/join/miter를 이미 계산한다. Text는 현재 fillText와 확정된 lines/metrics bounds를 사용하며 stroke/halo가 없다. Halo/outline은 이 경계와 명시 stroke geometry를 먼저 재사용해야 한다. Font glyph outline의 준비 방식, text stroke bounds, opacity 한 번 합성은 아직 검증하지 않았다. 별도 opaque style bag이나 renderer fetch를 만들지 않는다.

직접 shadowBlur를 넘기는 것은 공통 결정론적 blur가 아니다. Native Canvas·Browser Canvas·PDF probe에서 blur=8, shadow offset(15,8), source alpha .6, mark opacity .65, shadow alpha .5를 사용했다. Pixel(64,64)의 RGB가 각각 [221,226,230], [219,224,229], [217,222,227]이었다. PDF에는 image sublayer가 생겼다. Blur=0은 이 probe의 PDF에서 image가 없었다. 이는 특정 primitive probe이며 공개 renderer 지원표의 성공 수가 아니다. Raw source/결과는 `.artifacts/paint-effects-study/probe.mjs`, `results.json`, `probe.log`에 보존한다.

[Canvas shadow 표준](https://html.spec.whatwg.org/multipage/canvas.html#shadows)은 source alpha를 offset하고 Gaussian sigma=shadowBlur/2로 처리하는 모델을 설명한다. 그러나 native shadowBlur 단위와 구현 한계가 있으므로 이 private kernel의 명시 pixel-space 계약과 동일하다고 주장하지 않는다.

## Private 계산 계약

`src/grammar/shadow.js`의 `planShadowMask({width,height,blurRadius=0,pixelRatio=1,offsetX=0,offsetY=0})`는 할당 전에 frozen 계획을 반환한다. Width/height는 입력 alpha mask의 **물리 픽셀 정수**, blurRadius와 offset은 이 private 계산의 **logical CSS px**다. Source geometry·color parsing·font·program·renderer 객체를 받지 않는다.

- SigmaPixels = blurRadius × pixelRatio / 2. 양수 blur가 0으로 underflow하거나 무한대가 되면 오류다.
- Support padding = ceil(3 × sigmaPixels). 양쪽 끝을 포함하는 discrete Gaussian weight exp(-k²/(2 sigma²))를 합이 1이 되도록 정규화한다. Infinite Gaussian tail을 이 support 밖에서 자른다는 명시 정책이다. 이산 결과가 native Gaussian과 exact하게 같다고 주장하지 않는다.
- Blur 0은 identity다. 빈 mask는 허용하지 않는다. PixelRatio는 finite positive, offset은 finite이며 signed zero origin은 0이다.
- Input은 0..255 정수의 dense own-data 일반 배열이다. Typed array, accessor, symbol, extra/non-enumerable property를 받지 않는다. Width×height와 길이가 맞아야 한다.
- `blurShadowMask(alpha, options)`는 horizontal Float64 pass와 vertical pass 뒤에 alpha byte를 **한 번** round한다. 중간 pass에서 8-bit로 잘라 두 번 양자화하지 않는다. 입력은 바꾸지 않는다.
- 반환 alpha는 독립적으로 새로 할당한 Uint8Array이며 caller-owned다. Wrapper와 bounds는 frozen이지만 byte buffer 자체를 immutable persisted resource로 주장하지 않는다. 공개 저장 경계가 아직 없으며 다음 호출과 입력에 buffer를 공유하지 않는다.
- Bounds origin은 `(offsetX-padding/pixelRatio, offsetY-padding/pixelRatio)`, 크기는 `(width+2padding, height+2padding)/pixelRatio`다. 모든 좌표·끝점이 finite이고 양수 크기가 실제로 표현되어야 한다. Offset이 source pixels에 다시 적용되지 않는다.

현재 private 한도는 각 dimension ≤4096, output pixels ≤1,048,576, convolution work ≤10,000,000, numeric buffer bytes ≤8,388,608이다. Work는 source validation count + 두 pass의 최대 taps + weight 생성/정규화 count다. Numeric buffer bytes는 weight Float64 + horizontal Float64 + output Uint8 buffer의 정확한 합이며 caller input·JavaScript descriptor 객체·전체 process heap의 한도라고 주장하지 않는다. Shape/budget/bounds 검증을 caller alpha payload 접근과 buffer allocation보다 먼저 수행한다. 향후 RGBA sublayer·PNG encoding·pixelRatio surface는 별도 실제 byte/work preflight를 추가해야 한다.

## 검증과 다음 primitive

`test/oracles/shadow.js`는 production import 없이 직접 2D convolution을 계산한다. Sigma .5, 단일255 impulse의 5×5 byte 결과에서 중심158, 축 방향21, 대각3, 나머지0을 literal로 고정한다. Zero blur, input 불변·buffer 분리, symmetry, alpha order, constant interior, offset invariance, 같은 sigma의 pixelRatio equivalence, finite 극대/극소, descriptor 안전성, dimension/pixel/work/byte budget을 확인한다.

다음 primitive 후보는 source mask에 authored alpha를 반영하고 blur·shadow color를 계산한 뒤 source와 shadow를 해당 glyph의 bounded sublayer에 합쳐 mark opacity를 한 번 적용한다. 이 효과 glyph 외의 sibling은 vector로 남긴다. 이는 chart 전체 raster 대체가 아니지만 해당 glyph가 raster sublayer가 된다는 점을 검토 화면/metadata에 명시해야 한다. Blur shape, offset, alpha once, clip, sublayer bounds, 다른 sibling과 compositing order를 같은 PNG payload로 SVG/Browser Canvas/Native PNG/PDF에서 검사한다. Fractional placement·arbitrary shape mask preparation·HiDPI 선택은 별도 fixture 검증 전까지 지원 완료가 아니다.

Radial native PDF의 globalAlpha 보정은 [그 경로의 검증](../radial-gradient/REVIEW.md)에 한정한다. Shadow와 multiply/screen의 전체 glyph source에 선제 적용하지 않는다. Blend의 독립 oracle는 [W3C 합성식](https://www.w3.org/TR/compositing-1/#blending)을 사용해 premultiplied output과 alpha를 계산하고 opaque/transparent backdrop·drawing order·group isolation을 나누어 고정해야 한다. 현재 작은 solid probe는 그중 opaque 최종 backdrop 한 표본만 다뤘다.

Halo/outline/blend/shadow의 public schema·strict color·ref/inspection·bounds/hit·scene/codec·rematerialization·Full/Basic/types·unsupported preflight 및 exact public/primitive equality는 계속 남는다.

## Private checkpoint 검증

Node22.23.1/macOS arm64에서 focused unit37/37, source boundary/discovery/package 계약38/38, 새 shadow module coverage100/100/100, canonical package check가 통과했다. Critical floor95/90/100을 추가했다. Package 실측은681 entries/packed1,014,128/unpacked4,727,468 bytes, branch 한도는681/1,015,000/4,729,000이다. Main 통합 시 이 branch 한도로 최신 한도를 덮어쓰지 말고 최종 tree를 재측정한다. 자세한 명령·입력 hash·실행 probe source는 [PRIVATE-EVIDENCE.json](PRIVATE-EVIDENCE.json)에 있다. Private kernel의 원격 revision은 metadata 기록에서 고정한다.
