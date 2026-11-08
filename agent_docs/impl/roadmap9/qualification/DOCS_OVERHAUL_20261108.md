# 0.0.27 이후 문서 전면 개선 (2026-11-08)

사용자 지시: "docs 한번 업글좀 하자 … 짜치는 문제들을 싸그리 찾아", "모두 다 싸그리 고쳐",
"statistical layer도 outdate되어있고, interaction animation geo 이런것도 전혀없고 … 사람이 봐도 에이전트가 봐도
제대로 쓸수있게". 브랜치 `codex/docs-overhaul`(main `4ed72704f`에서 시작).

## 점검 방법

- 갤러리 153개 그림을 모두 직접 보고 분류했다. 실제 차트로 볼 수 있는 것은 약 40개였고, 113개는 장난감 데이터나
  기능 시험 그림이었다(새 0.0.27 계열 전부 포함).
- 독립 에이전트 두 개가 글을 점검했다: 새 기능 문서 범위(34건), 튜토리얼·레시피·시작하기(37건).
  재현 스크립트로 확인된 항목만 반영했다.

## 고친 것

1. 갤러리: `figure_only` 표시를 추가해 장난감·기능 시험 그림 113개를 갤러리와 홈에서 빼고 해당 API 페이지의 보조
   그림으로만 남겼다. 실제 데이터 쇼케이스 21개를 추가했다(세계 GDP 지도, 지진 지도, NASA 기온 히트맵·폭포,
   출생아 달력, 펭귄 밀도 등고선·Sankey·raincloud·beeswarm, 국가 유사도 네트워크, 인구 트리맵·선버스트,
   Flare 방사형 트리, IBM 캔들, Gapminder trail·표·dumbbell·lollipop·버블, 자동차 ECDF·그룹 막대).
   데이터는 `data/showcase/`에 출처·라이선스·SHA-256과 함께 고정했다(CC0, 퍼블릭 도메인, CC BY 4.0, BSD-3).
   라이선스가 불분명한 커피·식품 데이터는 쓰지 않았다.
2. 쇼케이스 프로그램은 생성기가 API 페이지와 튜토리얼에 그대로 복사하고, 시험은 결정적 렌더링과 저장 후 복원을
   확인한다.
3. 사이드바: Chart Types, Statistics, Interaction and Animation, Building Blocks 그룹으로 재구성하고 breadcrumb에
   그룹 이름을 넣었다. Statistics에 새 Distribution Plots 페이지를 추가했다.
4. 상호작용·애니메이션: "Make a Chart Interactive" 튜토리얼(Chromium에서 설치 패키지로 실행 확인), 1955–2005
   버블 GIF, 브라우저 애니메이션 빠른 시작(실행 확인), live와 interaction 선택표, interaction 페이지 첫 규칙 3개.
5. 지도: "Draw a world map" 다섯 단계와 함정 표(용량 10,000점, Canvas 픽셀 fit, 미적합 시 모서리, 시계 방향 winding,
   Antarctica). 함정은 모두 직접 재현했다.
6. Getting Started: 실제 자동차 392대, 쉬운 개념 설명, 편집과 trace, SVG/PNG 저장. 주 프로그램은 실행 시험 대상.
7. 튜토리얼: 계열 튜토리얼 13개를 실제 데이터 프로그램으로 시작하게 하고 색인 순서를 기초→통계→극좌표→상호작용→
   특수 차트로 바꿨다. 오류가 나던 예제 3개를 고치고, 학습 페이지에도 쉬운 fragment 안내를 붙였다.
8. 보조 문서: 새 계열 한계(Supported Features), 그림자 준비 경고, 지도·클릭·애니메이션 문제 해결, What's new,
   데이터 업데이트 빠른 시작, `llms.txt` 경로.

## 함께 발견한 함정

- 연속 `reviseData`의 `source`는 직전 revision id여야 한다. 원래 id를 다시 쓰면 마크가 오래된 행을 계속 그린다
  (오류 없음). 애니메이션·데이터 업데이트 문서에 적었다.
- 지도 projection 좌표는 Canvas 픽셀이라 margin을 무시한다. 문서로 안내했고 라이브러리 동작은 바꾸지 않았다.

## 남은 일

- 레시피 19개의 "Minimal flow" 블록은 여전히 데이터 선언과 render가 없다.
- 튜토리얼과 레시피 중복, 극좌표 튜토리얼 3개 통합, interaction 페이지의 내부 용어 정리.
- 브라우저용 graph worker 파일 예제, expression v2 함수 표.
- 문서 배포는 Release workflow(tag)로만 가능하다. 0.0.27 이후 docs만 바뀌었으므로 배포 방식은 사용자 결정이 필요하다.
