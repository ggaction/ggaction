# Geo 소비자 담당 시험 연결

## 진행 상태

- [x] GeoText@2 source `5a958cd1d`와 최종 pin `693950d14`를 분리 고정했다.
- [x] 실제 Current 및 시험을 읽고 Geo 4행의 scene-animation/types 8셀만 연결했다.
- [x] 기존 분모·required·N/A·전체 acceptance owner와 실제 판정을 유지했다.
- [x] canonical completion 구조 검사 16/16과 정확 8셀 차이를 확인했다.

부모의 2026-11-01 명시 지시에 따른 담당 경로 보완이다. 이는 시험 담당자 지정이며
최종 candidate의 성공 증거가 아니다. 정본은 `test/native-capabilities.json`이고 제품
검사에서 이 구현 기록을 import하지 않는다.

## 연결 근거

| 행 | scene-animation의 실제 담당 | types의 실제 담당 |
| --- | --- | --- |
| geo-shape | `geo-lifecycle.test.js`의 filled-shape 현재 native geometry/target lineage 및 재기준, 공통 공개 offline 소비자 | `geo-mark-types.test.js`의 shape options·Full/Basic 경계 + `animation-types.test.js`의 opaque plan/frame·직접 renderer 입력 |
| geo-point | 위 공통 Geo lifecycle, `geo-text-public`·`geo-text-expressions`·`geo-text-state`의 현재 camera/표현/복원, `geo-public-selection`의 실제 중간 frame, 동일 native oracle의 renderer/browser | 같은 두 type owner의 point와 animation 계약 |
| geo-line | `geo-lifecycle.test.js`의 date-line part/current native camera geometry 및 공통 공개 offline 소비자 | 같은 두 type owner의 line interpolation/role options와 animation 계약 |
| graticule | `geo-lifecycle.test.js`의 generated geometry/정확 projection lineage, `geo-text-public`의 graticule label/current camera, `geo-public-selection`의 실제 click/revision | 같은 두 type owner의 graticule options·source label 필드와 animation 계약 |

모든 행의 Current owner는 `GEOMETRY.md`와 `ANIMATION.md`다. 공통 공개 소비자는
`test/unit/animation/geo-public.test.js`가 실제 package consumer를 실행하므로 발견되는
test owner를 지정했다. `scripts/consumers` 경로를 test owner인 것처럼 등록하지 않았다.
행별 자세한 실행 파일 목록은 manifest 한 곳에만 둔다.

## 유지하는 미완료 경계

- 30요구 / 79 acceptance group / 577필수 consumer cell, required/N/A, 기존 다른 담당은 그대로다.
- AT44/AT53/AT55의 전체 통합 담당과 최종 판정은 pending이다. 새 GeoText family 행을 만들지 않는다.
- 4행의 package/docs/accessibility, graticule의 source-revise/encodings/scales/guides는 이번 지정 대상이 아니다.
- 현재 그려진 Text의 최대 weight 표현과 정적 native accessibility/formatter는 다르다. 새 sampled accessible Text API가 존재한다고 주장하지 않는다.
- body/label의 개별 component 증거는 보존했지만, 전체 접근성·상호작용·최종 offline 교차 matrix의 완결 증거로 확대하지 않는다.

[구조 증거](geo-native-owner-evidence/structure.json)는 변경 전후 manifest를 비교해 정확히
8개의 assignedOwners만 추가됐음을 검산하며, 실제 결과 없이 완료 집계를 실행하면
79 group과 577 consumer 전부 pending임을 보존한다. 기존 제품 실행을 반복하거나
새 package를 만들지 않았다.
