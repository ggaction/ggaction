# Geo owned snapshot 합산 검증

Geo JSON의 원 descriptor·cycle·depth·work 검산과 scratch tree 생성 순서를 모두 유지한다. 전체 subtree가 exact owned ordinary tree이고 alias가 없을 때에만 최종 추가 cloneAndFreeze를 생략한다. Caller 입력, 얕게 owned 처리한 mutable child, null prototype, 반복 alias는 기존 복사 경로를 유지한다. Global owned registry나 기본/명시 quota는 바꾸지 않았다.

[합산 증거](geo-owned-merged-evidence/qualification.json)는 owning427개, input100/100/100, source/package/discovery 및 문서 검증을 보존한다. 동일 canonical archive의 Node20/22/24 runtime·strict types·문서·6bundle과 실제 Chromium DPR1/2를 확인했다. Package1268entries/unpacked8,227,795bytes, Node22packed1,826,860·Node24packed1,830,520bytes다. Full793,173 및 animation343,701gzipbytes를 현재 ceiling에 정합했다.

Upstream의 동일 snapshot source가 설치 archive4fbdf2a66fe9a8396b43dcbc6fde2aba2ca0c5e39275a9fe37ef17115db52fa9에서 원100k native/current/rebase/offline 전체 검증을 통과했다. 각199999commands와339849native parts, 전체 scalar4queries 및 current/rebase CSS queries를 유지했다. 이전 rebase 정체는 이 실행에서 재현되지 않았다. 이 결과는 upstream archive의 증거이며 합산 archive에서 새 원100k를 실행했다고 주장하지 않는다.

최종 합산 archive의 원 workload, 장비를 단독 사용하는 canonical5+30 성능, 원 canonical100cycle lifetime은 후속 검증이다. Small100cycle과 Geo100k 기능 검사를 원 lifetime 자격으로 대체하지 않는다. STEP057–070/077은 아직 미완료다.
