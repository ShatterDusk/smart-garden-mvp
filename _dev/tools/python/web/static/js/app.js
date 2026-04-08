let eventSource = null;
let currentScenario = 'normal';
let udpLogs = [];
let backendLogs = [];
const MAX_LOGS = 50;

const scenarios = {
    'normal': '正常环境',
    'drought': '干旱模式',
    'high_temp': '高温模式',
    'low_temp': '低温模式',
    'high_hum': '高湿模式',
    'low_light': '光照不足',
    'watering': '浇水模式',
    'night': '夜间模式'
};

document.addEventListener('DOMContentLoaded', function() {
    initScenarioGrid();
    loadConfig();
    loadStatus();
    startEventStream();
    startLogPolling();
});

function initScenarioGrid() {
    const grid = document.getElementById('scenarioGrid');
    grid.innerHTML = '';

    for (const [key, name] of Object.entries(scenarios)) {
        const item = document.createElement('div');
        item.className = 'scenario-item' + (key === currentScenario ? ' active' : '');
        item.dataset.scenario = key;
        item.innerHTML = `<span class="radio-dot"></span><span>${name}</span>`;
        item.addEventListener('click', () => selectScenario(key));
        grid.appendChild(item);
    }
}

function selectScenario(scenario) {
    // 立即更新UI，不等待后端响应
    document.querySelectorAll('.scenario-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.scenario === scenario) {
            item.classList.add('active');
        }
    });
    
    // 立即更新当前场景变量和显示
    currentScenario = scenario;
    document.getElementById('currentScenario').textContent = scenarios[scenario] || scenario;

    fetch('/api/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenario })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            addBackendLog(`场景切换: ${scenarios[scenario]}`, 'INFO');
        }
    })
    .catch(err => console.error('场景切换失败:', err));
}

function loadConfig() {
    fetch('/api/config')
        .then(res => res.json())
        .then(data => {
            document.getElementById('serverUrl').textContent = data.server_url || '--';
            document.getElementById('deviceId').textContent = data.device_id || '--';
            document.getElementById('macAddress').textContent = data.mac_address || data.device_id || '--';
            document.getElementById('deviceName').textContent = data.device_name || '--';
            document.getElementById('plantId').textContent = data.plant_id || '--';
            document.getElementById('interval').textContent = data.interval || 60;
            document.getElementById('reportInterval').textContent = (data.interval || 60) + '秒';
            document.getElementById('udpPort').textContent = data.udp_port || 8266;
            // 显示采集间隔
            const sampleInterval = data.sample_interval || 5;
            document.getElementById('sampleInterval').textContent = sampleInterval + '秒';
            document.getElementById('sampleIntervalDisplay').textContent = sampleInterval;
            // 设置滑块值
            document.getElementById('sampleIntervalSlider').value = sampleInterval;
            document.getElementById('sampleIntervalValue').textContent = sampleInterval + '秒';
            document.getElementById('reportIntervalSlider').value = data.interval || 60;
            document.getElementById('reportIntervalValue').textContent = (data.interval || 60) + '秒';
            // 显示中文场景名
            const scenarioKey = data.scenario || 'normal';
            document.getElementById('currentScenario').textContent = scenarios[scenarioKey] || scenarioKey;
            updateBindStatus(data.plant_id);
            currentScenario = scenarioKey;
            updateScenarioSelection();
        })
        .catch(err => console.error('加载配置失败:', err));
}

// 初始化配置滑块
document.addEventListener('DOMContentLoaded', function() {
    // 采集间隔滑块
    const sampleSlider = document.getElementById('sampleIntervalSlider');
    const sampleValue = document.getElementById('sampleIntervalValue');
    if (sampleSlider) {
        sampleSlider.addEventListener('input', function() {
            sampleValue.textContent = this.value + '秒';
        });
        sampleSlider.addEventListener('change', function() {
            updateSampleInterval(parseInt(this.value));
        });
    }
    
    // 上报间隔滑块
    const reportSlider = document.getElementById('reportIntervalSlider');
    const reportValue = document.getElementById('reportIntervalValue');
    if (reportSlider) {
        reportSlider.addEventListener('input', function() {
            reportValue.textContent = this.value + '秒';
        });
        reportSlider.addEventListener('change', function() {
            updateReportInterval(parseInt(this.value));
        });
    }
});

// 更新采集间隔
function updateSampleInterval(interval) {
    fetch('/api/config/sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: interval })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            document.getElementById('sampleInterval').textContent = interval + '秒';
            document.getElementById('sampleIntervalDisplay').textContent = interval;
            addBackendLog(`采集间隔已更新: ${interval}秒`, 'INFO');
        }
    })
    .catch(err => console.error('更新采集间隔失败:', err));
}

// 更新上报间隔
function updateReportInterval(interval) {
    fetch('/api/config/interval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: interval })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            document.getElementById('interval').textContent = interval;
            document.getElementById('reportInterval').textContent = interval + '秒';
            addBackendLog(`上报间隔已更新: ${interval}秒`, 'INFO');
        }
    })
    .catch(err => console.error('更新上报间隔失败:', err));
}

function loadStatus() {
    fetch('/api/status')
        .then(res => res.json())
        .then(data => updateUI(data))
        .catch(err => console.error('加载状态失败:', err));
}

function updateUI(data) {
    const isRunning = data.running;

    document.getElementById('statusIndicator').className = 'status-indicator ' + (isRunning ? 'online' : 'offline');
    document.querySelector('.status-text').textContent = isRunning ? '运行中' : '已停止';

    updateWifiStatus(data.wifi_status || 'waiting');
    document.getElementById('reportCount').textContent = data.report_count || 0;
    
    // 使用 metrics 或 current_metrics（兼容两种字段名）
    const metrics = data.metrics || data.current_metrics;
    if (metrics) {
        for (const [key, value] of Object.entries(metrics)) {
            const el = document.getElementById(`metric-${key}`);
            if (el) el.textContent = typeof value === 'number' ? value.toFixed(1) : value;
        }
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
    }

    currentScenario = data.scenario || 'normal';
    updateScenarioSelection();
}

function updateWifiStatus(status) {
    const wifiStatusEl = document.getElementById('wifiStatus');
    const statusMap = {
        'waiting': { text: '等待配网', class: 'waiting' },
        'configuring': { text: '配网中', class: 'configuring' },
        'online': { text: '已上线', class: 'online' },
        'error': { text: '配网失败', class: 'error' }
    };
    const statusInfo = statusMap[status] || statusMap['waiting'];
    wifiStatusEl.innerHTML = `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
}

function updateBindStatus(plantId) {
    const bindStatusEl = document.getElementById('bindStatus');
    if (plantId) {
        bindStatusEl.innerHTML = `<span class="badge bound">已绑定</span>`;
    } else {
        bindStatusEl.innerHTML = `<span class="badge unbound">未绑定</span>`;
    }
}

function updateScenarioSelection() {
    document.querySelectorAll('.scenario-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.scenario === currentScenario) {
            item.classList.add('active');
        }
    });
}

function startEventStream() {
    if (eventSource) eventSource.close();
    eventSource = new EventSource('/api/stream');

    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        updateUI({
            running: true,
            current_metrics: data.metrics,
            report_count: data.report_count,
            uptime_seconds: data.uptime,
            scenario: data.scenario,
            wifi_status: data.wifi_status,
            plant_id: data.plant_id
        });
        // 更新服务器配置面板中的场景名称
        if (data.scenario) {
            document.getElementById('currentScenario').textContent = scenarios[data.scenario] || data.scenario;
        }
        if (data.plant_id) {
            updateBindStatus(data.plant_id);
            document.getElementById('plantId').textContent = data.plant_id;
        }
    };

    eventSource.onerror = function() {
        console.log('SSE连接断开');
    };
}

function startLogPolling() {
    setInterval(() => {
        Promise.all([
            fetch('/api/logs?type=udp&limit=10').then(res => res.json()).catch(() => ({logs: []})),
            fetch('/api/logs?type=backend&limit=10').then(res => res.json()).catch(() => ({logs: []}))
        ]).then(([udpData, backendData]) => {
            if (udpData.logs && udpData.logs.length > 0) {
                udpLogs = mergeLogs(udpLogs, udpData.logs);
                renderUdpLogs();
            }
            if (backendData.logs && backendData.logs.length > 0) {
                backendLogs = mergeLogs(backendLogs, backendData.logs);
                renderBackendLogs();
            }
        });
    }, 2000);
}

function mergeLogs(existingLogs, newLogs) {
    const existingIds = new Set(existingLogs.map(l => l.timestamp + l.message));
    const merged = [...existingLogs];
    for (const log of newLogs) {
        if (!existingIds.has(log.timestamp + log.message)) {
            merged.push(log);
        }
    }
    return merged.slice(-MAX_LOGS);
}

function renderUdpLogs() {
    const container = document.getElementById('udpLogContainer');
    if (!container) return;

    if (udpLogs.length === 0) {
        container.innerHTML = '<div class="log-empty">等待UDP通信...</div>';
        return;
    }

    container.innerHTML = udpLogs.map(log => `
        <div class="log-entry ${log.level || 'INFO'}">
            <span class="log-timestamp">[${log.timestamp || ''}]</span>
            <span class="log-source">[${log.source || 'UDP'}]</span>
            ${log.message}
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

function renderBackendLogs() {
    const container = document.getElementById('backendLogContainer');
    if (!container) return;

    if (backendLogs.length === 0) {
        container.innerHTML = '<div class="log-empty">等待后端通信...</div>';
        return;
    }

    container.innerHTML = backendLogs.map(log => `
        <div class="log-entry ${log.level || 'INFO'}">
            <span class="log-timestamp">[${log.timestamp || ''}]</span>
            <span class="log-source">[HTTP]</span>
            ${log.message}
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

function addBackendLog(message, level = 'INFO') {
    const log = {
        timestamp: new Date().toTimeString().slice(0, 8),
        level: level,
        message: message,
        source: 'WEB'
    };
    backendLogs.push(log);
    if (backendLogs.length > MAX_LOGS) {
        backendLogs = backendLogs.slice(-MAX_LOGS);
    }
    renderBackendLogs();
}

function formatUptime(seconds) {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
    return `${Math.floor(seconds / 3600)}时${Math.floor((seconds % 3600) / 60)}分`;
}
