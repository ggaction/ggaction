# Graph own-data와 immutable copy 보수

## 진행 상태

- [x] inherited required/optional option getter 반례
- [x] own-data validation 뒤 null-prototype 입력 snapshot
- [x] shared immutable copy의 inherited setter/getter 실행 차단
- [x] 전체unit5063·경계40·Node20/22/24 focused43 검증
- [ ] 공개 graph 통합·잔여 Roadmap9

Graph metric/feature/neighbor/edge identity는 ownRecord 후 직접 optional property를 읽어
Object.prototype에서 공급된 값을 받아들이거나 실행하던 결함이 있었다. 검사한 입력의 own values만
null-prototype copy로 읽고, optional zeroVector도 own 존재 여부로 전달한다. 저장 옵션/숫자/identity
의미와 공개 API는 바꾸지 않는다.

이 반례로 `core/immutable.js`의 clone[key] 대입이 inherited setter를 실행하거나 getter-only에서
실패하는 문제도 재현했다. 복사할 key가 Object.prototype에 있으면 기존 __proto__ 처리와 같은
own data defineProperty를 적용하고 나머지 일반 key는 기존 fast path를 유지한다. 호출자 nested
값은 별도 복사·freeze하며 새 result의 Object.prototype도 기존과 같다. arbitrary host proxy 안전성을
주장하지 않는다. 관련 source/시험만 바꿨으며 다른 입력 API의 정책을 확대하지 않는다.

Graph6owner coverage100/100/100, immutable 집중62test coverage92.52/88.37/100으로 현재
critical floor를 통과했다. 전체unit5063/5063 skip0,경계40/40,Node20/22/24 focused43/43이다.
Full/Basic gzip526,993/304,835와 package707/1,052,338/4,881,699는 기존caps 안이다.
전체 source coverage는 이 부분 checkpoint에서 다시 측정했다고 주장하지 않는다.
[원시 실패·성공과 source hashes](own-options-evidence/manifest.json)를 보존한다.
