# 승인된 축·parent 범례의 안정 예제

`axis-owners`와 `shared-facet-owner`를 canonical examples, registry, 문서 catalog와 같은
함수에 연결했다. 축 frame/title/scale 의미와 child60·union375·legend270 기하를 검증한다.
도식의 설명용 머리말을 공개 API 출력이라고 주장하지 않는다.

초기 handoff의 primitive snapshot은 public graphicSpec에서 authoring-time 변환한 것이어서
독립 증거로 사용하지 않았다. 최종 `test/oracles/guide-owner-scenes.js`는 public program,
renderer, materializer를 import하지 않고 authored domain/plot/margin/font constants에서
좌표·label·header reserve·symbol/label gap·border padding·전체 범례 크기를 산술로 만든다.
Primitive는 이 독립 scene의 explicit createGraphics/editGraphics chain이며 실행 중
public state를 읽지 않는다. Resource namespace도 알려진 facet/cell 문자열에서 별도 계산한다.

- Axis plot310×140, 두 frame45/395, tick55/125/195, inside title365/175.
- Parent plot union375×120, child60×120 네 개, 전체445×220, legend270×37.
- 전체 graphicSpec·order·Canvas 호출·decodedRGBA·PNG·PDF exact,6개 검사PASS.
- SVG는 기존 공개 resourceNamespace 옵션에 같은 `comparison`을 지정해byte exact이다.
  자동 hash는 semantic 차이가 아니라 graphic JSON key insertion order에 따라 달라질 수 있어
  hash를 바꾸거나 비교 오차를 늘리지 않고 기존 옵션으로 identity만 명시했다.
- Canonical browser 두 예제는 공유 harness에서 status/Canvas 크기/오류 없음PASS.
- Structure/discovery15개와 commit된 source ref의 문서120/120을 통과했다.
  다른 범례 slice 통합과 전체 검증도 남아 있다.
