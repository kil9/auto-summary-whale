# AGENTS

## 프로젝트 목적

- 웨일 브라우저에서 YouTube 시청 중 Gemini를 빠르게 여는 확장 프로그램
- 버튼 클릭 또는 단축키로 실행
- 현재 YouTube URL을 Gemini 입력창에 자동 주입하고 전송 시도
- API 키 없이 웹 UI 자동화 방식으로 동작

## 현재 아키텍처

- `manifest.json`
  - Manifest V3
  - `background.service_worker`: `src/background/index.js`
  - `content_scripts`: `src/content/index.js` (`https://www.youtube.com/*`)
  - `options_page`: `src/options/index.html`
- `src/content/index.js`
  - YouTube 제목 옆 `Gemini` 버튼 렌더링
  - `chrome.runtime.sendMessage({ type: "OPEN_GEMINI", url })` 전송
- `src/background/index.js`
  - 메시지/단축키 수신
  - Gemini 새 탭 생성 및 로딩 대기
  - `chrome.scripting.executeScript`로 URL 주입/전송 시도
- `src/options/*`
  - `showButton`, `autoInject` 설정 UI

## 핵심 제약

- 웨일 듀얼탭은 컨텍스트/탭 식별 제약이 있어 주입 신뢰성이 낮음
- Gemini UI 셀렉터는 자주 변경될 수 있어 주입 로직이 깨질 수 있음
- YouTube는 SPA라서 `yt-navigate-finish` 대응이 필수

## 개발 원칙

- 최소 변경 원칙: 문제 재현 범위에 필요한 코드만 수정
- 기능 추가 시 기존 옵션(`showButton`, `autoInject`)과 호환 유지
- 셀렉터 의존 코드 변경 시 다중 후보 셀렉터와 재시도 로직 유지
- 오류 추적이 필요한 경우 로그를 추가하되, 최종 머지 전에는 과도한 디버그 로그 정리

## 우선 작업 순서(요청 반영)

사용자가 요청한 순서대로 한 번에 하나씩 처리:

1. 듀얼탭에서 URL 주입 실패 원인 파악/수정
2. 버튼 스타일 개선
3. Gemini의 "사고 모드" 전환 시도
4. 자동 검색(전송) 안정화

각 단계는 반드시 사용자 확인 후 다음 단계로 진행.

## 테스트 체크리스트

- 버튼 클릭 시 Gemini 새 탭이 열리는지
- 새 탭에서 URL 주입 여부
- `autoInject` on/off 동작
- YouTube 페이지 전환(`yt-navigate-finish`) 후 버튼 재생성 여부
- 단축키 실행 시 탭 생성/주입 여부

## 문서 동기화 규칙

- 사용자 안내는 `README.md`에 유지
- 구현/제약/개발 전략은 `AGENTS.md`에 유지
- 기능/옵션 변경 시 두 문서를 함께 업데이트
