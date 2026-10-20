# 고정 선 색상과 점선 범례 샘플

## 진행 상태

- [x] 실제 공개 호출에서 mark stroke orange와 범례 기본 파란색 불일치 재현.
- [x] 기존 editLegendBlock의 명시 stroke로 우회 가능함을 확인.
- [x] 사용자 포괄 승인 재사용: 현재 번역·ggaction 수정 범위의 기존/향후 질문 모두 승인, 공개 릴리즈는 추가200개 단위.
- [x] 고정 stroke fallback과9집중 회귀 검증 통과, 전체 normal4827개 통과.
- [x] Current·공개 문서·생성 문서 동기화, normal4827개와 설치 package consumer62검사 통과.
- [x] 검증된 변경 checkpoint를 commit/push한다. 이 문서와 EVIDENCE가 포함된 commit이 checkpoint다. 공개 배포와 현재 authoring pin 교체는 수행하지 않는다.

## 확정 설계

점선 채널을 설명하는 line categorical legend의 색상 fallback은 유일한 target line의 markConfigs.stroke를 사용한다. 이는 createLineMark/editLineMark뿐 아니라 기존 encodeStroke({value})가 기록하는 같은 단일 저장소를 재사용한다. 고정 stroke가 없으면 기존 기본색을 유지한다. 색상/테두리 scale 매핑과 명시적 block symbol override가 우선하고, 마크 opacity를 샘플에 새로 곱하지 않는다. 기존 area gradient fallback 및 다른 mark family는 변경하지 않는다.

새 공개 옵션·액션·저장 스키마·renderer 경계 변경은 없다. 이전 program과 caller 입력은 불변이다. 공유 categorical appearance 계산의 fallback 한 곳을 수정하고 기존 lifecycle rematerialization을 사용한다. 분리된 새 아키텍처나 helper를 만들지 않는다.

## 검증과 배포

실제 concrete sample stroke, dash, opacity 및 scale/data/Canvas rematerialization·기존 program 불변성을 검사한다. Full/Basic와 명시 recipe/자동 recipe를 검사하고 mapped color/독립 stroke 및 block override 우선순위를 유지한다. 전체 normal suite, 공개 package consumer 및 문서 생성 검증을 수행한다. 공개200개 checkpoint 이전에는 배포·이슈 종료하지 않는다. 현재 authoring에 pin된 별도 후보는 자동 교체하지 않는다.

이슈: https://github.com/ggaction/ggaction/issues/239
