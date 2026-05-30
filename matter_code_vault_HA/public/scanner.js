// --- SCANNING ---
function triggerOcrScan() { document.getElementById('ocrInputFile').click(); }

function triggerFallbackAi() {
    showToast("📸 0.3초 후 캡처 (기기를 고정해 주세요)");
    setTimeout(() => {
        const video = document.querySelector("#qr-reader video");
        if (video) {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
            canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => {
                resizeImage(blob, 1024).then(resizedDataUrl => {
                    const base64Data = resizedDataUrl.split(',')[1];
                    executeAiAnalysis(base64Data);
                    stopCamera();
                    document.getElementById('fallbackAiBtn').classList.add('hidden');
                });
            }, 'image/jpeg');
        } else showToast("캡처 실패");
    }, 300);
}

function startCamera() {
    // Ingress Iframe Permission Handling
    // If getting blocked, we might need to prompt user
    if (window.self !== window.top) {
        console.warn("Running in iframe, camera might be blocked.");
    }

    document.getElementById('cameraModal').style.display = 'flex';
    document.getElementById('cameraLoading').style.display = 'flex';
    document.getElementById('fallbackAiBtn').classList.add('hidden');

    window.html5QrCode = new Html5Qrcode("qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
        .then(() => {
            document.getElementById('cameraLoading').style.display = 'none';
            document.getElementById('guideBox').style.display = 'block';
            window.isScanning = true; window.scanStartTime = Date.now();
            window.scanTimer = setInterval(checkTesseractAndFallback, 1000);
        })
        .catch(err => {
            stopCamera();
            console.error(err);
            showToast("카메라 시작 실패 (HTTPS 권한 확인)");
        });
}

function stopCamera() {
    if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => html5QrCode.clear()).catch(e => { });
    }
    window.isScanning = false; if (scanTimer) clearInterval(scanTimer);
    document.getElementById('cameraModal').style.display = 'none';
}

function onScanSuccess(decodedText) {
    if (decodedText.startsWith('MT:')) {
        currentVerifiedMt = decodedText;
        document.getElementById('devMtPayload').value = decodedText;
        document.getElementById('displayMtPayload').value = decodedText;
        document.getElementById('qrStatusIcon').classList.remove('hidden');
        const decoded = decodeMatterPayload(decodedText);
        applyDecodedInfo(decoded);
        if (decoded && decoded.manualCode) {
            handleInput(decoded.manualCode);
            showToast("QR 기반 디지털 코드 산출 완료!"); 
            stopCamera();
        } else {
            const currentCode = document.getElementById('devPayload').value;
            if (currentCode && currentCode.replace(/-/g, '').length === 11) {
                showToast("데이터 인식 완료!"); stopCamera();
            } else showToast("QR 인식됨! 숫자를 찾는 중...");
        }
    }
}

async function getTesseractWorker() {
    if (!tesseractWorker) {
        window.tesseractWorker = await Tesseract.createWorker("eng");
        await tesseractWorker.setParameters({ tessedit_char_whitelist: '0123456789-' });
    }
    return tesseractWorker;
}

async function checkTesseractAndFallback() {
    if (!isScanning) return;
    
    // 카메라 구동 후 초반 500ms(0.5초) 간은 초점 조정 및 손떨림 안정화를 위해 분석 제외
    const elapsed = Date.now() - scanStartTime;
    if (elapsed < 500) {
        console.log(`[Focus Settle] Waiting for camera stabilization... (${elapsed}ms)`);
        return;
    }

    if (elapsed > 5000) document.getElementById('fallbackAiBtn').classList.remove('hidden');
    const video = document.querySelector("#qr-reader video");
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const ocrCode = await runTesseractVersion2(canvas);
    if (ocrCode) {
        if (validateVerhoeff(ocrCode)) {
            handleInput(ocrCode);
            if (currentVerifiedMt) { showToast("인식 완료!"); stopCamera(); }
            else showToast("숫자 인식됨! QR을 찾는 중...");
        } else {
            console.log("[Live OCR Checksum Failure] 실시간 OCR 인식 코드의 체크섬이 유효하지 않아 스킵합니다:", ocrCode);
        }
    }
}

async function runTesseractVersion2(imageSource) {
    try {
        const worker = await getTesseractWorker();
        const { data: { text } } = await worker.recognize(imageSource);
        const match = text.match(/\b(\d{4})[- ]?(\d{3})[- ]?(\d{4})\b/);
        if (match) return match[1] + match[2] + match[3];
        const matchContinuous = text.match(/\b\d{11}\b/);
        return matchContinuous ? matchContinuous[0] : null;
    } catch (e) { return null; }
}

async function processOcrImage(event) {
    const file = event.target.files[0]; if (!file) return;
    const modalContent = document.getElementById('modalContent');
    
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = "ocrLoadingOverlay";
    loadingOverlay.className = "absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center rounded-2xl soft-pulse";
    loadingOverlay.innerHTML = '<span class="text-orange-600 font-bold text-sm">📸 이미지 분석 중...</span>';

    if (modalContent) {
        modalContent.classList.add('ai-border');
        modalContent.appendChild(loadingOverlay);
    }
    
    showToast("스마트 분석 중...");
    let processedFile = await convertHeicIfNecessary(file);
    const ocrPromise = new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = async () => { resolve(await runTesseractVersion2(img)); };
            img.onerror = () => resolve(null); img.src = ev.target.result;
        };
        reader.readAsDataURL(processedFile);
    });
    const qrPromise = new Promise(resolve => {
        let scanner; try { scanner = new Html5Qrcode("qr-reader"); } catch (e) { resolve(null); return; }
        scanner.scanFile(processedFile, false).then(txt => { scanner.clear(); resolve(txt); }).catch(e => { scanner.clear(); resolve(null); });
    });
    try {
        const [ocrCode, qrCode] = await Promise.all([ocrPromise, qrPromise]);
        
        // 0순위: 수학적 디코딩 (QR 최우선)
        if (qrCode && qrCode.startsWith('MT:')) {
            currentVerifiedMt = qrCode;
            document.getElementById('devMtPayload').value = qrCode;
            document.getElementById('displayMtPayload').value = qrCode;
            document.getElementById('qrStatusIcon').classList.remove('hidden');
            
            const decoded = decodeMatterPayload(qrCode);
            applyDecodedInfo(decoded);
            
            // 수학적 디코딩으로 11자리 코드가 완벽히 추출되었다면 여기서 즉시 종료
            if (decoded && decoded.manualCode) {
                handleInput(decoded.manualCode);
                showToast("초고속 수학적 분석 완료!");
                return; // Early Return: AI 호출 차단
            }
        }

        // 1순위: 로컬 OCR 백업
        if (ocrCode) {
            if (validateVerhoeff(ocrCode)) {
                handleInput(ocrCode);
                showToast("로컬 OCR 분석 완료!");
                return; // Early Return: AI 호출 차단 (체크섬 검증 성공)
            } else {
                console.log("[OCR Checksum Failure] 로컬 OCR 인식 코드의 체크섬이 유효하지 않아 AI 정밀 분석을 호출합니다:", ocrCode);
            }
        }

        // 2순위: 지능형 분석 (최후의 Fallback)
        // 위에서 return 되지 않았다면(QR/OCR 모두 실패), 이미지를 Base64로 변환 후 AI 호출
        showToast("정밀 분석 필요 (AI 가동)...");
        const resizedDataUrl = await resizeImage(processedFile, 1024);
        const base64Data = resizedDataUrl.split(',')[1];
        executeAiAnalysis(base64Data);

    } catch (e) { 
        showToast("분석 오류"); 
    } finally {
        if (modalContent) modalContent.classList.remove('ai-border');
        const overlay = document.getElementById('ocrLoadingOverlay');
        if (overlay) overlay.remove();
    }
    event.target.value = '';
}

async function convertHeicIfNecessary(file) {
    if (file.name.toLowerCase().endsWith(".heic") || file.type.includes("heic")) {
        try {
            const result = await heic2any({ blob: file, toType: "image/jpeg" });
            return new File([Array.isArray(result) ? result[0] : result], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: "image/jpeg" });
        } catch (e) { return file; }
    } return file;
}

function resizeImage(file, maxDimension) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > h) { if (w > maxDimension) { h *= maxDimension / w; w = maxDimension; } }
            else { if (h > maxDimension) { w *= maxDimension / h; h = maxDimension; } }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject; img.src = URL.createObjectURL(file);
    });
}

async function executeAiAnalysis(base64Data) {
    const modalContent = document.getElementById('modalContent');
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = "aiLoadingOverlay";
    loadingOverlay.className = "absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center rounded-2xl soft-pulse";
    loadingOverlay.innerHTML = '<span class="text-orange-600 font-bold text-sm">🤖 AI 정밀 분석 중...</span>';

    if (modalContent) {
        modalContent.classList.add('ai-border');
        modalContent.appendChild(loadingOverlay);
    }
    
    showToast("AI 정밀 판독 (Dual Model)...");
    
    try {
        // Step 1: Vision Pass (Moondream)
        const visionRes = await fetch(OLLAMA_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: VISION_MODEL,
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Describe all visible Matter QR codes (starting with MT:) and 11-digit pairing codes in this image. Be precise. Pay close attention to slashed zeros '0' which are often misread as '8'." },
                            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
                        ]
                    }
                ],
                temperature: 0.1
            })
        });
        const visionData = await visionRes.json();
        const visionText = visionData.choices?.[0]?.message?.content || "";

        // Step 2: Reasoning Pass (Qwen2.5)
        const reasoningRes = await fetch(OLLAMA_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: REASONING_MODEL,
                messages: [
                    {
                        role: "user",
                        content: `Based on the description, extract the Matter QR and the 11-digit code as strict JSON { "mt": "MT:...", "code": "xxxx-xxx-xxxx" }. Rule: Slashed zeros MUST be transcribed as the digit '0'. Output EXACTLY 11 digits for the code. Do NOT add any notes, explanations, or extra text. Description: ${visionText}`
                    }
                ],
                temperature: 0.1
            })
        });
        const reasoningData = await reasoningRes.json();
        const info = JSON.parse(reasoningData.choices?.[0]?.message?.content || "{}");

        // --- Algorithmic Voting & Auto-Correction for Slashed Zeros & LCD Distortion (v5.1.2) ---
        let finalCode = info.code ? info.code.replace(/-/g, '') : '';

        const existingInput = document.getElementById('devPayload');
        if (finalCode.length === 11 && existingInput && existingInput.value) {
            const existingCode = existingInput.value.replace(/-/g, '');
            if (existingCode.length === 11) {
                let mergedCode = "";
                for (let i = 0; i < 11; i++) {
                    // 한쪽이라도 0이고 다른 한쪽이 8이면, Slashed Zero 오인식으로 간주하고 '0' 채택
                    if ((existingCode[i] === '0' && finalCode[i] === '8') || 
                        (existingCode[i] === '8' && finalCode[i] === '0')) {
                        mergedCode += '0';
                    } else {
                        mergedCode += finalCode[i];
                    }
                }
                finalCode = mergedCode;
                console.log("[Cross-Validation] Merged Code applied:", finalCode);
            }
        }

        // QR 코드 디코딩 값을 최우선 신뢰하여 덮어쓰기
        let decodedManualCode = null;
        if (info.mt) {
            currentVerifiedMt = info.mt;
            document.getElementById('devMtPayload').value = info.mt;
            document.getElementById('displayMtPayload').value = info.mt;
            document.getElementById('qrStatusIcon').classList.remove('hidden');
            const decoded = decodeMatterPayload(info.mt);
            applyDecodedInfo(decoded);
            if (decoded && decoded.manualCode) {
                decodedManualCode = decoded.manualCode.replace(/-/g, '');
                console.log("[AI-QR] Digital Correction (v5.1.2):", decoded.manualCode);
                finalCode = decodedManualCode;
            }
        }

        // QR 디코딩 값이 없고 최종 코드가 체크섬을 통과하지 못할 때 지능형 자동 복구 작동
        if (finalCode.length === 11 && !validateVerhoeff(finalCode)) {
            console.log("[Verhoeff Checksum Failed] Attempting Auto-Correction for LCD distortions...", finalCode);
            const chars = finalCode.split('');
            const targetIndices = [];
            for (let i = 0; i < chars.length; i++) {
                if (chars[i] === '6' || chars[i] === '8') {
                    targetIndices.push(i);
                }
            }

            // 6 또는 8을 0으로 변환 가능한 모든 조합 생성
            if (targetIndices.length > 0 && targetIndices.length <= 4) {
                const limit = 1 << targetIndices.length;
                let foundCorrection = null;
                for (let mask = 0; mask < limit; mask++) {
                    const tempChars = [...chars];
                    for (let j = 0; j < targetIndices.length; j++) {
                        if ((mask & (1 << j)) !== 0) {
                            tempChars[targetIndices[j]] = '0';
                        }
                    }
                    const candidate = tempChars.join('');
                    if (validateVerhoeff(candidate)) {
                        foundCorrection = candidate;
                        break; // 첫 번째로 체크섬을 만족하는 올바른 교정본을 채택
                    }
                }

                if (foundCorrection) {
                    finalCode = foundCorrection;
                    console.log(`[Auto-Correction Success] Repaired code to: ${finalCode}`);
                    showToast("오인식 기기 코드 자동 복구 완료!");
                } else {
                    console.warn(`[Auto-Correction Failed] No valid Verhoeff candidate found for ${finalCode}`);
                }
            }
        }

        // 최종 확정된 11자리 코드를 인풋 필드에 세팅
        if (finalCode.length === 11) {
            const formatted = finalCode.replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2-$3');
            handleInput(formatted);
        }
        showToast("AI 분석 완료");
    } catch (e) {
        console.error("AI Analysis Error:", e);
        showToast("AI 분석 실패");
    } finally {
        if (modalContent) modalContent.classList.remove('ai-border');
        const overlay = document.getElementById('aiLoadingOverlay');
        if (overlay) overlay.remove();
    }
}

async function processAiImage(event) {
    const originalFile = event.target.files[0]; if (!originalFile) return;
    const file = await convertHeicIfNecessary(originalFile);
    try { resizeImage(file, 1024).then(url => executeAiAnalysis(url.split(',')[1])); } catch (e) { showToast("처리 실패"); }
    event.target.value = '';
}



// Window Bindings for HTML Inline Events & Scope Sharing
if(typeof window !== 'undefined' && !window.app) window.app = {};
window.triggerOcrScan = typeof triggerOcrScan !== 'undefined' ? triggerOcrScan : window.triggerOcrScan;
if(typeof window.app !== 'undefined') window.app.triggerOcrScan = window.triggerOcrScan;
window.triggerFallbackAi = typeof triggerFallbackAi !== 'undefined' ? triggerFallbackAi : window.triggerFallbackAi;
if(typeof window.app !== 'undefined') window.app.triggerFallbackAi = window.triggerFallbackAi;
window.startCamera = typeof startCamera !== 'undefined' ? startCamera : window.startCamera;
if(typeof window.app !== 'undefined') window.app.startCamera = window.startCamera;
window.stopCamera = typeof stopCamera !== 'undefined' ? stopCamera : window.stopCamera;
if(typeof window.app !== 'undefined') window.app.stopCamera = window.stopCamera;
window.onScanSuccess = typeof onScanSuccess !== 'undefined' ? onScanSuccess : window.onScanSuccess;
if(typeof window.app !== 'undefined') window.app.onScanSuccess = window.onScanSuccess;
window.getTesseractWorker = typeof getTesseractWorker !== 'undefined' ? getTesseractWorker : window.getTesseractWorker;
if(typeof window.app !== 'undefined') window.app.getTesseractWorker = window.getTesseractWorker;
window.checkTesseractAndFallback = typeof checkTesseractAndFallback !== 'undefined' ? checkTesseractAndFallback : window.checkTesseractAndFallback;
if(typeof window.app !== 'undefined') window.app.checkTesseractAndFallback = window.checkTesseractAndFallback;
window.runTesseractVersion2 = typeof runTesseractVersion2 !== 'undefined' ? runTesseractVersion2 : window.runTesseractVersion2;
if(typeof window.app !== 'undefined') window.app.runTesseractVersion2 = window.runTesseractVersion2;
window.processOcrImage = typeof processOcrImage !== 'undefined' ? processOcrImage : window.processOcrImage;
if(typeof window.app !== 'undefined') window.app.processOcrImage = window.processOcrImage;
window.convertHeicIfNecessary = typeof convertHeicIfNecessary !== 'undefined' ? convertHeicIfNecessary : window.convertHeicIfNecessary;
if(typeof window.app !== 'undefined') window.app.convertHeicIfNecessary = window.convertHeicIfNecessary;
window.resizeImage = typeof resizeImage !== 'undefined' ? resizeImage : window.resizeImage;
if(typeof window.app !== 'undefined') window.app.resizeImage = window.resizeImage;
window.executeAiAnalysis = typeof executeAiAnalysis !== 'undefined' ? executeAiAnalysis : window.executeAiAnalysis;
if(typeof window.app !== 'undefined') window.app.executeAiAnalysis = window.executeAiAnalysis;
window.processAiImage = typeof processAiImage !== 'undefined' ? processAiImage : window.processAiImage;
if(typeof window.app !== 'undefined') window.app.processAiImage = window.processAiImage;
window.validateVerhoeff = typeof validateVerhoeff !== 'undefined' ? validateVerhoeff : window.validateVerhoeff;
if(typeof window.app !== 'undefined') window.app.validateVerhoeff = window.validateVerhoeff;
