# Matter Code Vault AI (v5.1.1)

> Matter Device Management & QR Code Backup/Restore Tool (v5.1.1)

Matter Code Vault is a powerful Home Assistant add-on designed for seamless Matter device management. Securely back up complex pairing codes and QR codes, and manage them intelligently using AI-driven features.

---

## 🚀 Installation

To install this add-on, add the following URL to your Home Assistant **Add-on Store** > **Repositories**:

```text
https://github.com/dicapriokim/Matter-Code-Vault-v5.git
```

1. Navigate to **Settings** > **Add-ons** > **Add-on Store** in Home Assistant.
2. Click the **Menu** (3 dots) in the top right corner and select **Repositories**.
3. Paste the URL above and click **Add**.
4. Find **Matter Code Vault** in the list and click **Install**.

---

## 🏆 Official Release (v5.1.1)

- **Backend AI Proxy**: Integrated backend proxy to resolve Mixed Content (HTTPS -> HTTP) and CORS issues, ensuring stable AI communication in Home Assistant environments.
- **Dynamic Loading UI**: Soft pulsing "Analyzing..." indicators for AI and standard OCR/QR scans to provide clear visual feedback during processing.
- **Local AI Engine (Ollama)**: Advanced reasoning using `antigravity-model:3b` for intelligent device naming and OCR error correction.
- **Modular Architecture**: Optimized modular structure (`state.js`, `ui.js`, `ai.js`, `scanner.js`) for high performance and maintainability.
- **Official Rebranding (v5.0.4)**: Transitioned from beta to official release as "Matter Code Vault".
- **Enhanced AI Reasoning**: Finalized context-aware AI engine for smart home automation accuracy.
- **Smart Input States**: Polished UI with visual field state indicators for effortless registration.
- **Adaptive Card Actions (v4.2.0)**: Sophisticated multi-stage hover interaction for device management icons.
- **Modal Auto-Scroll**: Intelligent scroll-to-top behavior for all modals to enhance user interaction flow.
- **Label Ready**: High-quality QR generation optimized for thermal label printers.

---

## 📖 Quick Start Guide (v5.1.1)

### 1. Initial Setup
Before adding devices, configure your ecosystem in the **[Settings ⚙️]** menu to ensure data consistency:
- **Locations**: Living Room, Bedroom, Entrance, etc.
- **Manufacturers**: Aqara, Eve, Nanoleaf, etc.
- **Platforms**: Apple Home, SmartThings, Home Assistant, etc.

### 2. Smart Registration & AI
Click the **[+]** button to add a new device.
- **AI Recommendation**: Click the 'Magic Wand' icon for AI-generated device names.
- **Fallback Logic**: If QR scanning fails to extract the pairing code, the system automatically uses OCR data as a backup.
- **Slashed Zero (0) Correction**: The AI is specifically tuned to distinguish between slashed zeros '0' and the digit '8' in pairing codes.

---

## ⚙️ Configuration (AI Proxy)

This add-on features a built-in **Backend AI Proxy** to enable stable communication with local AI servers in HTTPS environments.
1. **Ollama Server**: Set your local AI server IP in the **Add-on Options** (default: `192.168.0.32`).
2. **Required Models**:
   - `moondream` (Vision Pass)
   - `antigravity-model:3b` (Reasoning Pass)
3. **Internal Routing**: Requests are proxied via `api/ai` to bypass browser Mixed Content and CORS restrictions.

> **Note**: Core features (registration, backup, label printing) work perfectly even without an AI server.

---

## ⚠️ Important Notes

- **Data Safety**: Data is stored at `/data/matter_data.json`. Always export a JSON backup before deleting the add-on to prevent data loss.
- **Camera Access**: Requires **HTTPS** or **localhost** due to browser security policies. For HTTP access, use the 'Photo Upload' feature.
- **Integrity Check**: Unauthorized modification of core files will trigger a security alert, disabling the app.

---
# 📧 로컬 AI 메일 자동화 서버 구축 가이드 (Proxmox + Ollama + Qwen2.5:3b)

**작성일:** 2026-05-06
**환경:** Proxmox VE (Intel N95, 가용 RAM 4GB 기준 최적화)
**목표:** 외부 클라우드 의존 없이 로컬에서 초경량 AI(Qwen2.5:3b)를 구동하여 메일을 자동 분류하는 API 서버 구축


## 1단계: Proxmox LXC 컨테이너 생성

가용 자원(RAM)의 한계를 고려하여 시스템 전체에 무리를 주지 않도록 최소한의 자원만 할당하여 컨테이너를 생성합니다.

1. Proxmox 웹 GUI 우측 상단 **[Create CT]** 클릭
2. **General:** 
   - Hostname: `AI-Mail-Server` (권장)
3. **Template:** 
   - `Ubuntu 22.04` 또는 `24.04 LTS` 선택
4. **Disk:** 
   - `30GB` 할당 (OS 및 모델 파일 저장용으로 충분함)
1. **CPU:** 
   - Cores: `4` (N95의 4코어 모두 할당하여 추론 속도 확보)
6. **Memory (매우 중요):** 
   - Memory: `4096 MB` (4GB) 
   - *주의: 3GB 이상 할당 시 호스트 서버 스왑 발생 우려*
7. **Network:** 
   - IPv4: `Static` 선택 후 고정 IP 할당 (예: `192.168.x.50/24`)
   - Gateway 입력

---

## 2단계: 필수 패키지 설치 (오류 사전 방지)

Ubuntu 최소 설치(Minimal) 템플릿의 경우 기본 패키지가 누락되어 있어 Ollama 설치 시 에러가 발생합니다. LXC 콘솔에 접속하여 이를 먼저 해결합니다.

```bash
# 1. 패키지 목록 최신화 및 웹 통신 패키지(curl), 압축 해제 패키지(zstd) 설치
apt-get update && apt-get install -y curl zstd
```


## 3단계: Ollama 구동 엔진 설치

설치된 curl을 이용하여 Ollama의 핵심 구동 엔진을 설치합니다. 이 단계에서는 엔진만 설치되며 모델은 아직 다운로드되지 않습니다.

```Bash
# 1. Ollama 원클릭 설치 스크립트 실행
curl -fsSL [https://ollama.com/install.sh](https://ollama.com/install.sh) | sh
```

---

## 4단계: 외부 API 접속 허용 설정 (OLLAMA_HOST)

Ollama는 기본적으로 외부 접속을 차단(`127.0.0.1`만 허용)합니다. 메일 자동화 파이썬 스크립트가 다른 기기나 컨테이너에서 접근할 수 있도록 포트를 개방합니다.

```
# 1. Ollama 서비스 설정 파일 편집기 열기
systemctl edit ollama.service
```

편집기가 열리면 빈 공간(주석 `#` 사이)에 아래 내용을 입력하고 저장합니다. 
(저장: `Ctrl+O` -> `Enter` -> `Ctrl+X`)

```Ini, TOML
[Service]
Environment="OLLAMA_HOST=0.0.0.0"
```


```
# 2. 서비스 재로드
systemctl daemon-reload
```

```
# 3. 서비스 재시작 설정 적용
systemctl restart ollama
```

---

## 5단계: 초경량 AI 모델(qwen2.5:3b) 다운로드 및 구동

자원 소모가 적으면서도 JSON 포맷 출력과 추론에 강력한 qwen2.5:1.5b 모델을 로드합니다.

```Bash
# 1단계 Vision 역할을 할 초경량 모델 (약 1.5GB)
ollama pull moondream
```

```Bash
# 2단계 Reasoning 역할을 할 똘똘한 모델 (약 2.0GB)
ollama pull qwen2.5:3b
```

_다운로드가 완료되고 `>>>` 프롬프트가 나타나면 "안녕" 등을 입력하여 정상 테스트 후 `/bye`로 종료합니다._

---

Designed by **돼지지렁이 (PigWorm)** v.5.1.1

### 📄 라이선스 (License)
이 프로젝트는 **MIT 라이선스** 하에 배포됩니다.  
Copyright (c) 2026 돼지지렁이. All rights reserved.

### 👑 Contributor
- **돼지지렁이** (Antigravity Developer)
