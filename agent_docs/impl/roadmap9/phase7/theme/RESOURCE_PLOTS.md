# Resource plot theme 기반 checkpoint

STEP-033 전체 완료가 아니다. 기존 23개 theme token의 Graph/Tree/Treemap 소비자와
descriptor 검증을 먼저 닫고, 추가 typography·guide·palette token과 winning-source inspection을
[PUBLIC.md](PUBLIC.md)에 남긴다. 사용자 전체 승인 `b758b912`를 재사용한다.

## 구현 결정

- Graph/Tree/Treemap grammar가 기존 family 기본값을 계속 하나만 소유한다. Private frozen export를
  theme가 읽으므로 처음 생성과 마지막 theme 제거의 기본값이 어긋나지 않는다.
- Body fill → mark, body stroke → background, edge/link stroke → mutedText,
  label fill/family → text/fontFamily다. Role별 명시 값과 per-node override는 값이 기본값과 같아도 유지한다.
- Theme 변경은 기존 wrapped plot materializer만 한 번 호출한다. 저장 graph/hierarchy/layout의
  identity, revision, 결과와 final item key를 유지한다. Typography와 paint가 함께 바뀌어도 중복 호출하지 않는다.
- Labels/links false 뒤 재생성은 이전 명시 style 소유를 해제한다. Parent theme 제거는 child-local
  frame과 각 family 기본값을 복원한다. Named highlight는 새 baseline 위에서 다시 적용한다.
- 교차 검사에서 발견한 hierarchy label stroke 전달 오류는 Flow owner와 공유한
  `transformLabeledPathHighlightChild`로 고쳤다. Label에는 body의 stroke/strokeWidth를 전달하지 않고
  fill/opacity/offset은 유지한다. Graph arrow 정책은 기존 owner에 남긴다.
- Theme definition/token object는 getter를 호출하기 전에 enumerable own data property인지 검사한다.
  별도 상태·resource·공개 helper·타입은 추가하지 않는다.

## 검증

실행 기록과 정확한 artifact hash는 `resource-plots-evidence/summary.json`과 같은 폴더가 소유한다.

- Public unit/selection/기존 theme lifecycle 103/103. 새 resource plot 회귀는 12개다.
- Source/package/discovery/theme contract 41/41, package artifact contract 7/7.
- Canonical docs 생성 및 docs 검사 172/172.
- 새 role helper coverage 100% lines / 94.74% branches / 100% functions. 변경 selection helper와
  hierarchy policy는 해당 기존 critical floor를 통과한다. Full source coverage를 새로 돌린 증거는 아니다.
- 설치된 artifact의 세 plot family에서 SVG theme color, Canvas=PNG bytes, Program/Graphic codec와
  Canvas scene 동일 bytes, PDF 생성 검증. SVG/PDF의 픽셀 동일성을 주장하지 않는다.
- 패키지 파일은 책임 owner 하나 추가로 821→822다. Node 20/22/24 staging 실측으로 한도를 조정한다.
  Source-free 설치는 Node 22 focused case이며 전체 installed 3-version 재실행을 의미하지 않는다.

## 최초 실패와 범위

처음에는 resource plot 기본색이 theme를 따르지 않았다. Labels false→{}에서 이전 명시색이 남는 문제와
highlight가 label에 stroke를 넘기는 오류도 실패를 먼저 보존한 뒤 수정했다. Selected item은 highlight
draw-order 변경 후 배열 index로 검증할 수 없어 안정 identity key로 기대값을 수정했다.
Package entry/unpacked 및 Node 20 Basic gzip의 기존 한도 초과를 측정해 보존했다.
예상했던 출력과 다른 결과를 통과로 표시하거나 시각 golden을 덮지 않았다.

후속: STEP-033 token·provenance 전체 구현, 합쳐질 Flow/Partition 소비자, STEP-034/035는 계속 남는다.
