# 1k frame sampling review evidence

제품 변경0, 소형 prototype/진단만이다. 설계와 정확한 한계는
[frame-sampling.md](../frame-sampling.md)가 소유한다.

- `source-inputs.json`: read-only snapshot의1,300파일 SHA256과 aggregate.
- `commit-source-check.json`: root `f2b28364b7555b9af823d9270dea1c2c09e8d9e9`와 차이0.
- `baseline.json`, `baseline.cpuprofile.gz`: unmodified CPU leaf/owner/core-caller 귀속.
- `allocations.json`: exact core clone/ownership count 및 보수적 geometry reuse 반례32개.
- `reuse-timing.json`: counter 없는 동일 plan ABBA 비교. Counter prototype의 index scratch는
  timing harness에서 for-loop로 바꿨다. `getOwnPropertyNames` guard scratch는 여전히 존재한다.
- `scale-prototype.json`, `scale-timing-clean.json`: 원 raw scale 공유안. Native v4 bytes가
  달라지는 배제 대안이며, counter/clean timing이 역전된 사실을 보존한다.
- `prepared-scale-prototype.json`: raw endpoint를 유지한4-slot context+1-slot scale pair.
  기존268 경우와 invalid4개(합272), v3/v4 native 및 sample37 rebase/복원 replay 검증.
- `prepared-scale-timing-clean.json`: counter 없는 소형 timing 진단(원268 경우 포함).
  Baseline GC outlier와 median 역전이 있으므로 가속률을 주장하지 않는다.
- `*.mjs`: 무수정 source copy를 읽는 임시 loader/harness. Product 파일에 쓰지 않는다.
- `*.log.gz`: 각 raw stdout. `verification.json`, `SHA256SUMS.json`: 봉인 검사와 파일 hash.

모든 실행은 Node24.22.1과 원1k fixture다. 생성된 logical data UUID가 실행마다 달라지므로
SHA는 **동일 실행의 before/after만** 비교한다. Input rows/source SHA는 고정이다.

## 재현

동일 commit object와 이 저장소의 dependencies가 필요하다. 아래 명령은 source snapshot과
결과를 gitignored `.artifacts/frame-sampling/`에만 쓴다. 기존 source snapshot이 있으면
`reproduce.mjs`는 덮어쓰지 않는다. 이전 결과는 별도 위치에 보존한 뒤 실행한다.

```sh
node agent_docs/impl/roadmap9/qualification/frame-sampling-evidence/reproduce.mjs
node .artifacts/frame-sampling/profile.mjs
node .artifacts/frame-sampling/allocations.mjs
node .artifacts/frame-sampling/reuse-timing.mjs
node .artifacts/frame-sampling/scale-prototype.mjs
node .artifacts/frame-sampling/scale-prototype.mjs --timing-clean
node .artifacts/frame-sampling/prepared-scale-prototype.mjs
node .artifacts/frame-sampling/prepared-scale-prototype.mjs --timing-clean
```

`registerHooks`를 쓰므로 기록한 Node24 경로를 사용한다. Node20/22 package consumer 지원을
이 진단으로 검증했다고 해석하지 않는다. 모든 sample은1k, 단일 plan/current endpoint이며
새100k 실행·heap 증가·fixture 축소·guard 변경은 없다. Timing만 다시 돌려 SLO pass/fail을
판단하지 않는다. 원50ms common-sample 의무는 남는다.
