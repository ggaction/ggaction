# Native axis label 배치 공유 검증

선택과 승인 근거는 [GUIDE_DETAILS](../GUIDE_DETAILS.md)의 native label 준비 절 및
[remainingApproval](../../AUTHORIZATION.json#remainingApproval)에 있다. 기존 action은 명시적으로
materialize하며 새 공개 API·저장 schema·typed guide family를 추가하지 않는다.

## 변경과 결과

- `materialization/axisLabelLayout.js`가 원 값 선택, 숨겨진 표시 문자열, settled wrapping과
  measured edge clearance/rotation/flush/alignment 계산을 공유한다. Action은 기존 Canvas와
  label/title 충돌 검사를 그대로 소유한다. 준비 후 해석 단계는 줄을 다시 나누지 않는다.
- Native guides + responsive + 신규 5개, 총 **1,130/1,130**가 통과했다. 변경 두 owner의
  line/function은 98/100%, branch94.46%이며 새 배치 owner는 **100/97.50/100**이다.
  `critical.json`은 canonical95/90/100 floor 적용 결과를 보존한다.
- 경계·발견·coverage policy·package·문서 진실성·architecture path **47/47**,
  최종 숫자 동기화 후 metadata **11/11**, 새 source Node20/22/24 각 **5/5**가 통과했다.
- 기존 `312026112`에 대한 세 프로그램의 **전체 저장값과 trace가 정확히 동일**하다.
  회전→wrapping→resize, 양축 flush+relative title, responsive skip→rotate를 대조했다.
  `equivalence.mjs`와 `equivalence.json`이 실행과 결과를 보존한다.
- 최종 같은 archive `7b20ca99f15a6bf24a4785584cd69a3e2f3aeaa9199265a3acaf7f2f21b4e88f`를
  Node20/22/24에 설치해 public import만 사용하는 `consumer.mjs` **3사례**와
  **6 entry bundle**을 각각 통과했다. `archive-source-proof.json`은 변경 source 두 파일의
  canonical staged bytes가 정확히 같음을 확인한다. 신규 private helper를 설치 fixture에서
  import하지 않는다.

## 첫 실패와 측정

첫 신규 test는 labelMap의 `label` 대신 `text`, metric profile의 정규화된 numeric weight 대신
`normal`을 쓴 fixture 오류 4개였다. 원 로그를 유지하고 실제 public/metric 계약으로 수리했다.
설치 첫 fixture는 Basic에 없는 `editCanvas`를 호출했다. Basic은 각각의 크기로 새로 생성하고
Full은 edit까지 확인하도록 수리했으며 runtime은 바꾸지 않았다.

Package 첫 1169>1168 실패와 bundle Full774703/Basic422705의 기존 상한 초과를 보존했다.
최종 3Node 실측은 1169 entries, packed 최대1675202, unpacked7562939이며 상한은
1169/1675300/7563000이다. Full/Basic cap은 774800/422800으로 최소 교정하고 README와
현재 architecture 표를 함께 갱신했다. 다른 네 entry cap은 유지했다.
Intermediate archive c2cee291…a3d94의 Node20 실패를 최종 통과로 세지 않는다.

## 재현과 남은 통합

저장된 native source baseline이 필요하면 repository root에서
`git archive 312026112 src | tar -x -C .artifacts/guide-details-baseline`을 실행한다.
이후 `node agent_docs/impl/roadmap9/animation/guide-label-layout-evidence/equivalence.mjs`로
세 source 동등성을 확인한다. 설치 fixture는 `scripts/package-consumer.js`의
`preparePackageConsumer({packageSpec: exactTar})`가 만든 격리 디렉터리로 `consumer.mjs`를
복사해 해당 Node로 실행했다. 번들은 같은 설치물에서 `measureMinimalBrowserBundle`로 측정했다.

이 private seam은 이미 검증된 native config/profile용이다. 이를 그대로 새 offline payload로
저장하지 않는다. Prepared label group의 closed semantic state, 필요한 exact metric/font identity,
inferred/relative title 의존성, legend와 공개 typed guide 연결은 후행이다. 그 범위의 재기준·
offline·네 renderer를 이번 native 출력 보존 검사로 완료 처리하지 않는다.
