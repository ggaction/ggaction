# STEP053 — 단계형 차트와 역할

## 진행 상태

- [x] 기존 전체 승인과 structure-recipes의 수치 계약 확인
- [x] Pyramid 순수 단계 kernel과 독립 polygon 면적·literal 수치 검사
- [ ] STEP050·051·052 최종 통합과 명칭·제외 정책 검사
- [ ] Pyramid primitive 시각 증거와 공개 create/edit/revise 소비자 연결
- [ ] OHLC·waterfall 역할, 독립 수치·시각 증거와 공개 소비자 연결
- [ ] 전체 mark consumer matrix·설치·문서 인수
- [ ] STEP074·077 누적 인수

[전체 승인](../AUTHORIZATION.json)의 남은 설계·저장·시각 결정 범위를 재사용한다.
단일 Y 선행 작업은 동료가 소유하며, 여기서는 그 결과에 의존하지 않는 순수 계산을 먼저 구현한다.
공개 action이나 저장 schema는 아직 추가하지 않았고 현재 공개 지원이라고 주장하지 않는다.

## Pyramid 계산 결정

`grammar/pyramid/layout.js`가 typed stage key·입력 순서·명시 viewport를 받아 frozen 결과를 만든다.
렌더러·ChartProgram·trace·host 상태에는 접근하지 않는다. 기존 itemIdentity/ownData/validation을 사용한다.
stage/trapezoid 수식은 승인한 structure-recipes 계약을 따른다. down/up/right/left는 viewport 안에서
진행 방향을 바꾸며 source 순서를 뒤집지 않는다. gap은 인접 단계 사이에만 있고, 마지막 끝점은
viewport 끝에 정확히 고정해 부동소수 누적으로 바깥에 남는 좌표를 방지한다.

width 기본은 flat 마지막 단계이며 명시 point를 지원한다. area는 taperRatio 기본 .8이고 다른
mode의 옵션을 거부한다. source key는 기존 typed key 규칙을 사용하며 중복은 오류다. 자동 정렬은 없다.
percentBase를 생략하면 비율 metadata는 null이다. first/total/previous를 명시할 수 있고 previous의 첫
단계와 0 분모는 null이다. total은 최대값으로 나눈 합을 사용해 유한한 큰 값의 합 overflow를 피한다.
표시 비율이나 geometry 자체가 유한하지 않으면 완성 결과를 반환하지 않는다.

빈 입력은 빈 단계, all-zero 입력은 key와 순서를 유지하는 폭0 단계다. gap이 전체 길이와 같으면
높이0을 허용하고 초과하면 실패한다. 공통 generated-item/work 예산을 적용한다. primitive/public
연결 때 source lineage·inspection·hit·selection 의미는 이 순수 kernel 위의 compound owner가 맡는다.

## 현재 검증

독립 shoelace 면적 oracle와 literal 좌표, 비율 법칙 및 seed 고정 127단계를 사용한다.
초기 8/9 성공 뒤 마지막 끝점의 반올림 overflow를 찾아 viewport 고정으로 수정했고 최초 로그를 보존했다.
수정 후 9/9, 새 owner line/branch/function100%다. 전체 source coverage를 뜻하지 않는다.
공개 API·새 primitive schema·패키지 export·기존 chart 출력은 아직 바꾸지 않는다.
현재 계산 증거는 후행 public visual/consumer 검증을 대체하지 않는다.

순수 source `854607630`의 같은 tar `1adb7ff0`를 Node20/22/24에서 각각 kernel9·기존runtime23·strict TS·optional peers·5bundle로 확인했다. 다섯 bundle gzip은 앞선 main과 정확히 같다.
패키지981entries/1406091packed/6409665unpacked에981/1407000/6410000의 최소 상한을 적용했다.
source pin 후 동일 bytes를 확인했고 문서191·built170pages/1454LLM이 통과했다. 새 공개 문서·이미지·HTML 구조는 없으므로 직전 main의320/390/768px browser 증거를 재사용한다.
[증거](pyramid-kernel-evidence/summary.json)는 최초 실패와 source·설치·문서 로그를 보존한다.
