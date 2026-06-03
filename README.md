# Matter Code Vault AI (v5.2.0)

[영문 가이드는 아래로 스크롤하세요. / Scroll down for the English guide.]

[한국어 설명서 (Korean Version)](#-한국어-설명서-korean-version) | [English Version](#-english-version)

---

## 🇰🇷 한국어 설명서 (Korean Version)

> Matter 기기 관리 및 QR 코드 백업/복원 도구 (v5.1.13)

Matter Code Vault는 Home Assistant 환경에서 Matter 기기를 원활하게 관리할 수 있도록 설계된 강력한 애드온입니다. 복잡한 페어링 코드와 QR 코드를 안전하게 백업하고, AI 기반 고도화 기능을 통해 스마트하게 관리하세요.

---

### 🚀 설치 가이드

이 애드온을 설치하려면 Home Assistant **애드온 스토어** > **저장소**에 아래 URL을 추가하십시오:

```text
https://github.com/your-username/Matter-Code-Vault-AI.git
```

1. Home Assistant에서 **설정** > **애드온** > **애드온 스토어**로 이동합니다.
2. 우측 상단의 **메뉴**(점 3개)를 누르고 **저장소**를 선택합니다.
3. 위의 URL을 붙여넣고 **추가**를 클릭합니다.
4. 목록에서 **Matter Code Vault**를 찾아 **설치**를 클릭합니다.

---

### 🏆 공식 릴리즈 내역 (v5.1.13)

- **스마트 필터 초기화 (v5.1.10)**: 첫 줄 카테고리 필터에서 'All'을 클릭할 때, 활성화되어 있던 장소 필터(주방 등)가 동시에 자동 해제 연동되어 전체 조회가 매끄럽게 복원됩니다.
- **커스텀 삭제 확인 모달 (v5.1.9)**: 기기 삭제 시 화면 정중앙에 기기명을 표시하여 경고하는 커스텀 팝업 모달을 도입하여 오작동(휴먼 에러)을 방지합니다.
- **검색 필드 X(지우기) 버튼 (v5.1.9)**: 검색어 입력 시 우측에 원클릭으로 내용을 지울 수 있는 동적 X 버튼이 제공되며, 클릭 시 목록이 즉시 리셋 갱신됩니다.
- **JSON 복원 중복 검증 (v5.1.8)**: 백업된 JSON 파일을 가져오기(복원)할 때도 QR코드 및 11자리 코드를 교차 비교하여 중복 기기는 자동으로 건너뛰고 스킵 내역을 상세 보고합니다.
- **등록 중복 차단 필터 (v5.1.7)**: 기기 추가/수정 저장 시 QR코드 및 11자리 페어링 코드를 기 등록된 목록과 교차 검증하여 3가지 시나리오별 맞춤 경고창(`alert`)으로 등록을 차단합니다.
- **Verhoeff 체크섬 오인식 교정 (v5.1.7)**: 11자리 페어링 코드의 무결성을 수학적으로 보증하는 Verhoeff 알고리즘 검증을 기반으로 OCR 판독 왜곡(예: 0을 6/8로 오인)을 자동 교정 및 복원합니다.
- **OCR Focus Settle 지연 가드**: 카메라 스캔 시작 안정 가드(초반 500ms 딜레이) 및 수동 캡처 시 손떨림 방지 딜레이(300ms) 기능을 적용하여 스캔 인식 정확도를 극대화했습니다.
- **백엔드 AI 프록시**: Mixed Content 및 CORS 제한을 우회하기 위해 로컬 AI 서버(`v1/chat/completions`)로 통신을 프록싱 라우팅해주는 백엔드 보안 우회 장치를 기본 탑재했습니다.
- **Vision & Reasoning 듀얼 파이프라인**: 지능형 기기 작명 및 스캔 정밀 보정을 위해 `moondream:latest`와 `qwen2.5:3b` 모델을 연동하여 상황 인식 연산을 실행합니다.
- **모듈화 아키텍처**: 시스템 유지보수성과 성능 극대화를 위해 프론트 스크립트를 독립 모듈(`state.js`, `ui.js`, `ai.js`, `scanner.js`)로 최적 설계했습니다.

---

### 🧠 Ollama 로컬 AI 서버 구축 (AI 사전 작업)

AI 기반의 OCR 오인식 교정 및 스마트 작명 추천 기능을 활용하려면, 애드온 사용 전에 로컬 AI 서버가 먼저 기동되어 있어야 합니다:
* **Ollama 서버 구축**: 외부 클라우드 통신 없이 로컬 환경에서 OpenAI API와 동일한 규격의 엔드포인트를 제공하는 경량 자율형 AI 서버 엔진인 Ollama를 사용합니다.
* **필수 모델 로드**: 구축된 Ollama 서버에 아래 두 가지 모델이 정상적으로 다운로드(pull)되어 작동하는지 확인하십시오:
  - **텍스트 모델**: `qwen2.5:3b` (또는 추론 연산용 동급 초경량 LLM)
  - **비전 모델**: `moondream:latest` (이미지/OCR 판독을 위한 멀티모달 비전 모델)

> **참고**: AI 서버가 구성되지 않은 기본 오프라인 상태에서도 기기 수동 등록, 11자리 페어링 코드 등록, JSON 백업/복원 및 열전사 라벨 QR 프린트 등 대시보드의 핵심 기능은 완벽하게 작동합니다.

---

### ⚙️ 설정 안내 (AI Proxy)

본 애드온은 HTTPS 환경에서도 로컬 AI 서버와 Mixed Content 제한 없이 안전하게 통신할 수 있도록 내부 **백엔드 AI 프록시**를 포함하고 있습니다.
1. **LocalAI Server IP**: Home Assistant 애드온 설정 옵션에서 사용자의 로컬 AI 서버 IP를 설정합니다 (기본값: `192.168.x.x`). 설정하지 않으면 `superllm.local:11434` 또는 네트워크 대역에서 Ollama 서버(11434 포트)를 자동 감지합니다.
2. **필수 모델 이름**:
   - `moondream:latest` (비전 분석 패스용)
   - `qwen2.5:3b` (텍스트 추론/작명 패스용)
3. **내부 라우팅**: 브라우저 보안 제약을 회피하기 위해 `api/ai` 엔드포인트를 경유하여 Ollama의 OpenAI 호환 completions API로 포워딩합니다.

---

### ⚠️ 유의 사항

- **데이터 보존**: 수집된 Matter 정보는 로컬 컨테이너 내 `/data/matter_data.json`에 영구 보존됩니다. 애드온을 제거하기 전에는 데이터 유실 방지를 위해 반드시 JSON 백업 파일을 내보내기(Export) 하시기 바랍니다.
- **카메라 권한**: 브라우저 보안 정책에 따라 기기 카메라를 구동하려면 **HTTPS** 보안 프로토콜 또는 **localhost** 접속 환경이 필수적으로 요구됩니다. HTTP 환경에서는 '사진 업로드' 스캔 기능을 대안으로 활용할 수 있습니다.
- **무결성 체크**: 핵심 구동 소스코드를 임의로 변조할 경우 보안 경고가 기동되며 앱 기능이 제한될 수 있습니다.


## 🇺🇸 English Version

> Matter Device Management & QR Code Backup/Restore Tool (v5.2.0)

Matter Code Vault is a powerful Home Assistant add-on designed for seamless Matter device management. Securely back up complex pairing codes and QR codes, and manage them intelligently using AI-driven features.

---

### 🚀 Installation

To install this add-on, add the following URL to your Home Assistant **Add-on Store** > **Repositories**:

```text
https://github.com/your-username/Matter-Code-Vault-AI.git
```

1. Navigate to **Settings** > **Add-ons** > **Add-on Store** in Home Assistant.
2. Click the **Menu** (3 dots) in the top right corner and select **Repositories**.
3. Paste the URL above and click **Add**.
4. Find **Matter Code Vault** in the list and click **Install**.

---

### 🏆 Official Release (v5.2.0)

- **Smart Filter Reset (v5.1.10)**: Clicking the 'All' category filter now automatically resets active location filters for a cleaner, full-list restore.
- **Custom Delete Modal (v5.1.9)**: Enhanced delete safety with a custom screen-centered modal display, specifying the device name to be deleted.
- **Search Clear (X) Button (v5.1.9)**: Clear search input instantly via a responsive, visual 'X' button inside the search field.
- **JSON Import Duplicate Prevention (v5.1.8)**: Duplicate pairing codes are auto-skipped during JSON backup restores, reporting detailed skip metrics.
- **Registration Duplicate Block (v5.1.7)**: Prevent duplicate device registrations by cross-comparing QR and 11-digit codes with alert block scenarios.
- **Verhoeff Checksum Auto-Correction (v5.1.7)**: Intelligent mathematical validation of 11-digit pairing codes with automatic OCR error fixing.
- **OCR Focus Settle Delay**: Focus settling timers (500ms on load, 300ms on manual capture) to ensure high-accuracy scans.
- **Backend AI Proxy**: Mixed Content and CORS resolver proxy, routing requests to Ollama Server (v1/chat/completions API).
- **Vision & Reasoning Models**: Enhanced context analysis with dual `moondream:latest` and `qwen2.5:3b` model pipeline.
- **Modular Architecture**: Optimized modular structure (`state.js`, `ui.js`, `ai.js`, `scanner.js`) for high performance and maintainability.

---

### 🧠 Ollama Server Setup (AI Prerequisites)

To utilize the AI-driven OCR correction and smart naming features, you must set up your local AI server beforehand:
* **Ollama Server Setup**: Ollama is a lightweight, self-hosted AI server engine that provides OpenAI-compatible API endpoints locally, without communicating with external clouds.
* **Model Load**: Ensure you have successfully loaded the required models on your local AI server:
  - **Text Model**: `qwen2.5:3b` (or equivalent lightweight text model)
  - **Vision Model**: `moondream:latest` (for vision-pass OCR analysis)

> **Note**: Core features (device registration, manual setup code entry, JSON backup, and label printing) function perfectly even without the Ollama server.

---

### ⚙️ Configuration (AI Proxy)

This add-on features a built-in **Backend AI Proxy** to enable stable communication with local AI servers in HTTPS environments.
1. **LocalAI Server**: Set your Ollama server IP in the **Add-on Options** (default: `192.168.x.x`). If left empty, it dynamically auto-detects `superllm.local:11434` or Ollama servers on port 11434 in the subnet.
2. **Required Models**:
   - `moondream:latest` (Vision Pass)
   - `qwen2.5:3b` (Reasoning Pass)
3. **Internal Routing**: Requests are proxied via `api/ai` to Ollama's OpenAI-compatible completions API endpoint.

---

### ⚠️ Important Notes

- **Data Safety**: Data is stored at `/data/matter_data.json`. Always export a JSON backup before deleting the add-on to prevent data loss.
- **Camera Access**: Requires **HTTPS** or **localhost** due to browser security policies. For HTTP access, use the 'Photo Upload' feature.
- **Integrity Check**: Unauthorized modification of core files will trigger a security alert, disabling the app.


Designed by **돼지지렁이 (PigWorm)** v.5.2.0

### 📄 License
This project is distributed under the **MIT License**.  
Copyright (c) 2026 돼지지렁이. All rights reserved.

### 👑 Contributor
- **돼지지렁이** (Antigravity Developer)
