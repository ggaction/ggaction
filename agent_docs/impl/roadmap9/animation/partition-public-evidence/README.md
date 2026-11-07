# Partition 공개 animation 검증

Runtime source와 정확 archive는 [qualification.json](qualification.json)에 고정했다. 기존 전체 잔여 승인을 재사용하며 공개 함수6개와 ChartProgram schema는 추가하지 않았다. 원 private frame과 같은 geometry owner를 공유하고 normalized hierarchy 의미를 새 현재 frame·offline payload까지 전달한다.

## 재현

저장소 root에서 지원 Node20/22/24와 lock 고정 의존성을 사용한다. 실제 npm CLI도 해당 Node로 실행한다. 패키지는 한 번 만든 같은 archive를 세 Node에 설치한다.

```sh
node scripts/run-tests.js unit unit/animation/ unit/hit-program.test.js unit/hit-frame.test.js unit/hit-guides.test.js
node scripts/run-tests.js contracts contracts/package-artifact.test.js contracts/source-boundaries.test.js contracts/package-boundaries.test.js contracts/test-discovery.test.js contracts/animation-types.test.js
node scripts/run-tests.js browser browser/animation-partition.browser.js
node scripts/run-tests.js render charts/cross-feature-integration/variants/animation/partition.render.js
node scripts/package-artifact.js --pack > .artifacts/partition-archive.json
node agent_docs/impl/roadmap9/animation/partition-public-evidence/installed.mjs .artifacts/partition-archive.json .artifacts/partition-installed.json
node scripts/run-tests.js docs
```

Coverage는 animation 전체 test와 기존 unit/resources/partition-frames.test.js를 함께 사용했다. 원 coverage 실패와 최종 모든 변경 owner의95/90/100 통과를 각각 남겼다. renderer는 literal 독립 색/좌표와 같은 sampled frame을 사용하며 PNG와 vector PDF, browser Canvas와 SVG DPR1·2를 검증한다. source-free 설치 소비자는 canonical scripts/consumers/fixtures/node/animation-partition.mjs와 기존 animation·graph fixture의12개를 사용한다. fresh child는 network API를 막은 후 저장 bytes만 읽고 같은 scene/SVG/Canvas/PNG와 PDF 형식을 검증한다.

## 최초 실패와 후속 판정

초기 package cap, reverseU arc traversal, coverage, stale docs provenance, system Ruby/Bundler 실패는 압축 원본에 남겼다. 세 Node 설치 명령은12runtime·strict TypeScript·실행 문서가 모두 통과한 뒤 기존 animation192000 상한에서 실패했다. 측정값 Node22 198752, Node20/24 199722에 맞춰 animation만199800으로 최소 갱신했다. 동일18개 실제 설치 bundle 측정의 상한 재판정은 별도 supplement이며, 원 명령을 성공으로 바꾸지 않는다. Full·Basic·SVG·graph·interaction 한도는 유지한다.

문서는 full231, pinned owning31, Jekyll186pages/1598LLM hashes와 desktop 및 모든 page의320/390/768 responsive 검사로 검증했다. Source pin 후 source refs만 바뀌었고 built hash 검사를 다시 수행했다. 공개 docs 배포나 npm publish는 수행하지 않았다.

## 남은 의무

다른 typed family, accepted session과 native 최종 matrix를 합산해야 한다. 이 증거는 STEP061/062 또는 전체 STEP077 완료를 선언하지 않는다. 초기 비공개 준비 및 graph prerequisite 증거는 별도 디렉터리에 보존한다.
