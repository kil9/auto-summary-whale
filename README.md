# auto-summary-whale

YouTube 시청 중 버튼 또는 단축키로 Gemini를 빠르게 여는 웨일(Whale) 확장 프로그램입니다.

현재 보고 있는 YouTube URL을 Gemini 입력창에 자동으로 넣고, 전송 버튼까지 자동 클릭하도록 설계되어 있습니다. 별도 API 키 없이 웹 UI 자동화 방식으로 동작합니다.

## 주요 기능

- YouTube 영상 제목 옆 `Gemini` 버튼 표시
- 버튼 클릭 시 Gemini 열기 (웨일 듀얼탭 시도)
- 단축키 `Ctrl+Shift+U` (`mac`: `Command+Shift+U`) 지원
- 현재 영상 URL 자동 입력 + 전송 시도
- 옵션 페이지에서 버튼 표시/자동 입력 설정

## 동작 방식 요약

- **버튼 클릭**
  - Content Script가 `window.open(..., "whale-space")`로 Gemini를 엽니다.
  - 동시에 Background로 `OPEN_GEMINI` 메시지를 보내 현재 YouTube URL을 전달합니다.
- **Background**
  - 가장 최근 Gemini 탭을 찾고 로딩 완료를 기다립니다.
  - 입력 요소를 찾아 URL을 주입하고 전송 버튼 클릭을 시도합니다.
- **단축키 실행**
  - 사용자 제스처 제약으로 일반 새 탭에서 Gemini를 열고 URL 주입을 수행합니다.

## 설치 방법

1. 저장소를 클론하거나 zip 파일로 내려받아 압축을 풉니다.
2. 웨일에서 `whale://extensions`로 이동합니다.
3. 우측 상단 `개발자 모드`를 켭니다.
4. `압축해제된 확장 프로그램을 로드합니다`를 눌러 이 프로젝트 폴더를 선택합니다.

## 사용 방법

1. YouTube 영상 페이지(`https://www.youtube.com/watch?...`)로 이동합니다.
2. 제목 오른쪽 `Gemini` 버튼을 클릭하거나 단축키를 누릅니다.
3. Gemini 탭/듀얼탭이 열리면 URL 자동 입력 및 전송 여부를 확인합니다.

## 옵션

- `유튜브 화면에 버튼 표시`: YouTube 페이지의 `Gemini` 버튼 표시 여부
- `Gemini 입력창에 URL 자동 입력`: URL 자동 주입 및 전송 시도 여부

## 권한 안내

- `tabs`, `scripting`, `storage`
- `https://www.youtube.com/*`
- `https://gemini.google.com/*`

위 권한은 탭 제어, 스크립트 주입, 설정 저장, 대상 사이트 접근을 위해 사용됩니다.
