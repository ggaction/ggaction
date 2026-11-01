# Native 경로·메모리 측정 도구

기존 full native route fixture와 기준을 `scripts/benchmark-native.js` 및 `scripts/benchmarks/`로 옮겼다. 실행 가능한 도구는 구현 이력 디렉터리를 읽지 않는다. 필수 local archive를 실제 설치하고 그 package만 production browser bundle에 포함한다. bootstrap 후 offline, DPR1/2, 기본 warmup5·측정30·memory100회와 exact counter0을 기록한다. Graphic count 등 실패를 기록하고 다른 독립 cell 측정을 계속하며, budget error를 성공으로 세지 않는다.

```sh
node scripts/benchmark-native.js --archive=/absolute/candidate.tgz --output=/absolute/evidence
node scripts/benchmark-native.js --archive=/absolute/candidate.tgz --output=/absolute/diagnostic --workload=routes --diagnostic
node scripts/benchmark-native.js --archive=/absolute/candidate.tgz --output=/absolute/memory --workload=memory
```

`--diagnostic`은 짧은 도구 검증이며 성능 qualification이 아니다. 이번 검증은 고정 ebfa7ce2 package에서 diagnostic route8cell·memory4회×2, 실제 memory100회×2를 실행했다. 두 DPR에서 retained heap 기울기는 약4.8/5.0KB per cycle, 증가량은886,508/896,372bytes였다. 해당 inspect mount·실제 Blob route worker fixture는 기준 안이지만 pointer editing·ResizeObserver·asset decode를 포함한 합산 heap이나 최종 candidate 증거가 아니다. Node syntax3·discovery/package boundary22을 확인했다.

Point/partition/geo/load/inference latency 및 전체 route sizeclass 측정·최적화, combined lifecycle heap, 정확한 최종 candidate 재실행은 계속 남아 있다. AT56/82 owner와 실제 최종 qualification 결과를 변경하지 않는다.
