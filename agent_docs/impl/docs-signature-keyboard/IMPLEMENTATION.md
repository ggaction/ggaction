# 문서 함수 서명의 키보드 스크롤

## 원인과 수정

자동 생성한 `.docs-action-signature`는 좁은 화면에서 가로 스크롤되지만
기존 code/table용 overflow 초점 처리를 거치지 않았다. 새 공개 API 없이
같은 overflow owner를 재사용해 넘칠 때만 tabIndex와 접근 가능한 이름을 적용한다.
resize와 scroll에서도 같은 상태를 갱신하며 넘치지 않으면 tab 정지점을 제거한다.

## 검증

- Ruby3.2 문서 preflight/build 통과. 최초 기본 Ruby2.6 preflight 실패는
  올바른 기존 Ruby3.2 경로를 적용해 해결했다.
- 기존 전체 문서 브라우저 검사: 데스크톱 검색, 모든 문서320/390/768px 통과.
- point API 페이지320/390/768px 별도 검증: Tab 초점 가능, ArrowRight 실제 scrollLeft 증가,
  초점 유지, WCAG2A/AA·2.1A/AA Axe 위반0개.
- 이 키보드 동작과 point 페이지 Axe 검사를 정식 built-site harness에 추가했다.
- 이미지 시각 관찰은 하지 않았다. 최종 기능 통합본에서도 전체 built-site harness를 실행한다.
