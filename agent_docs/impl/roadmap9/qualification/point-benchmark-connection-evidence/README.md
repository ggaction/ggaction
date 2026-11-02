# 원 point/data benchmark의 명시 native 용량 연결

기존 승인 범위에서 benchmark의 `createPointMark`에 공개 `maxItems:100000`만 전달했다.
15개 원 kind/size fixture hash를 변경 전후 모두 비교했고 완전히 같다. 원 seed·크기·DPR·
query·source row·좌표·threshold·blocking 측정 방식은 바꾸지 않았다. 계약38개가 통과했다.
새로 도달한 `Hit program exceeds its item budget.` RangeError는 알려진 item guard로 분류한다.
일반 Error와 내부 assertion은 계속 failure이며 명시 한도는 지원 성공이나 N/A가 아니다.
최초 두100k hit의 기존 classifier 실패와 수정 후 실제 재실행을 분리 보존한다.

현재 point source가 들어간 동일0f38bed7 archive를 실제 source-free Chromium production bundle로
실행했다. Points와data 각각3개 크기×DPR1/2의6셀, 합계24stage다. 최종 point는6measured/
6explicit-limit, data는12measured다. 모든100k native point와 data load/revise 출력의 전수 geometry가
독립 공식과 일치했다. Post-bootstrap network0과 입력 불변을 확인했다.

Data100k의 단발 load는약0.78–0.81초, revise는약5.35–5.71초였다. 동기 call 전체가blocking slice다.
이는 warm0/sample1 진단이며P95·원 size별 SLO·50ms blocking·AT56/82 또는 STEP077 통과가 아니다.
Point10k/100k animation 및100k hit는 원래 한도에서 계속 거부된다. worker·async data 준비 및
큰 native frame/hit 지원·최종 고정 장비 전수 성능 판정은 남아 있다.

실행은 repository root에서 다음 두 명령이다. `<archive>`는 point 통합 qualification의 canonical
0f38bed7 SHA256 archive 절대경로다.

```sh
node scripts/benchmark-native.js --archive=<archive> --output=.artifacts/point-benchmark-points --workload=points --diagnostic
node scripts/benchmark-native.js --archive=<archive> --output=.artifacts/point-benchmark-data --workload=data --diagnostic
```

Runtime·types·packed 입력은 변경0이라 새 package를 만들지 않는다. Harness의 실제 실행 bytes는
report.inputs로 별도 고정했고 당시 checkout HEAD와 구분한다. Data 실행은 classifier 수리 전의
bytes이며 data 입력·공개 호출·수치 oracle·원 measured12stage는 그대로다. Archive와 실제 증거를
새 source 없는 실행으로 바꾸어 기록하지 않는다.
