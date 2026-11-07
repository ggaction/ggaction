# Native layout update checkpoint evidence

이 evidence는 공개 B 경로의 첫 `editLayout` 연결을 검증한다. 전체 B union·원100ms·대규모 capacity 완료 증거가 아니다. `union.json`은 직접14/파생21/기존감사332개의 남은 범위를 유지한다.

저장소 루트에서 실행한다. `node20`, `node22`, `node24`는 실제 해당 major 실행 파일로 대체한다. npm을 통해 실행하지 않는 다른 호스트는 `npm_execpath`를 그 호스트 npm CLI 절대 경로로 설정한다.

```sh
zsh agent_docs/impl/roadmap9/chart/route-native-update-evidence/owning.zsh node20 node22 node24
node22 --test test/contracts/action-catalog.test.js test/contracts/compact-action-cards.test.js test/contracts/documentation-truth.test.js test/contracts/action-input-matrix.test.js test/contracts/graph-route-types.test.js test/contracts/graph-route-package.test.js > .artifacts/route-native-update/docs-final.log 2>&1
node20 agent_docs/impl/roadmap9/chart/route-native-update-evidence/archive.mjs
node20 agent_docs/impl/roadmap9/chart/route-native-update-evidence/installed.mjs
node22 agent_docs/impl/roadmap9/chart/route-native-update-evidence/installed.mjs
node24 agent_docs/impl/roadmap9/chart/route-native-update-evidence/installed.mjs
node22 agent_docs/impl/roadmap9/chart/route-native-update-evidence/browser.mjs
node22 agent_docs/impl/roadmap9/chart/route-native-update-evidence/union.mjs
node22 agent_docs/impl/roadmap9/chart/route-native-update-evidence/record.mjs
node22 agent_docs/impl/roadmap9/chart/route-native-update-evidence/verify.mjs
```

`archive.mjs`가 만든 단일 tarball을 모든 설치와 브라우저 검사가 공유한다. 소스 없는 임시 소비자에서 실제 Worker, 같은 엔진의 원 v1 기하, v2 정확 hash/bytes, immutable apply, 취소·수명·타입·번들 경계를 검사한다. 브라우저는 제품 문서의 실제 host/worker/update 조각도 실행한다. `record.mjs`는 현재 변경 소스와 압축 영수증을 고정하고 `verify.mjs`는 해시 및 기존 coverage/bundle/package 기준을 재검산한다. 엔진 간 수치 hash 동일성은 주장하지 않는다.

초기 own-data acquisition/deep clone의 완전 work·depth·heap 계량, 비선점 snapshot/clone/postMessage/최종 materialization, 전체 indirect/native update union은 미완료다. 공개·배포 작업은 수행하지 않는다.
