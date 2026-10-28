# 조건부 appearance와 bar blend 통합

진행 상태: 검증된 `codex/roadmap9-paints`의 `53678726`에 main `a9ecf107`을 병합했다. 정확한 소스 revision·패키지·실행 결과는 [CONDITIONAL_INTEGRATION-EVIDENCE.json](CONDITIONAL_INTEGRATION-EVIDENCE.json)이 소유한다. 새 P1/P2/I3 API나 저장 형식을 연결하지 않았다.

## 합친 책임

- 조건부 채널의 분기·parameter/selection 참조는 기존 `layer.conditionals`가 소유한다. bar의 `multiply`/`screen`은 기존 `layer.mark.blend` 한 곳에 남는다.
- 조건부 재계산이 concrete fill/opacity를 바꾸고 bar materializer가 blend를 유지한다. renderer는 `graphicSpec`만 읽는다. 이번 병합을 위해 runtime helper나 새 상태는 추가하지 않았다.
- `scripts/coverage-policy.js`는 조건부 grammar/materialization과 기존 PNG/paint critical floors를 모두 보존했다. 생성된 문서·inspection 충돌은 원본 계약에서 재생성했다.
- 합본 패키지 한도는 임시 측정값을 커밋하지 않고 실제 717 entries / 1,064,412 packed / 4,945,828 unpacked bytes를 기준으로 각각 717 / 1,065,000 / 4,947,000으로 제한했다. 기존 browser bundle 한도는 그대로 사용한다.

## 독립 검증

`test/contracts/conditional-bar-blend.test.js`는 두 blend마다 parameter edit, selection edit, `reviseData` 행 재정렬과 lineage, scale/canvas 재계산, facet·codec 복원, normal reset과 conditional 제거·대체를 검증한다. conditional과 blend의 소유권이 서로 남는지 확인한다. 첫 실행의 2개 실패는 새 데이터 순서를 따르는 출력에 옛 순서를 기대한 테스트 문제였으며, 순서 변경과 동일 item identity를 함께 검증하도록 수정했다. runtime 변경은 없었다.

Canvas 중앙 표본은 독립 `test/oracles/compositing.js` 방정식과 비교한다. alpha는 정확히 일치하고 RGB만 기존 ±1 byte 정책을 유지한다. graphic-only 복원 뒤 SVG 문자열, PNG bytes, PDF 해제 stream, scene concrete node와 Canvas 전체 픽셀을 원본과 비교한다.

`test/browser/conditional-rendering.browser.js`의 설치 패키지 교차 사례는 매개변수·선택 수정 후 DPR 2 DOM Canvas/Offscreen Canvas/scene 전체 픽셀을 비교한다. SVG와 Canvas의 interior 표본은 별도 literal 기대값과 비교한다. `scripts/consumers/fixtures/node/conditional-encoding.mjs`는 설치 export만으로 같은 lifecycle·facet·reset과 네 출력/scene을 검증한다. 소스 경로를 fixture에 주입하지 않는다.

## 재실행

```sh
node scripts/run-tests.js contracts contracts/conditional-bar-blend.test.js contracts/bar-blend.test.js contracts/conditional-encoding-types.test.js contracts/field-driven-encodings.test.js contracts/source-boundaries.test.js contracts/test-discovery.test.js
node scripts/run-tests.js unit unit/actions/conditional-encoding.test.js unit/grammar/conditional-encoding.test.js unit/grammar/conditional-state.test.js unit/materialization/conditional-dependencies.test.js unit/grammar/compositing.test.js unit/grammar/png-encoding.test.js
node scripts/run-tests.js contracts contracts/package-boundaries.test.js contracts/package-artifact.test.js contracts/test-discovery.test.js contracts/source-boundaries.test.js
node scripts/run-tests.js render charts/bar-compositing
npm run docs:generate
node scripts/run-tests.js docs
npm run package:check
node scripts/package-consumer.js /absolute/path/to/ggaction-0.0.26.tgz
GGACTION_PACKAGE_SPEC=/absolute/path/to/ggaction-0.0.26.tgz node scripts/run-tests.js browser browser/conditional-rendering.browser.js
```

## 남은 범위

이 체크포인트는 조건부 appearance와 기존 bar blend의 통합이다. 전체 coverage/realistic sweep을 새로 실행했다고 주장하지 않는다. main의 realistic shard 7 target inventory 보수는 별도 owner가 진행한다. [PUBLIC.md](PUBLIC.md)의 P1/P2, ellipse 추가 시각 대상과 image I3 공유 저장 값의 승인 대기를 유지하며, STEP017 전체 완료로 처리하지 않는다.
