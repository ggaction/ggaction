# Radial gradient private kernel과 primitive 검토

> 공개 P1 연결 시 승인된 실행 slice 전체를 `test/charts/structured-paints/variants/radial-gradient/`로 승격했다. 아래 Gate 경로와 미구현 표현은 원 승인 revision의 기록이며 현재 상태는 [P1 구현 기록](../paints/STRUCTURED_FILL.md)을 따른다.

## 진행 상태

- [x] private normalization·focal containment·circle 계산·독립 oracle
- [x] 기존 linear gradient stop 검증의 단일 owner 재사용
- [x] 6종 native primitive와 Canvas/SVG/PNG/PDF 검토 이미지
- [x] 실패한 PDF 후보와 수정된 vector shading의 차이를 수치로 보존
- [x] exact visual target 사용자 승인
- [ ] 공개 paint schema 및 전체 소비자 연결

상태는 `approved`다. Roadmap 9 전체 실행과 부모 agent의 독립 private 위임에 따라 준비했다. 공개 radial paint, STEP-017, AT-13 완료가 아니며 unseen visual target 승인을 가정하지 않는다. Source/evidence revision: `57f70fbcaec0883bb08e9142dc9de0a7daa2d7dc`. 이 revision의 실행 source와 rendered target을 검토한다. 뒤의 metadata-only 기록은 source와 출력 내용을 바꾸지 않는다.

## 사용자 승인 기록

현재 대화에서 사용자가 **“이 렌더링 승인, 구현 계속”**라고 명시 승인했다. Parent `/root`가 해당 답변과 정확한 대상 revision `57f70fbcaec0883bb08e9142dc9de0a7daa2d7dc`을 전달했다. 이 기록은 그 rendered target과 설명한 처리 방식의 승인이다. 앞의 private 구현 범위 설명은 해당 source checkpoint의 사실이며, 현재 Gate 상태는 approved다. 같은 시각 목표의 중복 승인을 요청하지 않고 공개 연결을 진행한다. 공개 API·persisted schema의 아직 정해지지 않은 중요한 선택은 별도 명시하며 STEP017 전체 완료로 기록하지 않는다.

## Private kernel의 정확한 범위

`src/grammar/radialGradient.js`의 `normalizeRadialGradient({center,focal?,radius,stops})`는 frozen plain object를 반환한다. center/radius/stops는 필수이며 focal 생략만 center를 사용한다. 두 점은 finite `{x,y}`, radius는 finite positive, signed zero point는 0으로 정규화한다. 좌표와 radius는 **같은 명시적 수학 단위**이며 아직 public object-bounds mapping이나 scalar radius의 ellipse 정책을 결정하지 않았다. Public `validateFillPaint`는 계속 radial paint를 거부한다.

Focal은 end circle 안이나 경계 위에 있어야 한다. Outside는 error이며 몰래 안으로 이동시키지 않는다. 거리 비교는 scaled hypot로 하므로 극소 radius의 대각점이 반올림 때문에 잘못 허용되지 않고, 최대 finite 좌표의 차이가 overflow하면 거부한다. Caller-owned 객체를 바꾸지 않으며 getter/symbol/non-enumerable/sparse array/unknown option/explicit undefined를 거부한다. Stop 수와 색 문자열 길이는 기존 work limit 10,000,000을 적용한다.

`paint.js`의 기존 stop 검증 본문을 private `validateGradientStops`로 추출했다. Linear 계약과 오류문구는 유지하고, radial은 같은 offset `[0,1]`, 2개 이상, nondecreasing, duplicate offset hard stop, nonempty color string 정책을 재사용한다. 엄밀 CSS 색 검증을 완료한 것은 아니다. `radialGradientCircle(options,t)`는 `t∈[0,1]`에서 focal→center 보간과 radius×t를 반환한다. Color interpolation이나 renderer 객체를 반환하지 않는다.

독립 oracle는 ray/end-circle 교점으로 offset을 계산하며 production import가 없다. `(0,0)` 중심/radius10에서 `(3,4)`의 offset=.5, 경계 focal `(-10,0)`에서 `(-5,0)`=.25, `(-11,0)`은 cone 밖이다. Literal, nested circle containment, translation/scale invariance, 극대·극소 입력, atomic input immutability를 검증한다.

## 실행 primitive와 검토 화면

`test/gates/radial-gradient/primitive.program.js`는 명시적 native Canvas drawing source와 SVG primitive source다. `fixture.js`가 frame260×200, center(130,110), radius65, 색·stop·clip·opacity를 소유하고 `manifest.js`가 실행 호출과 artifact identity를 기록한다. Public ChartProgram에 radial fill을 등록하지 않았으므로 아직 public/primitive equivalence나 product renderer 완료를 주장하지 않는다.

| variant | 검토 내용 |
|---|---|
| centered | focal=center, 두 stop의 연속 radial gradient |
| offset-focus | focal(100,90), 한쪽으로 치우친 시작점 |
| hard-stop | offset .5 중복, 원 경계에서 색이 즉시 바뀜 |
| alpha-clip | 두 stop alpha=.5, opacity=.65, radius60 원형 clip |
| edge-focus | focal(65,110), end circle의 왼쪽 경계. 왼쪽 cone 밖은 underlay 보존 |
| varying-alpha | start alpha=.2 → end alpha=.8, opacity=.65 |

최종 호출은 `drawRadialPrimitive(context, radialFixture(style), {lowerOpacity:true,clipCone:true})`다. Lowering은 authored color alpha×opacity를 각 stop에 한 번 적용하고 context globalAlpha를 1로 둔다. RGB를 미리 premultiply하지 않는다. 이 fixture에서 경계 focal은 왼쪽으로 고정되어 있으며 cone half-plane은 x≥65 clip으로 명시한다. 임의 방향 focal의 public clip 구현은 아직 남는다.

[Canvas 표준](https://html.spec.whatwg.org/multipage/canvas.html#fill-and-stroke-styles)은 color와 alpha를 각각 보간하고 radial cone 밖은 그리지 않는 모델을 정의한다. [SVG 2 paint server](https://www.w3.org/TR/SVG/latest/pservers.html#RadialGradients)는 start/end circle과 coordinate units를 정의한다. 이번 SVG는 `userSpaceOnUse`, `fr=0`, `spreadMethod=pad`, sRGB를 명시한다. Repeat/reflect 범위를 새로 도입하지 않는다.

## PDF의 실패와 수정 증거

직접 native radial shader에 rgba stop과 별도 globalAlpha를 주면 이 환경의 PDF backend가 globalAlpha를 기대대로 적용하지 않았다. Focal-on-edge의 cone 밖도 마지막 색으로 채웠다. 수정 전 native PDF는 pixel-footprint 판정에서도 13개 표본이 실패했다. `native-unlowered.pdf/png`와 diagnostics에 그대로 보존한다.

512개의 비겹침 compound annulus로 나누는 후보도 검사했다. 이 후보는 최대513회 fill, ring별 최대2개 circle로 한정되며 midpoint stop 분할 자체의 최대 RGB 오차는 약0.234 byte다. 그러나 path별 antialias coverage의 합성이 경계에서 누적되어 색/alpha 오차를 만들었다. 따라서 이 후보는 **rejected**다. `vector.program.js`, `rejected-annuli.pdf/png`, diagnostics를 실패 재현용으로 남겼으며 지원 성공 수에 포함하지 않는다. 분할 수 증가로 해결됐다고 주장하지 않는다.

수정된 target은 stop alpha에 opacity를 먼저 한 번 반영하고 cone clip을 보존하는 **native PDF vector shading**이다. 모든 PDF에서 `/ShadingType 3`을 확인하고 `/Subtype /Image`가 없음을 검사한다. 차트나 gradient를 bitmap으로 대체하지 않는다. General color parsing·다른 paint 종류·다른 backend에 이 보정을 선제 일반화하지 않는다.

연속 gradient의 PDF rasterizer는 Canvas와 subpixel 표본 위치가 다를 수 있다. Canvas/PNG/SVG는 analytic pixel center RGB±1 byte, alpha exact로 검사한다. PDF는 같은1×1 logical pixel 내부 3×3 analytic 표본의 color 범위±1 byte, alpha exact를 사용하고 범위를 evidence에 저장한다. 이 정책은 색이 빠르게 변하는 위치의 footprint를 설명하며 큰 alpha/cone 오류를 허용하지 않는다. Flat hard-stop 내부와 cone 밖의 기대값은 고정색이다. 전체 PDF decoded pixels가 Canvas와 같다는 주장은 하지 않는다.

## 재현·범위·남은 의무

```sh
node scripts/run-tests.js unit unit/grammar/paint.test.js unit/grammar/patterns.test.js unit/grammar/radial-gradient.test.js unit/renderers/canvas-path-renderer.test.js unit/renderers/canvas-renderer.test.js unit/renderers/svg-renderer.test.js unit/renderers/png-renderer.test.js unit/renderers/pdf-renderer.test.js unit/support/coverage-policy.test.js
node scripts/run-tests.js gates gates/radial-gradient/primitive.test.js
node scripts/run-tests.js render gates/radial-gradient/backends.render.js
node --experimental-test-coverage --test-coverage-include=src/grammar/radialGradient.js --test test/unit/grammar/radial-gradient.test.js
node scripts/run-tests.js contracts contracts/source-boundaries.test.js contracts/test-discovery.test.js contracts/package-boundaries.test.js contracts/package-artifact.test.js
npm run package:check
npm run package:bundle
```

최종 명령·hash·출력은 [REVIEW-EVIDENCE.json](REVIEW-EVIDENCE.json)에 기록한다. Node22.23.1/macOS arm64의 source/regression87/87, primitive2/2, render1/1(6 variants×7 samples×4 paths=168), 계약38/38이 통과했다. 새 private radial kernel coverage는100/100/100이며 critical floor95/90/100을 추가했다. Packed browser bundle도 Full gzip 507,594 bytes / Basic gzip 285,716 bytes로 통과했다. Whole release suite를 실행한 것으로 해석하지 않는다.

검토 atlas는 `.artifacts/test/png/review/radial-gradient/contact-sheet.png`다. Style별 `primitive.png/svg/pdf`, `browser-canvas.png`, `browser-svg.png`, `pdf.png`, 공용 `variant.json`, 별도 `evidence.json`을 재생성한다. 실패 후보는 같은 variant 폴더의 명시된 이름으로 구분한다. Artifact tree는 gitignored이며 commit/push한 source·manifest·hash receipt가 remote 재현 패키지다.

Private source1개와 shared stop helper 추출로 이 branch artifact는680 entries, packed1,012,696, unpacked4,722,593 bytes다. 측정에 맞춘 한도는680/1,013,000/4,724,000이다. Main의 다른 checkpoint와 통합할 때 최종 tree를 다시 측정하고 이 오래된 branch 한도로 덮어쓰지 않는다.

Public schema·단위와 bounds mapping·strict color owner·일반 focal cone clipping·resource hash/scope·immutable edit/rematerialization·ref collector·inspection·scene/hit·codec·Full/Basic/types/exports·public/primitive equality는 남아 있다. Pattern visual approval은 별도다. Shadow, halo, outline, blend의 지원표·bounds·compositing·unsupported preflight 및 STEP-017 전체 의무도 계속 남아 있다.
