# 추론 검증 재사용·바이트 계산의 합산 검증

- [x] 기존 전체 승인과 root의 정확한 proof 경계 채택을 재사용
- [x] fa943e864의 runtime4개를 기존 통합 후보에 바이트 단위로 동일하게 병합
- [x] owning207개·focused24개·계약26개·package7개·coverage 정책7개·문서243개 통과
- [x] 같은 canonical archive의 Node20/22/24 각각 runtime5개·strict type·문서2개·optional peers·bundle6개 통과
- [x] 실제 Chromium worker의 원100/1000/10000노드와 모든 간선·원행·가중치 검산
- [x] 문서186페이지·LLM1606개 identity 검사
- [x] 소스 commit pin 및 동일 archive 재확인
- [ ] 최종 combined AT82 반복 P95·retained heap·100cycle와 STEP057–070 종료

정확한 입력·실행 결과·첫 실패는 [qualification.json](qualification.json)이 소유한다.
이 checkpoint는 [검증 증명](../inference-reuse.md)과 [바이트 계산](../inference-byte-refinement.md)을
기존 point capacity·interaction handles·native worker benchmark 위에 합친다.
공개 API·저장 schema·추론 수학·원 work charge·hash·원 입력과 SLO는 바꾸지 않는다.
4개 변경 owner의 critical 증거는 source SHA와 실제 bytes가 같은 upstream 결과를 재사용하며,
whole coverage 또는 전체 suite를 새로 통과했다고 주장하지 않는다.

Canonical archive `942ca2087dd01f83441f2e78cc9963901b58ca79d81789bf6e079a789771c72a`를
세 Node에 그대로 설치했다. Package 실측은1251entries/Node22packed1,791,884/
unpacked8,087,760bytes이며 Node20/24packed1,795,679bytes다.
최소 한도1251/1,795,700/8,087,800, Full786,200/graph67,900gzipbytes를 적용한다.
Node20 최초 packed cap 실패와 suite selector 오류는 원 log로 보존한다.

실제 브라우저 large prepare8,203.2ms·commit446.7ms는 단발 기능 진단이다.
원100000간선과 search work31,318,394를 전수 유지했다.
이 관측이10초 아래라도 warmup5/측정30의 P95 또는 최종 성능 지원 통과로 세지 않는다.
최종 합산 후보의 전체9명령·577consumer·79ATgroup 및 보호된 최종 전달은 열려 있다.

소스 `5c07283cefeb08f9eca0e40bf5ab1e70c13c094b` pin 이후 문서 계약9개가 통과했고,
재포장한 archive SHA도 위 canonical archive와 동일하다. 메타데이터 기록이 runtime이나
package 입력을 바꾸지 않았으며 추가 전체 suite 실행으로 세지 않는다.

재현은 저장된 `evidence.py.gz`를 artifact 디렉터리에 복원하여 실행한다.
설치 harness는 기존 `qualification/inference-worker-evidence/installed.mjs`를 재사용하며,
원 descriptor와 모든 실제 receipt는 이 디렉터리의 압축 evidence에 보존한다.
