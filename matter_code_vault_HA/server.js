require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pkg = require('./package.json'); // Centralized Version
const app = express();
const PORT = 8099;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Support large payloads (images/backups)

// Integrity Check Middleware
function checkIntegrity(req, res, next) {
    const sig1 = "\u{b3fc}\u{c9c0}\u{c9c0}\u{b801}\u{c774}"; // 돼지지렁이
    const sig2 = "\\ub3fc\\uc9c0\\uc9c0\\ub801\\uc774"; // Escaped version

    const p1 = path.join(__dirname, 'public', 'index.html');
    const p2 = path.join(__dirname, 'public', 'script.js');

    try {
        if (!fs.existsSync(p1) || !fs.existsSync(p2)) {
            return res.status(403).send("Forbidden: Integrity Check Failed (Files Missing)");
        }

        const c1 = fs.readFileSync(p1, 'utf8');
        const c2 = fs.readFileSync(p2, 'utf8');

        // HTML 검사 (리터럴 또는 이스케이프)
        const check1 = c1.includes(sig1) || c1.includes(sig2) || c1.includes("Designed by 돼지지렁이");
        // JS 검사 (리터럴 또는 이스케이프 또는 주석)
        const check2 = c2.includes(sig1) || c2.includes(sig2) || c2.includes("돼지지렁이");

        if (!check1 || !check2) {
            console.error(`Integrity Check Failed: HTML=${check1}, JS=${check2}`);
            // 개발 편의를 위해 어떤 파일이 실패했는지 명시
            return res.status(403).send(`Forbidden: Integrity Check Failed (${!check1 ? 'HTML' : 'JS'} Mismatch)`);
        }
        next();
    } catch (e) {
        console.error("Integrity Check Error:", e);
        return res.status(500).send("Internal Server Error: Integrity Check");
    }
}

// Apply Integrity Check Globally (before static files)
app.use(checkIntegrity);

app.use(express.static('public'));

// Paths
// In Home Assistant Add-ons, persistent data is stored in /data
const DATA_DIR = '/data';
const DATA_FILE = path.join(DATA_DIR, 'matter_data.json');
const CONFIG_FILE = path.join(DATA_DIR, 'options.json');

// Local fallback for development
const LOCAL_DATA_FILE = path.join(__dirname, 'matter_data.json');
const LOCAL_CONFIG_FILE = path.join(__dirname, 'options.json');

const isProd = fs.existsSync(DATA_DIR);
const dataPath = isProd ? DATA_FILE : LOCAL_DATA_FILE;
const configPath = isProd ? CONFIG_FILE : LOCAL_CONFIG_FILE;

console.log(`Starting Matter Code Vault AI Server...`);
console.log(`Environment: ${isProd ? 'Production (HA)' : 'Development'}`);
console.log(`Data Path: ${dataPath}`);

// ensure dev file exists if not prod
if (!isProd && !fs.existsSync(dataPath)) {
    try {
        fs.writeFileSync(dataPath, '[]');
        console.log("Created local data file.");
    } catch (e) {
        console.error("Failed to create local data file:", e);
    }
}

// API: Get Configuration (Force Fresh Read)
app.get('/api/config', (req, res) => {
    // Check file existence every time to avoid stale logic
    if (fs.existsSync(configPath)) {
        try {
            // Read file directly from disk every time
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            res.json({ ...config, version: pkg.version });
        } catch (e) {
            console.error("Config read error:", e);
            res.status(500).json({ error: "Failed to read config" });
        }
    } else {
        res.json({ version: pkg.version });
    }
});

// API: Update Configuration (Removed for security/unification)
// app.post('/api/config') is deleted. API Key is managed via Home Assistant Options only.

// API: Get Data (Read devices list)
app.get('/api/data', (req, res) => {
    if (fs.existsSync(dataPath)) {
        try {
            const fileContent = fs.readFileSync(dataPath, 'utf8');
            // Handle empty file case
            const data = fileContent.trim() ? JSON.parse(fileContent) : [];
            res.json(data);
        } catch (e) {
            console.error("Data read error:", e);
            res.status(500).json({ error: "Failed to read data" });
        }
    } else {
        res.json([]); // Return empty array if file doesn't exist yet
    }
});

// API: Save Data (Write devices list)
app.post('/api/data', (req, res) => {
    try {
        // Validate that body is an array or object as expected
        const data = req.body;
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (e) {
        console.error("Data write error:", e);
        res.status(500).json({ error: "Failed to save data" });
    }
});
const net = require('net');
let resolvedLocalAiUrl = null;

function testTcpConnection(host, port, timeout = 300) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let status = false;
        socket.setTimeout(timeout);
        socket.connect(port, host, () => {
            status = true;
            socket.destroy();
        });
        socket.on('timeout', () => { socket.destroy(); });
        socket.on('error', () => { socket.destroy(); });
        socket.on('close', () => { resolve(status); });
    });
}

async function scanSubnetForOllama() {
    const promises = [];
    for (let i = 1; i < 255; i++) {
        const ip = `192.168.0.${i}`;
        promises.push(
            testTcpConnection(ip, 11434, 200).then(isOpen => isOpen ? ip : null)
        );
    }
    const results = await Promise.all(promises);
    return results.find(ip => ip !== null) || null;
}

async function getResolvedAiUrl(localAiIp) {
    if (resolvedLocalAiUrl) return resolvedLocalAiUrl;
    let host = localAiIp;
    let port = 11434;
    if (localAiIp.includes(':')) {
        const parts = localAiIp.split(':');
        host = parts[0];
        port = parseInt(parts[1], 10);
    }
    if (await testTcpConnection(host, port, 400)) {
        resolvedLocalAiUrl = `http://${host}:${port}/v1/chat/completions`;
        return resolvedLocalAiUrl;
    }
    if (await testTcpConnection('superllm.local', 11434, 400)) {
        console.log("[AI Proxy] Discovered Ollama at superllm.local:11434");
        resolvedLocalAiUrl = `http://superllm.local:11434/v1/chat/completions`;
        return resolvedLocalAiUrl;
    }
    const discoveredIp = await scanSubnetForOllama();
    if (discoveredIp) {
        console.log(`[AI Proxy] Discovered Ollama via subnet scan: ${discoveredIp}`);
        resolvedLocalAiUrl = `http://${discoveredIp}:11434/v1/chat/completions`;
        return resolvedLocalAiUrl;
    }
    return `http://${host}:${port}/v1/chat/completions`;
}

// API: AI Proxy (Forward requests to LocalAI)
app.post('/api/ai', async (req, res) => {
    // 1. Resolve LocalAI IP (Priority: HA Options > .env > Default)
    let localAiIp = process.env.LOCAL_AI_IP || "127.0.0.1";
    
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.local_ai_ip && config.local_ai_ip.trim() !== "") {
                localAiIp = config.local_ai_ip;
            }
        } catch (e) {
            console.warn("[AI Proxy] Failed to read local_ai_ip from config.");
        }
    }

    const LOCALAI_SERVER_URL = await getResolvedAiUrl(localAiIp);
    console.log(`[AI Proxy] Request received. Model: ${req.body.model} | Targeting: ${LOCALAI_SERVER_URL}`);
    
    try {
        const payload = {
            ...req.body
        };

        // Node 18 fetch with AbortController for timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

        const response = await fetch(LOCALAI_SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[AI Proxy] LocalAI error (${response.status}):`, errorText);
            throw new Error(`LocalAI responded with ${response.status}`);
        }

        const data = await response.json();
        console.log(`[AI Proxy] Success.`);
        res.json(data);
    } catch (e) {
        // AI 통신 실패 시 캐시된 URL을 비워 다음 요청에서 네트워크 재탐색(스캔)을 유도합니다.
        resolvedLocalAiUrl = null;
        const isTimeout = e.name === 'AbortError';
        console.error(`[AI Proxy] Failed:`, isTimeout ? "Timeout (60s)" : e.message);
        res.status(500).json({ 
            error: "AI Proxy Failed", 
            message: isTimeout ? "AI 요청 시간 초과 (60초)" : e.message 
        });
    }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});
