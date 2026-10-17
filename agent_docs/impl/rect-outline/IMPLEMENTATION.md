# 닫힌 rectangle outline 복구

새 합성 기능의 독립 primitive 대조에서 기존 Canvas rectangle이 마지막 점을
첫 점에 lineTo로 연결할 뿐 closePath를 호출하지 않는 것을 재현했다. 이에 따라
시작 모서리가 join 대신 두 end cap으로 그려져 SVG/native strokeRect와 달랐다.

기존 rectangle 의미에 맞게 마지막 segment를 closePath로 바꾸었다. 새 API·저장·
geometry/bounds는 없다. 기본 stroke가 없는 경우나 폭0은 그대로 생략한다.

- 3join ×3cap 전체80×80 RGBA가 독립 native strokeRect와 정확히 같다.
- 기존 renderer unit과 이 회귀를 함께 통과했다.
- 새 difference의32개 background/opacity/width 조합에서 독립 native source와
  public Canvas, OffscreenCanvas 및 독립/public SVG 각각의 전체 RGBA가 정확히 같다.
  각 내부/outline 표본에서 Canvas와 SVG도 정확히 같다. 이미지/VLM 검사는 하지 않았다.
