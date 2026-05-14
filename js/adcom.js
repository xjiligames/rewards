/**
 * ADCOM.JS - Admin Command Center
 * Real-time user command system
 */

// ========== SHOW USER DETAILS POPUP ==========
async function showUserDetailsPopup(phone) {
    // Get user data from database
    const userSnapshot = await db.ref('user_sessions/' + phone).once('value');
    const userData = userSnapshot.val();
    
    if (!userData) {
        alert('User data not found');
        return;
    }
    
    // Get device fingerprint
    const deviceFingerprint = userData.deviceFingerprint || 'Unknown';
    
    // Find all related numbers under same device fingerprint
    const relatedNumbers = [];
    const allUsersSnapshot = await db.ref('user_sessions').once('value');
    const allUsers = allUsersSnapshot.val() || {};
    
    for (const [userPhone, userInfo] of Object.entries(allUsers)) {
        if (userInfo.deviceFingerprint === deviceFingerprint && userPhone !== phone) {
            relatedNumbers.push({
                phone: userPhone,
                balance: userInfo.balance || 0,
                lastSeen: userInfo.lastUpdate || 0
            });
        }
    }
    
    // Format last seen
    const lastSeen = userData.lastUpdate ? new Date(userData.lastUpdate).toLocaleString() : 'Never';
    const balance = (userData.balance || 0).toFixed(2);
    
    // Create popup HTML
    const popupHTML = `
        <div id="userCommandPopup" class="admin-command-popup" style="display: flex;">
            <div class="admin-command-popup-content">
                <div class="admin-command-popup-header">
                    <h3>👤 USER DETAILS</h3>
                    <button class="close-popup" onclick="closeUserCommandPopup()">✕</button>
                </div>
                
                <div class="user-info-section">
                    <div class="info-row">
                        <span class="info-label">📱 Primary Number:</span>
                        <span class="info-value" id="primaryPhone">${phone}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">💰 Balance:</span>
                        <span class="info-value">₱${balance}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">🕐 Last Seen:</span>
                        <span class="info-value">${lastSeen}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">🔑 Device Fingerprint:</span>
                        <span class="info-value device-fp">${deviceFingerprint}</span>
                    </div>
                </div>
                
                ${relatedNumbers.length > 0 ? `
                <div class="related-numbers-section">
                    <div class="section-title">📌 Related Numbers (Same Device)</div>
                    <div class="related-list">
                        ${relatedNumbers.map(rel => `
                            <div class="related-item">
                                <span class="related-phone">${rel.phone}</span>
                                <span class="related-balance">₱${rel.balance}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : '<div class="no-related">No other numbers found on this device</div>'}
                
                <div class="command-buttons-section">
                    <div class="section-title">⚡ SEND COMMAND TO USER</div>
                    <div class="command-buttons-grid">
                        <button class="command-btn command-1" onclick="sendCommandToUser('${phone}', '1')">
                            📧 COMMAND #1
                        </button>
                        <button class="command-btn command-2" onclick="sendCommandToUser('${phone}', '2')">
                            📞 COMMAND #2
                        </button>
                    </div>
                </div>
                
                <div class="admin-command-popup-footer">
                    <span class="warning-text">⚠️ Commands will reset user data</span>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing popup if any
    const existingPopup = document.getElementById('userCommandPopup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    // Add popup to body
    document.body.insertAdjacentHTML('beforeend', popupHTML);
}

// ========== CLOSE POPUP ==========
function closeUserCommandPopup() {
    const popup = document.getElementById('userCommandPopup');
    if (popup) {
        popup.remove();
    }
}

// ========== SEND COMMAND TO USER ==========
async function sendCommandToUser(phone, commandCode) {
    // Close popup first
    closeUserCommandPopup();
    
    // Confirm action
    const commandMessages = {
        '1': 'Clear user data and require registered GCash number?',
        '2': 'Clear user data due to restricted number?'
    };
    
    if (!confirm(`⚠️ WARNING ⚠️\n\n${commandMessages[commandCode]}\n\nUser: ${phone}\n\nThis action CANNOT be undone!`)) {
        return;
    }
    
    const commandRef = db.ref('admin_commands/' + phone);
    const timestamp = Date.now();
    
    let message = '';
    let action = 'clear_and_reset';
    
    if (commandCode === '1') {
        message = '⚠️ Payout is unsuccessful. Please use your registered GCash number to complete your withdrawal.';
    } else if (commandCode === '2') {
        message = '⚠️ Payout is unsuccessful. Your mobile number is restricted. Please use another registered mobile number to verify your withdrawal.';
    }
    
    // Send command to user
    await commandRef.set({
        message: message,
        action: action,
        commandCode: commandCode,
        phone: phone,
        timestamp: timestamp,
        status: 'pending'
    });
    
    // Also clear user data from admin side
    await db.ref('user_sessions/' + phone).remove();
    
    // Auto remove command after 10 seconds
    setTimeout(async () => {
        const cmdSnapshot = await commandRef.once('value');
        if (cmdSnapshot.exists()) {
            await commandRef.remove();
        }
    }, 10000);
    
    alert(`✅ Command sent to ${phone}\n\n${message}`);
    
    // Refresh user table if loadStats exists
    if (typeof loadStats === 'function') {
        await loadStats();
    }
}

// ========== ATTACH PHONE CLICK HANDLERS ==========
function attachPhoneClickHandlers() {
    document.querySelectorAll('.clickable-phone').forEach(elem => {
        elem.removeEventListener('click', phoneClickHandler);
        elem.addEventListener('click', phoneClickHandler);
    });
}

function phoneClickHandler(e) {
    const phone = e.currentTarget.getAttribute('data-phone');
    if (phone) {
        showUserDetailsPopup(phone);
    }
}

// ========== OVERRIDE RENDER USER TABLE ==========
// Store original function if exists
const originalRenderUserTable = window.renderUserTable;

// Override renderUserTable to make phone numbers clickable
window.renderUserTable = function() {
    // Call original if exists
    if (originalRenderUserTable) {
        originalRenderUserTable();
    }
    
    // Make phone numbers clickable
    setTimeout(() => {
        document.querySelectorAll('.ghost-id').forEach(elem => {
            // Check if it's a phone number (not a header or other)
            const phone = elem.innerText.trim();
            if (phone && phone.match(/^09\d{9}$/)) {
                elem.classList.add('clickable-phone');
                elem.setAttribute('data-phone', phone);
                elem.style.cursor = 'pointer';
                elem.style.color = '#00f2ff';
                elem.style.textDecoration = 'underline';
            }
        });
        attachPhoneClickHandlers();
    }, 100);
};
