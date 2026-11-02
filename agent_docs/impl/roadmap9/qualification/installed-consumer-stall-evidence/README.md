# 장시간 설치 소비자 검사의 정체 진단

- [x] 같은 canonical archive의 설치 integrity와400개 실제 공개 사례 성공 확인
- [x] 반복 native sample과 원 실패·명시 중단·일시정지/재개 경계 보존
- [x] 전체 계약845중844통과/1중단 및 실제 데이터 집중96통과 구분
- [ ] 큰 사례의 독립 process 실행 검증 및 장수명/최종 전체 검증

[qualification.json](qualification.json)이 정확한 실행·중단·미완료 범위를 소유한다.
같은 프로세스에서400개를 실행한 뒤 원100k hit 준비가7분 이상 진전하지 않았다.
두 macOS native sample은 WeakSet.add의 EphemeronHashTable 재정리에 집중됐다.
이는 원인 후보이며 JS 함수별 귀속 또는 제품 memory leak 확정이 아니다.
Root가 소유 child만 SIGTERM했고 부모는 원400개 receipt를 보존한 후 나머지 계약을 마쳤다.
전체 suite green, 큰 fixture 통과, P95나 retained heap 성공으로 세지 않는다.
다음은 fixture/가드를 보존한 독립 process 실행으로 검증 하네스 경계를 확인한다.
별도 장수명 혼합 workload·100cycle 의무는 그대로 남는다.
