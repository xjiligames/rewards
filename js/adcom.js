/**
 * ADCOM.JS v3.0 - Admin Clear Data System
 * 
 * FEATURES:
 * - Admin: Single "Clear Data" button in popup
 * - Admin: Shows Last Active timestamp in popup
 * - User: Automatic logout (no alert), clears localStorage, redirects to index.html
 * - Real-time listener for instant logout
 */

// ========== DETECT CURRENT PAGE ==========
const isAdminPage = window.location.pathname.includes('admin') || 
                    window.location.pathname.includes('admin_12820') ||
                    document.querySelector('.cia-header') !== null;

// ========== CONFIGURATION ==========
const CONFIG = {
    USER_SESSIONS_PATH: 'user_sessions',
    POPUP_DELAY: 1500,
    LISTENER_DELAY: 1500,
    RETRY_ATTEMPTS: 10,
    RETRY_INTERVAL: 2000
};

// ========== CSS FOR ADMIN POPUP ==========
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
            border: 2px solid #ff4444;
            overflow: hidden;
            animation: slideUp 0.3s ease;
        }
        .admin-command-popup-header {
            padding: 15px;
            background: rgba(255,68,68,0.1);
            border-bottom: 1px solid #ff4444;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .admin-command-popup-header h3 { 
            color: #ff4444; 
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
        .info-value.online {
            color: #4caf50;
        }
        .info-value.offline {
            color: #ff9800;
        }
        .command-buttons-section { 
            padding: 15px; 
            border-top: 1px solid #333; 
        }
        .clear-data-btn {
            width: 100%;
            padding: 14px;
            background: #ff4444;
            color: #fff;
            border: none;
            border-radius: 10px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .clear-data-btn:hover {
            background: #ff6666;
            transform: translateY(-2px);
        }
        .clear-data-btn:active {
            transform: translateY(0);
        }
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
    `;
    document.head.appendChild(style);
}

// ========== STANDARDIZED PHONE FORMAT ==========
function standardizePhone(phone) {
    if (!phone || typeof phone !== 'string') return '';
    let digits = phone.replace(/\D/g, '');

    if (digits.startsWith('639') && digits.length >= 12) {
        digits = '0' + digits.substring(2);
    } else if (digits.startsWith('63') && digits.length >= 11) {
        digits = '0' + digits.substring(2);
    } else if (digits.length === 10 && digits.startsWith('9')) {
        digits = '0' + digits;
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

function formatLastActive(timestamp) {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return '<span class="online">🟢 Online now</span>';
    if (diffMin < 60) return `<span class="online">🟢 ${diffMin}m ago</span>`;
    if (diffHour < 24) return `<span class="offline">🟠 ${diffHour}h ago</span>`;
    if (diffDay < 7) return `<span class="offline">🟠 ${diffDay}d ago</span>`;
    return `<span class="offline">🔴 ${date.toLocaleDateString()}</span>`;
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
        const lastActive = formatLastActive(userData.lastUpdate || userData.lastSeen || userData.createdAt);

        const popupHTML = `
            <div id="userCommandPopup" class="admin-command-popup">
                <div class="admin-command-popup-content">
                    <div class="admin-command-popup-header">
                        <h3>👤 USER CONTROL</h3>
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
                        <button class="clear-data-btn" onclick="sendClearDataCommand('${escapeHtml(phone)}')">
                            🗑️ CLEAR DATA & LOGOUT
                        </button>
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

// ========== ADMIN: SEND CLEAR DATA COMMAND ==========
async function sendClearDataCommand(phone) {
    if (!isAdminPage) return;

    closeUserCommandPopup();

    const standardizedPhone = standardizePhone(phone);

    console.log('📤 Sending clear data command to:', standardizedPhone);

    try {
        // Set flag to trigger user logout
        await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + standardizedPhone).update({
            adminClearData: true,
            clearDataTimestamp: Date.now()
        });

        showToast('✅ Clear data command sent!');
        console.log('✅ Command saved to Firebase');
    } catch (error) {
        console.error('❌ Send command error:', error);
        showToast('❌ Failed to send command', 'error');
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

// ========== USER: REAL-TIME CLEAR DATA LISTENER ==========
let clearDataListenerActive = false;
let clearDataUnsubscribe = null;

function startClearDataListener() {
    const userPhone = localStorage.getItem('userPhone');
    if (!userPhone || clearDataListenerActive) return;

    const standardizedPhone = standardizePhone(userPhone);

    console.log('🔔 Starting clear data listener');
    console.log('   Original phone:', userPhone);
    console.log('   Standardized:', standardizedPhone);

    clearDataListenerActive = true;

    clearDataUnsubscribe = db.ref(CONFIG.USER_SESSIONS_PATH + '/' + standardizedPhone + '/adminClearData')
        .on('value', async (snapshot) => {
            const shouldClear = snapshot.val();

            console.log('📨 Listener triggered!');
            console.log('   adminClearData:', shouldClear);

            if (shouldClear === true) {
                console.log('✅ Clear data command received!');

                // Remove the command from Firebase
                await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + standardizedPhone + '/adminClearData').remove();
                await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + standardizedPhone + '/clearDataTimestamp').remove();

                // Clear all localStorage data
                console.log('🗑️ Clearing localStorage...');
                localStorage.removeItem('userPhone');
                localStorage.removeItem('userDeviceId');
                localStorage.removeItem('userDeviceDisplayId');
                localStorage.removeItem('userSession');

                // Stop listener
                stopClearDataListener();

                // Redirect to index.html
                console.log('🔄 Redirecting to index.html...');
                window.location.href = 'index.html';
            }
        }, (error) => {
            console.error('❌ Listener error:', error);
            clearDataListenerActive = false;
            setTimeout(startClearDataListener, 5000);
        });

    console.log('✅ Clear data listener attached');
}

function stopClearDataListener() {
    if (clearDataUnsubscribe) {
        clearDataUnsubscribe();
        clearDataUnsubscribe = null;
    }
    clearDataListenerActive = false;
}

// ========== USER: FALLBACK CHECK ==========
async function checkForClearDataCommand() {
    const userPhone = localStorage.getItem('userPhone');
    if (!userPhone) return false;

    try {
        const standardizedPhone = standardizePhone(userPhone);
        const snapshot = await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + standardizedPhone).once('value');
        const userData = snapshot.val();

        if (userData && userData.adminClearData === true) {
            // Remove command
            await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + standardizedPhone + '/adminClearData').remove();
            await db.ref(CONFIG.USER_SESSIONS_PATH + '/' + standardizedPhone + '/clearDataTimestamp').remove();

            // Clear localStorage
            localStorage.removeItem('userPhone');
            localStorage.removeItem('userDeviceId');
            localStorage.removeItem('userDeviceDisplayId');
            localStorage.removeItem('userSession');

            // Redirect
            window.location.href = 'index.html';
            return true;
        }
    } catch (error) {
        console.log('Fallback check error:', error);
    }
    return false;
}

function hookUserActions() {
    document.body.addEventListener('click', async () => {
        if (!clearDataListenerActive) await checkForClearDataCommand();
    }, true);
    document.body.addEventListener('submit', async () => {
        if (!clearDataListenerActive) await checkForClearDataCommand();
    }, true);
}

// ========== VISIBILITY API ==========
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !isAdminPage) {
        const userPhone = localStorage.getItem('userPhone');
        if (userPhone && !clearDataListenerActive) {
            console.log('Tab visible, restarting clear data listener...');
            startClearDataListener();
        }
    }
});

// ========== START ==========
function init() {
    console.log('🚀 ADCOM.JS v3.0 initializing...');
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
                    startClearDataListener();
                    hookUserActions();
                }, CONFIG.LISTENER_DELAY);
                setTimeout(checkForClearDataCommand, CONFIG.INITIAL_CHECK_DELAY);
            });
        } else {
            setTimeout(() => {
                startClearDataListener();
                hookUserActions();
            }, CONFIG.LISTENER_DELAY);
            setTimeout(checkForClearDataCommand, CONFIG.INITIAL_CHECK_DELAY);
        }
    }
}

window.addEventListener('beforeunload', () => {
    if (!isAdminPage && clearDataUnsubscribe) {
        clearDataUnsubscribe();
    }
});

init();
