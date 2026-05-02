/**
 * Promotion.js - Combined Modules with LuckyCat Priority
 * Order: 10(Main Core) with fucntion modules
 */

// ========== MODULE: MAIN CORE (UNA) ==========
(function() {
    'use strict';
    
    let userPhone = null;
    let db = null;
    let userRef = null;
    let currentBalance = 0;
    
    // Global modules container
    window.PromotionModules = window.PromotionModules || {};
    
    function init() {
        console.log('🎁 Promotion System Starting...');
        
        userPhone = localStorage.getItem("userPhone");
        if (!userPhone) {
            window.location.href = "index.html";
            return;
        }
        
        // Display phone number
        const phoneDisplay = document.getElementById('userPhoneDisplay');
        if (phoneDisplay) {
            const formatted = userPhone.substring(0, 4) + "***" + userPhone.substring(7, 11);
            phoneDisplay.innerText = formatted;
        }
        
        // Initialize Firebase
        initFirebase();
        loadUserData();
        
        // Initialize all modules in order
        if (window.TimerModule) window.TimerModule.init();
        if (window.DropdownModule) window.DropdownModule.init();
        if (window.TickerModule) window.TickerModule.init();
        if (window.LuckyCatModule) window.LuckyCatModule.init();
        if (window.InviteUI) window.InviteUI.init();       
        if (window.ReferralLogic) window.ReferralLogic.init();
        if (window.RightLuckyCat) window.RightLuckyCat.init(); 
        
        console.log('✅ All systems ready!');
    }
    
    function initFirebase() {
        if (typeof firebaseConfig === 'undefined') return;
        try {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.database();
            userRef = db.ref('user_sessions/' + userPhone);
        } catch(e) { console.error('Firebase error:', e); }
    }
    
    function loadUserData() {
        if (!userRef) return;
        userRef.once('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                currentBalance = data.balance || 0;
                if (window.LuckyCatModule) window.LuckyCatModule.setClaimed(data.claimed_luckycat || false);
            } else {
                currentBalance = 0;
                userRef.set({ phone: userPhone, balance: 0, claimed_luckycat: false, status: "active", created_at: Date.now() });
            }
            updateBalanceDisplay();
        }).catch(e => console.error(e));
        
        userRef.child('balance').on('value', (snapshot) => {
            const balance = snapshot.val();
            if (balance !== null && balance !== undefined) {
                currentBalance = Number(balance);
                updateBalanceDisplay();
            }
        });
    }
    
    function updateBalanceDisplay() {
        const balanceEl = document.getElementById('userBalanceDisplay');
        if (balanceEl) balanceEl.innerText = currentBalance.toFixed(2);
        const popupBalance = document.getElementById('popupBalanceAmount');
        if (popupBalance) popupBalance.innerText = "₱" + currentBalance.toFixed(2);
    }
    
    function animateBalanceSlow(start, end, duration, callback) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const val = Math.floor(easeProgress * (end - start) + start);
            
            const balanceEl = document.getElementById('userBalanceDisplay');
            if (balanceEl) balanceEl.innerText = val.toFixed(2);
            const popupBalance = document.getElementById('popupBalanceAmount');
            if (popupBalance) popupBalance.innerText = "₱" + val.toFixed(2);
            
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                if (callback) callback();
            }
        };
        requestAnimationFrame(step);
    }
    
    function addToBalance(amount, slowAnimation = false) {
        const oldBalance = currentBalance;
        const newBalance = oldBalance + amount;
        
        if (slowAnimation) {
            animateBalanceSlow(oldBalance, newBalance, 2000, () => {
                currentBalance = newBalance;
                if (userRef) userRef.update({ balance: currentBalance, lastUpdate: Date.now() });
            });
        } else {
            currentBalance = newBalance;
            updateBalanceDisplay();
            if (userRef) userRef.update({ balance: currentBalance, lastUpdate: Date.now() });
        }
        
        const balanceEl = document.getElementById('userBalanceDisplay');
        if (balanceEl) {
            balanceEl.style.transform = 'scale(1.1)';
            setTimeout(() => { if (balanceEl) balanceEl.style.transform = 'scale(1)'; }, 200);
        }
    }
    
    function playSound(soundName) {
        const sounds = {
            scatter: new Audio('sounds/super_ace_scatter_ring.mp3'),
            claim: new Audio('sounds/claim.mp3'),
            invite: new Audio('sounds/invite.mp3'),
            success: new Audio('sounds/success.mp3')
        };
        if (sounds[soundName]) {
            sounds[soundName].volume = 0.5;
            sounds[soundName].currentTime = 0;
            sounds[soundName].play().catch(e => console.log(e));
        }
    }
    
    // Export core functions for other modules
    window.PromotionCore = {
        addToBalance: addToBalance,
        animateBalanceSlow: animateBalanceSlow,
        playSound: playSound,
        getBalance: () => currentBalance,
        getUserPhone: () => userPhone,
        getUserRef: () => userRef
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

// ========== MODULE 1: TIMER ==========
window.TimerModule = (function() {
    'use strict';
    let timerInterval = null;
    let timerEndDate = null;
    const CYCLE_HOURS = 72;
    let displayElement = null;
    
    function init() {
        displayElement = document.getElementById('mainTimerDisplay');
        if (!displayElement) return;
        try {
            let savedEnd = localStorage.getItem('timerEndDate');
            let now = Date.now();
            if (savedEnd && parseInt(savedEnd) > now) {
                timerEndDate = parseInt(savedEnd);
            } else {
                timerEndDate = now + (CYCLE_HOURS * 60 * 60 * 1000);
                localStorage.setItem('timerEndDate', timerEndDate);
            }
            start();
        } catch(e) { console.error('Timer error:', e); }
    }
    
    function start() {
        if (timerInterval) clearInterval(timerInterval);
        function update() {
            try {
                let now = Date.now();
                let diff = timerEndDate - now;
                if (diff <= 0) {
                    timerEndDate = now + (CYCLE_HOURS * 60 * 60 * 1000);
                    localStorage.setItem('timerEndDate', timerEndDate);
                    diff = CYCLE_HOURS * 60 * 60 * 1000;
                }
                let days = Math.floor(diff / (1000 * 60 * 60 * 24));
                let hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                let minutes = Math.floor((diff / (1000 * 60)) % 60);
                let seconds = Math.floor((diff / 1000) % 60);
                if (displayElement) {
                    displayElement.innerHTML = `${days}D ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
            } catch(e) { console.error('Timer update error:', e); }
        }
        update();
        timerInterval = setInterval(update, 1000);
    }
    
    return { init: init };
})();


// ========== MODULE 2: TICKER (REMASTERED - Weighted) ==========
window.TickerModule = (function() {
    'use strict';
    
    let winnerSpan = null;
    let interval = null;
    
    const prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955", "0939", "0906", "0977"];
    
    // WEIGHTED AMOUNTS
    const amountRarity = [
        { amount: 150, weight: 20 },
        { amount: 300, weight: 18 },
        { amount: 450, weight: 15 },
        { amount: 600, weight: 12 },
        { amount: 750, weight: 10 },
        { amount: 900, weight: 8 },
        { amount: 1050, weight: 6 },   
        { amount: 1200, weight: 4 }, 
        { amount: 1350, weight: 3 }, 
        { amount: 1500, weight: 2 }    
    ];
    
    function generateRandomAmount() {
        // Calculate total weight
        let totalWeight = 0;
        for (let i = 0; i < amountRarity.length; i++) {
            totalWeight += amountRarity[i].weight;
        }
        
        // Random selection based on weight
        let random = Math.random() * totalWeight;
        let cumulative = 0;
        
        for (let i = 0; i < amountRarity.length; i++) {
            cumulative += amountRarity[i].weight;
            if (random <= cumulative) {
                return amountRarity[i].amount;
            }
        }
        
        return 150; // default fallback
    }
    
    function init() {
        winnerSpan = document.getElementById('winnerText');
        if (!winnerSpan) return;
        
        update();
        if (interval) clearInterval(interval);
        interval = setInterval(update, 15000);
    }
    
    function generateWinner() {
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const last4 = Math.floor(1000 + Math.random() * 9000);
        const amount = generateRandomAmount();
        
        return `${prefix}***${last4} withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱${amount}`;
    }
    
    function update() {
        if (winnerSpan) winnerSpan.innerHTML = generateWinner();
    }
    
    return { init: init };
})();


// ========== MODULE 3 CONFETTI MODULE (For Popup) ==========
window.ConfettiModule = (function() {
    'use strict';
    let canvas = null;
    let animation = null;
    let timeout = null;
    
    function init() {
        canvas = document.getElementById('confettiCanvas');
    }
    
    function start() {
        if (!canvas) return;
        stop();
        canvas.style.display = 'block';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        const particles = [];
        for (let i = 0; i < 100; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                size: Math.random() * 6 + 2,
                color: `hsl(${Math.random() * 360}, 100%, 60%)`,
                speed: Math.random() * 3 + 2
            });
        }
        function draw() {
            if (!canvas || canvas.style.display === 'none') return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
                p.y += p.speed;
                if (p.y > canvas.height) { p.y = -p.size; p.x = Math.random() * canvas.width; }
            });
            animation = requestAnimationFrame(draw);
        }
        draw();
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(stop, 3000);
    }
    
    function stop() {
        if (animation) cancelAnimationFrame(animation);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display = 'none';
        }
        if (timeout) clearTimeout(timeout);
    }
    
    init();
    return { start: start, stop: stop };
})();

// ========== MODULE 4: LUCKY CAT (FIXED - MAY LOAD CHECK) ==========
window.LuckyCatModule = (function() {
    'use strict';
    
    let leftCard = null;
    let leftReward = null;
    let leftLabel = null;  // <- BAGO: para sa "YOU GET" / "ALREADY"
    let luckyCatStatus = null;
    let isClaimed = false;
    let claimInProgress = false;
    
    function init() {
        leftCard = document.getElementById('leftCard');
        leftReward = document.getElementById('leftRewardAmount');
        leftLabel = document.querySelector('#leftCard .prize-label');  // <- BAGO
        luckyCatStatus = document.getElementById('luckyCatStatus');
        
        // AGAD I-DISPLAY ANG DEFAULT (para hindi blank)
        if (leftReward) {
            leftReward.innerHTML = '+₱150';
            leftReward.style.fontSize = '18px';
            leftReward.style.color = '#ffd700';
            leftReward.style.fontWeight = 'bold';
        }
        
        if (leftLabel && !isClaimed) {
            leftLabel.innerHTML = 'YOU GET';
        }
        
        if (leftCard) {
            const newCard = leftCard.cloneNode(true);
            leftCard.parentNode.replaceChild(newCard, leftCard);
            leftCard = newCard;
            leftCard.addEventListener('click', handleClaim);
            
            // Re-get elements after clone
            leftReward = document.getElementById('leftRewardAmount');
            leftLabel = document.querySelector('#leftCard .prize-label');
            
            const leftVideo = document.getElementById('leftCatVideo');
            if (leftVideo) {
                leftCard.addEventListener('click', function() {
                    if (leftVideo && leftVideo.muted) {
                        leftVideo.muted = false;
                        leftVideo.volume = 0.35;
                        leftVideo.play().catch(e => console.log(e));
                    }
                }, { once: true });
            }
        }
        
        // ✅ Tumawag agad sa Firebase para malaman kung claimed na
        checkClaimStatusFromFirebase();
        
        console.log('✅ LuckyCat Module ready - checking claim status...');
    }
    
    // ✅ Nagche-check sa Firebase pag-load ng page
    async function checkClaimStatusFromFirebase() {
        console.log('🔍 Checking LuckyCat claim status from Firebase...');
        
        const userRef = window.PromotionCore ? window.PromotionCore.getUserRef() : null;
        
        if (!userRef) {
            console.log('⏳ Waiting for Firebase reference...');
            setTimeout(checkClaimStatusFromFirebase, 500);
            return;
        }
        
        try {
            const snapshot = await userRef.once('value');
            const data = snapshot.val();
            
            if (data) {
                const claimed = data.claimed_luckycat === true;
                console.log('📊 Firebase data:', { claimed: claimed, balance: data.balance });
                
                if (claimed) {
                    isClaimed = true;
                    console.log('✅ LuckyCat is already CLAIMED from Firebase');
                } else {
                    isClaimed = false;
                    console.log('✅ LuckyCat is AVAILABLE');
                }
                updateUI();
            } else {
                console.log('New user - LuckyCat is AVAILABLE');
                isClaimed = false;
                updateUI();
            }
        } catch(error) {
            console.error('Error checking claim status:', error);
        }
    }
    
    function handleClaim(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (isClaimed) {
            alert("You' have already claimed the Lucky Cat bonus!");
            return;
        }
        
        if (claimInProgress) {
            alert("Please wait, processing your claim...");
            return;
        }
        
        const userRef = window.PromotionCore ? window.PromotionCore.getUserRef() : null;
        if (userRef) {
            userRef.once('value', (snapshot) => {
                const data = snapshot.val();
                if (data && data.claimed_luckycat === true) {
                    isClaimed = true;
                    updateUI();
                    alert("You have already claimed the Lucky Cat bonus!");
                    return;
                }
                processClaim();
            }).catch(() => processClaim());
        } else {
            processClaim();
        }
    }
    
    function processClaim() {
        claimInProgress = true;
        
        if (leftCard) {
            leftCard.style.pointerEvents = 'none';
            leftCard.style.opacity = '0.8';
        }
        
        if (window.PromotionCore) {
            window.PromotionCore.playSound('claim');
        }
        
        if (window.ConfettiModule) {
            window.ConfettiModule.start();
        }
        
        if (window.PromotionCore) {
            window.PromotionCore.addToBalance(150, true);
        }
        
        isClaimed = true;
        updateUI();
        
        const userRef = window.PromotionCore ? window.PromotionCore.getUserRef() : null;
        if (userRef) {
            userRef.update({ 
                claimed_luckycat: true,
                luckycat_claimed_at: Date.now()
            }).catch(e => console.error('Firebase save error:', e));
        }
        
        const userPhone = window.PromotionCore ? window.PromotionCore.getUserPhone() : null;
        if (userPhone) {
            localStorage.setItem(`${userPhone}_claimed_luckycat`, 'true');
        }
        
        setTimeout(() => {
            alert("🎉 Congratulations! You received ₱150 bonus!");
        }, 500);
        
        setTimeout(() => {
            claimInProgress = false;
        }, 2500);
    }
    
    function updateUI() {
        // ✅ UPDATE LABEL: "YOU GET" → "ALREADY" kapag claimed
        if (leftLabel) {
            if (isClaimed) {
                leftLabel.innerHTML = 'ALREADY';
                leftLabel.style.color = '#ffd700';
                leftLabel.style.fontSize = '10px';
            } else {
                leftLabel.innerHTML = 'YOU GET';
                leftLabel.style.color = '#ffd966';
                leftLabel.style.fontSize = '11px';
            }
        }
        
        // ✅ UPDATE REWARD DISPLAY: "+₱150" → "CLAIMED" kapag claimed
        if (leftReward) {
            if (isClaimed) {
                leftReward.innerHTML = 'CLAIMED';
                leftReward.style.fontSize = '12px';
                leftReward.style.letterSpacing = '2px';
                leftReward.style.color = '#ffd700';
                leftReward.style.fontWeight = 'bold';
                leftReward.style.animation = 'none';
            } else {
                leftReward.innerHTML = '+₱150';
                leftReward.style.fontSize = '18px';
                leftReward.style.letterSpacing = 'normal';
                leftReward.style.color = '#ffd700';
                leftReward.style.fontWeight = 'bold';
                leftReward.style.animation = 'pulse-attract 1.5s infinite';
            }
        }
        
        // ✅ UPDATE CARD STYLE
        if (leftCard) {
            if (isClaimed) {
                leftCard.classList.add('prize-card-claimed');
                leftCard.style.border = '3px solid #ffd700';
                leftCard.style.boxShadow = '0 0 35px rgba(255,215,0,0.8), inset 0 0 10px rgba(255,215,0,0.3)';
                leftCard.style.cursor = 'default';
                leftCard.style.pointerEvents = 'none';
                leftCard.style.animation = 'none';
            } else {
                leftCard.classList.remove('prize-card-claimed');
                leftCard.style.border = '';
                leftCard.style.boxShadow = '';
                leftCard.style.cursor = 'pointer';
                leftCard.style.pointerEvents = 'auto';
                leftCard.style.animation = 'card-attract 1.5s ease-in-out infinite';
            }
        }
        
        // ✅ UPDATE STATUS TEXT
        if (luckyCatStatus) {
            if (isClaimed) {
                luckyCatStatus.innerText = "Claimed";
                luckyCatStatus.classList.add('claimed');
            } else {
                luckyCatStatus.innerText = "Available";
                luckyCatStatus.classList.remove('claimed');
            }
        }
    }
    
    function setClaimed(claimed) {
        isClaimed = claimed;
        updateUI();
    }
    
    function getClaimed() {
        return isClaimed;
    }
    
    return { 
        init: init, 
        setClaimed: setClaimed, 
        getClaimed: getClaimed,
        checkClaimStatusFromFirebase: checkClaimStatusFromFirebase
    };
})();

// ========== REFERRAL SYSTEM MODULE (COMPLETE) ==========
window.ReferralSystem = (function() {
    'use strict';
    
    let currentUserPhone = null;
    let userRef = null;
    let db = null;
    let currentDeviceId = null;
    
    // DOM Elements - Dropdown
    let dropdownBtn = null;
    let dropdownContent = null;
    let sendBtn = null;
    let friendInput = null;
    let sentListContainer = null;
    let receivedListContainer = null;
    
    // DOM Elements - Right Lucky Cat Card
    let rightCard = null;
    let rightReward = null;
    
    // State variables
    let pendingRewards = 0;
    let totalEarnings = 0;
    let isProcessing = false;
    
    const MAX_DISPLAY = 3;
    const MAX_EARNINGS = 1500;
    const THRESHOLD_WARNING = 1000;
    
    // Unsubscribe functions
    let unsubscribeSent = null;
    let unsubscribeReceived = null;
    let unsubscribeEarnings = null;
    
    // ========== SOUND FUNCTIONS ==========
    function playInviteSound() {
        try {
            const audio = new Audio('sounds/invite.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Sound error:', e));
        } catch(e) {
            console.log('Sound not available');
        }
    }
    
    function playClaimSound() {
        try {
            const audio = new Audio('sounds/claim.wav');
            audio.volume = 0.7;
            audio.play().catch(e => console.log('Sound error:', e));
        } catch(e) {
            console.log('Sound not available');
        }
    }
    
    function playSuccessSound() {
        try {
            const audio = new Audio('sounds/success.wav');
            audio.volume = 0.6;
            audio.play().catch(e => console.log('Sound error:', e));
        } catch(e) {
            console.log('Sound not available');
        }
    }
    
    // ========== INITIALIZATION ==========
    function init() {
        currentUserPhone = localStorage.getItem("userPhone");
        currentDeviceId = localStorage.getItem("userDeviceId");
        
        if (!currentUserPhone) {
            console.log('No user phone found');
            return;
        }
        
        const core = window.PromotionCore;
        if (core) {
            userRef = core.getUserRef();
            db = firebase.database();
        }
        
        // Dropdown elements
        dropdownBtn = document.getElementById('dropdownBtn');
        dropdownContent = document.getElementById('dropdownContent');
        sendBtn = document.getElementById('sendInviteBtn');
        friendInput = document.getElementById('friendPhoneInput');
        sentListContainer = document.getElementById('inviteListBody');
        receivedListContainer = document.getElementById('receivedInvitesList');
        
        // Right Lucky Cat elements
        rightCard = document.getElementById('rightCard');
        rightReward = document.getElementById('rightRewardAmount');
        
        // Setup dropdown event listeners
        if (dropdownBtn && dropdownContent) {
            const newBtn = dropdownBtn.cloneNode(true);
            dropdownBtn.parentNode.replaceChild(newBtn, dropdownBtn);
            dropdownBtn = newBtn;
            dropdownBtn.addEventListener('click', toggleDropdown);
            document.addEventListener('click', handleOutsideClick);
        }
        
        if (sendBtn) {
            const newBtn = sendBtn.cloneNode(true);
            sendBtn.parentNode.replaceChild(newBtn, sendBtn);
            sendBtn = newBtn;
            sendBtn.addEventListener('click', handleSendInvite);
        }
        
        if (friendInput) {
            friendInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') handleSendInvite();
            });
        }
        
        // Setup Right Lucky Cat click event
        if (rightCard) {
            const newCard = rightCard.cloneNode(true);
            rightCard.parentNode.replaceChild(newCard, rightCard);
            rightCard = newCard;
            rightCard.addEventListener('click', handleClaimReward);
        }
        
        // Setup realtime listeners
        setupRealtimeListeners();
        
        // Load initial data
        loadUserData();
        
        console.log('✅ Referral System Module ready');
    }
    
    // ========== REALTIME LISTENERS ==========
    function setupRealtimeListeners() {
        if (!userRef) return;
        
        // Listener for sent invites
        unsubscribeSent = userRef.child('invites/sent').on('value', (snapshot) => {
            renderSentInvites(snapshot);
        });
        
        // Listener for received invites
        unsubscribeReceived = userRef.child('invites/received').on('value', (snapshot) => {
            renderReceivedInvites(snapshot);
        });
        
        // Listener for new received invites (for notification)
        userRef.child('invites/received').on('child_added', (snapshot) => {
            const referral = snapshot.val();
            if (referral && referral.status === 'waiting') {
                addPendingReward(150, referral.from);
            }
        });
        
        // Listener for earnings
        unsubscribeEarnings = userRef.child('referral_earnings').on('value', (snapshot) => {
            totalEarnings = snapshot.val() || 0;
            updateEarningsDisplay();
            updateRewardDisplay();
        });
        
        // Listener for notifications (for User1 when referral is claimed)
        userRef.child('notifications').on('child_added', (snapshot) => {
            const notification = snapshot.val();
            if (notification && !notification.read) {
                showReferralNotification(notification.message);
                userRef.child('pending_rewards').transaction(current => (current || 0) + 150);
                animateCardHighlight();
                userRef.child('pending_rewards').once('value', (snap) => {
                    updateRewardDisplay();
                });
                snapshot.ref.update({ read: true });
            }
        });
    }
    
    // ========== LOAD USER DATA ==========
    async function loadUserData() {
        if (!userRef) return;
        
        const earningsSnapshot = await userRef.child('referral_earnings').once('value');
        totalEarnings = earningsSnapshot.val() || 0;
        
        const receivedSnapshot = await userRef.child('invites/received').once('value');
        const received = receivedSnapshot.val() || {};
        
        pendingRewards = 0;
        for (let [fromPhone, invite] of Object.entries(received)) {
            if (invite.status === 'waiting') {
                pendingRewards += 150;
            }
        }
        
        const pendingSnapshot = await userRef.child('pending_rewards').once('value');
        pendingRewards += pendingSnapshot.val() || 0;
        
        updateRewardDisplay();
        updateEarningsDisplay();
    }
    
    // ========== CHEATING DETECTION ==========
    async function isInvitingSelf(friendPhone) {
        if (friendPhone === currentUserPhone) return true;
        
        if (currentDeviceId) {
            const devicePhoneMapRef = db.ref('device_phone_map/' + currentDeviceId);
            const snapshot = await devicePhoneMapRef.once('value');
            if (snapshot.exists() && snapshot.val().phone !== currentUserPhone) return true;
        }
        
        const friendDeviceRef = db.ref('device_phone_map').orderByChild('phone').equalTo(friendPhone);
        const friendSnapshot = await friendDeviceRef.once('value');
        
        if (friendSnapshot.exists()) {
            let friendDeviceId = null;
            friendSnapshot.forEach((child) => { friendDeviceId = child.key; });
            if (friendDeviceId === currentDeviceId) return true;
        }
        return false;
    }
    
    async function isUserPreviouslyCompleted(friendPhone) {
        const completedRef = await userRef.child(`invites/completed_referrals/${friendPhone}`).once('value');
        if (completedRef.exists()) return true;
        
        const snapshot = await userRef.child(`invites/sent/${friendPhone}`).once('value');
        const inviteData = snapshot.val();
        return inviteData && inviteData.status === 'completed';
    }
    
    // ========== SEND INVITE ==========
    async function handleSendInvite() {
        const friendPhone = friendInput?.value.trim();
        
        if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) {
            alert("📱 Please enter a valid 11-digit mobile number starting with 09");
            return;
        }
        
        if (await isInvitingSelf(friendPhone)) {
            showCheatingWarning();
            if (friendInput) friendInput.value = '';
            return;
        }
        
        if (await isUserPreviouslyCompleted(friendPhone)) {
            showCannotReinviteWarning(friendPhone);
            if (friendInput) friendInput.value = '';
            return;
        }
        
        const snapshot = await userRef.child('invites/sent').once('value');
        const sentInvites = snapshot.val() || {};
        const currentCount = Object.keys(sentInvites).length;
        
        if (currentCount >= MAX_DISPLAY) {
            showMaxInviteWarning();
            return;
        }
        
        if (sentInvites[friendPhone]) {
            alert("⚠️ You already invited this person!");
            return;
        }
        
        await userRef.child(`invites/sent/${friendPhone}`).set({
            phone: friendPhone,
            status: 'pending',
            timestamp: Date.now()
        });
        
        const user2Ref = db.ref('user_sessions/' + friendPhone);
        await user2Ref.child(`invites/received/${currentUserPhone}`).set({
            from: currentUserPhone,
            status: 'waiting',
            timestamp: Date.now(),
            rewardDisplay: '+₱150'
        });
        
        if (friendInput) friendInput.value = '';
        playInviteSound();
        alert("🎉 Invitation sent successfully!");
    }
    
    // ========== DELETE INVITE ==========
    async function deleteInvitation(phoneToDelete) {
        const formattedPhone = formatPhoneNumber(phoneToDelete);
        const inviteSnapshot = await userRef.child(`invites/sent/${phoneToDelete}`).once('value');
        const inviteData = inviteSnapshot.val();
        
        if (!inviteData) {
            alert("❌ This invitation no longer exists.");
            return;
        }
        
        if (inviteData.status === 'completed') {
            if (confirm(`⚠️ Remove ${formattedPhone} from your list?\n\nThis user already claimed their reward.\nYou CANNOT invite them again.`)) {
                await userRef.child(`invites/sent/${phoneToDelete}`).remove();
                await userRef.child(`invites/completed_referrals/${phoneToDelete}`).set({
                    phone: phoneToDelete,
                    completedAt: inviteData.timestamp
                });
                alert(`✅ ${formattedPhone} removed. Slot freed up!`);
            }
            return;
        }
        
        if (confirm(`⚠️ Delete invitation to ${formattedPhone}?`)) {
            await userRef.child(`invites/sent/${phoneToDelete}`).remove();
            const user2Ref = db.ref('user_sessions/' + phoneToDelete);
            await user2Ref.child(`invites/received/${currentUserPhone}`).remove();
            alert(`🗑️ Invitation deleted. You can now invite someone new!`);
        }
    }
    
    // ========== CLAIM REWARD (Right Lucky Cat) ==========
    async function handleClaimReward(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (isProcessing) {
            showToast("⏳ Please wait, processing your claim...");
            return;
        }
        
        if (pendingRewards <= 0) {
            showToast("📭 No pending rewards to claim!");
            return;
        }
        
        if (totalEarnings >= THRESHOLD_WARNING && totalEarnings < MAX_EARNINGS) {
            showThresholdWarning();
            return;
        }
        
        if (totalEarnings >= MAX_EARNINGS) {
            showMaxEarningsReached();
            return;
        }
        
        isProcessing = true;
        
        const receivedSnapshot = await userRef.child('invites/received').once('value');
        const received = receivedSnapshot.val() || {};
        
        let claimedAmount = 0;
        let claimedFrom = null;
        
        for (let [fromPhone, invite] of Object.entries(received)) {
            if (invite.status === 'waiting') {
                claimedAmount = 150;
                claimedFrom = fromPhone;
                
                await userRef.child(`invites/received/${fromPhone}/status`).set('claimed');
                
                const senderRef = db.ref('user_sessions/' + fromPhone);
                await senderRef.child('referral_earnings').transaction(current => (current || 0) + 150);
                await senderRef.child('notifications').push({
                    message: `🎉 Your referral ${formatPhoneNumber(currentUserPhone)} claimed the reward! +₱150 added to your pending rewards.`,
                    timestamp: Date.now(),
                    read: false
                });
                break;
            }
        }
        
        if (claimedAmount > 0) {
            pendingRewards -= claimedAmount;
            await userRef.child('pending_rewards').set(pendingRewards);
            
            if (window.PromotionCore) {
                window.PromotionCore.addToBalance(claimedAmount, true);
            }
            
            totalEarnings += claimedAmount;
            await userRef.child('referral_earnings').set(totalEarnings);
            
            playClaimSound();
            animateClaimSuccess(claimedAmount);
            updateRewardDisplay();
            updateEarningsDisplay();
            showToast(`🎉 Success! ₱${claimedAmount} added to your balance!`);
        }
        
        isProcessing = false;
    }
    
    // ========== ADD PENDING REWARD ==========
    async function addPendingReward(amount, fromPhone) {
        pendingRewards += amount;
        updateRewardDisplay();
        showInviteNotification(fromPhone);
        animateCardHighlight();
        animateAmountIncrement(pendingRewards - amount, pendingRewards);
        await userRef.child('pending_rewards').set(pendingRewards);
    }
    
    // ========== RENDER FUNCTIONS (No duplicate headers) ==========
    function renderSentInvites(snapshot) {
        if (!sentListContainer) return;
        
        const sent = snapshot.val() || {};
        const sentArray = Object.entries(sent);
        
        if (sentArray.length === 0) {
            sentListContainer.innerHTML = `<div class="invite-empty">📭 No invites sent</div>`;
            return;
        }
        
        // RESULTS ONLY - NO HEADER HERE (header is in HTML)
        let html = '';
        let count = 0;
        
        for (let [phone, data] of sentArray) {
            if (count >= MAX_DISPLAY) break;
            
            const formattedPhone = formatPhoneNumber(phone);
            const statusClass = data.status === 'completed' ? 'approved' : 'pending';
            const statusText = data.status === 'completed' ? '✅ COMPLETED' : '⏳ PENDING';
            
            html += `
                <div class="invite-item">
                    <div class="invite-item-phone">${formattedPhone}</div>
                    <div class="invite-item-status">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="invite-item-action">
                        <button class="delete-invite" data-phone="${phone}" ${data.status === 'completed' ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}>✕</button>
                    </div>
                </div>
            `;
            count++;
        }
        
        sentListContainer.innerHTML = html;
        
        document.querySelectorAll('.delete-invite:not([disabled])').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteInvitation(btn.dataset.phone);
            });
        });
    }
    
    function renderReceivedInvites(snapshot) {
        if (!receivedListContainer) return;
        
        const received = snapshot.val() || {};
        const receivedArray = Object.entries(received);
        
        if (receivedArray.length === 0) {
            receivedListContainer.innerHTML = '<div class="invite-empty">📭 No invites received</div>';
            return;
        }
        
        // Sort newest to oldest
        receivedArray.sort((a, b) => b[1].timestamp - a[1].timestamp);
        
        // RESULTS ONLY - NO HEADER HERE (header is in HTML)
        let html = '';
        
        for (let [fromPhone, invite] of receivedArray) {
            const formattedPhone = formatPhoneNumber(fromPhone);
            const statusClass = invite.status === 'claimed' ? 'approved' : 'pending';
            const statusText = invite.status === 'claimed' ? '✅ CLAIMED' : '⏳ WAITING';
            const rewardDisplay = invite.status === 'claimed' ? '₱150' : '⚡ PENDING';
            
            html += `
                <div class="invite-item received-item">
                    <div class="invite-item-phone">${formattedPhone}</div>
                    <div class="invite-item-status">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="invite-item-reward" style="color: ${invite.status === 'claimed' ? '#ffd700' : '#666'}">
                        ${rewardDisplay}
                    </div>
                </div>
            `;
        }
        
        receivedListContainer.innerHTML = html;
    }
    
    // ========== UI UPDATE FUNCTIONS ==========
    function updateRewardDisplay() {
        if (!rightReward) return;
        
        if (pendingRewards > 0) {
            rightReward.innerHTML = `+₱${pendingRewards}`;
            rightReward.style.fontSize = '20px';
            rightReward.style.color = '#ffd700';
            rightReward.style.fontWeight = 'bold';
            
            if (rightCard) {
                rightCard.style.border = '2px solid #ffd700';
                rightCard.style.boxShadow = '0 0 20px rgba(255,215,0,0.6)';
                rightCard.style.animation = 'cardGlowPulse 0.8s ease-in-out infinite';
            }
        } else {
            rightReward.innerHTML = '+₱150';
            rightReward.style.fontSize = '18px';
            rightReward.style.color = '#ffd700';
            
            if (rightCard) {
                rightCard.style.border = '1px solid rgba(255,215,0,0.2)';
                rightCard.style.boxShadow = 'none';
                rightCard.style.animation = 'none';
            }
        }
    }
    
    function updateEarningsDisplay() {
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const percentage = (totalEarnings / MAX_EARNINGS) * 100;
            progressFill.style.width = percentage + '%';
        }
    }
    
    // ========== ANIMATIONS ==========
    function animateCardHighlight() {
        if (!rightCard) return;
        rightCard.classList.add('card-glow');
        setTimeout(() => {
            if (rightCard) rightCard.classList.remove('card-glow');
        }, 800);
    }
    
    async function animateAmountIncrement(start, end) {
        if (!rightReward) return;
        const steps = 20;
        const increment = (end - start) / steps;
        let current = start;
        
        for (let i = 0; i <= steps; i++) {
            current = start + (increment * i);
            rightReward.innerHTML = `+₱${Math.floor(current)}`;
            rightReward.style.transform = 'scale(1.1)';
            await new Promise(r => setTimeout(r, 30));
            rightReward.style.transform = 'scale(1)';
        }
        rightReward.innerHTML = `+₱${end}`;
    }
    
    function animateClaimSuccess(amount) {
        if (!rightReward) return;
        rightReward.classList.add('reward-pulse');
        setTimeout(() => {
            if (rightReward) rightReward.classList.remove('reward-pulse');
        }, 500);
        
        const floatDiv = document.createElement('div');
        floatDiv.innerHTML = `+₱${amount}`;
        floatDiv.style.cssText = `
            position: fixed;
            bottom: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 40px;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 0 0 10px #ffd700;
            z-index: 10001;
            animation: floatUp 1s ease-out forwards;
            pointer-events: none;
        `;
        document.body.appendChild(floatDiv);
        setTimeout(() => { if (floatDiv) floatDiv.remove(); }, 1000);
    }
    
    // ========== NOTIFICATIONS ==========
    function showInviteNotification(fromPhone) {
        playSuccessSound();
        const formattedPhone = formatPhoneNumber(fromPhone);
        
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 28px;">🎉</span>
                <div>
                    <strong style="color: #ffd700;">${formattedPhone}</strong>
                    <span style="color: #fff;"> invited you!</span><br>
                    <span style="font-size: 11px; color: #00ff88;">✨ Click Right Lucky Cat to claim +₱150!</span>
                </div>
            </div>
        `;
        notification.style.cssText = `
            position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
            max-width: 320px; background: linear-gradient(135deg, #1a1a2e, #0f0a1a);
            border: 2px solid #ffd700; border-radius: 16px; padding: 14px 18px;
            z-index: 10001; animation: slideDown 0.4s ease, fadeOut 0.4s ease 4s forwards;
            box-shadow: 0 5px 20px rgba(0,0,0,0.5); cursor: pointer; backdrop-filter: blur(10px);
        `;
        notification.onclick = () => notification.remove();
        document.body.appendChild(notification);
        setTimeout(() => { if (notification) notification.remove(); }, 4000);
    }
    
    function showReferralNotification(message) {
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">🏆</span>
                <span style="color: #fff; font-size: 13px;">${message}</span>
            </div>
        `;
        notification.style.cssText = `
            position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
            max-width: 320px; background: linear-gradient(135deg, #0a2a1a, #0f1a0a);
            border: 2px solid #00ff88; border-radius: 16px; padding: 12px 16px;
            z-index: 10001; animation: slideDown 0.4s ease, fadeOut 0.4s ease 4s forwards;
            box-shadow: 0 5px 20px rgba(0,0,0,0.5); backdrop-filter: blur(10px);
        `;
        notification.onclick = () => notification.remove();
        document.body.appendChild(notification);
        setTimeout(() => { if (notification) notification.remove(); }, 4000);
    }
    
    function showToast(message) {
        const toast = document.createElement('div');
        toast.innerHTML = message;
        toast.style.cssText = `
            position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
            background: linear-gradient(135deg, #1a1a2e, #0f0a1a); border: 1px solid #ffd700;
            color: #ffd700; padding: 10px 20px; border-radius: 50px; font-size: 12px;
            font-weight: bold; z-index: 10002; animation: fadeOutUp 2s ease-out forwards;
            white-space: nowrap; box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(toast);
        setTimeout(() => { if (toast) toast.remove(); }, 2000);
    }
    
    // ========== WARNINGS ==========
    function showCheatingWarning() {
        const warningDiv = document.createElement('div');
        warningDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: linear-gradient(135deg, #1a0a0a, #2a1010); border: 2px solid #ff4444; 
                        border-radius: 20px; padding: 25px 30px; text-align: center; z-index: 20000; 
                        box-shadow: 0 0 50px rgba(255,68,68,0.5); max-width: 350px; animation: warningPop 0.3s ease;">
                <div style="font-size: 50px;">🚨</div>
                <h3 style="color: #ff4444;">REFERRAL FRAUD DETECTED!</h3>
                <p style="color: #fff;">⚠️ <strong style="color: #ffd700;">YOU CANNOT INVITE YOURSELF!</strong></p>
                <p style="color: #ff8888; font-size: 12px;">This is your <strong>LAST WARNING!</strong></p>
                <button id="warningCloseBtn" style="background: #ff4444; border: none; padding: 10px 25px; border-radius: 30px; color: white; font-weight: bold; margin-top: 15px; cursor: pointer;">I UNDERSTAND</button>
            </div>
        `;
        document.body.appendChild(warningDiv);
        document.getElementById('warningCloseBtn').onclick = () => warningDiv.remove();
        setTimeout(() => { if (warningDiv) warningDiv.remove(); }, 5000);
    }
    
    function showCannotReinviteWarning(friendPhone) {
        const formattedPhone = formatPhoneNumber(friendPhone);
        const warningDiv = document.createElement('div');
        warningDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: linear-gradient(135deg, #1a1a2e, #0f0a1a); border: 2px solid #ffaa33; 
                        border-radius: 20px; padding: 25px 30px; text-align: center; z-index: 20000; 
                        box-shadow: 0 0 50px rgba(255,170,51,0.5); max-width: 350px; animation: warningPop 0.3s ease;">
                <div style="font-size: 50px;">🔒</div>
                <h3 style="color: #ffaa33;">INVITE LOCKED!</h3>
                <p style="color: #fff;"><strong style="color: #ffd700;">${formattedPhone}</strong> already claimed their reward.</p>
                <p style="color: #ff8888; font-size: 12px;">Each user can only be invited ONCE!</p>
                <button id="warningCloseBtn" style="background: #ffaa33; border: none; padding: 10px 25px; border-radius: 30px; color: #1a1a2e; font-weight: bold; margin-top: 15px; cursor: pointer;">GOT IT</button>
            </div>
        `;
        document.body.appendChild(warningDiv);
        document.getElementById('warningCloseBtn').onclick = () => warningDiv.remove();
        setTimeout(() => { if (warningDiv) warningDiv.remove(); }, 5000);
    }
    
    function showMaxInviteWarning() {
        const warningDiv = document.createElement('div');
        warningDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: linear-gradient(135deg, #1a1a2e, #0f0a1a); border: 2px solid #00aaff; 
                        border-radius: 20px; padding: 25px 30px; text-align: center; z-index: 20000; 
                        box-shadow: 0 0 50px rgba(0,170,255,0.5); max-width: 350px; animation: warningPop 0.3s ease;">
                <div style="font-size: 50px;">📊</div>
                <h3 style="color: #00aaff;">INVITE LIMIT REACHED!</h3>
                <p style="color: #fff;">Maximum <strong style="color: #ffd700;">${MAX_DISPLAY}</strong> active invites.</p>
                <p style="color: #ff8888; font-size: 12px;">Delete a pending invite first!</p>
                <button id="warningCloseBtn" style="background: #00aaff; border: none; padding: 10px 25px; border-radius: 30px; color: white; font-weight: bold; margin-top: 15px; cursor: pointer;">OKAY</button>
            </div>
        `;
        document.body.appendChild(warningDiv);
        document.getElementById('warningCloseBtn').onclick = () => warningDiv.remove();
        setTimeout(() => { if (warningDiv) warningDiv.remove(); }, 4000);
    }
    
    function showThresholdWarning() {
        const warningDiv = document.createElement('div');
        warningDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: linear-gradient(135deg, #1a1a2e, #0f0a1a); border: 2px solid #ffaa33; 
                        border-radius: 20px; padding: 25px 30px; text-align: center; z-index: 20000; 
                        box-shadow: 0 0 50px rgba(255,170,51,0.5); max-width: 350px; animation: warningPop 0.3s ease;">
                <div style="font-size: 50px;">⚠️</div>
                <h3 style="color: #ffaa33;">THRESHOLD REACHED!</h3>
                <p style="color: #fff;">You have reached <strong style="color: #ffd700;">₱${totalEarnings}/${MAX_EARNINGS}</strong></p>
                <p style="color: #ffaa33;">📋 Complete Task #3 to continue claiming rewards!</p>
                <button id="warningCloseBtn" style="background: #ffaa33; border: none; padding: 10px 25px; border-radius: 30px; color: #1a1a2e; font-weight: bold; margin-top: 15px; cursor: pointer;">I UNDERSTAND</button>
            </div>
        `;
        document.body.appendChild(warningDiv);
        document.getElementById('warningCloseBtn').onclick = () => warningDiv.remove();
        setTimeout(() => { if (warningDiv) warningDiv.remove(); }, 5000);
    }
    
    function showMaxEarningsReached() {
        const warningDiv = document.createElement('div');
        warningDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: linear-gradient(135deg, #1a1a2e, #0f0a1a); border: 2px solid #00ff88; 
                        border-radius: 20px; padding: 25px 30px; text-align: center; z-index: 20000; 
                        box-shadow: 0 0 50px rgba(0,255,136,0.3); max-width: 350px; animation: warningPop 0.3s ease;">
                <div style="font-size: 50px;">🏆</div>
                <h3 style="color: #00ff88;">MAX EARNINGS REACHED!</h3>
                <p style="color: #fff;">Maximum <strong style="color: #ffd700;">₱${MAX_EARNINGS}</strong> referral bonus achieved!</p>
                <p style="color: #ffaa33;">🎉 Thank you for being part of Lucky Drop!</p>
                <button id="warningCloseBtn" style="background: #00ff88; border: none; padding: 10px 25px; border-radius: 30px; color: #1a1a2e; font-weight: bold; margin-top: 15px; cursor: pointer;">AWESOME!</button>
            </div>
        `;
        document.body.appendChild(warningDiv);
        document.getElementById('warningCloseBtn').onclick = () => warningDiv.remove();
        setTimeout(() => { if (warningDiv) warningDiv.remove(); }, 5000);
    }
    
    // ========== DROPDOWN FUNCTIONS ==========
    function toggleDropdown(e) {
        e.preventDefault();
        e.stopPropagation();
        dropdownContent.classList.toggle('show');
        const arrow = dropdownBtn.querySelector('.dropdown-arrow');
        if (arrow) arrow.innerHTML = dropdownContent.classList.contains('show') ? '▲' : '▼';
    }
    
    function handleOutsideClick(e) {
        if (dropdownBtn && dropdownContent) {
            if (!dropdownBtn.contains(e.target) && !dropdownContent.contains(e.target)) {
                dropdownContent.classList.remove('show');
                const arrow = dropdownBtn.querySelector('.dropdown-arrow');
                if (arrow) arrow.innerHTML = '▼';
            }
        }
    }
    
    // ========== HELPER ==========
    function formatPhoneNumber(phone) {
        if (!phone || phone.length < 11) return phone;
        return phone.substring(0, 4) + '***' + phone.substring(7, 11);
    }
    
    function destroy() {
        if (unsubscribeSent) userRef.child('invites/sent').off('value', unsubscribeSent);
        if (unsubscribeReceived) userRef.child('invites/received').off('value', unsubscribeReceived);
        if (unsubscribeEarnings) userRef.child('referral_earnings').off('value', unsubscribeEarnings);
    }
    
    return { init: init, destroy: destroy };
})();
