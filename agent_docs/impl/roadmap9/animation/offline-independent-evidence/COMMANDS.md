# 독립 내부 준비 검증

실행 위치는 `codex/roadmap9-animation-offline` branch의 repository root다.
소스 base와 정확 파일 hash는 `qualification.json`이 고정한다. 최초 실패와 보정 뒤
로그를 구분해 보존했고 이 검사를 공개 offline animation 완료로 세지 않는다.

```sh
node scripts/run-tests.js unit unit/animation/
node --test --experimental-test-coverage \
  --test-coverage-include=src/animation/envelopeCodec.js \
  --test-coverage-include=src/animation/player.js \
  --test-coverage-include=src/grammar/animation/frameTimes.js \
  --test-coverage-include=src/grammar/animation/playbackOptions.js \
  --test-coverage-lines=95 --test-coverage-branches=90 --test-coverage-functions=100 \
  test/unit/animation/envelope-codec.test.js test/unit/animation/frame-times.test.js \
  test/unit/animation/playback-options.test.js test/unit/animation/player.test.js
node scripts/run-tests.js contracts contracts/source-boundaries.test.js contracts/test-discovery.test.js
node scripts/run-tests.js contracts contracts/source-boundaries.test.js contracts/package-artifact.test.js
node scripts/package-artifact.js --check
git diff --check
```

Unit66개와 package check는 Node20.20.2/22.23.1/24.22.1에서 각각 종료0이다.
각 Node의 bin을 PATH 선두에 놓았다. 신규 public export가 없어 source-free 설치나
browser 전체·실데이터 전체·전체 source coverage는 이번 내부 변경에서 재실행하지 않았다.
변경4source의 집중 coverage는 기존 animation family95/90/100보다 높다.

기존 discovery 전역 실패2개는 최초 로그에 남고 root 합산 소유자가 수리한다.
현재 branch의 source-boundary와 package owning18개는 별도로 모두 통과했다.
새 helper와 tests는 모두 existing animation prefix/normal discovery로 도달한다.

Package cap 실패 후 측정은 canonical `package-artifact.js`의 동일 `runPack` 함수에
read-only export만 추가한 임시 모듈로 했다. Staging/compaction/pack 구현은 바꾸지
않았으며 Node별 실제 수치는 qualification에 보존한다. 최소 cap 갱신 후에는 수정 없는
canonical `--check`를 세 Node 모두 다시 실행했다. Private module3개의 packed 추가와
기존 native branch의 누적 entry 증가를 구분하며 최종 합산 archive qualification과 섞지 않는다.
