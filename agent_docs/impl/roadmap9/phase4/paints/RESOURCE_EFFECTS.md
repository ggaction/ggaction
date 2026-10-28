# Resource plot와 이미지의 효과 소비자 통합

## 진행 상태

- [x] P2 및 전체 남은 결정 승인 재사용
- [x] Tree/Treemap/Partition/Graph/Flow의 본문·라벨 outline/shadow
- [x] Tree link와 Graph edge/arrow의 stroke 기반 shadow
- [x] Image source alpha를 사용한 shadow와 exact viewport clip
- [x] 저장·제거·immutable 입력·타입·공개 계약 동기화
- [x] 8종 공개/primitive Canvas·SVG·PNG·PDF 동일 출력
- [x] 실제 dataset5종×recipe3종의 역할 효과와 기존 회귀47개
- [x] 통합 전체 coverage·installed archive3Node 검증 및 checkpoint

[승인한 P2](PUBLIC.md)와 [남은 결정 승인](../../AUTHORIZATION.json)을 재사용한다.
원안의 효과 소비자를 기존 역할 옵션에 연결하며 새 action/resource/entry를 만들지 않는다.
Image에는 원래 pixel alpha에 따른 shadow를 제공한다. 벡터 contour가 없는 이미지의 outline이나
stroke 기반 tree link/graph edge outline은 허용하지 않는다. 후행 animation/controller 요구는 남는다.

## 구현과 저장 경계

`grammar/markEffects.js`는 기존 outline/shadow 정규화 owner를 호출한다. 본문·라벨과 item override가
합쳐진 뒤 `materialization/markEffects.js`가 false reset을 concrete 속성에서 제거한다. 같은 patch의
outline+stroke 충돌, 이전 stroke 보존, override별 false, 하이라이트 stroke에 의한 outline 제거는
기존 mark 계약을 따른다. 새 선택 의미나 layout 계산을 style에 섞지 않는다.

Image config의 shadow는 optional이며 기존 저장 결과에 필수 키를 추가하지 않는다. 복원은 모든
resolved shadow 항목을 확인한다. Image shadow 준비는 전체 work/pixel/byte preflight 후 명시 decode
host로 source RGBA를 얻고 기존 glyph composite owner에 전달한다. 투명한 원본 pixel은 shadow를
만들지 않는다. source+shadow에 opacity를 한 번 적용하고 기존 viewport/outer clip을 지킨다.
Text shadow는 등록된 exact font profile과 prepared metrics를 사용한다.

## 재현과 확인한 결과

- `test/unit/resources/resource-plot-effects.test.js`: 7 plot 역할, per-node/edge·arrow 예외와 pattern 기본값 보존, 총9개.
- `test/unit/resources/image-shadow.test.js`: 독립 RGBA 위치·alpha128·투명 corner·clip·codec·stale·decoder 사전검사2개.
- `test/charts/mark-shadows/resource-consumers.render.js`: tree,treemap,icicle,sunburst,graph,flow-node,flow-link,image.
  실제 browser Canvas/SVG와 native PNG/PDF를 각각 같은 실행의 explicit primitive와 비교한다.
  font asset을 exact 준비하며 원본과 그림자 외의 그래픽은 기존 renderer를 사용한다.
- 실제 데이터 검사는 `node scripts/run-tests.js realistic contracts/realistic-mark-shadows.test.js contracts/realistic-flow-layouts.test.js contracts/realistic-hierarchy-lifecycle.test.js`로 실행했다.
  실제 source hash와 행을 유지한 47/47 검사가 통과했다. 새 역할 효과는5dataset×3recipe×6family를 포함한다.
- 문서 검사177/177, built160pages/1390selective artifacts를 확인했다.
- 새 정규화·materialization owner는 focused coverage에서 line/branch/function 모두100%다.

최초 renderer 검사는 테스트 fixture의 private item id, 준비되지 않은 label/title font, 제한을 넘은
blur work, SVG를 지원하지 않는 테스트 decoder를 발견했다. private id 제거·exact font preparation·
기존10m work 안의 사례·canonical image decoder로 수정했다. runtime work 한도는 올리지 않았다.
Image unit에서는 fixture byte 타입, collection의 inherited image type, viewport 기준 oracle를 수정했다.
최초 실패 로그와 후속 결과를 `.artifacts/resource-effect-*` 및 `.artifacts/resource-effects-*`에 보존한다.

## 패키지와 공개 목록

통합 source의 공개 action328, option path30015, required19975, excluded10040과 ledger35451을
canonical inventory generator로 계산했다. Flow API/tutorial navigation 두 페이지를 기존 canonical
pages 목록에 등록했다. 새 search index940813bytes는 최소1000단위941000cap에 포함한다.
Package entry863/packed1258299/unpacked5801784, installed Node20 Full634881/Basic359550/SVG20196gzip을
실측해 기존 budget 초과를 기록한 후 최소 cap863/1259000/5802000 및635000/360000/25000을 적용했다.

최종 고정 archive는 SHA256 `097587bad545225bd0b9afa0e040e3ab27e8ff9a0d06db6ffffc89c4e7ebaf79`다.
같은 archive에서 Node20/22/24 각각 runtime228, tutorial81, type/MCP/bundle을 포함한 qualification7개가 모두 통과했다.
전체 suite는7697개 중7694개가 최초 통과했다. 나머지3개는 Flow baseline·capability 목록의 정렬과
Partition action reachability 목록 순서에 관한 메타데이터 불일치였다. canonical 목록을 재생성·정렬하고
reachability와 실제 trace 순서를 구분한 후 해당 owner22/22가 통과했다. runtime source는 바뀌지 않았고
메타데이터 수정 뒤 전체 suite를 다시 돌렸다고 주장하지 않는다.
전체 coverage는 line96.54/branch94.41/function98.95%, 중요 파일381개의 개별 floor도 모두 통과했다.
최종 문서177/177과 built160pages/1390artifacts, desktop search 및320/390/768px의 모든 페이지 검사가 통과했다.
공개 renderer 예제의 label 대비를 확인하고 최종8종을 다시 비교했다. variant metadata는 실행 fixture와
최종 공개 action을 표시하며 plot 영역의 실제 ink도 확인한다.
[검증 정본](resource-effects-evidence/summary.json)은 정확한 입력 hash, 최초 실패, 전체 coverage 원본,
수정 후 검사, 세 Node receipt를 보존한다.
이 기록은 전체 Roadmap9 또는 STEP-077 완료 선언이 아니다.
