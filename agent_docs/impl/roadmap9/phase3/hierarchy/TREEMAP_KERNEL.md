# Hierarchy treemap private checkpoint

## 진행 상태

- [x] 공통 model/value/lineage owner를 소비하는 slice-dice와 squarify 계산
- [x] Stable descending child order·equal-aspect tie·reserved own rectangle
- [x] 재귀 padding·전역 면적 보존·무중첩·containment·zero metadata 검증
- [x] BigInt 유리수 oracle·깊이10,000·work bound·source/package 경계 검증
- [ ] 명시 input/key/value/custom-field sibling 정렬
- [ ] Hierarchy/layout resources 및 public/visual/consumer 통합
- [ ] AT-22·STEP-020·STEP-077 전체 완료

기준은 partition `4bf4a3c5e19898606f6771fb80b84f6d016595a3`이며 기존
[AUTHORIZATION](../../AUTHORIZATION.json)과 parent의 private 계산 위임을 재사용한다.
Tree/partition/treemap 세 kernel을 준비했다는 것과 공개 기능 완료는 구분한다.

## 소유자와 명시 입력

`layoutHierarchyTreemap(model,{size,padding,method,maxNodes?})`는 기존 model integrity/index,
numeric compensated sum/prefix, own-data boundary와 공통 work 한도를 재사용한다.
별도 hierarchy parser·identity·value aggregation 또는 source-row 추론을 만들지 않는다.
`size:[width,height]`와 `padding`은 finite nonnegative이고 root area도 finite여야 한다.
Method는 slice-dice/squarify 중 명시한다. Source/model/options는 수정하지 않고 반환값을 freeze한다.

결과 node는 원 key, parent, children, depth, weights, sourceRows와 다음 private 계산 metadata를 갖는다.

| 필드 | 의미 |
| --- | --- |
| rect | 부모에게 배분받은 x0/y0/x1/y1 사각형 |
| content | 각 축 반폭까지 제한한 padding을 뺀 사용 가능 사각형 |
| residualRect | 자신의 ownValue 몫. 가짜 node를 생성하지 않는다. |
| childOrder | 실제 tile 배치에 사용한 child key 순서 |
| area | rect의 계산 면적. Pixel 반올림은 적용하지 않는다. |

Slice-dice는 root에서 x축으로 시작하고 depth마다 y/x를 교대하는 private 정책이다.
Model의 child 순서를 그대로 쓰고 ownValue는 해당 축의 마지막 tail이다.
Squarify는 child total descending stable 순서이며 동률은 입력 child 순서다.
Own 몫은 content의 마지막 x strip으로 먼저 예약하고 나머지 영역에 실제 children을 배치한다.
따라서 squarify child 정렬에 parent 자체 몫을 가짜 child로 섞지 않는다.
Node 배열과 원 childrenKeys는 canonical model preorder를 그대로 보존한다.

Squarify는 short side를 기준으로 worst aspect가 엄격하게 좋아지는 동안 row를 늘린다.
동률이면 기존 row를 확정한다. 일반 dimension ratio가 유한하면 그대로 비교하며,
극단적인 비율에서만 log-space 비교를 써서 제곱/면적비 overflow를 피한다.
반복 row 계산과 정렬 비교 비용을 model 검증 비용에 합쳐10M work로 제한한다.
큰 candidate 배열을 여러 번 평가하는 경우도 검사 비용에 포함하며20,000-leaf 과부하 fixture는 명확히 실패한다.
깊은 single-child hierarchy는 iterative 순회로10,000 depth에서 동작한다.

전체 total0은 root부터 zero rectangle이며 node metadata를 남긴다. 일부 child weight0도 삭제하지 않는다.
Padding으로 내부가 사라지면 descendants는 zero area가 된다. 아주 작은 양수 weight/치수는
부동소수점 표현 한계에서 zero area가 될 수 있으나 원 value/identity를 보존하고 nonfinite 좌표를 만들지 않는다.

## 독립 검증과 재현

`test/oracles/hierarchy-treemap.js`는 production import 없이 BigInt 유리수로 모든 candidate row prefix의
정확한 aspect를 평가하고 earliest global minimum을 고른다. Production의 부동소수점 local-improvement
walk와 계산 경로가 다르다. 6×4의7개 weight literal 및2×2 동률 fixture를 anchor하고30개 정수 fixture를 비교한다.

각 부모에서 children area+own reserved area=content area, 무중첩·containment를 검사한다.
전역에서는 모든 node의 reserved area와 모든 padding border area를 합쳐 root area와 비교한다.
Padding0의 value 비례, source lineage/key 보존, 배율 변화, 안정적인 동률 순서,
empty/forest/zero와 MIN_VALUE/MAX_VALUE dimension의 finite 동작도 별도 검사한다.

| 명령 | 결과 |
| --- | --- |
| Hierarchy6개 test 파일+numeric-sums의 Node coverage | 56 passed; treemap100/97.22/100, partition100/93.75/100, 나머지100/100/100 |
| Canonical critical95/90/100 | 여섯 hierarchy owner 통과, 기준 유지 |
| `node scripts/check-hierarchy-fixtures.js` | 15개 독립 fixture의 call/input/expected/actual/diff SHA 저장 |
| Discovery/source/package boundary 및 artifact contracts | 38 passed |
| `npm run package:check` | 689entries/1,026,790packed/4,776,397unpacked bytes |
| `npm run package:bundle` | Full/Basic installed browser build 통과; gzip510,644/287,809bytes 유지 |

증거는 `.artifacts/validation/hierarchy-treemap/`에 보존한다. 이전688-entry cap 실패도 보존한다.
새 source1개를 반영하여 entry cap689, 실측 최소1,000byte 경계로1,027,000/4,777,000 bytes를 적용했다.
Public import graph에는 이 private owner가 들어가지 않아 bundle 증가는 없다.
공통 numeric owner는 직전 checkpoint에서 기존 통계343개를 통과했고 그 소스는 여기서 바뀌지 않았다.
Main 누적 integration의 package/bundle/full/realistic 검증은 parent가 별도로 수행한다.

## 남은 의무

명시 sibling ordering과 public hierarchy/layout resource lifecycle, 실제 dataset row identity/ref,
persistence/inspection/scene/selection/hit/accessibility, composition, SVG/Canvas/PNG/PDF와 types/docs 소비자 통합이 남는다.
새 tree/treemap/partition visual public flow는 실행 가능한 rendered primitive 검토 뒤 구현한다.
이 기록은 독립 계산의 checkpoint이며 STEP-020 또는 전체77개 카드의 완료 선언이 아니다.
