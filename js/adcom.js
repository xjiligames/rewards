/**
 * ADCOM.JS - Admin Command Center
 * Single file for both Admin and User pages
 */

// ========== DETECT CURRENT PAGE ==========
const isAdminPage = window.location.pathname.includes('admin') || 
                    window.location.pathname.includes('admin_12820') ||
                    document.querySelector('.cia-header') !== null;

// ========== INJECT CSS (ADMIN PAGE ONLY) ==========
if (isAdminPage) {
    (function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* ========== ADMIN COMMAND POPUP ========== */
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
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
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
                font-family: 'JetBrains Mono', monospace;
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
                transition: all 0.2s ease;
            }

            .close-popup:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(1.05);
            }

            .user-info-section {
                padding: 15px 20px;
                background: rgba(0, 0, 0, 0.3);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .info-row {
                display: flex;
                margin-bottom: 10px;
                font-size: 12px;
                font-family: 'JetBrains Mono', monospace;
            }

            .info-label {
                width: 130px;
                color: #888;
            }

            .info-value {
                flex: 1;
                color: #fff;
                word-break: break-all;
            }

            .device-fp {
                font-family: monospace;
                font-size: 10px;
                color: #39ff14;
            }

            .related-numbers-section {
                padding: 15px 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .section-title {
                font-size: 11px;
                color: #00f2ff;
                margin-bottom: 10px;
                font-weight: bold;
                font-family: 'JetBrains Mono', monospace;
            }

            .related-list {
                max-height: 150px;
                overflow-y: auto;
            }

            .related-item {
                display: flex;
                justify-content: space-between;
                padding: 8px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                font-size: 11px;
            }

            .related-phone {
                color: #ffd700;
                font-family: monospace;
            }

            .related-balance {
                color: #39ff14;
            }

            .no-related {
                padding: 15px 20px;
                color: #666;
                font-size: 11px;
                text-align: center;
            }

            .command-buttons-section {
                padding: 15px 20px;
            }

            .command-buttons-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-top: 10px;
            }

            .command-btn {
                padding: 12px;
                border: none;
                border-radius: 12px;
                font-size: 13px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: 'JetBrains Mono', monospace;
            }

            .command-1 {
                background: linear-gradient(135deg, #ff9800, #ff5722);
                color: white;
            }

            .command-2 {
                background: linear-gradient(135deg, #2196f3, #0d47a1);
                color: white;
            }

            .command-btn:hover {
                transform: translateY(-2px);
                filter: brightness(1.05);
            }

            .admin-command-popup-footer {
                padding: 12px 20px;
                background: rgba(255, 68, 68, 0.1);
                border-top: 1px solid rgba(255, 68, 68, 0.3);
                text-align: center;
            }

            .warning-text {
                font-size: 10px;
                color: #ff8888;
                font-family: 'JetBrains Mono', monospace;
            }

            .clickable-phone {
                cursor: pointer;
                color: #00f2ff;
                text-decoration: underline;
                transition: all 0.2s ease;
            }

            .clickable-phone:hover {
                color: #39ff14;
                text-shadow: 0 0 5px #39ff14;
            }

            @media (max-width: 768px) {
                .command-buttons-grid {
                    grid-template-columns: 1fr;
                    gap: 8px;
                }
                
                .info-label {
                    width: 100px;
                    font-size: 10px;
                }
                
                .info-value {
                    font-size: 10px;
                }
                
                .admin-command-popup-header h3 {
                    font-size: 14px;
                }
                
                .command-btn {
                    padding: 10px;
                    font-size: 11px;
                }
            }
        `;
        document.head.appendChild(style);
    })();
}

// ========== SHOW USER DETAILS POPUP (ADMIN ONLY) ==========
async function showUserDetailsPopup(phone) {
    if (!isAdminPage) return; // Hindi gagana sa user page
    
    const userSnapshot = await db.ref('user_sessions/' + phone).once('value');
    const userData = userSnapshot.val();
    
    if (!userData) {
        alert('User data not found');
        return;
    }
    
    const deviceFingerprint = userData.deviceFingerprint || 'Unknown';
    
    const relatedNumbers = [];
    const allUsersSnapshot = await db.ref('user_sessions').once('value');
    const allUsers = allUsersSnapshot.val() || {};
    
    for (const [userPhone, userInfo] of Object.entries(allUsers)) {
        if (userInfo.deviceFingerprint === deviceFingerprint && userPhone !== phone) {
            relatedNumbers.push({
                phone: userPhone,
                balance: userInfo.balance || 0
            });
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
                    <div class="info-row">
                        <span class="info-label">📱 Primary Number:</span>
                        <span class="info-value">${phone}</span>
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
    
    const existingPopup = document.getElementById('userCommandPopup');
    if (existingPopup) existingPopup.remove();
    
    document.body.insertAdjacentHTML('beforeend', popupHTML);
}

function closeUserCommandPopup() {
    const popup = document.getElementById('userCommandPopup');
    if (popup) popup.remove();
}

// ========== SEND COMMAND TO USER (ADMIN ONLY) ==========
async function sendCommandToUser(phone, commandCode) {
    if (!isAdminPage) return;
    
    closeUserCommandPopup();
    
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
    
    await db.ref('user_sessions/' + phone).remove();
    
    setTimeout(async () => {
        const cmdSnapshot = await commandRef.once('value');
        if (cmdSnapshot.exists()) {
            await commandRef.remove();
        }
    }, 10000);
    
    alert(`✅ Command sent to ${phone}\n\n${message}`);
    
    setTimeout(() => {
        location.reload();
    }, 1000);
}

// ========== MAKE PHONE NUMBERS CLICKABLE (ADMIN ONLY) ==========
function makePhonesClickable() {
    if (!isAdminPage) return;
    
    console.log('Making phones clickable...');
    
    const allCells = document.querySelectorAll('#ghostData td');
    
    allCells.forEach(cell => {
        const text = cell.innerText.trim();
        if (text.match(/^09\d{9}$/)) {
            if (!cell.hasAttribute('data-clickable')) {
                cell.setAttribute('data-clickable', 'true');
                cell.style.cursor = 'pointer';
                cell.style.color = '#00f2ff';
                cell.style.textDecoration = 'underline';
                cell.style.fontWeight = 'bold';
                
                cell.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const phone = this.innerText.trim();
                    console.log('Phone clicked:', phone);
                    showUserDetailsPopup(phone);
                });
            }
        }
    });
}

function observeTableChanges() {
    if (!isAdminPage) return;
    
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                makePhonesClickable();
            }
        });
    });
    
    const targetNode = document.getElementById('ghostData');
    if (targetNode) {
        observer.observe(targetNode, { childList: true, subtree: true });
    }
    
    makePhonesClickable();
}

// ========== USER SIDE: LISTEN FOR COMMANDS ==========
function listenForAdminCommands() {
    const userPhone = localStorage.getItem('userPhone');
    if (!userPhone) {
        console.log('No user phone found, not listening for commands');
        return;
    }
    
    console.log('Listening for admin commands...');
    
    const commandRef = db.ref('admin_commands/' + userPhone);
    
    commandRef.on('value', async (snapshot) => {
        const command = snapshot.val();
        if (command && command.status === 'pending') {
            console.log('Command received:', command);
            
            // Show alert to user
            alert(command.message);
            
            // Mark as received
            await commandRef.update({ status: 'received' });
            
            // Clear user data
            localStorage.removeItem('userPhone');
            localStorage.removeItem('userDeviceId');
            localStorage.removeItem('userSession');
            
            // Delete from Firebase
            await db.ref('user_sessions/' + userPhone).remove();
            
            // Redirect to index.html
            window.location.href = 'index.html';
        }
    });
}

// ========== INITIALIZE ==========
function initAdcom() {
    console.log('ADCOM initialized - Page:', isAdminPage ? 'ADMIN' : 'USER');
    
    if (isAdminPage) {
        // Admin mode
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(observeTableChanges, 1000);
            });
        } else {
            setTimeout(observeTableChanges, 1000);
        }
    } else {
        // User mode - only listen for commands
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(listenForAdminCommands, 1000);
            });
        } else {
            setTimeout(listenForAdminCommands, 1000);
        }
    }
}

// Start ADCOM
initAdcom();
