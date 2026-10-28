# P1 구조화 fill 공개 연결

## 진행 상태

- [x] P1/P2 `06e9eba8`와 ellipse의 기존 승인, 전체 남은 구현 승인 정본 재사용
- [x] 최신 통합 `a561ae1c`를 보존하며 pattern/radial 공개 fill 연결
- [x] Point/Bar/Rect/Arc/Area/Text create/edit·명시 materialization·codec·Full/Basic 연결
- [x] 7 pattern styles와 radial ellipse/focal-edge의 공개·primitive 동일 실행 픽셀
- [x] 조건부 appearance/position/Text·parameter revision과 paint 교차 회귀
- [ ] 최신 통합 입력의 전체 unit/contracts/coverage·설치 소비자·문서 최종 검증
- [ ] P2 outline/halo·blend·shadow, 실제 Text glyph mask 연결

P1 checkpoint는 STEP017 및 Roadmap9 전체 완료가 아니다. 정확한 현재 사용자 계약은
`contract/current/MARKS.md`의 shared structured fill과 `PRIMITIVES.md`, 공개 설명은
`docs/api/appearance/mark-style.md`가 소유한다. 이 기록은 구현 선택과 검증 증거만 보존한다.

## 경계와 구현

새 action/resource/entrypoint 없이 기존 fill에 정규화된 pattern/radial을 받는다. Pattern origin은
mark materializer가 명시 plot/object frame에서 저장하며 composition 이동도 같은 origin을 옮긴다.
Gradient stop 검증은 기존 linear와 radial의 공유 pure owner로 분리했고 legacy solid/linear 색 문법은 보존한다.

Text의 `fillBounds`는 기존 metrics/line-origin 계산에서 만든 회전 전 concrete bounds다. SVG는
native text/tspan과 vector paint를 쓰며 Canvas는 기존 fillText의 실제 glyph alpha를 유지한다.
타원 radial Text는 bounded paint texture만 준비하고 글자 모양을 사각 bounds로 대체하지 않는다.
Native glyph가 estimated metrics 밖으로 나오는 경우도 visible frame 전체 texture와 periodic tile로
채운다. 두 renderer에서 `WW`의 실제 glyph overhang 내부 픽셀을 별도 회귀로 고정했다.

닫힌 도형의 radial PDF는 native vector shading을 유지한다. Pattern의 foreground/background를
합친 glyph opacity는 기존 isolated-glyph owner가 한 번 적용한다. 그래서 opacity가 1 미만인 pattern과
Text paint의 PDF에는 bounded glyph/paint image가 포함될 수 있다. 이 출력 차이를 Current와 공개 문서에 명시한다.

조건부 통합에서는 Rect 초기 concrete 속성에 `undefined` opacity/stroke/fill을 쓰던 결함을 고쳤다.
선택된 값은 기존 final-output owner가 적용하며 초기 단계는 미지정 선택 속성을 생략한다. Area의
stroke-from-fill 검증은 아직 선택되지 않은 conditional fill을 거부하지 않으며 명시된 structured fill의
암묵적 solid stroke 전환은 계속 거부한다. 조건부 채널 지원 범위를 새 paint 때문에 확장하지 않는다.

## 재현 가능한 증거

- 공개 표본: `examples/structured-paints/program.js`, 9 variants
- 독립 literal/primitive/public 검증: `test/charts/structured-paints/`
- 기존 승인 slice 전체 승격: 위 경로의 `variants/pattern-paints/`, `variants/radial-gradient/`
- 실제 browser glyph/ellipse/periodic samples: `test/browser/structured-paint.browser.js`
- create/edit·selection·labels·composition·revision·conditional·codec: `test/unit/actions/marks/structured-fill.test.js`
- alpha·PDF shading·Text mask·scene·preflight: `test/contracts/structured-paint-rendering.test.js`
- 5 pinned datasets × 3 recipes × 9 variants × 6 filled owners: `test/contracts/realistic-structured-paints.test.js`
- source-free Full/Basic/renderers/Text/fresh-process codec: `scripts/consumers/fixtures/node/structured-paints.mjs`

최종 실행 수, 원 로그 hash, package/bundle 실측은 후속 `structured-fill-evidence/manifest.json`에 기록한다.
미통과 검사를 통과로 기록하거나 이전 branch 입력의 전체 검증을 최신 통합 증거로 대신하지 않는다.

## 패키지 경계

통합 직후 기존 755-entry 한도는 새 6개 책임 owner로 761이 되어 실패했다. 최초 실패 로그를 보존한다.
Node22 최초 측정은 packed1,126,677/unpacked5,199,497bytes이며 기존1,118,000/5,160,000을 초과했다.
Node20 packed1,129,521bytes가 추가로 관측되어 허용치는 761/1,130,000/5,200,000으로 필요한 만큼만
조정한다. Installed Full/Basic gzip은554,881/331,553bytes이므로 기존549,000/325,000 대신
555,000/332,000만 허용한다. Node24 및 최종 설치 결과도 evidence에 별도로 기록한다.
