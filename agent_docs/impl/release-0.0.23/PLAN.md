# 0.0.23 통합 릴리즈

## 진행 상태

- [x] 원격 branch 3개, 전체 PR 72개, issue/PR 263개, release 21개 조사
- [x] v0.0.22 release workflow 성공 확인
- [x] 문서/테스트 개선 branch와 축/제목 branch 통합; 집중 검사 16개 통과
- [x] #253 nullable calendar 정책
- [x] #244 독립 Steffen 곡선
- [x] #238 회귀 layer의 plot-last 배치
- [ ] #258 content facet 배치와 channel별 axis 소유권
- [ ] 전체 source/coverage/realistic/render/browser/package/docs/platform CI
- [ ] exact annotated tag의 동일 candidate로 npm/GitHub/Pages 배포 검증

## 승인 근거와 범위

2026-10-23 사용자가 모든 branch/PR/issue 반영 구현과 통합, 모든 CI 통과 및 새로운
릴리즈를 요청했다. 이번 요청은 구현·통합·릴리즈 배포를 포함한다. 기존
[facet 설계 승인](../facet-content-flow/PROPOSAL.md#승인과-범위)은 번역에 필요한
in-scope API 결정에 대한 포괄 승인을 기록한다. 같은 문제 범위와 기존 기본값을
보존하며 재사용한다. 번역 서비스 호출, 별도 데이터셋 프로젝트 릴리즈는 이 저장소
릴리즈의 일부로 임의 실행하지 않는다. Native capability 검증과 외부 원본 번역
완료 증거를 구분한다.

## 통합 입력

- base: main / v0.0.22 `202b7afd4146a691c136964c4cc53f9c37444513`.
- `fix/documentation-and-rose-demo`: 문서/README/LLM/test 개선 전체.
- `codex/edit-axes-autocomplete`: legend title alignment와 four-edge facet title.
- open PR: 0. PR #263은 이미 merge 및 release 완료.
- closed PR 72개 중 미병합 7개(#5, #25, #39–43)는 폐쇄 사유와 현행 구현을
  비교한다. 오래된 branch를 다시 덮어쓰지 않고 누락된 요구만 구현한다.
- closed issues는 기존 해결 사항의 회귀 근거로 확인한다. 열린 4개는 아래 계약으로 구현한다.

## 구현 계약

- #253: `createTimeUnitData` / `editTimeUnitData`의 `missing:"error"|"null"`.
  생략은 기존 strict behavior와 저장형태 유지. null 정책은 null 및 absent input만
  null bucket으로 만들며 undefined/nonfinite/invalid non-null input은 거부한다.
  모든 row/raw field/order/lineage 유지. Weekday도 현재 numeric 0–6 출력 유지.
  Full/Basic 지원 범위는 기존 entry별 경계를 보존한다.
- #244: 별도 `curve:"monotone-steffen"`; 기존 `monotone` 출력 불변.
  Line/Area/ErrorBand 및 boundary curve의 공유 grammar에서 일관 처리한다.
  독립 수식/control point, reverse boundary, duplicate X, persistence/backend 검증.
- #238: `createRegression({placement:"source"|"plot-last"})`; 생략은 source.
  같은 회귀 owner의 band/line 순서를 유지하고 grid/frame/axis 소유권을 보존한다.
  기존 편집 경로에서 placement 변경 및 source-follow/data revision/restore를 검증한다.
- #258: [기존 연결 계약](../facet-content-flow/INTEGRATION_PLAN.md) 적용.
  `spacing:"content"`, header `anchor:"view"`, `axes:{x:"outer",y:"each"}`.
  실제 native retained bounds와 논리 cell order에 기반하고 source coordinate 주입 금지.
  기존 canvas/plot spacing 및 content header anchor 유지.

## 검증과 완료

각 변경은 source, types, current contracts, docs/generated artifacts, focused tests를
동시에 커밋/푸시한다. 통합 후보는 전체 CI와 realistic shard를 통과해야 한다.
실패를 skip/continue-on-error로 숨기지 않는다. 버전은 직전 0.0.22의 다음 patch
0.0.23으로 준비하며 CI 통과 커밋을 merge/tag한다. 배포 후 registry 버전/무결성,
GitHub release 및 문서 identity를 확인한 뒤 완료한다.


## 통합 검증 기록

- 미병합 폐쇄 PR #39–43: GitHub closure comment에서 #44 통합을 확인했고 현행
  datum/series scale, bar shorthand, arc label 테스트와 의존성 lock에 대응한다.
- #25: #27과 0.0.9로 대체된 중간 평가 branch다. 실패한 구형 코드를 재도입하지 않는다.
- #5: repository maintainer가 별도 demo 저장소 대상으로 거부한 작업이다. 현재 라이브러리에
  강제 재도입하지 않는다. 위 폐쇄 사유는 이번 세션에서 GitHub API로 확인했다.
- #258 집중 composition/guide 검사 284개 통과. 추가 source/theme/text/nesting/named-axis
  검사는 6개 통과. 공통 footer의 자식 Canvas clipping을 부모 소유권으로 수정했다.
- 새 core axis-policy와 native measurement module 두 개에 따라 package entry 621→623.
  실제 packed 899462/unpacked 4271487 bytes를 측정하고 최소 1000-byte 단위 한도
  900000/4272000으로 조정했다. 이전 한도 실패 로그는 workspace study에 보존한다.
- 외부 원본 family의 model-authored translation과 수치 fidelity 승인은 이 저장소의
  native capability 완료와 별도다. #258의 해당 검증이 없으면 issue를 닫거나 family가
  완성되었다고 보고하지 않는다.

- Clean CI package 재측정: Linux 901585 / Windows 901579 packed bytes로 로컬 압축과
  차이가 확인됐다. 실제 최대치를 올림한 902000으로 packed 한도만 조정했다.
  Source 5587개 검사는 모두 통과했으나 검사 실행 중 source 편집이 겹친 로컬 coverage는
  파일별 합산이 유효하지 않아 동결된 후보에서 재실행한다. Threshold는 유지한다.
- 렌더 회귀 261개/205개 chart variants 통과. PR #264에서 전체 CI 시작.

- 설치된 full browser bundle은 451111 gzip bytes로 기존 448000 한도를 초과했다.
  새 공개 기능을 유지하며 full entry만 452000으로 최소 조정하고 Basic/SVG는 그대로 유지했다.
  공개 browser 검사 전체 284개는 통과했다.

- 동결 후보의 5587개 검사와 global coverage 95.65/93.19/98.76은 통과했으나
  stdout chunk가 UTF-8 `ℹ` 중간에서 잘리면 decoder가 이를 훼손해 한 파일을 누락시켰다.
  스트림별 bytes를 완전히 모은 뒤 decode하도록 runner를 수정하고 모든 byte 경계와
  stderr 교차 입력 회귀를 추가했다. Source/critical coverage 기준은 그대로 유지한다.
