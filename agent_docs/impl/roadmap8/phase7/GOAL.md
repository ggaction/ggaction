# Phase 7 — Roadmap 8 통합 완료

상태: **완료**. F01–F05와 F07–F12의 runtime, 타입, current contract, generated knowledge,
문서, 패키지 경계와 성능 workload를 통합했다. F06과 V23–V25는 사용자 결정에 따라 제외했다.

## 완료 결과

- Dataset schema를 source, transform, revision과 editable snapshot schema version 2에 연결했다.
- Empty-domain, mark missing, 통계 missing/empty/report 정책을 명시적으로 구현했다.
- Regression fit/interval/predict와 fixed/follow source binding lifecycle을 분리했다.
- Stable multi-key sorted data의 create/edit/revise/snapshot lifecycle을 완성했다.
- `ggaction/inspection`의 schema, action descriptor, program comparison, graphic inspection API를 공개했다.
- 후보 branch, parameter revision, bounded trajectory, source revision, empty recovery, snapshot,
  1천/1만 item inspection과 5만 row bounded-preview workload를 측정했다.
- Public action 274개, 전체 catalog action 281개, internal wrapped action 120개를 동기화했다.

## 검증

- `npm run test:unit`: 2,575개 통과.
- `npm run test:contracts`: 524개 통과.
- `npm run test:docs`: 120개 통과.
- `npm run test:charts`: 578개 통과.
- `npm run test:browser`: 86개 통과.
- `npm run benchmark:runtime`: 실제 graphic inspection을 포함한 workload report 생성.
- `npm run package:check`: 551 entries, 759,755 packed bytes, 3,837,346 unpacked bytes.
- Full browser entry는 schema·policy runtime 추가 후 368,326-byte gzip으로 측정되어 회귀 상한을
  370,000 bytes로 조정했다. 실제 Basic/SVG 측정치는 170,210/6,956 bytes이며 기존 상한을 유지한다.

최종 수치가 후속 검증에서 달라지면 이 파일을 실행 결과에 맞춰 갱신한다. 현재 API의 canonical
목록은 [`../../../contract/ACTION_INDEX.json`](../../../contract/ACTION_INDEX.json)이다.

## 별도 운영 범위

Release tag, npm publish, GitHub release와 문서 배포는 이 Phase에서 실행하지 않았다. 이 작업들은
검증된 commit을 대상으로 별도 release 절차에서 수행한다.
