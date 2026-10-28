# 7가지 pattern의 private vector kernel

## 진행 상태

- [x] STEP-017과 geometry-design 계약, 기존 paint/color/work owner 확인
- [x] 순수 정규화와 bounded tile geometry 구현
- [x] 독립 literal·periodicity·coverage·경계 시험
- [x] discovery·source boundary·신규 critical coverage 확인
- [x] package artifact 실측 및 private checkpoint 검증
- [ ] 공개 paint/schema/action·4개 renderer·scene·persistence 통합과 visual evidence

대화의 Roadmap 9 전체 실행 승인과 병렬 위임에 따른 독립 checkpoint다. Base는 `8685719f`, branch는 `codex/roadmap9-paints`다. 이번 범위는 `src/grammar/patterns.js`의 private 순수 계산이며 STEP-017 또는 AT-13 완료를 의미하지 않는다. 새 visual target의 공개 action flow는 아직 구현하지 않는다.

## 현재 private 함수와 기본값

`normalizePatternOptions(options)`는 omission만 기본값으로 채우고 frozen plain result를 반환한다. Unknown key, explicit undefined, getter/symbol/non-enumerable property, 잘못된 scalar와 sparse phase를 거부한다. Caller-owned object/array를 변경하지 않는다.

| 옵션 | 기본값 | 정확한 의미 |
|---|---|---|
| style | `solid` | `solid`, `diagonal`, `antidiagonal`, `horizontal`, `vertical`, `cross`, `dots`만 허용 |
| pitch | `8` | finite positive logical pixel 값. 정사각형 tile의 한 변과 x/y 반복 주기 |
| strokeWidth | `1` | finite nonnegative logical pixel 값. 선은 수직 두께, dots는 지름 |
| phase | `[0,0]` | finite pair. 각 성분을 `[0,pitch)`로 정규화하고 signed zero는 0으로 고정 |
| foreground | `#000000` | 기존 solid paint string validation을 재사용하고 원문/alpha를 보존 |
| background | `transparent` | 동일한 color boundary. Foreground와 별도 색으로 보존 |
| coordinateSpace | `plot` | `plot` 또는 `object`; 아래 explicit origin 선택에만 사용 |

현재 shared `validateFillPaint`의 string 검증은 nonempty string까지다. 이 kernel에 별도 CSS parser나 color registry를 복제하지 않았다. 따라서 완전한 CSS color syntax 검증 또는 backend의 invalid-color fallback 차단을 완료했다고 주장하지 않는다. 엄밀 색 검증의 공통 owner와 공통 alpha 정책은 공개 paint 통합의 남은 의무다.

## 방향과 geometry

`createPatternTile(options)`는 normalized options, `repeat`, unit bounds `{x:0,y:0,width:1,height:1}`, `fillRule: nonzero`, polygons/circles를 반환한다. 원점은 tile 좌상단, x는 오른쪽, y는 아래쪽이다.

| style | foreground 영역 |
|---|---|
| solid | 전체 단색. `repeat:false`; phase/strokeWidth로 ink가 달라지지 않음 |
| diagonal | 화면에서 우하향하는 `\` stripe. 중심선 `y-x=k*pitch` |
| antidiagonal | 화면에서 우상향하는 `/` stripe. 중심선 `x+y=k*pitch` |
| horizontal | `y=k*pitch`의 수평 stripe |
| vertical | `x=k*pitch`의 수직 stripe |
| cross | horizontal과 vertical의 합집합. 중심 교차부 중복 polygon 영역을 분리 |
| dots | 각 grid 교점의 원. 실제 radius=`strokeWidth/2`; unit radius=`strokeWidth/(2*pitch)` |

대각선의 pitch는 x/y tile 주기이며 선 사이의 수직 거리는 `pitch/sqrt(2)`다. 선 두께의 뜻은 방향에 관계없이 수직 두께다. Tile 경계를 가로지르는 stripe는 인접 band를 잘라 polygon으로 보존하고 dots는 네 corner circle을 반환한다. Circle 자체가 unit bounds 밖에 걸칠 수 있으므로 소비자는 tile bounds로 clip해야 한다. 이 정보는 침묵하는 clip 생략을 허용하지 않는다.

모든 polygon은 같은 양의 winding을 가진다. Circle도 같은 winding의 contour로 내려 **한 번의 compound nonzero fill**을 실행해야 한다. Foreground contour마다 별도 alpha layer를 그리면 겹치는 원이나 stripe에 alpha가 중복되므로 금지한다. 색 alpha와 mark opacity의 최종 곱셈·background 합성·mark clip은 이 kernel의 출력만으로 구현 완료가 아니며 renderer integration에서 증명해야 한다.

`strokeWidth=0`인 여섯 반복 pattern은 foreground geometry가 없고 background만 남는다. solid는 이 경우에도 단색이다. 충분히 넓은 stripe는 full tile로 축약한다: horizontal/vertical/cross는 width≥pitch, diagonal/antidiagonal은 width≥pitch/sqrt(2), dots는 width≥sqrt(2)*pitch다.

Geometry는 unit 좌표에서 계산하고 physical pitch를 별도로 보존한다. `MAX_VALUE/MIN_VALUE` 같은 직접 나눗셈 전에 두 값을 공통 최대값으로 scale하여 saturation을 판정한다. 따라서 무한 좌표나 폭에 비례한 enumeration을 만들지 않는다. 출력은 최대 4개 primitive, polygon vertex 합계 최대 16개다. 상대 두께의 절반이 0으로 underflow하거나 stripe 경계가 중심선과 같은 좌표로 반올림되는 경우는 명시 RangeError다. Dots는 양수 radius를 별도 scalar로 보존할 수 있으면 유지한다. Canvas dimensions·공간 전체의 반복 개수 budget은 후속 materializer가 기존 work/item limit owner를 적용해야 한다.

## Phase와 origin

`resolvePatternOrigin(options, {plot?,object?})`는 coordinateSpace가 가리키는 explicit finite origin pair를 요구한다. Plot mode는 같은 plot origin을 쓰는 여러 item 사이에 phase를 이어 주고 object mode는 각 item bounds의 원점을 쓴다. Kernel은 ChartProgram이나 named resource를 찾지 않는다.

예: pitch8, phase[-1,9]는 [7,1]이며 plot=[10,20]이면 [17,21], object=[30,40]이면 [37,41]이다. Selected origin이 없으면 실패한다. 제공한 다른 origin도 malformed이면 거부한다. Origin+phase가 finite 범위를 넘으면 실패한다. Phase는 geometry를 잘라 다시 만드는 대신 tile placement를 이동시킨다.

## 검증과 남은 연결

독립 oracle는 production import 없이 nearest integer distance, circle distance, shoelace area와 winding test로 계산한다. 7 styles×6 widths×25×25 interior points를 unit tile과 다른 반복 tile에서 비교한다. Literal fixture는 두 대각선의 corner/central polygon, cross area .4375, dot radius .125 등을 고정한다. Numeric extremes, zero width, immutability, descriptor safety, strict options, origin overflow를 포함한다.

현재 focused 14/14, 기존 paint/coverage policy를 합친 unit 25/25, discovery/source boundary 25/25, package artifact 계약 7/7 통과. `patterns.js` focused coverage는 lines/branches/functions 모두100%이며 새 critical family floor는95/90/100이다. 전체 suite와 renderer parity를 실행한 것으로 해석하지 않는다.

재현 명령(Node 22.23.1, npm 10.9.8):

```sh
node scripts/run-tests.js unit unit/grammar/patterns.test.js unit/grammar/paint.test.js unit/support/coverage-policy.test.js
node --experimental-test-coverage --test-coverage-include=src/grammar/patterns.js --test test/unit/grammar/patterns.test.js
node scripts/run-tests.js contracts contracts/source-boundaries.test.js contracts/test-discovery.test.js
node scripts/run-tests.js contracts contracts/package-artifact.test.js
node scripts/package-artifact.js --check
```

이 branch의 package 실측은 679 entries, packed 1,011,834 bytes, unpacked 4,719,645 bytes다. 이전 baseline 678 entries에 private source 한 파일이 추가되어 측정값을 포함하는 한도 679/1,012,000/4,720,000으로 조정했다. Main의 다른 동시 checkpoint는 다른 package baseline이므로 통합할 때 한도를 이 값으로 덮어쓰지 말고 최종 tree를 다시 측정해야 한다. 내부 kernel은 공개 exports나 browser bundle에서 사용하지 않는다.

공개 paint 선택·resource hash·schema·편집 lifecycle·Full/Basic/types·package entry·Canvas/SVG/PNG/PDF·scene/hit·persistence 연결은 남아 있다. Radial gradient, shadow/halo/outline/blend는 이번 private pattern kernel의 완료 범위가 아니다. 기존 linear gradient 계약은 그대로 유지된다.
