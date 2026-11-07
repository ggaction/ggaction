# 좌표 sample의 검증·배열 소유권 재사용

- [x] 실제 원1k point의 동일 native plan에서 전체 frame deepEqual
- [x] copied/frozen/getter 입력 경계와6연속 scale 독립 공식 포함 owning164개
- [x] critical8개:100/96.20/100, 경계20·package7·문서243·실제 Canvas/SVG browser2개
- [x] 같은 tar Node20/22/24 각각 runtime6·strict types·peers·bundle6개
- [x] 문서186페이지·선택 LLM1606개
- [x] source pin 및 같은 archive 재확인
- [ ] 원100k sample·Canvas 재생과 최종 native P95/heap/lifecycle

정확한 실행 범위와 원자료는 [qualification.json](qualification.json)이 소유한다.
`preparedPositions`에 등록된 이 모듈의 정확한 immutable plan만 닫힌 record 검사를 재사용한다.
복사본과 caller-frozen plan은 종전 전체 경계 검사를 거치며 호출자 배열을 동결하거나 owned로 등록하지 않는다.
중간 scale은 검증된 scalar와 새 local domain/range만 가지므로 배열과 scale을 mapping 전에 owned로 등록한다.
원수학·연산 순서·fallback·공개 API·types·저장 구조·용량 guard는 그대로다.

같은 실제 plan을 임시 loader로 두 sampler에 연결한 원1k 검산에서 전체 frame은 동일하다.
내부 clone allocations24037→14037, owned registrations26042→22042,
descriptor walks3002→1002이며 clone calls9020은 같다.
이것은 객체 생성 귀속 증거이며 원100k 지연시간·browser P95 통과 또는 순차 STEP 완료가 아니다.

Canonical archive `7a58b485728c4e47ef37d30455bfce6cfdef6af630bd8c43ade98eb7ad16da6b`를
세 Node에 그대로 설치했다.1251entries/Node22packed1791989/Node20·24packed1795790/
unpacked8088155bytes다. 실측에 따라 packed1795800/unpacked8088200과
animation gzip333900(실측333816)만 재평가했다. 원 pack 실패와 premeasure를 원자료로 보존한다.
재현 harness는 이전 [source-free installed consumer](../frame-appearance-reuse-evidence/installed.mjs)를 재사용한다.

소스 `0b86ddebd41788295a8836ff4546f0cd4cba8154` pin 이후 문서 계약9개와 같은 archive 재확인이 통과했다. 메타데이터 검증을 새 runtime 또는 전체 suite 실행으로 세지 않는다.
