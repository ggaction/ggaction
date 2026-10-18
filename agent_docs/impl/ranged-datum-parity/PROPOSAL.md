# Ranged datum wrapper parity

## 진행 상태

- [x] #226 재현과 기존 개별 인코더/선언의 실제 범위 검토.
- [x] 아래 구체 설계에 현재 작업 범위의 사용자 포괄 승인 재사용.
- [x] runtime, 선언, 계약, 문서와 패키지 consumer 동기화. [RESULTS.json](./RESULTS.json).
- [x] 검증 결과와 remote source checkpoint `d0a117ca` 기록. 배포는 1,413-family checkpoint에 통합.

## 승인과 정확한 범위

사용자의 “지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”를 이 진행 중인 번역의 확인된 라이브러리 오류에 재사용한다. 현재 공개 기준 1,213개 + 200개인 1,413개 완료 전에는 새 릴리스/문서 배포/runtime 교체를 하지 않는다.

실제 공개 선언은 한쪽 numeric datum + 한쪽 field를 이미 허용하지만 양쪽 datum은 허용하지 않는다. #226 재현의 두 datum 조합까지 정확히 표현하도록 quantitative range 선언에 양쪽 datum을 포함한다. 새 액션이나 옵션 이름은 추가하지 않는다.

## 동작

Rect/Rule의 `encodeXRange`/`encodeYRange`는 field string 또는 정확히 `{datum: finite number}`인 endpoint를 기존 primary/secondary 인코더에 전달한다. 한쪽 또는 양쪽 numeric datum을 허용한다. 두 endpoint는 기존 하나의 scale/coordinate를 공유하고 데이터 행/field를 만들지 않는다. 형식이 잘못된 객체, nonfinite datum, 새로운 temporal/nominal datum range는 거부한다. 기존 temporal field/field range는 유지한다.

Area는 현재의 최종-pair preflight, quantitative datum, 최소 한 field 규칙을 유지한다. Bar는 field/field만 지원한다. 새로운 mark 생성이나 사용자 row 변경, 저장 schema 변경, renderer 변경은 없다. Rect/Rule range의 기존 field/field 경로와 trace child 순서를 보존하고 datum 경로도 wrapped primary → secondary를 사용한다. 기존 개별 인코더가 거부하는 재할당/scale 조합을 이 변경으로 새로 허용한다고 주장하지 않는다.

Datum 경로는 기존 Area/Bar aggregate와 같이 최종 두 endpoint 및 공유 scale을 pure preview로 검증한 뒤 companion semantic을 먼저 기록하고 wrapped primary/secondary를 호출한다. 따라서 이전 endpoint의 zero가 남아 있는 동안 새 log scale을 잠시 적용하는 잘못된 중간 상태를 만들지 않는다. 기존 field/field 경로는 바꾸지 않는다. 이 좁은 재할당 사례도 회귀 검사에 포함한다.

기준 그림은 이미 공개된 두 개별 인코더의 정확한 결과다. 예를 들어 240×160/20px margin의 `encodeY({datum:45000, scale:{domain:[0,45000],nice:false}}).encodeY2({datum:0})`는 y=20, height=120인 Rect다. range wrapper는 이 결과와 semantic/scale/graphic/SVG/PNG가 같아야 한다. 기존 공개 동작의 버그 복구이며 새 시각 목표나 primitive를 도입하지 않는다.

## 검증

수정 전 실패 기록을 보존한다. Rect/Rule × X/Y × field/field·field/datum·datum/field·datum/datum 및 양방향/비선형 scale의 기존 직접 인코더와 정확히 비교한다. 입력과 이전 프로그램 보존, 잘못된 upper/객체/범위 거부, Area/Bar 제한, rematerialization/저장 복원, Full positive/negative types와 Basic의 기존 액션 범위를 검사한다. 실제 packed package consumer에서도 원본 재현과 types를 실행한다. 단위/계약/문서 검사와 렌더러 비교는 후보 검증이며 보호된 릴리스·registry 증거를 대신하지 않는다.

관련 이슈: https://github.com/ggaction/ggaction/issues/226
