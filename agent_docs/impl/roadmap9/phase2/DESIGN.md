# G-PATH — 복합 경로 검토안 D1–D6

상태: 제안. 이 문서는 아직 current 계약이 아니다. 사용자 “승인 계속 진행”은 검토 준비의 근거이며,
아래 새 공개·저장·시각 결정을 이미 승인했다는 증거로 사용하지 않는다.

## D1. 하나의 path에 여러 subpath

기존 `commands`의 M/L/C/Z만 유지한다. M은 새 subpath, Z는 현재 subpath의 종료다.
Z 뒤에는 새 M만 허용한다. M 전 L/C/Z, 연속 Z, unknown key, nonfinite coordinate,
sparse/accessor 배열과 command는 거부한다. point-only M 또는 M Z와 연속 M은 유효하다.
점만 있는 subpath는 면적 0이며 bounds에는 남는다. 총 30,000개 한도는 path 전체에 적용한다.
명령 순서와 winding을 보존하고 caller 입력을 복사한다. 검증 실패는 program·trace를 바꾸지 않는다.
같은 grammar를 named path owner와 concrete path item에 적용한다.

## D2. fillRule

path의 `fillRule`은 `"nonzero" | "evenodd"`, 생략 시 `"nonzero"`다.
`editGraphics({target, property:"fillRule", value:"evenodd"})`로 설정하며 path가 아닌 target에서는 거부한다.
open subpath의 fill은 암묵적으로 닫고 stroke는 닫지 않는다. fill 없음·stroke 없음의 기존 의미를 보존한다.
기존 단일 경로에 생략된 값을 저장 시 강제 추가하지 않는다. 명시한 값은 concrete graphicSpec에 보존한다.
새 semantic chart action은 추가하지 않고 이후 domain action이 이 primitive를 명시 materialize한다.

## D3. 경로형 owner clip

기존 `{x,y,width,height}`를 유지하고 다음 합집합을 추가한다.

```js
{ type: "path", commands: [/* D1 명령 */], fillRule: "evenodd" }
```

경로형 clip의 fillRule도 생략 시 nonzero다. clip은 fill 영역만 사용하며 stroke paint를 갖지 않는다.
기존 owner clip과 같은 parent coordinate frame을 사용하고 item 좌표를 재배치하지 않는다.
`editGraphics({target, property:"clip", value:...})`와 기존 false 해제 방식을 유지한다.
Canvas는 기존 viewport를 사용한다. 별도 item clip API나 Canvas clip API를 신설하지 않는다.
모든 owner clip 적용 경로에서 같은 합집합을 소비하며 unknown key와 잘못된 commands를 action 시점에 거부한다.

## D4. geometry owner와 오차

`graphicBounds.js`의 기존 cubic derivative extrema 계산을 재사용한다. fixture의 최고점은 7.5다.
stroke는 각 subpath의 cap/join/close를 독립 처리하고 rotated/translated/clipped ink를 bounds가 포함해야 한다.
flatten은 scene CSS px 기준 tolerance 0.25, de Casteljau 이분, maxDepth 20으로 한다.
한도를 넘기면 diagnostic을 반환하고 이를 소비하는 경로가 조용히 성공하지 않게 한다.
zero-length/close segment를 보존하여 winding/evenodd와 segment distance가 같은 geometry를 사용한다.
arc는 각도 π/2 이하 조각과 `4/3*tan(delta/4)`로 C에 내리고 필요 시 adaptive 분할한다.
full circle의 start=end는 빈 경로가 아니다. 새 A command, raw SVG string 저장, 경로 문자열 보간은 추가하지 않는다.

## D5. 저장·scene·호환성

editable envelope 4, graphic envelope 1과 기존 scene format version을 유지하는 additive 확장으로 제안한다.
envelope 구조·identity encoding을 바꾸지 않으며 저장된 commands/fillRule/clip은 그대로 round-trip한다.
기존 snapshot과 단일 경로는 결과가 같아야 한다. 구버전 runtime이 새 값을 읽는 forward compatibility는 제공하지 않는다.
현재 strict validator가 새 복합 값에서 명시 실패하는 경계를 유지하고 unsupported 값을 누락·단순화하지 않는다.
legacy editable 1–3의 historical grammar 검증은 보존하여 새 값의 위조된 legacy snapshot을 거부한다.
새 feature snapshot은 현재 editable 4 writer로만 만든다. packageVersion과 exact source revision을 증거에 남긴다.
scene Canvas/SVG 저장·재생, graphic/editable import, fresh-process edit/remove까지 동일 값을 검사한다.

## D6. 검토할 시각 결과와 실행 source

canonical manifest: `test/gates/compound-path/manifest.js`.
실행 primitive: `test/gates/compound-path/primitive.program.js`.
정확한 공개 호출안: `test/gates/compound-path/target.program.js`의 `targetProgram(variant)`.
해당 함수는 manifest의 좌표·style을 사용하여 createCanvas→createGraphics→editGraphics를 명시적으로 호출한다.
현재 public grammar에서 거부되는 것은 정상이며 이를 검사한다. public 통합 성공으로 표시하지 않는다.

| variant | 승인 대상 의미 |
|---|---|
| nonzero-hole | 반대 winding의 구멍, 면적 84; 별도 섬 포함 88 |
| evenodd-hole | 같은 winding이어도 evenodd의 구멍 유지 |
| nonzero-solid | 같은 winding + nonzero는 중앙까지 채움 |
| evenodd-clip | 같은 topology로 사각형 paint를 clip |
| open-fill | cubic fill은 암묵적으로 닫되 상단 stroke 없음; 별도 열린 선 |
| point-only | 점만 있는 subpath는 채움 ink 없음 |

각 400×304, 흰 배경과 주황 underlay, 파랑 opacity 0.65다. 구멍에서 underlay가 그대로 보여야 한다.
리뷰 이미지는 `.artifacts/test/png/review/compound-path/contact-sheet.png`이며 각 variant에
primitive.png/svg/pdf, svg.png, pdf.png, browser.png와 variant.json을 생성한다.

native path trace와 독립 rect/cubic primitive는 같은 native backend의 decoded RGBA가 정확히 같다.
네 backend는 literal 내부/외부/구멍/열린 stroke pixel을 검사한다. 색 양자화 ±1만 허용하며 alpha는 정확 비교한다.
이는 지원 가능성을 확인하는 primitive 증거다. 제품 통합 후에는 public/primitive exact same-run pixel 비교,
top-level trace, bounds와 scene/persistence 회귀를 추가해야 한다. 현재 검토는 전체 제품 지원 완료가 아니다.

## 동기화와 남은 범위

[소비자 표](consumers.json)의 pending 셀을 닫기 전 STEP-010–012 완료를 선언하지 않는다.
공개 구현과 함께 PRIMITIVES·PERSISTENCE·scene current 계약, types, extension 문서와 생성 문서를 갱신한다.
이번 준비에서는 공개 behavior와 macro architecture를 바꾸지 않아 해당 current 문서에 제안을 섞지 않는다.
AT-11/12는 STEP-012 통합까지 열린 상태다. publish·deploy·PR 생성은 별도 승인 범위다.
