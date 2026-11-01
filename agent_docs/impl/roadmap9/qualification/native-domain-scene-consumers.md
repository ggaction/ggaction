# Native facade scene 소비자 검증

- 승인: [기존 remainingApproval](../AUTHORIZATION.json)을 재사용한다.
- 최신 root `d2bbf53c8`를 merge `b9707e6d1`로 반영했다. Runtime/types/package 입력은 root와 같다. 공유 animation owner를 직접 수정하지 않았다.
- `test/unit/animation/domain-facade-fallbacks.test.js`가 Table 정렬, Pyramid 방향, OHLC/Waterfall 폭, Trail sample-width→constant-width의 실제 native edit를 검증한다.
- 원 item key와 원행은 유지하며, Table header/body/footer와 Waterfall subtotal/total의 독립 행 목록까지 검산한다. 각 실제 track의 `unsupported-family`/`primitive-role`과 개수, 40ms의 0.6/0.4 weight를 고정했다. 새 typed kernel 지원을 주장하지 않는다.
- 최초 plan 0/20/40/100ms, authentic 현재 frame을 출발점과 도착점으로 각각 쓰는 reverse/forward plan 0/30/60ms의 전체 offline frame을 비교한다. endpoint 객체 동일성, concrete graphics에서 재구성한 장면의 실제 properties/clip/offset, immutable 원본을 확인한다.
- 재구성한 scene snapshot key/topology는 retained animation matching key/topology와 별도다. 이 차이를 숨겨 fullframe 비교를 축소하지 않고, 실제 rendering content의 일관성과 offline 전체 frame 동일성을 각각 검사한다.
- 최초 실패 2종은 시험의 잘못된 node identity/scene key 가정이며 원본 로그를 보존했다. 제품 수정은 없다.
- owning 115/115, 변경 5개×Node20/22/24, docs 47/47 통과. 병합된 검색 index는 1,089,169 bytes(기존 root +692)라 최소 cap 1,089,200을 적용했으며 최초 실패도 보존했다. 시험/문서 생성물만 변경하여 새 package archive/번들·renderer 전수 재실행은 하지 않았다.
- Native manifest는 해당 5개 scene-animation owner만 추가한다. 원 required/applicability/다른 owner/실행 결과를 유지한다. STEP077 또는 전체 animation 완료 증거가 아니다.

기계 요약과 원본 로그: [evidence](native-domain-scene-evidence/summary.json).
