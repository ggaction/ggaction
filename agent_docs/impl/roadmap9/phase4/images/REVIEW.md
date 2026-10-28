# 이미지 배치 primitive 검토

## 진행 상태

- [x] 명시 host가 준비한 immutable image bytes와 6종 배치 primitive
- [x] 독립 literal rectangle 및 pixel oracle와 실제 4개 출력 경로
- [x] focused28, renderer1, source/package/discovery38, docs159 통과
- [x] 실행 source·입력/출력 hash·최초 실패를 검토 package에 보존
- [ ] 사용자의 rendered primitive 승인
- [ ] 공개 asset action·저장 schema·renderer 자원 준비·소비자 연결

상태는 **approved**다. 2026-10-28 사용자가 revision `3853bdb1`의 6종 배치에
“표시한 이미지 배치 승인”이라고 명시 답했다. 정확한 승인 응답과 revision은
[REVIEW-EVIDENCE.json](REVIEW-EVIDENCE.json)의 `visualApproval`에 기록했다. 전체 계획의 실행 승인은 [AUTHORIZATION](../../AUTHORIZATION.json)에
기록되어 있다. 새 visual target의 확인은 [시각 검토 규칙](../../../AGENTS.md)에 따라 별도로
기록한다. 이 자료는 public image 기능이나 STEP-018 완료를 의미하지 않는다.

## 실행 source와 승인 대상

`test/gates/image-assets/primitive.program.js`는 Canvas의 명시적인 save/fill/clip/drawImage/restore
호출과 SVG의 image element를 소유한다. 존재하지 않는 public action을 사용한 것으로 표시하지 않는다.
`fixture.js`가 source bytes·viewport·크기·배치 입력을 소유하고 `manifest.js`는 정확한
실행 함수 호출과 variant identity를 연결한다. 브라우저도 같은 primitive source를 실행한다.

원본은 200×100 SVG로, 빨강·파랑·초록·노랑 네 사분면과 중앙 흰 원을 가진다.
원본 bytes는 SHA256으로 고정하며 네트워크 없이 재생한다. 각 화면은 200×210이고
회색 viewport는 x50/y60/width100/height100이다.

| variant | 검토하는 concrete image rectangle | 결과 |
| --- | --- | --- |
| contain-center | 50,85,100,50 | 원본 비율을 유지하며 중앙에 맞춤 |
| contain-start | 50,60,100,50 | 원본 비율을 유지하며 시작점에 맞춤 |
| cover-center | 0,60,200,100 | 중앙을 채우고 좌우를 viewport에서 자름 |
| cover-end | -50,60,200,100 | 끝점을 기준으로 채우고 남는 영역을 자름 |
| fill | 50,60,100,100 | viewport 비율로 늘림; 흰 원도 세로로 늘어남 |
| clip-opacity | 0,60,200,100 | cover에 반지름45 원형 clip과 opacity0.5 적용 |

Atlas는 이 순서로 3열×2행이다. 그림자나 필터를 추가하지 않았다.
SVG는 data URI를 포함하며 PDF는 image 영역만 native image로 쓰고 주변 text/rect는 vector로 남긴다.
Raw image payload·decoder object를 public ChartProgram에 저장하는 계약은 아직 결정하지 않았다.

## 검증과 재현

Node22.23.1, macOS arm64, Chromium, @napi-rs/canvas, Poppler를 사용했다.

```sh
node scripts/run-tests.js all capability:image-assets
node scripts/run-tests.js render gates/image-assets/backends.render.js
node scripts/run-tests.js contracts contracts/source-boundaries.test.js contracts/test-discovery.test.js contracts/package-boundaries.test.js contracts/package-artifact.test.js
node scripts/run-tests.js docs
npm run docs:machine:check
npm run package:check
```

Focused28/28, renderer1/1, 경계38/38, docs159/159가 통과했다.
Native Canvas/PNG는 전체 decoded pixels가 정확히 같다. Native Canvas/PNG, Browser Canvas,
Browser SVG, 72dpi PDF의 각 variant에서 11개 literal interior 표본을 검사하여 264/264가
RGB 1byte 이내, alpha exact로 일치했다. 독립 inverse-coordinate pixel oracle는 실제 runtime을
import하지 않으며 고정 color/alpha 사례도 normal test에서 검증한다. 각 viewport의 ink는2500pixels를 넘는다.
브라우저의 readiness·accessible canvas label·크기·console/page errors도 확인했다.
Backend끼리 전체 화면 pixels가 동일하다고 주장하지 않는다.

최초 render 실행은 PDF에서 2개 표본이 실패했다. 공통 probe(100,110)가 contain-start의
image bottom edge 및 cover-end의 source quadrant 경계에 놓여 literal interior라는 기존
정책에 맞지 않았다. 이를 모든 variant의 내부인(103,113)으로 바꾸고 다시 실행했다.
기하·source·기대색·허용치는 변경하지 않았다. 최초 결과와 로그를 evidence에 보존했다.
최초 discovery 계약은 새 Gate가 named capability에 미등록되어 실패했다. canonical
`test/capabilities.json`에 image-assets를 등록한 뒤 전체 관련38개 계약을 통과했다.

Runtime은 이전 private checkpoint119b7845에서 바뀌지 않았으므로 동일 source hash의
resolver100/99.03/100%, SVG validator100/97.12/100%, placement100/100/100% 증거를 재사용한다.
Package688entries, packed1029429/unpacked4788996bytes로 기존 한도 안이다.
원시 로그, source/output hashes와 환경은 [REVIEW-EVIDENCE.json](REVIEW-EVIDENCE.json)을 참조한다.
Output은 gitignored `.artifacts/test/png/review/image-assets/` 아래에 있으며 commit한 source로
재생성할 수 있다.

## 남은 범위

시각 승인 후 구현할 범위는 asset resource CRUD/ref collector, immutable/offline codec, renderer별
decode/cache와 export preflight, image mark/fit/align/clip/opacity, revise/rematerialization,
inspection/scene, Full/Basic/types/exports 및 public/primitive exact equivalence를 구현해야 한다.
Renderer의 network fetch나 실패한 image의 silent placeholder는 허용하지 않는다.
AT-04/AT-14의 후행 소비자와 STEP-018 전체 종료는 별도 미완료 상태로 유지한다.
