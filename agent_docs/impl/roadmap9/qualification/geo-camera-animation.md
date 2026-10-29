# Geo camera 애니메이션 준비 경계

## 진행 상태

- [x] 기존 camera 및 animation 값 owner와 원안 요구를 대조했다.
- [x] 구체 계약과 기존 승인 재사용을 기록했다.
- [x] private 준비·복원·반복 샘플과 실제 Geo 장면을 검증했다.
- [x] 지원 Node 및 기존 owner 경계를 검증했다.
- [ ] 개념 checkpoint를 commit/push하고 후속 planner 의무를 전달한다.

## 범위와 승인

[전체 잔여 승인](../AUTHORIZATION.json)의 `remainingApproval`을 재사용한다.
[애니메이션 원안](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/animation.ko.md)의
Geo typed kernel·version·명시 endpoint·현재 frame 재기준 의무를 보완한다.
공개 planner, action, package export 또는 ChartProgram 저장 스키마는 추가하지 않는다.
이 기록은 STEP-074 또는 전체 animation 완료 선언이 아니다.

`src/grammar/geo/cameraInterpolation.js`가 이미 quaternion 최단 회전과 정적 projection
호환성, log scale·translation 보간을 소유한다. 새 `animation/geoCamera.js` alias는 만들지
않으며 기존 owner에 실제 준비값 검증 책임을 추가한다. native pan/zoom/fit/reset/resize와
13개 기존 수치 검사는 그대로 보존한다. 문서·타입 공개면은 변하지 않는다.

## private 준비값

`prepareGeoCameraInterpolation(from, to)`는 닫힌 불변 plain data를 반환한다.
`{kind:'geo-camera', version:1, mode:'camera'|'crossfade', from, to, reason?}`의
두 endpoint는 기존 projection normalizer가 확정한 전체 parameter다. 서로 다른 type은
`projection-type`, clip·center·reflection·precision·conic parallels 같은 정적 값 차이는
`projection-parameters`로 crossfade한다. reason은 crossfade에만 존재한다.

`sampleGeoCameraInterpolation(track, progress)`는 own data descriptor, 정확 kind/version,
닫힌 key, 정규형 endpoint 및 mode/reason의 정합성을 검사한다. 정상 데이터의 JSON 왕복과
기존 값 codec을 허용하며 callback, receiver, cache, resource alias는 저장하지 않는다.
두 고정 크기 projection parameter만 포함하여 geometry 크기와 무관한 일정한 검증 비용이다.
정규형 비교는 값 검증이며 dataset inference, fit, inverse projection은 실행하지 않는다.

기존 `interpolateGeoCamera`는 같은 prepare/sample owner를 사용하고 기존 반환 계약을
유지한다. sampler는 시간/clock/easing을 소유하지 않는다. t=0/1은 endpoint 값 그대로,
동일 scale/translation/rotation은 내부 시각에서도 그대로 반환한다. translation은 convex
linear, scale은 기존 positive log, 구면 rotation은 기존 quaternion 계산을 사용한다.
구면 Euler 각의 정확 반회전은 기존 [-180,180) 정규화에 따른 결정적 최단 경로를 유지한다.
일반 2D scalar rotation의 양의 π tie와 구면의 3D 축 선택을 같은 규칙으로 바꾸지 않는다.

현재 camera sample의 `parameters`를 다음 prepare의 `from`으로 넣으면 현재 frame에서
재기준한다. crossfade sample은 한 projection으로 환원하지 않으며 최종 planner의
per-item weighted source capture가 필요하다.

## 검증과 후속 연결

독립 literal 행렬·log scale·translation 수치, 입력 불변성, 잘못된 version/descriptor/
정규형/호환 판정, 반복 순서 독립성, JSON/codec 왕복, 현재 frame 재기준을 검증한다.
native editProjection으로 실제 Geo source를 다시 materialize하여 양 endpoint scene의
동등성과 중간 장면의 hole/complement·큰 spherical disk·feature identity를 확인한다.
픽셀에서 geographic 값을 역산하거나 arbitrary path를 수치 보간하지 않는다.

최종 planner는 exact projection resource revision·endpoint payload·source winding·Geo
feature key를 결박하고 기존 projection materializer로 매 sample을 실현해야 한다.
clip/type 변경은 승인된 concrete weighted blend로 연결하고 현재 frame hit/interrupt
capture·clock/easing/reduced-motion·4 backend·offline version envelope를 함께 닫아야 한다.
이 checkpoint는 그 후속 책임을 삭제하거나 이미 완료했다고 주장하지 않는다.

## 실행 결과

| 검사 | 결과 | 범위 |
|---|---|---|
| Node20.20.2 /22.23.1 /24.22.1 | 각각51/51 | camera 기존13, 새 typed/actual-scene10, native action 및 winding, shared values |
| 동일 source focused coverage |51/51,100/99.08/100 | cameraInterpolation100/98.18/100, values100/100/100; 기존95/90/100 floor 유지 |
| source/package/discovery/Geo label/evidence 경계 |43/43 | 신규 public export 없음, 같은 source ownership 유지 |
| canonical package contract |7/7 |1048entries, unpacked6,761,201bytes |
| package Node22 /Node20·24 |1,484,277 /1,487,978bytes |같은 source staging, 각 runtime/zlib 측정 |

unpacked 최초 측정은 기존cap6,761,000보다201bytes 컸다. 실제 측정 후 최소 여유를 두어
6,763,000으로만 수정했다. packed1,489,000과entries1048은 유지한다. 이 초기 초과는
실측값이며 실패하지 않은 명령을 실패 실행으로 기록하지 않는다.

이 검사는 private source를 대상으로 실행했으며 설치 public API 또는 전체 release
검증이라고 주장하지 않는다. 공개 import graph에 이 두 private owner의 consumer가 없으므로
새 public consumer fixture, Current action, 타입, docs build는 만들지 않았다.
최종 source hash와 실행 로그는 별도 evidence manifest에 고정한다.

Root의 별도 positions owner는 이 branch에 없으며 합산 시 log domain
`[150,150.00000000000003]`·value150의 stationary 중간 결과가 endpoint와 정확히 같은지
joint 회귀를 추가한다. shared positiveScale의 두 endpoint 각각은 이 checkpoint에서
literal exact 검증했다. winding 변경의 공통 realistic3 의무는 앞선 winding 기록에 남는다.
