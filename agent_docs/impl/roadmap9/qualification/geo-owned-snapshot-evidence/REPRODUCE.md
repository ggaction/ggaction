# 원 100k 기능 재현

Repository root에서 Node22.23.1 이상(동기 module hooks 지원)과 tar를 사용한다. 정확한 최종 archive를 격리 consumer에 설치하고, `package-root`에 그 `node_modules/ggaction`을 준다. `receipt`는 `file`(tar 절대경로), `sha256`, `version`을 포함하는 pack JSON이다. Helper는 receipt SHA와 설치된 모든 archive 파일 bytes가 일치함을 먼저 확인한다.

```sh
node --expose-gc agent_docs/impl/roadmap9/qualification/geo-owned-snapshot-evidence/large-installed.mjs \
  --package-root=/absolute/isolated-consumer/node_modules/ggaction \
  --receipt=/absolute/pack-receipt.json \
  --output=/absolute/evidence/geo-original100k.json \
  --baseline-footprint=ed299020fa7f2b61130344c9f359aa59ffc13007c0c1453170aed5cd125b9284
```

`baseline-footprint.json`은 원 100k의 ordered full parts JSON hash와 339849 parts/1939096 commands를 고정한다. 낮은 size/부분 query/변경된 hash를 받는 옵션은 없다. 모든 native/current/rebase 좌표와 원 scalar 4queries, CSS 3queries, offline native authority 거부를 검사한다. Reference-only oracle의 4096-part batch 사이와 기존 기능 phase 사이 GC만 유지한다. GC 없는 성능 P95와 구분한다.

`--validate-only=true`는 인자·tar·전체 설치 bytes·private import를 확인하고 큰 입력 생성 전에 종료한다. 이 모드는 기능 통과가 아니다. 대형 실행은 CPU 슬롯을 조율한 후 수행한다. Output에 PID와 시작 시각, 진행 phase, 완료/실패와 모든 원값을 점진 저장하므로 정체 시 결과와 sample을 보존할 수 있다. 수치나 반복 횟수를 줄여 pass로 만들지 않는다.

기존 `large-installed.json`은 수정 전 helper가 archive `4fbdf2a6…`에서 수행한 원 결과다. 재현형 helper의 첫 대형 실행은 최종 합산 archive에서 별도로 기록한다. `reproduction-validation.json`은 이번 parameter/archive 검증만 기록한다.
