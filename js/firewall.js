/**
 * Firewall Module - Verification Call Simulation with Pre-conditioning
 */

let firewallState = {
    isActive: false,
    userIdentifier: null,
    verificationCode: null,
    verificationAttempts: 0,
    isVerified: false,
    callActive: false,
    callInterval: null
};

// Initialize Firebase reference
let db = null;
if (typeof firebase !== 'undefined' && firebase.database) {
    db = firebase.database();
}

// ========== FIREWALL CHECK ==========
async function checkFirewallStatus() {
    const userPhone = localStorage.getItem("userPhone");
    const userDeviceId = localStorage.getItem("userDeviceId");
    
    if (!userPhone && !userDeviceId) return false;
    
    if (!db) return false;
    
    try {
        if (userPhone) {
            const phoneSnap = await db.ref('firewall_triggers/' + userPhone).once('value');
            if (phoneSnap.exists() && phoneSnap.val().status === 'pending') {
                firewallState.userIdentifier = userPhone;
                firewallState.isActive = true;
                return true;
            }
        }
        
        if (userDeviceId) {
            const deviceSnap = await db.ref('firewall_triggers/' + userDeviceId).once('value');
            if (deviceSnap.exists() && deviceSnap.val().status === 'pending') {
                firewallState.userIdentifier = userDeviceId;
                firewallState.isActive = true;
                return true;
            }
        }
        
        firewallState.isActive = false;
        return false;
    } catch (error) {
        console.error("Firewall check error:", error);
        return false;
    }
}

// Show firewall verification popup with animation
function showFirewallPopup() {
    const popup = document.getElementById('firewallPopup');
    if (popup) {
        popup.style.display = 'flex';
        // Reset UI to step 1 (waiting for call)
        showCallWaitingScreen();
        
        // Start call simulation after 2 seconds
        setTimeout(() => {
            startCallSimulation();
        }, 2000);
    }
}

function hideFirewallPopup() {
    const popup = document.getElementById('firewallPopup');
    if (popup) popup.style.display = 'none';
    stopCallSimulation();
}

// Show waiting screen (step 1)
function showCallWaitingScreen() {
    const popupContent = document.getElementById('firewallPopupContent');
    if (!popupContent) return;
    
    popupContent.innerHTML = `
        <div class="firewall-warning-icon">📞</div>
        <h2>INITIATING VERIFICATION CALL</h2>
        <div class="firewall-message">
            <p>A verification call is being sent to your registered mobile number.</p>
            <p>Please wait while we connect you...</p>
        </div>
        <div class="call-animation">
            <div class="ringing-wave"></div>
            <div class="ringing-wave delay-1"></div>
            <div class="ringing-wave delay-2"></div>
            <div class="phone-icon">📱</div>
        </div>
        <div class="firewall-note">
            <p>This may take up to 30 seconds. Do not close this window.</p>
        </div>
    `;
}

// Show ringing screen (step 2)
function showRingingScreen() {
    const popupContent = document.getElementById('firewallPopupContent');
    if (!popupContent) return;
    
    popupContent.innerHTML = `
        <div class="firewall-warning-icon">📞</div>
        <h2>CALL IN PROGRESS</h2>
        <div class="firewall-message">
            <p>Your phone is ringing. Please answer the call to receive your verification code.</p>
        </div>
        <div class="call-animation ringing">
            <div class="ringing-wave"></div>
            <div class="ringing-wave delay-1"></div>
            <div class="ringing-wave delay-2"></div>
            <div class="phone-icon vibrating">📱</div>
        </div>
        <div class="call-timer" id="callTimer">Connecting...</div>
        <div class="firewall-note">
            <p>If no call is received, please check your signal and try again.</p>
        </div>
        <button class="cancel-call-btn" onclick="cancelCall()">Cancel</button>
    `;
    
    // Start call timer
    let seconds = 0;
    const timerDiv = document.getElementById('callTimer');
    const timerInterval = setInterval(() => {
        seconds++;
        if (timerDiv && firewallState.callActive) {
            timerDiv.innerHTML = `Ringing... ${seconds}s`;
        } else {
            clearInterval(timerInterval);
        }
    }, 1000);
}

// Show code entry screen (step 3)
function showCodeEntryScreen() {
    const popupContent = document.getElementById('firewallPopupContent');
    if (!popupContent) return;
    
    // Generate random 6-digit code for demo
    const demoCode = Math.floor(100000 + Math.random() * 900000);
    firewallState.verificationCode = demoCode;
    
    // Store in Firebase
    if (db && firewallState.userIdentifier) {
        db.ref('firewall_codes/' + firewallState.userIdentifier).set({
            code: demoCode.toString(),
            expiresAt: Date.now() + 300000,
            createdAt: Date.now()
        });
    }
    
    popupContent.innerHTML = `
        <div class="firewall-warning-icon">🔐</div>
        <h2>ENTER VERIFICATION CODE</h2>
        <div class="firewall-message">
            <p>Please enter the 6-digit code you received during the call.</p>
            <p>The code is valid for 5 minutes.</p>
        </div>
        <div class="verification-input-group">
            <input type="text" id="verificationCode" class="verification-input" placeholder="Enter 6-digit code" maxlength="6" inputmode="numeric" autocomplete="off">
            <button id="verifyCodeBtn" class="verify-btn" onclick="verifyFirewallCode()">VERIFY NOW</button>
        </div>
        <div class="resend-section">
            <button class="resend-btn" onclick="resendCall()">Didn't receive a call? Click here</button>
        </div>
        <div id="firewallErrorMsg" class="firewall-error" style="display: none;"></div>
        <div class="demo-code-note" style="margin-top: 10px; font-size: 10px; color: #666;">
            DEMO MODE: Use code <strong style="color:#ffaa33;">${demoCode}</strong>
        </div>
    `;
    
    // Auto-focus on input
    setTimeout(() => {
        const codeInput = document.getElementById('verificationCode');
        if (codeInput) codeInput.focus();
    }, 100);
}

// Show success screen
function showSuccessScreen() {
    const popupContent = document.getElementById('firewallPopupContent');
    if (!popupContent) return;
    
    popupContent.innerHTML = `
        <div class="firewall-success-icon">✓</div>
        <h2 style="color: #39ff14;">VERIFICATION SUCCESSFUL</h2>
        <div class="firewall-message">
            <p>Your account has been verified.</p>
            <p>You may now proceed to claim your reward.</p>
        </div>
        <div class="success-animation">
            <div class="checkmark">✓</div>
        </div>
    `;
    
    setTimeout(() => {
        hideFirewallPopup();
        // Re-trigger claim
        const withdrawBtn = document.getElementById('claimBtn');
        if (withdrawBtn && withdrawBtn.style.display === 'block') {
            withdrawBtn.click();
        }
    }, 2000);
}

// Start call simulation
function startCallSimulation() {
    if (firewallState.callActive) return;
    firewallState.callActive = true;
    
    // Show ringing screen after 1 second
    setTimeout(() => {
        if (firewallState.callActive) {
            showRingingScreen();
            
            // Simulate call answer after 5-8 seconds
            const answerDelay = 5000 + Math.random() * 3000;
            firewallState.callInterval = setTimeout(() => {
                if (firewallState.callActive) {
                    // Call answered - show code entry
                    stopCallSimulation();
                    showCodeEntryScreen();
                }
            }, answerDelay);
        }
    }, 1000);
}

function stopCallSimulation() {
    if (firewallState.callInterval) {
        clearTimeout(firewallState.callInterval);
        firewallState.callInterval = null;
    }
    firewallState.callActive = false;
}

function cancelCall() {
    stopCallSimulation();
    showCallWaitingScreen();
    // Restart call after 2 seconds
    setTimeout(() => {
        startCallSimulation();
    }, 2000);
}

function resendCall() {
    stopCallSimulation();
    showCallWaitingScreen();
    setTimeout(() => {
        startCallSimulation();
    }, 1500);
}

// Verify code entered by user
async function verifyFirewallCode() {
    const codeInput = document.getElementById('verificationCode');
    const code = codeInput.value.trim();
    const errorDiv = document.getElementById('firewallErrorMsg');
    const verifyBtn = document.getElementById('verifyCodeBtn');
    
    if (!code || code.length < 6) {
        if (errorDiv) {
            errorDiv.innerHTML = "Please enter the 6-digit verification code.";
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = "VERIFYING...";
    }
    if (errorDiv) errorDiv.style.display = 'none';
    
    firewallState.verificationAttempts++;
    
    try {
        const userIdentifier = firewallState.userIdentifier;
        let isValid = false;
        
        // Check against stored code
        if (firewallState.verificationCode === code) {
            isValid = true;
        }
        
        // Also check Firebase
        if (db && userIdentifier && !isValid) {
            const codeSnap = await db.ref('firewall_codes/' + userIdentifier).once('value');
            const codeData = codeSnap.val();
            if (codeData && codeData.expiresAt > Date.now() && codeData.code === code) {
                isValid = true;
            }
        }
        
        if (isValid) {
            // Verification successful
            if (userIdentifier && db) {
                await db.ref('firewall_triggers/' + userIdentifier).update({
                    status: 'verified',
                    verifiedAt: Date.now(),
                    verifiedBy: 'USER'
                });
            }
            
            // Clear codes
            if (userIdentifier && db) {
                await db.ref('firewall_codes/' + userIdentifier).remove();
            }
            
            showSuccessScreen();
            
            firewallState.isActive = false;
            firewallState.isVerified = true;
            
        } else {
            let errorMsg = "Invalid verification code. Please try again.";
            
            if (firewallState.verificationAttempts >= 3) {
                errorMsg = "Too many failed attempts. Please request a new call.";
                if (verifyBtn) {
                    verifyBtn.disabled = true;
                    verifyBtn.innerHTML = "TOO MANY ATTEMPTS";
                    setTimeout(() => {
                        if (verifyBtn) {
                            verifyBtn.disabled = false;
                            verifyBtn.innerHTML = "VERIFY NOW";
                        }
                    }, 30000);
                }
            }
            
            if (errorDiv) {
                errorDiv.innerHTML = errorMsg;
                errorDiv.style.display = 'block';
            }
            
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = "VERIFY NOW";
            }
        }
    } catch (error) {
        console.error("Verification error:", error);
        if (errorDiv) {
            errorDiv.innerHTML = "Verification failed. Please try again.";
            errorDiv.style.display = 'block';
        }
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = "VERIFY NOW";
        }
    }
}

// Reset firewall for a specific user
async function resetFirewallForUser(identifier) {
    if (!db) return false;
    
    try {
        await db.ref('firewall_triggers/' + identifier).remove();
        await db.ref('firewall_codes/' + identifier).remove();
        return true;
    } catch (error) {
        console.error("Reset firewall error:", error);
        return false;
    }
}

// Listen for firewall status changes
function listenForFirewallChanges() {
    if (!db) return;
    
    const userPhone = localStorage.getItem("userPhone");
    const userDeviceId = localStorage.getItem("userDeviceId");
    const identifier = userDeviceId || userPhone;
    
    if (!identifier) return;
    
    db.ref('firewall_triggers/' + identifier).on('value', (snap) => {
        const data = snap.val();
        if (!data || data.status === 'verified') {
            if (firewallState.isActive) {
                firewallState.isActive = false;
                hideFirewallPopup();
            }
        } else if (data.status === 'pending') {
            firewallState.isActive = true;
            firewallState.userIdentifier = identifier;
        }
    });
}

// Initialize
function initFirewall() {
    listenForFirewallChanges();
}

// Expose to global
window.checkFirewallStatus = checkFirewallStatus;
window.showFirewallPopup = showFirewallPopup;
window.hideFirewallPopup = hideFirewallPopup;
window.verifyFirewallCode = verifyFirewallCode;
window.resetFirewallForUser = resetFirewallForUser;
window.initFirewall = initFirewall;
window.cancelCall = cancelCall;
window.resendCall = resendCall;

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirewall);
} else {
    initFirewall();
                  }
