let eventSource = null;
let currentScenario = 'normal';

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
    loadLogs();
});

function initScenarioGrid() {
    const grid = document.getElementById('scenarioGrid');
    grid.innerHTML = '';
    
    for (const [key, name] of Object.entries(scenarios)) {
        const item = document.createElement('div');
        item.className = 'scenario-item' + (key === currentScenario ? ' active' : '');
        item.dataset.scenario = key;
        item.innerHTML = `
            <span class="radio-dot"></span>
            <span>${name}</span>
        `;
        item.addEventListener('click', () => selectScenario(key));
        grid.appendChild(item);
    }
}

function selectScenario(scenario) {
    document.querySelectorAll('.scenario-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.scenario === scenario) {
            item.classList.add('active');
        }
    });
    
    fetch('/api/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenario })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            currentScenario = scenario;
            addLog(`场景切换: ${scenarios[scenario]}`, 'INFO');
        } else {
            addLog(`场景切换失败: ${data.error}`, 'ERROR');
        }
    })
    .catch(err => {
        addLog(`场景切换失败: ${err}`, 'ERROR');
    });
}

function loadConfig() {
    fetch('/api/config')
        .then(res => res.json())
        .then(data => {
            document.getElementById('serverUrl').value = data.server_url || '';
            document.getElementById('deviceId').value = data.device_id || '未绑定';
            document.getElementById('plantId').value = data.plant_id || '未绑定';
            document.getElementById('interval').value = data.interval || 60;
            document.getElementById('udpPort').textContent = data.udp_port || 8266;
            
            currentScenario = data.scenario || 'normal';
            updateScenarioSelection();
        })
        .catch(err => console.error('加载配置失败:', err));
}

function loadStatus() {
    fetch('/api/status')
        .then(res => res.json())
        .then(data => {
            updateUI(data);
            
            if (data.running) {
                startEventStream();
            }
        })
        .catch(err => console.error('加载状态失败:', err));
}

function loadLogs() {
    fetch('/api/logs')
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('logContainer');
            container.innerHTML = '';
            data.logs.forEach(log => {
                addLogToContainer(log.message, log.level, log.timestamp);
            });
        })
        .catch(err => console.error('加载日志失败:', err));
}

function updateUI(data) {
    const isRunning = data.running;
    
    document.getElementById('statusIndicator').className = 
        'status-indicator ' + (isRunning ? 'online' : '');
    document.querySelector('.status-text').textContent = 
        isRunning ? '在线' : '离线';
    
    document.getElementById('runStatus').textContent = 
        isRunning ? '🟢 运行中' : '🔴 已停止';
    document.getElementById('reportCount').textContent = data.report_count || 0;
    document.getElementById('uptime').textContent = formatUptime(data.uptime_seconds || 0);
    
    document.getElementById('startBtn').disabled = isRunning;
    document.getElementById('stopBtn').disabled = !isRunning;
    
    if (data.current_metrics) {
        for (const [key, value] of Object.entries(data.current_metrics)) {
            const el = document.getElementById(`metric-${key}`);
            if (el) {
                el.textContent = value.toFixed(1);
            }
        }
    }
    
    currentScenario = data.scenario || 'normal';
    updateScenarioSelection();
}

function updateScenarioSelection() {
    document.querySelectorAll('.scenario-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.scenario === currentScenario) {
            item.classList.add('active');
        }
    });
}

function startDevice() {
    fetch('/api/start', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                addLog('设备启动成功', 'INFO');
                loadStatus();
                startEventStream();
            } else {
                addLog('设备启动失败: ' + (data.error || '未知错误'), 'ERROR');
            }
        })
        .catch(err => {
            addLog('设备启动失败: ' + err, 'ERROR');
        });
}

function stopDevice() {
    fetch('/api/stop', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            addLog('设备已停止', 'INFO');
            stopEventStream();
            loadStatus();
        })
        .catch(err => {
            addLog('停止失败: ' + err, 'ERROR');
        });
}

function manualReport() {
    fetch('/api/report', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                addLog('手动上报成功: ' + (data.reading_id || ''), 'INFO');
            } else {
                addLog('手动上报失败: ' + (data.error || '未知错误'), 'ERROR');
            }
        })
        .catch(err => {
            addLog('手动上报失败: ' + err, 'ERROR');
        });
}

function setInterval() {
    const interval = parseInt(document.getElementById('interval').value);
    if (interval < 5 || interval > 3600) {
        addLog('上报间隔必须在5-3600秒之间', 'WARNING');
        return;
    }
    
    fetch('/api/interval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: interval })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            addLog(`上报间隔已更新: ${interval}秒`, 'INFO');
        } else {
            addLog('设置间隔失败: ' + (data.error || '未知错误'), 'ERROR');
        }
    })
    .catch(err => {
        addLog('设置间隔失败: ' + err, 'ERROR');
    });
}

function startEventStream() {
    if (eventSource) {
        eventSource.close();
    }
    
    eventSource = new EventSource('/api/stream');
    
    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        updateUI({
            running: true,
            current_metrics: data.metrics,
            report_count: data.report_count,
            uptime_seconds: data.uptime,
            scenario: data.scenario
        });
    };
    
    eventSource.onerror = function() {
        console.log('SSE连接断开');
        stopEventStream();
    };
}

function stopEventStream() {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
}

function addLog(message, level = 'INFO') {
    const timestamp = new Date().toTimeString().slice(0, 8);
    addLogToContainer(message, level, timestamp);
}

function addLogToContainer(message, level, timestamp) {
    const container = document.getElementById('logContainer');
    const entry = document.createElement('div');
    entry.className = `log-entry ${level}`;
    entry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span>${message}`;
    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;
    
    while (container.children.length > 100) {
        container.removeChild(container.firstChild);
    }
}

function formatUptime(seconds) {
    if (seconds < 60) {
        return `${seconds}秒`;
    } else if (seconds < 3600) {
        return `${Math.floor(seconds / 60)}分钟`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}小时${minutes}分钟`;
    }
}
