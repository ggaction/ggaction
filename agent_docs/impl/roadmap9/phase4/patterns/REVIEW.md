# 7종 vector pattern primitive 검토

## 진행 상태

- [x] private kernel의 기본값·방향·원점 계약 유지
- [x] 실행 가능한 primitive source와 단일 입력 manifest 준비
- [x] 7 styles × Canvas/SVG/PNG/PDF 출력과 독립 interior 값 비교
- [x] alpha·phase·plot/object 원점·clip 검토 이미지 준비
- [x] 사용자 visual target 승인
- [ ] 공개 paint API와 전체 소비자 연결

검토 source와 최초 evidence revision은 `4cd8917e` (`codex/roadmap9-paints`)다. 이 revision 표시는 metadata 후속 기록이며 검증된 실행 source는 바꾸지 않는다.

Gate 상태는 `approved`다. Roadmap 전체 구현 승인은 작업 진행 근거지만 이 이미지의 시각적 승인을 뜻하지 않는다. 이번 checkpoint는 public paint API나 renderer runtime을 수정하지 않는다. STEP-017 및 AT-13 완료도 아니다. Private kernel 계약과 이전 수치 검증은 [PRIVATE.md](PRIVATE.md)가 소유한다.

기준 카드는 현재 병행 DATA checkout에서 읽은 `study/coverage-expansion-2026-10-27/roadmap/tasks/STEP-017-paint-resources.ko.md`와 `roadmap/contracts/geometry-design.ko.md`다. 이 paints branch에는 study 자료가 없으므로 새 복제 계약을 만들지 않았다.

## 사용자 승인 기록

현재 대화에서 사용자가 **“이 렌더링 승인, 구현 계속”**라고 명시 승인했다. Parent `/root`가 해당 답변과 정확한 대상 revision `4cd8917e8a912de51164669439820f7d7fff4e82`을 전달했다. 이 기록은 그 rendered target과 설명한 처리 방식의 승인이다. 앞의 private 구현 범위 설명은 해당 source checkpoint의 사실이며, 현재 Gate 상태는 approved다. 같은 시각 목표의 중복 승인을 요청하지 않고 공개 연결을 진행한다. 공개 API·persisted schema의 아직 정해지지 않은 중요한 선택은 별도 명시하며 STEP017 전체 완료로 기록하지 않는다.

## 검토 대상과 실행 source

`test/gates/pattern-paints/primitive.program.js`는 `createGraphics`/`editGraphics`의 명시적 method chain이다. `fixture.js`가 style·크기·좌표·색·geometry·레이블을 소유하고 `manifest.js`가 정확한 literal call chain과 artifact identity를 만든다. Normal test는 표시된 call chain을 실제 top-level trace와 비교한다. 아직 존재하지 않는 public pattern action 이름을 제시하지 않는다.

각 style은 600×360 logical pixel 화면에 East=54, West=82인 두 막대를 네 번 그린다. pitch=18, strokeWidth=6, foreground=`#0f766e`, background=`#fef3c7`이며 private API 기본값을 바꾼 것이 아닌 검토용 명시 입력이다.

| 위치 | 검토 내용 |
|---|---|
| 좌상 | plot origin, phase `[0,0]`: 두 막대가 동일한 반복 좌표를 공유 |
| 우상 | object origin, phase `[0,0]`: 각 막대 bounds에서 다시 시작 |
| 좌하 | plot origin, phase `[7,5]`: 두 막대에서 같은 이동 유지 |
| 우하 | transparent background, `rgba(15,118,110,0.5)`, mark opacity `.65`, 원형 clip |

우하단은 회색 underlay 위에서 foreground alpha를 `.5 × .65 = .325`로 한 번 적용한다. 고정 interior RGB는 `[157,195,198]`, clip 밖은 `[226,232,240]`이다. Dots의 우하단만 strokeWidth=20으로 넓혀 서로 다른 grid circle이 겹치는 곳의 alpha도 검사한다. dots radius는 언제나 strokeWidth/2다. Solid는 phase와 반복 원점에 영향을 받지 않는 단색이다. Diagonal은 화면의 `\`, antidiagonal은 `/` 방향이다.

Tile의 corner circle은 tile 내부 quadrant로 자르고 모든 tile contour를 **하나의 nonzero compound path**에 합친다. 한 막대마다 foreground fill은 정확히 한 번이며 cross 교차부나 넓은 dots의 겹침에 별도 alpha layer를 만들지 않는다. 원은 90° 이하 cubic arc의 `4/3*tan(π/8)` 계수로 내리고 pixel oracle는 analytic circle의 경계에서 떨어진 interior만 비교한다. Primitive lowering은 이 고정된 작은 검토 fixture만 담당하며 public materializer의 반복 개수 budget 또는 범용 clipping API가 아니다.

## 재현과 evidence

Node 22.23.1, npm 10.9.8, macOS arm64, Chromium 및 @napi-rs/canvas, Poppler `pdftoppm`을 사용한다. Browser page는 `test/gates/pattern-paints/browser.html`이며 shared readiness/console harness로 검사한다.

```sh
node scripts/run-tests.js all capability:pattern-paints
node scripts/run-tests.js render gates/pattern-paints/backends.render.js
node scripts/run-tests.js contracts contracts/source-boundaries.test.js contracts/test-discovery.test.js contracts/package-boundaries.test.js contracts/package-artifact.test.js
npm run package:check
```

최종 명령·상태·입력/출력 hash는 [REVIEW-EVIDENCE.json](REVIEW-EVIDENCE.json)에 기록한다. Normal focused 16/16, renderer 1/1(7 styles, 5 출력 경로), 경계/검색/패키지 계약 38/38이 통과했다. Native Canvas와 PNG는 전체 decoded pixel이 정확히 일치한다. Browser Canvas와 browser SVG는 독립 경로로 실행하며 PNG/PDF도 함께 같은 analytic interior samples를 검사한다. 허용치는 RGB 1 byte, alpha는 exact다. PDF 전체 화면이 다른 backend와 픽셀 단위로 같다고 주장하지 않는다.

생성물은 `.artifacts/test/png/review/pattern-paints/`에만 저장한다. `contact-sheet.png`는 7종 전체 atlas이고 각 style 폴더에는 `primitive.png`, `primitive.svg`, `primitive.pdf`, `native.png`, `browser-canvas.png`, `browser-svg.png`, `pdf.png`, 공용 `variant.json`, 별도 `evidence.json`이 있다. Artifact tree는 repository 규칙에 따라 gitignored다. Commit/push한 source와 manifest로 재생성하며 output hash receipt는 문서와 함께 보존한다. 검사자는 atlas 및 개별 렌더링을 열어 방향·간격·위상·origin·clip·alpha appearance를 승인하거나 수정 요청한다.

이번 체크포인트는 source runtime 변경이 없으므로 private kernel의 100/100/100 coverage를 동일 파일 hash에서 재사용한다. Package는 679 entries, packed 1,011,834 bytes, unpacked 4,719,645 bytes로 이전 private checkpoint와 같다. Main의 더 최신 package 한도를 이 branch 값으로 덮어쓰지 않는다.

## 남은 구현과 승인 경계

승인 뒤에도 public option/schema, 엄밀한 공통 color 검증과 invalid color fallback 차단, background/foreground의 일반 alpha 합성, resource hash·scope, finite 반복 budget, mark/facet/plot coordinate-space 변환, revision/rematerialization, ref collector, inspection, Full/Basic/types/exports, scene/hit, codec/offline restore 및 public/primitive exact equivalence가 남는다. 이번 fixture는 유효한 명시 색만 사용했으므로 모든 CSS 색이나 모든 사용자 paint 입력을 보증하지 않는다.

기존 linear gradient 계약을 보존하며 radial gradient의 center/focal/radius/stop 검증과 4 backend lowering은 별도 남은 작업이다. Shadow, halo, outline, blend와 각 backend의 지원표·bounds·compositing order·unsupported preflight도 남아 있다. Renderer fetch나 silent solid fallback은 허용하지 않는다. 이 범위를 축소하거나 완료로 표시하지 않는다.
