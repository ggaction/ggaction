# Hit capacity source-only diagnostic

이 디렉터리는 제품 qualification/result가 아니다. 원100k의 공개 거부,
10k guarded 관측,100k guard-observation-only 실행과 중단을 각각 보존한다.
정책/권한/후속 검증은 [구체안](../HIT_CAPACITY_PROPOSAL.md)에 한 번만 기록한다.

원파일은 gzip이며 sha256/풀린 bytes는 diagnostic.json에 있다.
스크립트를 당시9cb source WT의 `.artifacts/hit-capacity/`로 복원한다.
archive/browser/P95는 실행하지 않았다. NODE_OPTIONS는 비어 있었다.

```sh
HIT_COUNT=100000 HIT_REPORT=.artifacts/hit-capacity/public-100k.json node --max-old-space-size=1536 .artifacts/hit-capacity/probe-v1.mjs
HIT_COUNT=10000 HIT_REPORT=.artifacts/hit-capacity/instrumented-10k.json node --experimental-loader ./.artifacts/hit-capacity/loader-v1.mjs --max-old-space-size=1536 .artifacts/hit-capacity/probe-v1.mjs
HIT_COUNT=100000 HIT_OBSERVE=1 HIT_REPORT=.artifacts/hit-capacity/instrumented-100k-observe.json node --experimental-loader ./.artifacts/hit-capacity/loader-v1.mjs --max-old-space-size=1536 .artifacts/hit-capacity/probe-v1.mjs
# 위 Node22 관측은15:53에서 SIGTERM 종료143. OS sample2초를 process-sample.txt에 보존.
HIT_COUNT=10000 HIT_REPORT=.artifacts/hit-capacity/profile-10k.json node --cpu-prof --cpu-prof-dir=.artifacts/hit-capacity --cpu-prof-name=hit-10k.cpuprofile --experimental-loader ./.artifacts/hit-capacity/loader.mjs --max-old-space-size=1536 .artifacts/hit-capacity/probe-v1.mjs
HIT_COUNT=100000 HIT_OBSERVE=1 HIT_REPORT=.artifacts/hit-capacity/instrumented-100k-gc-observe.json node --expose-gc --experimental-loader ./.artifacts/hit-capacity/loader-gc.mjs --max-old-space-size=2048 .artifacts/hit-capacity/probe-gc.mjs
# 위 Node22 강제GC 관측도 중단143. 마지막 shape40000 progress를 보존.
HIT_COUNT=100000 HIT_OBSERVE=1 HIT_REPORT=.artifacts/hit-capacity/instrumented-100k-node24-observe.json /Users/hyeonjeon/.npm/_npx/387698761821791d/node_modules/node/bin/node --experimental-loader ./.artifacts/hit-capacity/loader-gc.mjs --max-old-space-size=2048 .artifacts/hit-capacity/probe-gc.mjs
# 마지막 Node24 실행은 --expose-gc가 없어 GC 개입 없이 완료0. Guard 관측 mode이므로 제품pass가 아님.
```

OS sample/cpu-profile은 실행 지연의 단서이며 통계적 성능 증거가 아니다.
10k의 per-call index 비용은 profile-10k.json,100k의 생성/mount 분리는
instrumented-100k-node24-observe.json afterCreate/afterMount에 있다.
100k에서는 실제 모든 geometry/identity를 만들었고3CSS query가 정확한 row를 포함한다.
query2M 초과 처리나 원 fixture를 바꾸지 않았다. 전체 이전9query/3Node/DPR 검증은 후속 제품 검증이다.
