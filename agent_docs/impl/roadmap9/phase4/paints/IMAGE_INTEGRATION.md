# Image 준비·조건부 appearance·paint 통합

## 진행 상태

`codex/roadmap9-integration`의 image own-property checkpoint `b90b3042`와 paints `bb5ef350`를 통합했다. main은 변경하지 않았다. 정확한 통합 revision·명령·패키지·실행 결과는 [IMAGE_INTEGRATION-EVIDENCE.json](IMAGE_INTEGRATION-EVIDENCE.json)에 기록한다.

양쪽 runtime에 충돌은 없었다. source boundary나 공개 API를 새로 만들지 않고 기존 코드를 보존했다. 문서 충돌은 canonical generator로 해결하고, `coverage-policy.js`의 image/font/SVG/conditional/paint/PNG critical families를 모두 보존했다. 실제 측정한 722 entries, unpacked 4,970,578 bytes, Node20/24 packed 1,074,671 bytes에 맞춰 한도를 722 / 1,075,000 / 4,971,000으로 제한한다. Node22 packed 값은 1,072,238 bytes이며 서로 다른 압축 artifact를 동일 byte로 주장하지 않는다.

## 교차 검증의 정확한 범위

`test/unit/resources/paint-image-preparation.test.js`는 조건부 색과 selection opacity를 가진 실제 bar의 interior 두 표본을 독립 blend 방정식과 비교한다. 그 2×1 RGBA fixture를 private PNG encoder로 인코딩하고, 명시 host load와 실제 native decoder를 통해 image 준비 kernel에 전달한다.

이미지 load가 진행되는 동안 프로그램 parameter·selection을 수정해도 이전 image 요청은 명시한 이전 bytes/hash에 대한 결과를 보존한다. 새 요청은 새 bytes/hash를 보존하고, 이전 hash로 새 bytes를 전달하면 decoder 실행 전에 거부된다. JSON으로 저장할 수 있는 immutable payload를 다시 decode해 정확한 RGBA와 contain 배치 `(0,25,100,50)`를 확인한다. 원래 ChartProgram의 불변성과 새 conditional dependency revision도 확인한다.

이는 private 준비와 public bar 출력의 교차 검증이다. `prepareImageAsset`이 ChartProgram receiver에 바인딩되거나 stale public handle을 검증한다고 주장하지 않는다. I1–I4 image action/primitive/renderer flow, P1/P2 structured paints와 새 ellipse 시각 대상은 승인 전까지 연결하지 않는다. 테스트의 두 pixel fixture를 차트 전체 raster lowering 구현으로 사용하지 않는다.

## 검증 명령

```sh
node scripts/run-tests.js unit unit/resources/paint-image-preparation.test.js unit/resources/image-preparation.test.js unit/resources/asset-own-inputs.test.js unit/resources/svg-images.test.js unit/resources/font-preparation.test.js unit/materialization/image-placement.test.js unit/grammar/png-encoding.test.js unit/grammar/compositing.test.js unit/immutable-calculation-reuse.test.js
node scripts/run-tests.js unit unit/grammar/patterns.test.js unit/grammar/radial-gradient.test.js unit/grammar/shadow.test.js unit/actions/guides/grapheme-wrapping.test.js unit/actions/conditional-encoding.test.js unit/materialization/conditional-dependencies.test.js
node scripts/run-tests.js contracts contracts/conditional-bar-blend.test.js contracts/bar-blend.test.js contracts/source-boundaries.test.js contracts/package-boundaries.test.js contracts/test-discovery.test.js
node scripts/run-tests.js contracts contracts/package-artifact.test.js contracts/test-discovery.test.js
node scripts/run-tests.js render charts/bar-compositing gates/image-assets
npm run docs:generate
node scripts/run-tests.js docs
node scripts/package-artifact.js --check
npx --yes --package=node@20 -- node scripts/package-artifact.js --check
npx --yes --package=node@24 -- node scripts/package-artifact.js --check
node scripts/package-consumer.js /absolute/path/to/ggaction-0.0.26.tgz
GGACTION_PACKAGE_SPEC=/absolute/path/to/ggaction-0.0.26.tgz node scripts/run-tests.js browser browser/conditional-rendering.browser.js browser/bar-blend.browser.js browser/png-byte-encoding.browser.js
```

문서 첫 실행에서 165/166이 통과했으며, 1건은 미커밋 bar example이 이전 integration revision을 가리켜 실패했다. 이를 삭제하거나 완화하지 않고 소스 커밋 `ed274ed1` 뒤 provenance를 고정하여 최종 166/166을 통과했다. 원 로그를 함께 보존한다.

이 기록은 집중 통합 checkpoint이며 전체 coverage·realistic 또는 STEP017/018/019 완료를 주장하지 않는다. 기존 시각 검토와 public design 승인 경계는 각 원본 문서가 소유한다.

최종 검증은 asset/paint unit57/57, paint/conditional unit57/57, 계약64/64, package/discovery23/23, critical coverage 정책7/7, browser6/6, render3/3, docs166/166, 설치 Node199/199와 qualification7/7이다. 같은 Node20 환경에서 마지막 metadata 고정 뒤 재팩한 artifact는 설치 검증에 사용한 SHA256 `b17a864887335a468dc0da7945662c2d0636a2bfaaa99469691cd0edba1b392e`와 정확히 일치한다.
