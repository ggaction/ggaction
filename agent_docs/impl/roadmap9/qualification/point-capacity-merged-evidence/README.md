# Point 명시 용량 통합

기존 전체 실행 승인과 point 최소 설계에 따라9cb510f05를15842b929에 통합한다.
12개 incoming source/type 파일은 모두 byte-identical하다. 기본50000은 그대로이고,
공개 `maxItems` 명시 용량만100000까지 허용한다. Raw/output, 원 native point owner,
retained child, facade, edit/remove, source revise, primitive와 editable codec 경계를 함께 검증한다.
전역 item/work 및 hit/animation/renderer 한도를 바꾸지 않는다.

최초 incoming owning66개가 통합본에서 통과했다. 고비용4backend 검사를 `.render.js`로
분리하고 공통 입력을 `test/support/point-capacity.js` 한 곳에 두었다. 같은 모든100000좌표,
Canvas arc100000/SVG circle100000/PDF fill100001 및 PNG/SVG/PDF 대표 잉크 검산을 유지한다.
정상 의미 검사와 별도 renderer 실행의 최종 집계는 qualification.json에 기록한다.
Selector coverage100/92/100은 기존90/80/100 floor를 유지한다.

동일 canonical archive를 실제3Node에 설치해 Full/Basic 각각100000 raw/concrete 전수,
100001 거부와 Full capacity 감소·제거 실패, 두 scatter facade 및 strict TypeScript를 확인했다.
3Node6bundle 실제18개 측정에서 Full/Basic 최대784297/424647을 근거로784300/424700만
최소 정합했다. 최초 cap 실패의 raw 결과와 같은 측정의 재대조를 구분한다. 나머지4개
bundle ceiling은 바꾸지 않았다. 초기 독립 설치 harness의 작은 scatter에 Canvas를 빠뜨린
오류도 원본으로 보존하고 올바른 공개 호출로 실제 실행을 다시 했다.

Node22 archive1239entries/1778464packed/8025734unpacked, 실제 Node20/24 npm packed
최대1781472에1239/1781500/8025800 ceiling을 적용했다. 첫 packed cap 거부를 보존한다.
전체 문서241개와 generated157이미지를 확인했으며 PNG byte는 변하지 않았다.

이 변경은 원100k benchmark를 native 옵션에 연결하거나 hit/animation과 동기50ms slice를
완료하지 않는다. 해당 도구 변경과 모든 원 크기·DPR·SLO 검증은 후속 개념이다. 전체
577consumer/79ATgroup,9개 최종 명령, 독립 검토와 보호된 최종 전달도 계속 남아 있다.
