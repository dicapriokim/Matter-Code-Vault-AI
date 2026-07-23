# Matter Code Vault AI (v5.2.2)

[영문 가이드는 아래로 스크롤하세요. / Scroll down for the English guide.]

[한국어 설명서 (Korean Version)](#-한국어-설명서-korean-version) | [English Version](#-english-version)

---

## 🇰🇷 한국어 설명서 (Korean Version)

> **Matter 기기 페어링 코드 & QR 전용 안전 백업/관리 Home Assistant 애드온 (v5.2.2)**

**Matter Code Vault**는 Home Assistant(HA) 환경에서 복잡한 스마트홈 **Matter 기기의 QR 코드, 11자리 페어링 설정 코드, 기기 정보(설치 위치, 제조사, 카테고리)를 안전하게 백업 및 복원하고 열전사 라벨 프린터용 라벨을 생성해 주는 전문 관리 애드온**입니다.

---

### 📦 주요 기능 소개

1. **Matter 페어링 정보 중앙 백업 & 관리**
   - QR 코드 이미지 스캔/업로드 및 11자리 Setup Code 안전 보관
   - 기기별 위치(거실, 안방 등), 카테고리(조명, 센서 등), 제조사(Aqara, Eve 등) 체계적 분류
2. **수학적 오타 자가 보정 (Verhoeff Checksum)**
   - 카메라/OCR 스캔 시 숫자 `0`을 `6`이나 `8`로 잘못 읽는 현상을 Verhoeff 체크섬 알고리즘으로 자동 검증 및 역추적 복원
3. **라벨 스티커 출력 지원**
   - 열전사 라벨 프린터(PNG 내보내기)용 QR 코드 + 기기 정보 라벨 이미지 즉시 생성
4. **완벽한 데이터 백업/복원 및 중복 검증**
   - 전체 데이터를 `.json` 파일로 내보내기/불러오기 지원 (중복 기기 등록 차단 및 스킵 리포트 제공)
5. **크리에이터 보안 마스킹 모드**
   - 화면 공유나 방송 시 민감한 QR 코드 및 11자리 페어링 코드를 원클릭으로 마스킹 가림 처리

---

### 🚀 애드온 설치 가이드 (Installation)

이 애드온을 설치하려면 Home Assistant **애드온 스토어** > **저장소**에 아래 공식 URL을 추가하십시오:

```text
https://github.com/dicapriokim/Matter-Code-Vault-AI.git
```

1. Home Assistant에서 **설정** > **애드온** > **애드온 스토어**로 이동합니다.
2. 우측 상단의 **메뉴**(점 3개)를 누르고 **저장소**를 선택합니다.
3. 위의 URL(`https://github.com/dicapriokim/Matter-Code-Vault-AI.git`)을 붙여넣고 **추가**를 클릭합니다.
4. 목록에서 **Matter Code Vault**를 찾아 **설치**를 클릭합니다.

---

### ⚙️ 애드온 기본 옵션 및 유의 사항

- **데이터 보존 위치**: 수집된 Matter 기기 정보는 로컬 컨테이너 내 `/data/matter_data.json`에 안전하게 영구 보존됩니다. (애드온 제거 전 JSON 백업 내보내기 권장)
- **카메라 권한**: 브라우저 보안 정책에 따라 기기 웹캠 스캔은 **HTTPS** 또는 **localhost** 접속 환경이 필수입니다. (HTTP 접속 시 '사진 업로드' 스캔 활용)

---

### 💡 [선택 사항] 사전 조치: 로컬 AI 연동 가이드 (Ollama)

> 📌 **참고**: AI 기능이 구성되지 않은 오프라인 상태에서도 기기 등록, 11자리 코드 백업, JSON 백업/복원, 라벨 출력 등 **애드온의 모든 핵심 기능은 100% 정상 구동**됩니다.

스캔 정밀 보정 및 지능형 기기 한글 작명 추천 기능을 부가적으로 활용하려는 경우, 애드온 구동 전 로컬 AI 서버가 구축되어 있어야 합니다:

1. **사전 구축 가이드 (Proxmox VE LXC 환경)**
   - Proxmox LXC 템플릿 생성부터 GPU 패스스루, Ollama 엔진 설치 및 OpenAI 호환 API 가속까지 올인원으로 구축하려면 아래 링크를 참고하세요:
   - 👉 [**SuperLLM LXC 신규 구축 가이드 (Ollama + OpenAI)**](https://github.com/dicapriokim/LocalAI-ollama-openai)
2. **필수 로드 모델**:
   - **비전 분석 모델**: `moondream:latest`
   - **텍스트/작명 모델**: `qwen2.5:3b`
3. **애드온 설정 매핑**:
   - HA 애드온 설정의 `local_ai_ip` 필드에 구축된 로컬 AI 서버 IP(예: `192.168.x.x`)를 직접 입력하세요. (자동 탐색 스캔 지연 방지)

---

### 🏆 공식 릴리즈 내역 (v5.2.2)

- **AI 프록시 타임아웃 180초 연장 (v5.2.2)**: N95 미니 PC 등 GPU가 없는 로컬 CPU 환경에서 AI 추론 연산이 끊기지 않도록 대기 시간을 180초로 최적화.
- **AI 응답 에러 핸들링 & 시스템 프롬프트 독립 전송 (v5.2.1)**: AI 프록시 에러 시 UI 경고창 시각화 및 맥락 인식률 극대화.
- **Verhoeff 체크섬 오인식 교정 (v5.1.7)**: 11자리 페어링 코드 무결성 검증 및 자가 복구 파이프라인 탑재.
- **스마트 필터 & 삭제 모달 (v5.1.9~v5.1.10)**: 필터 교집합 연동 및 안전한 삭제 확인 모달 도입.

---

## 🇺🇸 English Version

> **Dedicated Home Assistant Add-on for Matter Device Pairing Code & QR Backup/Management (v5.2.2)**

**Matter Code Vault** is a specialized Home Assistant (HA) add-on designed to **securely back up and restore complex Matter device QR codes, 11-digit setup codes, and device metadata (locations, manufacturers, categories), as well as generate label images for thermal label printers**.

---

### 📦 Key Features

1. **Centralized Matter Backup & Management**
   - Secure storage for QR code images and 11-digit setup codes.
   - Categorized by location (Living Room, Bedroom), category (Lights, Sensors), and manufacturer (Aqara, Eve, etc.).
2. **Verhoeff Checksum Auto-Correction**
   - Automatically detects and mathematically restores OCR misread numbers (e.g., misreading `0` as `6` or `8`) using the Verhoeff algorithm.
3. **Thermal Label Printing Support**
   - Instantly generates label images formatted for thermal label printers.
4. **Complete Data Backup & Restore**
   - Export and import all data via `.json` files with duplicate registration prevention and skip metrics.
5. **Creator Security Masking Mode**
   - One-click masking of sensitive QR codes and 11-digit setup codes during screen shares or live streams.

---

### 🚀 Installation Guide

To install this add-on, add the following URL to your Home Assistant **Add-on Store** > **Repositories**:

```text
https://github.com/dicapriokim/Matter-Code-Vault-AI.git
```

1. Navigate to **Settings** > **Add-ons** > **Add-on Store** in Home Assistant.
2. Click the **Menu** (3 dots) in the top right corner and select **Repositories**.
3. Paste the URL (`https://github.com/dicapriokim/Matter-Code-Vault-AI.git`) and click **Add**.
4. Find **Matter Code Vault** in the list and click **Install**.

---

### ⚙️ Add-on Options & Notes

- **Data Storage**: Stored locally at `/data/matter_data.json`. Export a JSON backup before uninstalling.
- **Camera Access**: Requires **HTTPS** or **localhost** due to browser security policies. (Use 'Photo Upload' for HTTP connections).

---

### 💡 [Optional] Prerequisites: Local AI Setup Guide (Ollama)

> 📌 **Note**: All core features (device registration, 11-digit code backup, JSON restore, label printing) **function 100% normally offline without setting up the AI server**.

To optionally use AI-driven OCR correction and smart naming recommendations, set up your local AI server before running the add-on:

1. **Setup Guide (Proxmox VE LXC)**
   - For an all-in-one guide covering Proxmox LXC template creation, GPU passthrough, and Ollama engine setup with OpenAI-compatible API:
   - 👉 [**SuperLLM LXC Setup Guide Document (Ollama + OpenAI)**](https://github.com/dicapriokim/LocalAI-ollama-openai)
2. **Required Models**:
   - **Vision Model**: `moondream:latest`
   - **Text Model**: `qwen2.5:3b`
3. **Add-on Configuration**:
   - Enter your local AI server IP (e.g., `192.168.x.x`) in the `local_ai_ip` option field in the HA add-on settings to avoid auto-scan delays.

---

### 🏆 Official Release (v5.2.2)

- **AI Proxy Timeout Extension (v5.2.2)**: Extended timeout to 180s for low-end hardware (e.g., N95 Mini PC).
- **AI Error Handling & System Prompt Isolation (v5.2.1)**: Visual UI error alerts and isolated system prompt role.
- **Verhoeff Checksum Auto-Correction (v5.1.7)**: Mathematical validation and self-healing pipeline for setup codes.
- **Smart Filter & Custom Delete Modal (v5.1.9–v5.1.10)**: Responsive filter resets and centered deletion safety modal.

---

Designed by **돼지지렁이 (PigWorm)** v.5.2.2

### 📄 License
This project is distributed under the **MIT License**.  
Copyright (c) 2026 돼지지렁이. All rights reserved.

### 👑 Contributor
- **돼지지렁이** (Antigravity Developer)
