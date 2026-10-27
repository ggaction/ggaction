# Browser, rendering, and installed-consumer audit

대상: `ggaction` commit `31ce29f31e5ae87c57759a5b3e002db1f29a4808`. 2026-10-23, Node 23.5.0, macOS, 설치된 Playwright Chromium. 이 문서는 전체 테스트 감사에 합칠 분야별 근거다. 저장소 소스는 변경하지 않았다. 전체 browser/render/package suite 재실행 대신 정적 교차 점검과 세 가지 독립 probe를 실행했다.

## 먼저 보존할 강점

- 공개 browser registry에는 99개 예제가 있고 각각 별도 `node:test`로 등록된다. `#status`, HTTP status, console/page errors, Canvas 크기, 접근 가능한 이름, 일부 상태 객체를 확인한다.
- primitive/public의 같은 실행에서 픽셀 hash를 비교하고, 여러 기능에서는 독립 literal Canvas/SVG/PDF reference를 추가한다. 조합, clipping, blend, opacity, text, gradient, DPR에 대한 구체적인 검사가 이미 존재한다. “스크린샷만 검사한다”, “실제 브라우저가 없다”, “Firefox/WebKit CI가 없다”는 평가는 틀리다.
- CI와 release 모두 Firefox/WebKit matrix가 있고 packed package를 대상으로 하는 compatibility test가 있다. Node native 출력은 platform matrix에서도 검사한다.
- PNG helper는 전체 ink, 영역별 ink, 색상, 물리 크기, 일부 승인된 bounds/density signature를 검사한다. 그러나 아래 빈 출력 반례에 취약하다.

## B1 — [P1, 재현됨] 투명한 빈 PNG를 전체 화면의 ink로 판정한다

**근거:** `test/support/png.js:62–65`, `120–140`, `199–217`, `248–249`; `test/support/visual-variants.js:437–454`; `test/charts/continuous-area-color/manifest.js:9`; `test/charts/bootstrap-mean-ci/manifest.js:9`.

`pixelDiffersFromBackground`는 alpha를 포함하여 모든 채널의 차이를 ink로 계산한다. 흰 배경을 기대할 때 `[0,0,0,0]`은 배경과 다르므로 ink가 된다. `colors: []`이고 bounds/density upper bound가 없는 실제 variant에서는 완전히 투명한 출력이 최소 ink/영역 ink를 전부 통과한다. primitive와 public을 같은 고장 난 renderer로 만들면 hash equality도 통과한다.

**실행 근거:** `evidence/browser-png-blank-probe.mjs`는 공유 helper 전체를 외부 파일에 복사한 뒤 renderer import만 투명 PNG를 반환하는 stub으로 대체했다. 검증 로직과 실제 variant의 크기·색상·영역 옵션은 그대로 사용했다. continuous-area-color와 bootstrap-mean-ci가 모두 PASS; 실제 640×440 투명 PNG를 `inkPixels=281600`, `inkRatio=1`로 보고했다. 각각 영역 ink 181440/162400, primitive/public hash 일치. 상세: `evidence/browser-png-blank-results.json`, 변형 helper: `evidence/browser-png-helper-mutant.mjs`.

**영향 범위:** 공유 PNG 검사에서 잘못된 결과를 합격시키는 확정된 문제다. 전체 suite가 해당 renderer 변이에 합격한다는 주장은 아니다. 색상 조건이 있는 다른 variant나 별도 renderer unit test는 이를 잡을 수 있다.

**개선/완료 조건:** 기대 배경의 실제 출력 존재와 foreground ink를 분리하고, 투명·반투명 배경의 의도를 명시한다. foreground는 alpha를 고려하여 측정한다. opaque white/dark background, transparent canvas, fully transparent renderer, 배경만 존재하는 renderer를 음성 대조군으로 고정한다. 위 두 실제 variant의 blank mutant가 반드시 실패하고 정상 투명 배경 차트는 통과해야 한다.

## B2 — [P2, 재현됨] 공개 예제의 browser smoke가 그려진 픽셀을 증명하지 않는다

**근거:** `test/browser/public-examples.browser.js:34–68`, `72–102`; 유사한 구조는 `test/browser/capability-pages.browser.js:69–91`.

검사는 크기·이름·status·선택적인 JS 상태·오류 없음에 집중된다. 브라우저에서 실제 Canvas paint가 모두 없어져도 이 조건은 유지될 수 있다. 특히 예제 자체의 wiring을 검증하려면 detached Canvas에 별도 프로그램을 재렌더하는 검사가 실제 보이는 `#chart`의 출력까지 보장하지 못한다.

**실행 근거:** `evidence/browser-empty-canvas-probe.mjs`는 실제 브라우저에서 동일한 공개 harness assertion을 실행했다. baseline과 Canvas paint 메서드만 no-op으로 대체한 컨텍스트를 비교했다. cars-scatterplot, legend-layout, cars-binned-heatmap 모두 기존 assertion PASS; 정상 nontransparentPixels는 256000/129600/350000, 변형 실행은 모두 0이었다. `evidence/browser-empty-canvas-results.json`.

**개선/완료 조건:** shared registry에 기대 배경/대표 mark 영역 같은 작고 명시적인 paint witness를 둔다. 페이지에 보이는 Canvas에서 alpha-aware foreground 검사를 수행한다. 모든 예제에 전체 golden screenshot을 늘릴 필요는 없다. 위 no-paint 변이와 background-only 변이가 실제 페이지 smoke에서 실패하도록 한다. semantic identity/geometric 검사는 별도로 유지한다.

## B3 — [P2, 재현됨] assertion 실패 직후 페이지가 닫혀 failure screenshot이 사라진다

**근거:** `test/support/browser.js:35–57`; `test/browser/named-shapes.browser.js:38–45`; `continuous-area-color.browser.js:38–45`; `legend-appearance.browser.js:29–33`; `facet-content-headers.browser.js:53–56`; `backend-compatibility.browser.js:117–156`.

`closeBrowserWithEvidence`는 “실패한 페이지는 열린 상태”라고 가정한다. 하지만 여러 caller는 `finally { page.close() }` 또는 `finally { context.close() }`로 assertion 실패 때도 먼저 닫는다. 그러면 after hook은 빈 목록만 보므로 screenshot/details를 저장하지 못한다. 열린 페이지가 남는 경우에도 `closeBrowserWithEvidence(browser)`는 원래 error를 넘기지 않아 assertion message/stack이 failure.json에 보존되지 않는다. backend compatibility의 DPR 테스트만 명시적인 catch/save 경로가 있어 부분적으로 다르게 동작한다.

**실행 근거:** 실제 named-shapes 페이지 준비 후 의도적인 assertion failure, 동일한 finally/page close 흐름을 실행했다. evidence capture 직전 remainingPages=0, 새 failure directory=0. `evidence/browser-failure-capture-probe.mjs`, `browser-failure-capture-results.json`.

**개선/완료 조건:** 공유 lifecycle wrapper가 callback의 실패를 catch하여 error·test id·URL·console/page errors·screenshot을 먼저 저장하고 finally에서 닫는다. 준비 실패와 검증 실패 모두 동일 정책으로 처리한다. helper의 실패 유도 self-test에서 파일/원래 stack/정리 완료를 동시에 검증한다. 무조건 page를 열어 두는 방식은 피한다.

## B4 — [P2, 정적 확정] engine-aware content-header 테스트가 Firefox/WebKit 실행 목록에서 빠져 있다

**근거:** `test/browser/facet-content-headers.browser.js:10–23`는 Chromium/Firefox/WebKit과 DPR 1/2를 지원한다. 하지만 `package.json:158`의 `test:browser:compat`는 `browser/backend-compatibility.browser.js` 한 파일만 선택한다. `.github/workflows/ci.yml:223–247`, `.github/workflows/release.yml:461–505`는 Firefox/WebKit에서 이 명령만 실행한다.

따라서 기존 cross-browser matrix는 실재하지만 별도로 작성한 facet content-header/persistence 픽셀 비교는 기본 Chromium 실행에만 포함된다. backend-compatibility가 일부 인접 facet/legend 동작을 검사하는 사실과 별개로 이 전용 회귀 케이스는 빠져 있다.

**개선/완료 조건:** browser compatibility를 명시적인 capability/file registry로 관리하고 두 engine-aware 파일을 포함한다. matrix마다 각 case/engine/DPR 실행 영수증을 남기고, engine-aware 테스트가 CI selection에서 빠지면 discovery contract가 실패하게 한다. 이번 감사에서는 Firefox/WebKit 새 실행을 하지 않았다.

## B5 — [P2, 유지보수/진단] packed consumer가 거대한 문자열과 단일 성공 신호에 묶여 있다

**근거:** `test/browser/package-consumer.browser.js:19–714`는 하나의 HTML/module 문자열, `725–893`은 하나의 test다. `scripts/package-consumer.js`는 5834줄이며 `testNodeConsumer`가 `76–3252`에 걸쳐 있고 생성된 소비자 파일 하나를 `3229`에서 실행한다. `testPackageConsumer`의 `5718–5747`은 Node/MCP/TypeScript/tutorial/bundle 단계를 직렬 처리한다.

많은 실제 계약을 다루는 강점은 있으나 앞부분의 한 실패가 뒤쪽 시나리오를 미실행 상태로 만든다. browser module 내부 예외는 마지막 global readiness까지 도달하지 못해 별개의 30초 readiness timeout으로 드러날 수도 있다. 시나리오별 status·duration·선택 실행·소유권이 없고 stack은 생성 임시 파일을 가리킨다. 변경 시 중복 chart chain을 추가하기 쉽다.

**개선/완료 조건:** 파일 길이 기준으로 자르지 말고 설치/entry contract, renderer, persistence, extension, MCP, types 등 계약별 실제 fixture module과 독립 test id를 둔다. 설치된 package import를 그대로 유지하고 설치는 fixture scope에서 재사용한다. 별도 시나리오 하나를 일부러 실패시켜 다른 독립 scenario의 결과와 정확한 owner/id가 남는지 확인한다. 공개 프로그램/입력의 canonical owner를 재사용한다.

## B6 — [P2, 정적 확정] package consumer 준비 중 실패하면 임시 디렉터리를 회수할 수 없다

**근거:** `scripts/package-consumer.js:39–73`; 호출부 `5718–5720`; `test/browser/package-consumer.browser.js:19–20`, `718–723`; `test/browser/backend-compatibility.browser.js:15–16`.

`mkdtemp` 뒤 pack/install/read manifest가 실패하면 `cleanup`을 가진 객체를 return하기 전 예외가 발생한다. caller의 `consumer`는 할당되지 않거나 try 블록이 시작되지 않아 rm이 실행되지 않는다. 로컬 반복 실패 때 npm cache/임시 파일이 누적되고 실패 재현 fixture도 명시적인 보존 정책 없이 남는다.

**개선/완료 조건:** 준비 함수 내부에서 성공 전 자원을 소유하고 try/catch/finally로 정리한다. 실패 분석에 필요한 작은 로그만 지정 evidence 경로로 복사한 뒤 지운다. invalid packageSpec/install failure/manifest failure를 주입했을 때 임시 디렉터리와 하위 프로세스가 남지 않는 self-test를 추가한다. 본 감사는 실제 npm 실패 주입을 하지 않았으므로 누적 용량을 주장하지 않는다.

## B7 — [P3, 재현됨] 기대 색상의 오타가 검은색으로 조용히 바뀐다

**근거:** `test/support/png.js:15–24`, `27–53`; `test/unit/support/png.test.js:29–33`은 malformed object만 검사한다.

Canvas의 invalid fillStyle 설정은 무시된다. 새 context 기본값 black에 `not-a-css-color`를 지정하면 `normalizeExpectedColor`가 오류 없이 `[0,0,0,255]`를 반환한다. 따라서 typo인 expected color가 검은 axis/text 한 픽셀 때문에 충족될 수 있다. `evidence/browser-png-blank-results.json` 마지막 항목에서 재현됐다.

**개선/완료 조건:** test expectation의 CSS color syntax를 엄격하게 검증한다. black, transparent, rgba(), named color 등 유효한 값은 유지하되 invalid syntax는 renderer 호출 전에 실패하게 한다. `none`이 지원되는 테스트 의도라면 CSS color와 별도 토큰으로 명시한다.

## 추가 개선 후보 — 결함으로 단정하지 않은 범위

1. **readiness 비용:** 공유 `openBrowserPage`는 `goto(...networkidle)` 뒤 별도 완료 신호까지 기다린다 (`test/support/browser.js:17–19`). 99개 독립 페이지에는 이미 명시적인 완료 신호가 있으므로 `domcontentloaded`+완료 신호가 같은 오류 탐지력을 유지하는지 측정할 가치가 있다. 네트워크가 있는 예제의 data/image/font 완료는 해당 신호에 포함되어야 한다.
2. **bounded work:** browser `page.evaluate` 안의 Image load/decode와 consumer `execFileSync`에는 상위 timeout/cancellation 계약을 확인할 필요가 있다. 이 분야에서는 무한 hang을 주입하지 않았다. 인프라 감사의 runner/job timeout 결과와 함께 판단한다.
3. **공통 renderer 오류의 독립 witness:** 같은 renderer로 만든 primitive/public pixels 일치는 domain materialization 차이를 잘 잡지만 공통 renderer 오류는 놓칠 수 있다. literal geometry/paint, 실제 SVG decode, PDF rasterization이 이미 있는 대표 케이스를 기준으로 missing witness를 채운다. 모든 차트의 golden PNG를 늘리는 제안은 아니다.
4. **실패 아티팩트 품질:** PDF literal comparisons는 임시 PDF/PNG를 finally에서 제거한다 (`combined-legends/pdf.render.js:7–24` 등). 실제 오차가 났을 때 수치 assertion만 남는 경우를 대비해 actual/expected/diff와 font/Poppler/native backend 버전을 작은 bounded bundle로 남길 수 있다.
5. **정적 formatting:** 다수 browser/render 테스트가 긴 단일 행으로 압축되어 있다. 테스트 목적과 fixture/expected 값이 한 줄에 섞여 diff/stack line이 쓸모없어진다. 논리적 단계별 보통 formatting과 named subcases가 리뷰 비용을 낮춘다.

## 우선순위와 검사 경계

1. B1과 B2의 잘못된 합격을 막고 negative-control tests를 고정한다.
2. B3 failure evidence와 B4 cross-browser selection을 바로잡는다.
3. B5 시나리오별 실행/진단, B6 자원 소유권을 개선한다.
4. B7 assertion input 검증과 readiness/renderer diagnostics를 다듬는다.

재현 파일은 모두 `study/test-audit/evidence/browser-*`에 있다. probe 실행 이후 `git status --short`는 비어 있었다. full suite/browser engines/platform/render corpus를 전부 이번에 재실행했다는 의미는 아니다.
