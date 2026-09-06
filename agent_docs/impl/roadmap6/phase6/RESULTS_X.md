# Roadmap 6 Phase 6 X 결과 — Data statistics and composite lifecycle

## 고정 결과

- 검증 source commit과 원격 ref: `ce2e37a5821cccce40d9d8703af06f170dc14c28`.
  `origin/codex/roadmap6-hierarchical-actions`에 push하고 같은 ref임을 확인했다.
- W1–W5의 dataset binding, reusable derived data, confidence method·level, filter lifecycle,
  Violin·ErrorBar·ErrorBand 역할 revision을 하나의 realistic corpus와 package consumer에서 함께 실행했다.
- Phase 6에서 추가된 public surface는 `bindMarkData`, `createSummaryData`, `createBinData`,
  `createFoldData`, `createComputedData`, `createStackData`, `removeMarkFilter`, `editViolinPlot`이다.
  Phase 5에서 만들어져 이 단계의 data/theme consumer가 된 action도 같은 hierarchy scenario에서 직접 실행했다.

## 통합 중 발견하고 닫은 오류

1. `editDensity`의 category placement 전환에서 caller가 새 `placement.scale.id`를 주면 기존 x/y scale
   identity 대신 그 ID가 transition definition에 스며들어 consumer와 orphan cleanup이 어긋날 수 있었다.
   전환 전 full preflight에서 기존 channel scale ID와 다르면 거부하고, scale definition 병합에서도 기존
   ID가 마지막에 이기도록 고쳤다.
2. `editRegression({ confidence })`가 이전 revision의 canonical `level`을 먼저 상속한 뒤 legacy alias를
   정규화해, 유효한 confidence 교체를 alias 충돌로 잘못 거부했다. Explicit confidence가 stored level을
   대체하고 같은 호출에서 두 alias를 줄 때만 동일값을 요구하도록 고쳤다.
3. Public declaration과 Current legend contract는 categorical `labels.format: "auto"`를 허용했지만 direct
   categorical normalizer는 `format` key 자체를 거부했다. `"auto"`만 no-op으로 받아 제거하고 numeric/UTC
   format은 계속 원자적으로 거부하도록 runtime을 contract와 맞췄다.
4. 생성 scenario의 guide edge, polar angle key, Text source binding과 aggregate observer가 실제 contract와
   어긋나던 부분을 고쳤다. 새 public action 203개와 option/literal inventory를 직접 실행하는 hierarchy
   scenario를 추가하고 불가능한 categorical-format 조합은 이유가 있는 waiver로만 남겼다.

각 오류는 focused unit/contract 회귀, immutable rejection과 realistic scenario에서 재현·검증했다.

## 누적 검증

| 범위 | 실제 결과 |
| --- | --- |
| realistic corpus | `npm run test:realistic` — 242/242 pass |
| normal suite | `npm test` — 3,114/3,114 pass |
| browser | `npm run test:browser` — 65/65 pass |
| render | `npm run test:render` — 208/208 pass |
| artifact gallery | Approved 171 variants, Active Review 0, 두 gallery verifier pass |
| coverage | 95.45% lines, 92.41% branches, 98.93% functions, 88 critical floors pass |
| public docs | source 47/47 pass, built 125 pages, 320/390/768px 전 페이지 browser pass |
| package shape | 473 entries, packed 550,959 bytes, unpacked 2,635,558 bytes, limits pass |
| installed package | Node, extension, PNG/PDF/SVG, strict TypeScript, Basic, tutorials, MCP와 bundle guards pass |

최종 installed tarball SHA-256은
`e660915740d6745fb4cc590146448bf55ba9ec2192b7967761ec9acbc464ebe6`다. Browser gzip은 Full
278,993/279,000, Basic 149,800/150,000, SVG 6,437/25,000 bytes다. Full이 최초 51 bytes 초과한 결과를
숨기지 않고 중복 분기를 줄인 뒤 같은 tarball 소비자 검사를 다시 실행했다. 상한은 바꾸지 않았다.

문서 검증은 저장소 bundle을 설치한 Ruby 3.3.12와 Bundler 2.4.19로 실행했다. 시스템 Ruby 2.6을 사용한
첫 preflight 실패는 제품·문서 오류가 아니라 실행 환경 선택 오류였으며, Ruby 3.3 경로에서 전체
`docs:verify`가 통과했다.

## 시각과 호환성 처분

- 이 단계는 기존 mark/guide primitive의 새 모양을 정의하지 않는다. W3는 기존 default 수치를 보존하고,
  W4 empty view는 ink를 제거하며, W5는 기존 Violin/interval primitive를 stable owner 아래 다시 만든다.
  따라서 새 primitive target 승인은 N/A다.
- 기존 승인 variant는 누적 render 208개와 gallery 171개로 다시 검증했다. Source/orientation/method/filter
  변경은 Canvas, SVG, PNG, PDF와 installed consumer에서 실제 concrete graphics로 소비됐다.
- Legacy confidence input, legacy single-selector filter provenance와 기존 default CI 결과는 계속 읽힌다.
  새 revision은 canonical method/level과 selector recipe를 저장한다.

## 종료 판정

- W1–W5와 Phase 6에 배정된 Planned 항목은 모두 Current contract, declaration, action card, public docs,
  generated inventory와 package surface에 동기화됐다.
- 숨은 deferral이나 Phase 6 owner에 남은 구현 항목은 없다.
- 전체 실행 승인은 `../APPROVAL.md`에 기록되어 있으므로 실제 결과가 완료된 이 X Gate를 approved로 닫고
  Phase 7로 진행한다.
