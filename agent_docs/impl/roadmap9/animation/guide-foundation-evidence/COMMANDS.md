# 실행 명령

작업 트리: `/Users/hyeonjeon/.codex/worktrees/roadmap9-data/ggactionnewbrand`.

```sh
node --experimental-test-coverage \
  --test-coverage-include=src/grammar/animation/guideState.js \
  --test-coverage-include=src/animation/guideTracks.js \
  --test-coverage-include=src/materialization/animation/guides.js \
  --test-coverage-include=src/materialization/guides/axisItems.js \
  --test-coverage-include=src/materialization/guides/tickValues.js \
  --test-coverage-include=src/grammar/axisGeometry.js \
  --test-coverage-include=src/grammar/gridGeometry.js \
  --test-coverage-include=src/selectors/graphicScopes.js --test \
  test/unit/animation/guide-state.test.js \
  test/unit/animation/guide-tracks.test.js \
  test/unit/animation/native-guides.test.js \
  test/unit/hit-guides.test.js \
  test/unit/layout/grid-policy.test.js \
  test/unit/actions/guides/axis-policy.test.js \
  test/unit/actions/guides/polar-resolve.test.js \
  test/unit/actions/guides/polar-axis-actions.test.js \
  test/unit/actions/guides/polar-grid-actions.test.js \
  test/unit/actions/guides/axis-grid-along-offset.test.js \
  test/unit/actions/guides/axis-tick-actions.test.js \
  test/unit/actions/guides/axis-tick-format.test.js \
  test/unit/actions/scales/transformed-position-scale.test.js
node --test test/contracts/source-boundaries.test.js test/contracts/package-artifact.test.js test/contracts/documentation-truth.test.js
node scripts/package-artifact.js --pack
node .artifacts/qualify-guide-private.mjs
git diff --check
```

마지막 설치 명령은 같은 고정 tar에서 Node 20.20.2 / 22.23.1 / 24.22.1의 실행 파일을
각각 사용했다. PATH 선두에도 해당 Node 디렉터리를 배치했다. Installed runner의 복사본이
이 디렉터리에 있으며 runtime source를 설치 소비자에 복사하거나 내부 구현을 import하지 않는다.

Critical floor는 위 coverage report에서 canonical `scripts/coverage-policy.js`의
`assertCriticalCoverage`로 검증했다. 원 report와 실제 floor/실측 JSON을 함께 보존한다.
현재 Basic 한도 README 수정 뒤 package/documentation 10개를 재실행했고, 마지막 tar의
member hash 비교로 README 외 바이트 동일성을 확인했다.
